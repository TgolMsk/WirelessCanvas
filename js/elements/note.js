import { layoutText, drawLines } from './textlayout.js';
import { rectContains } from '../core/geometry.js';

export const NOTE_PAD = 12;
export const NOTE_RADIUS = 6;

export const noteType = {
  draw(ctx, el) {
    ctx.beginPath();
    ctx.roundRect(el.x, el.y, el.w, el.h, NOTE_RADIUS);
    ctx.fillStyle = el.noteColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (el.text) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(el.x, el.y, el.w, el.h, NOTE_RADIUS);
      ctx.clip();
      const layout = layoutText(el.text, el.fontSize, el.w - NOTE_PAD * 2);
      drawLines(ctx, layout, el.x + NOTE_PAD, el.y + NOTE_PAD, el.fontSize, '#2A2A2A', 'left', el.w - NOTE_PAD * 2);
      ctx.restore();
    }
  },
  hit(el, px, py, tol) {
    return rectContains({ x: el.x - tol, y: el.y - tol, w: el.w + tol * 2, h: el.h + tol * 2 }, px, py);
  },
  bbox(el) {
    return { x: el.x, y: el.y, w: el.w, h: el.h };
  },
  // 文字变多时便签向下生长，不自动收缩
  reflow(el) {
    const need = layoutText(el.text, el.fontSize, el.w - NOTE_PAD * 2).height + NOTE_PAD * 2;
    el.h = Math.max(el.h, need, 60);
  },
};
