import { genId, rectFromPoints } from '../core/geometry.js';
import { drawElement } from '../elements/registry.js';

// 填充档位 → 实际 fill 值（tint 为 18% 透明度的墨色）
export function fillFor(mode, inkHex) {
  if (mode === 'tint') return inkHex + '2E';
  if (mode === 'solid') return inkHex;
  return null;
}

export function createShapeTool({ store, renderer }, kind) {
  const isLinear = kind === 'line' || kind === 'arrow';
  let start = null, cur = null, shift = false;

  function buildElement() {
    const base = {
      id: genId(), type: kind, rotation: 0,
      stroke: store.ink, strokeWidth: store.strokeWidth, opacity: 1,
    };
    if (isLinear) {
      let { x, y } = cur;
      if (shift) {
        const ang = Math.atan2(cur.y - start.y, cur.x - start.x);
        const snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
        const len = Math.hypot(cur.x - start.x, cur.y - start.y);
        x = start.x + Math.cos(snap) * len;
        y = start.y + Math.sin(snap) * len;
      }
      return { ...base, x: start.x, y: start.y, x2: x, y2: y, w: 0, h: 0, fill: null };
    }
    let end = cur;
    if (shift) {
      const dx = cur.x - start.x, dy = cur.y - start.y;
      const s = Math.max(Math.abs(dx), Math.abs(dy));
      end = { x: start.x + Math.sign(dx || 1) * s, y: start.y + Math.sign(dy || 1) * s };
    }
    const r = rectFromPoints(start.x, start.y, end.x, end.y);
    return { ...base, ...r, fill: fillFor(store.fillMode, store.ink) };
  }

  return {
    id: kind,
    onDown(e, pt) { start = pt; cur = pt; shift = e.shiftKey; },
    onMove(e, pt) {
      if (!start) return;
      cur = pt;
      shift = e.shiftKey;
      renderer.invalidate('overlay');
    },
    onUp(e) {
      if (!start) return;
      const el = buildElement();
      const min = 2 / store.camera.zoom;
      const big = isLinear
        ? Math.hypot(el.x2 - el.x, el.y2 - el.y) >= min
        : (el.w >= min || el.h >= min);
      if (big) {
        store.addElements([el], { select: true });
        if (!e.altKey) store.setTool('select');
      }
      start = cur = null;
      renderer.invalidate('overlay');
    },
    drawOverlay(ctx) {
      if (!start || !cur) return;
      drawElement(ctx, buildElement(), { assets: {}, imageCache: new Map(), invalidate() {} });
    },
  };
}
