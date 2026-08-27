import { fillFor } from '../tools/shape.js';
import { noteColorFor } from '../tools/note.js';
import { insertImageBlob } from '../io/images.js';
import { exportPng } from '../io/exportPng.js';

const INKS = [
  { v: '#2A2A2A', t: '炭黑' }, { v: '#7A7A74', t: '灰' }, { v: '#F2B705', t: '黄' },
  { v: '#2E8B57', t: '绿' }, { v: '#D0342C', t: '红' }, { v: '#F4F4F0', t: '纸白' },
];
const STROKES = [1, 2, 4, 8];
const FILLS = [{ v: 'none', t: '无' }, { v: 'tint', t: '淡' }, { v: 'solid', t: '实' }];

const STROKE_TYPES = new Set(['pen', 'rect', 'ellipse', 'line', 'arrow']);

export function createPanel({ store, camera, renderer, persistence, toolManager, stage }) {
  const $ = id => document.getElementById(id);

  // ---- 工具键排 ----
  const toolKeys = [...document.querySelectorAll('#tools .key[data-tool]')];
  for (const key of toolKeys) {
    key.addEventListener('click', () => toolManager.setTool(key.dataset.tool));
  }
  store.subscribe(type => {
    if (type !== 'tool') return;
    for (const key of toolKeys) key.classList.toggle('sel', key.dataset.tool === store.tool);
    $('lcd-tool') && ($('lcd-tool').textContent = store.tool.toUpperCase());
  });

  // ---- 插入图片 ----
  const fileImage = $('file-image');
  $('btn-insert-image').addEventListener('click', () => fileImage.click());
  fileImage.addEventListener('change', () => {
    const center = camera.screenToWorld(stage.clientWidth / 2, stage.clientHeight / 2);
    [...fileImage.files].forEach((f, i) => insertImageBlob(store, f, { x: center.x + i * 24, y: center.y + i * 24 }));
    fileImage.value = '';
  });

  // ---- 墨色档位 ----
  const inks = $('inks');
  for (const ink of INKS) {
    const label = document.createElement('label');
    label.title = ink.t;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'ink';
    input.value = ink.v;
    input.checked = ink.v === store.ink;
    input.style.background = ink.v;
    input.addEventListener('change', () => {
      store.ink = ink.v;
      const items = [];
      for (const el of store.selectedElements()) {
        if (STROKE_TYPES.has(el.type) || el.type === 'text') {
          const patch = { stroke: ink.v };
          if ((el.type === 'rect' || el.type === 'ellipse') && el.fill) {
            patch.fill = fillFor(el.fill === el.stroke ? 'solid' : 'tint', ink.v);
          }
          items.push({ id: el.id, patch });
        } else if (el.type === 'note') {
          items.push({ id: el.id, patch: { noteColor: noteColorFor(ink.v) } });
        }
      }
      if (items.length) store.updateElements(items);
    });
    label.appendChild(input);
    inks.appendChild(label);
  }

  // ---- 线宽档位 ----
  const strokes = $('strokes');
  const strokeKeys = STROKES.map(w => {
    const key = document.createElement('button');
    key.className = 'key' + (w === store.strokeWidth ? ' sel' : '');
    key.title = w + 'px';
    key.innerHTML = `<i style="height:${Math.min(w, 6)}px"></i>`;
    key.addEventListener('click', () => {
      store.strokeWidth = w;
      strokeKeys.forEach(k => k.classList.toggle('sel', k === key));
      const items = store.selectedElements()
        .filter(el => STROKE_TYPES.has(el.type))
        .map(el => ({ id: el.id, patch: { strokeWidth: w } }));
      if (items.length) store.updateElements(items);
    });
    strokes.appendChild(key);
    return key;
  });

  // ---- 填充档位 ----
  const fills = $('fills');
  const fillKeys = FILLS.map(f => {
    const key = document.createElement('button');
    key.className = 'key' + (f.v === store.fillMode ? ' sel' : '');
    key.title = '填充：' + f.t;
    key.innerHTML = f.v === 'none' ? '<i></i>' : `<i class="${f.v}"></i>`;
    key.addEventListener('click', () => {
      store.fillMode = f.v;
      fillKeys.forEach(k => k.classList.toggle('sel', k === key));
      const items = store.selectedElements()
        .filter(el => el.type === 'rect' || el.type === 'ellipse')
        .map(el => ({ id: el.id, patch: { fill: fillFor(f.v, el.stroke) } }));
      if (items.length) store.updateElements(items);
    });
    fills.appendChild(key);
    return key;
  });

  // ---- undo / redo ----
  const btnUndo = $('btn-undo'), btnRedo = $('btn-redo');
  btnUndo.addEventListener('click', () => store.undo());
  btnRedo.addEventListener('click', () => store.redo());
  store.subscribe(type => {
    if (type !== 'history') return;
    btnUndo.classList.toggle('off', !store.history.canUndo);
    btnRedo.classList.toggle('off', !store.history.canRedo);
  });

  // ---- 指示灯 + 元素计数 ----
  const lampSave = $('lamp-save'), lampCap = $('lamp-cap');
  store.subscribe((type, payload) => {
    if (type === 'save-state') {
      lampSave.className = payload === 'on' ? 'on' : payload === 'busy' ? 'busy' : 'warn';
    } else if (type === 'usage') {
      lampCap.className = payload.ratio > 0.8 ? 'warn' : payload.ratio > 0.6 ? 'busy' : 'on';
    } else if (type === 'elements') {
      $('el-count').textContent = store.elements.length;
    }
  });

  // ---- 导入导出 ----
  $('btn-export-png').addEventListener('click', async () => {
    const board = store.boards.find(b => b.id === store.activeBoardId);
    const ok = await exportPng({ store, env: renderer.env, boardName: board?.name });
    if (!ok) alert('画布上还没有元素，先画点什么再导出。');
  });

  $('btn-export-json').addEventListener('click', () => {
    const json = persistence.exportAllJson();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `wireless-canvas-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  const fileImport = $('file-import');
  $('btn-import-json').addEventListener('click', () => fileImport.click());
  fileImport.addEventListener('change', async () => {
    const file = fileImport.files[0];
    fileImport.value = '';
    if (!file) return;
    try {
      persistence.importJson(await file.text());
    } catch (err) {
      alert('导入失败：' + err.message + '。请选择本应用导出的 JSON 备份文件。');
    }
  });
}
