import { createStore } from './state/store.js';
import { createPersistence } from './state/persistence.js';
import { createCamera } from './core/camera.js';
import { createRenderer } from './core/renderer.js';
import { createToolManager } from './tools/toolManager.js';
import { createEditor } from './ui/editor.js';
import { createPanel } from './ui/panel.js';
import { createLcd } from './ui/lcd.js';
import { createBoards } from './ui/boards.js';
import { createClipboard } from './io/clipboard.js';
import { bboxOf } from './elements/registry.js';
import { unionRects } from './core/geometry.js';

const stage = document.getElementById('stage');
const mainCanvas = document.getElementById('cv-main');
const overlayCanvas = document.getElementById('cv-overlay');

const store = createStore();
const camera = createCamera(store, stage);
const renderer = createRenderer({ store, stage, mainCanvas, overlayCanvas });
const editor = createEditor({ store, camera, stage, renderer });
const toolManager = createToolManager({ store, camera, renderer, stage, editor });
const persistence = createPersistence(store);
const clipboard = createClipboard({ store, camera, stage });

createPanel({ store, camera, renderer, persistence, toolManager, stage });
createLcd({ store });

persistence.init();
createBoards({ store, persistence });

// ---- 缩放按键 ----
function fitAll() {
  if (!store.elements.length) return;
  camera.fitRect(unionRects(store.elements.map(bboxOf)));
}
document.getElementById('zoom-in').addEventListener('click', () => camera.zoomStep(1.25));
document.getElementById('zoom-out').addEventListener('click', () => camera.zoomStep(1 / 1.25));
document.getElementById('zoom-reset').addEventListener('click', () => camera.setZoom(1));
document.getElementById('zoom-fit').addEventListener('click', fitAll);

// ---- 时钟 ----
const clock = document.getElementById('clock');
const tick = () => clock.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });
tick();
setInterval(tick, 1000);

// ---- 快捷键 ----
const TOOL_KEYS = {
  v: 'select', h: 'pan', p: 'pen', r: 'rect', o: 'ellipse',
  l: 'line', a: 'arrow', t: 'text', n: 'note', e: 'eraser',
};

window.addEventListener('keydown', e => {
  if (e.target.closest?.('textarea,input,select,[contenteditable]')) return;
  const mod = e.metaKey || e.ctrlKey;

  if (mod) {
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); }
    else if (k === 'y') { e.preventDefault(); store.redo(); }
    else if (k === 'c') { if (clipboard.copy()) e.preventDefault(); }
    else if (k === 'x') { e.preventDefault(); clipboard.cut(); }
    else if (k === 'd') { e.preventDefault(); clipboard.duplicate(); }
    else if (k === 'a') { e.preventDefault(); store.setSelection(store.elements.map(el => el.id)); }
    else if (k === '0') { e.preventDefault(); camera.setZoom(1); }
    else if (k === '1') { e.preventDefault(); fitAll(); }
    return;
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selection.size) { e.preventDefault(); store.removeElements([...store.selection]); }
    return;
  }
  if (e.key === 'Escape') { store.setSelection([]); return; }
  if (e.key === '+' || e.key === '=') { camera.zoomStep(1.25); return; }
  if (e.key === '-' || e.key === '_') { camera.zoomStep(1 / 1.25); return; }

  const tool = TOOL_KEYS[e.key.toLowerCase()];
  if (tool) toolManager.setTool(tool);
});
