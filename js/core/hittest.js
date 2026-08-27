import { bboxOf, hitElement } from '../elements/registry.js';
import { rectContains, rectsIntersect, expandRect } from './geometry.js';

// 自顶向下找命中的元素
export function hitTest(store, wx, wy, tol) {
  const els = store.elements;
  for (let i = els.length - 1; i >= 0; i--) {
    const el = els[i];
    if (!rectContains(expandRect(bboxOf(el), tol), wx, wy)) continue;
    if (hitElement(el, wx, wy, tol)) return el;
  }
  return null;
}

// 框选：包围盒相交即选中
export function rectSelect(store, rect) {
  return store.elements.filter(el => rectsIntersect(bboxOf(el), rect)).map(el => el.id);
}
