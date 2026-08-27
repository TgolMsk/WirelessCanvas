import { createSelectTool } from './select.js';
import { createPanTool } from './pan.js';
import { createPenTool } from './pen.js';
import { createShapeTool } from './shape.js';
import { createTextTool } from './text.js';
import { createNoteTool } from './note.js';
import { createEraserTool } from './eraser.js';

const CURSOR_CLASS = {
  select: 'cur-select', pan: 'cur-pan', pen: 'cur-draw', rect: 'cur-draw',
  ellipse: 'cur-draw', line: 'cur-draw', arrow: 'cur-draw',
  text: 'cur-text', note: 'cur-draw', eraser: 'cur-draw',
};

export function createToolManager(app) {
  const { store, camera, renderer, stage } = app;

  const tools = {
    select: createSelectTool(app),
    pan: createPanTool(app),
    pen: createPenTool(app),
    rect: createShapeTool(app, 'rect'),
    ellipse: createShapeTool(app, 'ellipse'),
    line: createShapeTool(app, 'line'),
    arrow: createShapeTool(app, 'arrow'),
    text: createTextTool(app),
    note: createNoteTool(app),
    eraser: createEraserTool(app),
  };

  let spaceHeld = false;
  let tempPan = false;
  let activePointer = null;

  function activeTool() { return tempPan ? tools.pan : tools[store.tool]; }

  function updateCursor() {
    stage.classList.remove(...Object.values(CURSOR_CLASS), 'cur-pan');
    stage.classList.add(spaceHeld || tempPan ? 'cur-pan' : (CURSOR_CLASS[store.tool] || 'cur-select'));
  }

  stage.addEventListener('pointerdown', e => {
    if (!(e.target instanceof HTMLCanvasElement)) return;
    if (activePointer !== null) return;
    // 点击画布不会让 textarea 自然失焦，这里主动提交编辑态
    if (app.editor.active) app.editor.commit();
    if (e.button === 1 || (e.button === 0 && spaceHeld)) tempPan = true;
    else if (e.button !== 0) return;
    activePointer = e.pointerId;
    stage.setPointerCapture(e.pointerId);
    updateCursor();
    activeTool().onDown?.(e, camera.eventWorld(e));
    e.preventDefault();
  });

  stage.addEventListener('pointermove', e => {
    const pt = camera.eventWorld(e);
    store.emit('pointer', pt);
    if (e.pointerId !== activePointer) return;
    activeTool().onMove?.(e, pt);
  });

  function finish(e) {
    if (e.pointerId !== activePointer) return;
    activeTool().onUp?.(e, camera.eventWorld(e));
    activePointer = null;
    tempPan = false;
    updateCursor();
  }
  stage.addEventListener('pointerup', finish);
  stage.addEventListener('pointercancel', finish);

  stage.addEventListener('dblclick', e => {
    if (!(e.target instanceof HTMLCanvasElement)) return;
    if (store.tool === 'select') tools.select.onDblClick?.(e, camera.eventWorld(e));
  });

  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const p = camera.eventPoint(e);
    if (e.ctrlKey || e.metaKey) {
      camera.zoomAt(p.x, p.y, store.camera.zoom * Math.exp(-e.deltaY * 0.01));
    } else {
      camera.panBy(e.deltaX, e.deltaY);
    }
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.repeat) return;
    if (e.target.closest?.('textarea,input,select,[contenteditable]')) return;
    spaceHeld = true;
    if (activePointer === null) updateCursor();
    e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    if (e.code !== 'Space') return;
    spaceHeld = false;
    if (activePointer === null) updateCursor();
  });
  window.addEventListener('blur', () => { spaceHeld = false; updateCursor(); });

  renderer.setOverlayPainter((ctx, helpers) => {
    tools[store.tool]?.drawOverlay?.(ctx, helpers);
  });

  store.subscribe(type => {
    if (type === 'tool') {
      updateCursor();
      renderer.invalidate('overlay');
    }
  });

  updateCursor();

  return {
    setTool(t) {
      if (app.editor.active) app.editor.commit();
      store.setTool(t);
    },
  };
}
