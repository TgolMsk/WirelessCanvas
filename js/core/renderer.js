import { drawElement, bboxOf } from '../elements/registry.js';
import { rectsIntersect } from './geometry.js';

const GRID_SPACING = 32;          // 世界单位
const GRID_MIN_SCREEN = 13;       // 点距小于此屏幕像素时隐藏网格

export function createRenderer({ store, stage, mainCanvas, overlayCanvas }) {
  const mctx = mainCanvas.getContext('2d');
  const octx = overlayCanvas.getContext('2d');

  const css = getComputedStyle(document.documentElement);
  const slab = (css.getPropertyValue('--slab') || '#F4F4F0').trim();

  const env = {
    assets: null,           // 每帧指向 store.assets
    imageCache: new Map(),
    alpha: 1,
    invalidate: which => invalidate(which),
  };

  let dirtyMain = true, dirtyOverlay = true, scheduled = false;
  let overlayPainter = null;
  let dpr = window.devicePixelRatio || 1;

  function invalidate(which = 'both') {
    if (which === 'main' || which === 'both') dirtyMain = true;
    if (which === 'overlay' || which === 'both') dirtyOverlay = true;
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(frame);
    }
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(stage.clientWidth * dpr));
    const h = Math.max(1, Math.round(stage.clientHeight * dpr));
    for (const c of [mainCanvas, overlayCanvas]) {
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    }
    invalidate('both');
  }

  function worldTransform(ctx) {
    const c = store.camera;
    ctx.setTransform(dpr * c.zoom, 0, 0, dpr * c.zoom, -c.x * dpr * c.zoom, -c.y * dpr * c.zoom);
  }

  function viewRect() {
    const c = store.camera;
    return { x: c.x, y: c.y, w: stage.clientWidth / c.zoom, h: stage.clientHeight / c.zoom };
  }

  function drawGrid() {
    const c = store.camera;
    const step = GRID_SPACING * c.zoom;
    if (step < GRID_MIN_SCREEN) return;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.fillStyle = 'rgba(42,42,42,.10)';
    const w = stage.clientWidth, h = stage.clientHeight;
    const x0 = Math.ceil(c.x / GRID_SPACING) * GRID_SPACING;
    const y0 = Math.ceil(c.y / GRID_SPACING) * GRID_SPACING;
    for (let wx = x0; (wx - c.x) * c.zoom < w; wx += GRID_SPACING) {
      const sx = (wx - c.x) * c.zoom;
      for (let wy = y0; (wy - c.y) * c.zoom < h; wy += GRID_SPACING) {
        const sy = (wy - c.y) * c.zoom;
        mctx.beginPath();
        mctx.arc(sx, sy, 1.25, 0, Math.PI * 2);
        mctx.fill();
      }
    }
  }

  function drawMain() {
    env.assets = store.assets;
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.fillStyle = slab;
    mctx.fillRect(0, 0, stage.clientWidth, stage.clientHeight);
    drawGrid();
    worldTransform(mctx);
    const vr = viewRect();
    const { editingId, fadeIds } = store.view;
    for (const el of store.elements) {
      if (el.id === editingId) continue;
      if (!rectsIntersect(bboxOf(el), vr)) continue;
      env.alpha = fadeIds.has(el.id) ? 0.25 : 1;
      drawElement(mctx, el, env);
    }
    env.alpha = 1;
  }

  function drawOverlay() {
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (!overlayPainter) return;
    worldTransform(octx);
    overlayPainter(octx, { zoom: store.camera.zoom, viewRect: viewRect() });
  }

  function frame() {
    scheduled = false;
    if (dirtyMain) { drawMain(); dirtyMain = false; }
    if (dirtyOverlay) { drawOverlay(); dirtyOverlay = false; }
  }

  new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);
  resize();

  store.subscribe(type => {
    if (type === 'elements') invalidate('both');
    else if (type === 'camera') invalidate('both');
    else if (type === 'selection') invalidate('overlay');
  });

  document.fonts?.ready.then(() => invalidate('main'));

  return {
    env,
    invalidate,
    setOverlayPainter(fn) { overlayPainter = fn; invalidate('overlay'); },
  };
}
