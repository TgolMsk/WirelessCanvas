import { hitTest } from '../core/hittest.js';

export function createEraserTool({ store, renderer }) {
  let last = null;

  function tryHit(x, y) {
    const el = hitTest(store, x, y, 5 / store.camera.zoom);
    if (el && !store.view.fadeIds.has(el.id)) {
      store.view.fadeIds.add(el.id);
      renderer.invalidate('main');
    }
  }

  return {
    id: 'eraser',
    onDown(e, pt) {
      last = pt;
      tryHit(pt.x, pt.y);
    },
    onMove(e, pt) {
      if (!last) return;
      const step = 4 / store.camera.zoom;
      const d = Math.hypot(pt.x - last.x, pt.y - last.y);
      const n = Math.max(1, Math.ceil(d / step));
      for (let i = 1; i <= n; i++) {
        tryHit(last.x + (pt.x - last.x) * i / n, last.y + (pt.y - last.y) * i / n);
      }
      last = pt;
    },
    onUp() {
      if (!last) return;
      last = null;
      const ids = [...store.view.fadeIds];
      store.view.fadeIds.clear();
      store.removeElements(ids);       // 一次手势 = 一条历史
      renderer.invalidate('main');
    },
  };
}
