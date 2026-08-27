import { genId } from '../core/geometry.js';

const INDEX_KEY = 'wc:index';
const BOARD_PREFIX = 'wc:board:';
const VERSION = 1;
const QUOTA = 5 * 1024 * 1024;      // localStorage 预算（字节，按 UTF-16 每字符 2 字节估算）
const DEBOUNCE_MS = 800;

export function createPersistence(store) {
  let timer = null;
  let lastState = 'on';

  function setState(s) {
    lastState = s;
    store.emit('save-state', s);
  }

  function boardKey(id) { return BOARD_PREFIX + id; }

  function serializeCurrent() {
    const meta = store.boards.find(b => b.id === store.activeBoardId);
    return {
      version: VERSION,
      id: store.activeBoardId,
      name: meta ? meta.name : '画板',
      camera: { ...store.camera },
      elements: store.elements,
      assets: store.assets,
    };
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!store.activeBoardId) return;
    const meta = store.boards.find(b => b.id === store.activeBoardId);
    if (meta) meta.updatedAt = Date.now();
    try {
      localStorage.setItem(boardKey(store.activeBoardId), JSON.stringify(serializeCurrent()));
      localStorage.setItem(INDEX_KEY, JSON.stringify({
        version: VERSION,
        activeBoardId: store.activeBoardId,
        boards: store.boards,
      }));
      setState(usage().ratio > 0.8 ? 'warn' : 'on');
    } catch (err) {
      console.error('保存失败', err);
      setState('warn');
    }
    store.emit('usage', usage());
  }

  function schedule() {
    setState('busy');
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  }

  function usage() {
    let chars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wc:')) chars += k.length + (localStorage.getItem(k) || '').length;
    }
    const bytes = chars * 2;
    return { bytes, ratio: bytes / QUOTA };
  }

  function readBoard(id) {
    try {
      const raw = localStorage.getItem(boardKey(id));
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.elements)) return null;
      return data;
    } catch { return null; }
  }

  // 将画板数据装入 store（历史清空、无引用资源回收）
  function activate(id) {
    const data = readBoard(id);
    store.activeBoardId = id;
    store.elements = data?.elements ?? [];
    store.assets = data?.assets ?? {};
    store.camera = data?.camera ? { ...data.camera } : { x: 0, y: 0, zoom: 1 };
    const used = new Set(store.elements.map(e => e.assetId).filter(Boolean));
    for (const key of Object.keys(store.assets)) if (!used.has(key)) delete store.assets[key];
    store.selection = new Set();
    store.view.editingId = null;
    store.view.fadeIds.clear();
    store.history.clear();
    store.emit('boards');
    store.emit('elements');
    store.emit('history');
    store.emit('selection');
    store.emit('camera');
  }

  function nextName() {
    for (let i = 0; i < 26; i++) {
      const name = '画板 ' + String.fromCharCode(65 + i);
      if (!store.boards.some(b => b.name === name)) return name;
    }
    return '画板 ' + (store.boards.length + 1);
  }

  const api = {
    flush,
    usage,

    init() {
      let index = null;
      try { index = JSON.parse(localStorage.getItem(INDEX_KEY) || 'null'); } catch { /* 损坏则重建 */ }
      if (index && Array.isArray(index.boards) && index.boards.length) {
        store.boards = index.boards;
        const active = store.boards.some(b => b.id === index.activeBoardId)
          ? index.activeBoardId : store.boards[0].id;
        activate(active);
      } else {
        api.createBoard(nextName());
      }
      setState('on');
      store.emit('usage', usage());
    },

    switchBoard(id) {
      if (id === store.activeBoardId || !store.boards.some(b => b.id === id)) return;
      flush();
      activate(id);
      flush();
    },

    createBoard(name) {
      if (store.activeBoardId) flush();
      const board = { id: genId(), name: name || nextName(), createdAt: Date.now(), updatedAt: Date.now() };
      store.boards.push(board);
      activate(board.id);
      flush();
      return board;
    },

    renameBoard(id, name) {
      const b = store.boards.find(x => x.id === id);
      if (!b || !name) return;
      b.name = name;
      store.emit('boards');
      flush();
    },

    deleteBoard(id) {
      const i = store.boards.findIndex(b => b.id === id);
      if (i < 0) return;
      store.boards.splice(i, 1);
      localStorage.removeItem(boardKey(id));
      if (store.activeBoardId === id) {
        if (store.boards.length) activate(store.boards[Math.min(i, store.boards.length - 1)].id);
        else api.createBoard(nextName());
      } else {
        store.emit('boards');
      }
      flush();
    },

    exportAllJson() {
      flush();
      const boards = store.boards.map(b =>
        b.id === store.activeBoardId ? serializeCurrent() : (readBoard(b.id) || {
          version: VERSION, id: b.id, name: b.name, camera: { x: 0, y: 0, zoom: 1 }, elements: [], assets: {},
        }));
      return JSON.stringify({ version: VERSION, exportedAt: new Date().toISOString(), boards });
    },

    importJson(text) {
      const data = JSON.parse(text);
      const boards = Array.isArray(data.boards) ? data.boards : (data.elements ? [data] : null);
      if (!boards || !boards.length) throw new Error('文件里没有画板数据');
      flush();
      let firstId = null;
      for (const bd of boards) {
        if (!Array.isArray(bd.elements)) continue;
        const id = genId();
        firstId ??= id;
        const name = (bd.name || '导入画板') + (store.boards.some(b => b.name === bd.name) ? ' · 导入' : '');
        store.boards.push({ id, name, createdAt: Date.now(), updatedAt: Date.now() });
        localStorage.setItem(boardKey(id), JSON.stringify({
          version: VERSION, id, name,
          camera: bd.camera || { x: 0, y: 0, zoom: 1 },
          elements: bd.elements,
          assets: bd.assets || {},
        }));
      }
      if (!firstId) throw new Error('文件里没有有效画板');
      activate(firstId);
      flush();
    },
  };

  store.subscribe(type => {
    if (type === 'elements' || type === 'camera' || type === 'boards') schedule();
  });
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  return api;
}
