import { layoutText, drawLines } from './textlayout.js';
import { rectContains } from '../core/geometry.js';

export const textType = {
  draw(ctx, el) {
    const layout = layoutText(el.text, el.fontSize, el.w);
    drawLines(ctx, layout, el.x, el.y, el.fontSize, el.stroke, el.align, el.w);
  },
  hit(el, px, py, tol) {
    return rectContains({ x: el.x - tol, y: el.y - tol, w: el.w + tol * 2, h: el.h + tol * 2 }, px, py);
  },
  bbox(el) {
    return { x: el.x, y: el.y, w: el.w, h: el.h };
  },
  // 文本/宽度/字号变化后重算高度
  reflow(el) {
    el.h = Math.max(el.fontSize * 1.4, layoutText(el.text, el.fontSize, el.w).height);
  },
};
