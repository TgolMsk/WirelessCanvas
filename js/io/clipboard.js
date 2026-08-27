import { genId } from '../core/geometry.js';
import { insertImageBlob } from './images.js';
import { reflowElement } from '../elements/registry.js';

const MARK = '__wirelesscanvas';

export function createClipboard({ store, camera, stage }) {
  let internal = null; // { elements, assets }

  function viewCenter() {
    return camera.screenToWorld(stage.clientWidth / 2, stage.clientHeight / 2);
  }

  function copy() {
    const sel = store.selectedElements();
    if (!sel.length) return false;
    const assets = {};
    for (const el of sel) if (el.assetId && store.assets[el.assetId]) assets[el.assetId] = store.assets[el.assetId];
    internal = { elements: structuredClone(sel), assets };
    navigator.clipboard?.writeText(JSON.stringify({ [MARK]: 1, ...internal })).catch(() => {});
    return true;
  }

  function cut() {
    if (copy()) store.removeElements([...store.selection]);
  }

  function placeElements(data, offset = { x: 16, y: 16 }) {
    const els = structuredClone(data.elements || []);
    if (!els.length) return;
    Object.assign(store.assets, data.assets || {});
    for (const el of els) {
      el.id = genId();
      el.x += offset.x; el.y += offset.y;
      if (el.x2 !== undefined) { el.x2 += offset.x; el.y2 += offset.y; }
    }
    store.addElements(els, { select: true });
  }

  function pasteText(text) {
    const fontSize = 16;
    const c = viewCenter();
    const el = {
      id: genId(), type: 'text', rotation: 0,
      x: c.x - 140, y: c.y, w: 280, h: fontSize * 1.4,
      fontSize, text: text.slice(0, 5000), align: 'left',
      stroke: store.ink, strokeWidth: 0, fill: null, opacity: 1,
    };
    reflowElement(el);
    store.addElements([el], { select: true });
  }

  function duplicate() {
    const sel = store.selectedElements();
    if (!sel.length) return;
    placeElements({ elements: sel, assets: {} });
  }

  document.addEventListener('paste', e => {
    if (e.target.closest?.('textarea,input,[contenteditable]')) return;
    const cd = e.clipboardData;
    if (!cd) return;
    for (const item of cd.items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          insertImageBlob(store, file, viewCenter());
          return;
        }
      }
    }
    const text = cd.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed[MARK]) { placeElements(parsed); return; }
    } catch { /* 不是画布数据，按纯文本处理 */ }
    if (internal) { placeElements(internal); return; }
    pasteText(text);
  });

  stage.addEventListener('dragover', e => e.preventDefault());
  stage.addEventListener('drop', e => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    const at = camera.eventWorld(e);
    files.forEach((f, i) => insertImageBlob(store, f, { x: at.x + i * 24, y: at.y + i * 24 }));
  });

  return { copy, cut, duplicate, placeElements };
}
