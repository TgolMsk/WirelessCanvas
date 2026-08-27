import { distToSegment, rectContains } from '../core/geometry.js';

function strokeFillRect(ctx, el, path) {
  path();
  if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(); }
  if (el.strokeWidth > 0) {
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = el.strokeWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export const rectType = {
  draw(ctx, el) {
    strokeFillRect(ctx, el, () => { ctx.beginPath(); ctx.rect(el.x, el.y, el.w, el.h); });
  },
  hit(el, px, py, tol) {
    const r = el.strokeWidth / 2 + tol;
    const outer = rectContains({ x: el.x - r, y: el.y - r, w: el.w + r * 2, h: el.h + r * 2 }, px, py);
    if (!outer) return false;
    if (el.fill) return true;
    const inner = rectContains({ x: el.x + r, y: el.y + r, w: el.w - r * 2, h: el.h - r * 2 }, px, py);
    return !inner;
  },
  bbox(el) {
    const p = el.strokeWidth / 2;
    return { x: el.x - p, y: el.y - p, w: el.w + p * 2, h: el.h + p * 2 };
  },
};

export const ellipseType = {
  draw(ctx, el) {
    strokeFillRect(ctx, el, () => {
      ctx.beginPath();
      ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
    });
  },
  hit(el, px, py, tol) {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    const r = el.strokeWidth / 2 + tol;
    const a = el.w / 2, b = el.h / 2;
    const dOut = norm(px - cx, py - cy, a + r, b + r);
    if (dOut > 1) return false;
    if (el.fill) return true;
    if (a - r <= 0 || b - r <= 0) return true;
    return norm(px - cx, py - cy, a - r, b - r) >= 1;
  },
  bbox: rectType.bbox,
};

function norm(dx, dy, a, b) {
  return (dx * dx) / (a * a) + (dy * dy) / (b * b);
}

function drawArrowHead(ctx, x1, y1, x2, y2, size) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(ang - 0.44), y2 - size * Math.sin(ang - 0.44));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(ang + 0.44), y2 - size * Math.sin(ang + 0.44));
  ctx.stroke();
}

function lineDraw(withHead) {
  return (ctx, el) => {
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = el.strokeWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(el.x, el.y);
    ctx.lineTo(el.x2, el.y2);
    ctx.stroke();
    if (withHead) drawArrowHead(ctx, el.x, el.y, el.x2, el.y2, Math.max(9, el.strokeWidth * 3.2));
  };
}

function lineHit(el, px, py, tol) {
  return distToSegment(px, py, el.x, el.y, el.x2, el.y2) <= el.strokeWidth / 2 + tol;
}

function lineBBox(el) {
  const p = el.strokeWidth / 2 + (el.type === 'arrow' ? Math.max(9, el.strokeWidth * 3.2) : 0);
  const x = Math.min(el.x, el.x2), y = Math.min(el.y, el.y2);
  return { x: x - p, y: y - p, w: Math.abs(el.x2 - el.x) + p * 2, h: Math.abs(el.y2 - el.y) + p * 2 };
}

export const lineType = { draw: lineDraw(false), hit: lineHit, bbox: lineBBox };
export const arrowType = { draw: lineDraw(true), hit: lineHit, bbox: lineBBox };
