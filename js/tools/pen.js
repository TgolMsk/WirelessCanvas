import { genId, simplifyPolyline, polylineBBox } from '../core/geometry.js';
import { tracePath } from '../elements/pen.js';

export function createPenTool({ store, renderer }) {
  let pts = null;
  return {
    id: 'pen',
    onDown(e, pt) { pts = [[pt.x, pt.y]]; },
    onMove(e, pt) {
      if (!pts) return;
      const last = pts[pts.length - 1];
      const minD = 2 / store.camera.zoom;
      if (Math.hypot(pt.x - last[0], pt.y - last[1]) >= minD) {
        pts.push([pt.x, pt.y]);
        renderer.invalidate('overlay');
      }
    },
    onUp() {
      if (!pts) return;
      const simplified = simplifyPolyline(pts, 0.6 / store.camera.zoom);
      const bbox = polylineBBox(simplified);
      store.addElements([{
        id: genId(), type: 'pen',
        x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h, rotation: 0,
        stroke: store.ink, strokeWidth: store.strokeWidth, fill: null, opacity: 1,
        points: simplified.map(([x, y]) => [x - bbox.x, y - bbox.y]),
      }]);
      pts = null;
      renderer.invalidate('both');
    },
    drawOverlay(ctx) {
      if (!pts) return;
      ctx.strokeStyle = store.ink;
      ctx.lineWidth = store.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      tracePath(ctx, pts);
      ctx.stroke();
    },
  };
}
