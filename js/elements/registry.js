import { penType } from './pen.js';
import { rectType, ellipseType, lineType, arrowType } from './shape.js';
import { textType } from './text.js';
import { noteType } from './note.js';
import { imageType } from './image.js';

export const types = {
  pen: penType,
  rect: rectType,
  ellipse: ellipseType,
  line: lineType,
  arrow: arrowType,
  text: textType,
  note: noteType,
  image: imageType,
};

export function drawElement(ctx, el, env) {
  const t = types[el.type];
  if (!t) return;
  ctx.save();
  ctx.globalAlpha = (el.opacity ?? 1) * (env.alpha ?? 1);
  t.draw(ctx, el, env);
  ctx.restore();
}

// 含描边/箭头外扩的绘制包围盒（用于剔除、命中快筛、导出）
export function bboxOf(el) {
  return types[el.type].bbox(el);
}

// 纯几何包围盒（用于选择框与缩放锚点）
export function geoBBox(el) {
  if (el.type === 'line' || el.type === 'arrow') {
    const x = Math.min(el.x, el.x2), y = Math.min(el.y, el.y2);
    return { x, y, w: Math.abs(el.x2 - el.x), h: Math.abs(el.y2 - el.y) };
  }
  return { x: el.x, y: el.y, w: el.w, h: el.h };
}

export function hitElement(el, px, py, tol) {
  return types[el.type].hit(el, px, py, tol);
}

export function reflowElement(el) {
  const t = types[el.type];
  if (t.reflow) t.reflow(el);
}
