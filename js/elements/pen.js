import { distToSegment } from '../core/geometry.js';

// 沿相邻点中点的二次贝塞尔平滑折线
export function tracePath(ctx, points, ox = 0, oy = 0) {
  ctx.beginPath();
  if (points.length === 1) {
    ctx.moveTo(ox + points[0][0], oy + points[0][1]);
    ctx.lineTo(ox + points[0][0] + 0.01, oy + points[0][1]);
    return;
  }
  ctx.moveTo(ox + points[0][0], oy + points[0][1]);
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i][0] + points[i + 1][0]) / 2;
    const my = (points[i][1] + points[i + 1][1]) / 2;
    ctx.quadraticCurveTo(ox + points[i][0], oy + points[i][1], ox + mx, oy + my);
  }
  const last = points[points.length - 1];
  ctx.lineTo(ox + last[0], oy + last[1]);
}

export const penType = {
  draw(ctx, el) {
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = el.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    tracePath(ctx, el.points, el.x, el.y);
    ctx.stroke();
  },
  hit(el, px, py, tol) {
    const lx = px - el.x, ly = py - el.y;
    const r = el.strokeWidth / 2 + tol;
    const pts = el.points;
    if (pts.length === 1) return Math.hypot(lx - pts[0][0], ly - pts[0][1]) <= r;
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(lx, ly, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= r) return true;
    }
    return false;
  },
  bbox(el) {
    const p = el.strokeWidth / 2;
    return { x: el.x - p, y: el.y - p, w: el.w + p * 2, h: el.h + p * 2 };
  },
};
