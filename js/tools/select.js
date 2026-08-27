import { hitTest, rectSelect } from '../core/hittest.js';
import { geoBBox, reflowElement } from '../elements/registry.js';
import { unionRects, rectFromPoints, genId } from '../core/geometry.js';

const GEOM_KEYS = ['x', 'y', 'w', 'h', 'x2', 'y2', 'points', 'fontSize'];
const HANDLE_IDS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN_SIZE = 2;

export function createSelectTool(app) {
  const { store, renderer, editor } = app;
  let state = null; // { mode, start, cur, snaps, handle, bounds0, moved }

  function selBounds() {
    const rects = store.selectedElements().map(geoBBox);
    return unionRects(rects);
  }

  function handlePoints(b) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    return {
      nw: [b.x, b.y], n: [cx, b.y], ne: [b.x + b.w, b.y], e: [b.x + b.w, cy],
      se: [b.x + b.w, b.y + b.h], s: [cx, b.y + b.h], sw: [b.x, b.y + b.h], w: [b.x, cy],
    };
  }

  function hitHandle(pt, bounds, zoom) {
    if (!bounds) return null;
    const r = 7 / zoom;
    const hp = handlePoints(bounds);
    for (const id of HANDLE_IDS) {
      const [hx, hy] = hp[id];
      if (Math.abs(pt.x - hx) <= r && Math.abs(pt.y - hy) <= r) return id;
    }
    return null;
  }

  function snapshotSelection() {
    const m = new Map();
    for (const el of store.selectedElements()) m.set(el.id, structuredClone(el));
    return m;
  }

  function commitGesture() {
    const items = [];
    for (const [id, snap] of state.snaps) {
      const el = store.byId(id);
      if (!el) continue;
      const before = {}, after = {};
      for (const k of GEOM_KEYS) {
        if (snap[k] === undefined && el[k] === undefined) continue;
        if (JSON.stringify(snap[k]) !== JSON.stringify(el[k])) {
          before[k] = structuredClone(snap[k]);
          after[k] = structuredClone(el[k]);
        }
      }
      if (Object.keys(after).length) items.push({ id, before, after });
    }
    if (items.length) store.recordApplied(items);
  }

  function applyMove(dx, dy) {
    for (const [id, snap] of state.snaps) {
      const el = store.byId(id);
      if (!el) continue;
      el.x = snap.x + dx;
      el.y = snap.y + dy;
      if (snap.x2 !== undefined) { el.x2 = snap.x2 + dx; el.y2 = snap.y2 + dy; }
    }
    renderer.invalidate('both');
  }

  function applyResize(pt, uniform) {
    const b0 = state.bounds0;
    const h = state.handle;
    let x1 = b0.x, y1 = b0.y, x2 = b0.x + b0.w, y2 = b0.y + b0.h;
    if (h.includes('w')) x1 = Math.min(pt.x, x2 - MIN_SIZE);
    if (h.includes('e')) x2 = Math.max(pt.x, x1 + MIN_SIZE);
    if (h.includes('n')) y1 = Math.min(pt.y, y2 - MIN_SIZE);
    if (h.includes('s')) y2 = Math.max(pt.y, y1 + MIN_SIZE);

    let sx = b0.w > 0 ? (x2 - x1) / b0.w : 1;
    let sy = b0.h > 0 ? (y2 - y1) / b0.h : 1;
    const isCorner = h.length === 2;
    if (uniform && isCorner && b0.w > 0 && b0.h > 0) {
      const s = Math.abs(sx - 1) > Math.abs(sy - 1) ? sx : sy;
      sx = sy = s;
      if (h.includes('w')) x1 = x2 - b0.w * s; else x2 = x1 + b0.w * s;
      if (h.includes('n')) y1 = y2 - b0.h * s; else y2 = y1 + b0.h * s;
    }

    const mapX = v => x1 + (v - b0.x) * sx;
    const mapY = v => y1 + (v - b0.y) * sy;

    for (const [id, snap] of state.snaps) {
      const el = store.byId(id);
      if (!el) continue;
      el.x = mapX(snap.x);
      el.y = mapY(snap.y);
      if (snap.x2 !== undefined) {
        el.x2 = mapX(snap.x2);
        el.y2 = mapY(snap.y2);
        continue;
      }
      el.w = Math.max(0.5, snap.w * sx);
      el.h = Math.max(0.5, snap.h * sy);
      if (el.type === 'pen') {
        el.points = snap.points.map(([px, py]) => [px * sx, py * sy]);
      } else if (el.type === 'text') {
        if (isCorner || h === 'n' || h === 's') el.fontSize = Math.max(6, snap.fontSize * sy);
        reflowElement(el);
      } else if (el.type === 'note') {
        el.w = Math.max(60, el.w);
        el.h = Math.max(40, el.h);
      }
    }
    renderer.invalidate('both');
  }

  return {
    id: 'select',

    onDown(e, pt) {
      const zoom = store.camera.zoom;
      // 1) 选中框手柄
      if (store.selection.size) {
        const handle = hitHandle(pt, selBounds(), zoom);
        if (handle) {
          state = { mode: 'resize', handle, bounds0: selBounds(), snaps: snapshotSelection(), start: pt };
          return;
        }
      }
      // 2) 元素命中
      const hit = hitTest(store, pt.x, pt.y, 6 / zoom);
      if (hit) {
        if (e.shiftKey) {
          const next = new Set(store.selection);
          next.has(hit.id) ? next.delete(hit.id) : next.add(hit.id);
          store.setSelection([...next]);
          state = null;
          return;
        }
        if (!store.selection.has(hit.id)) store.setSelection([hit.id]);
        state = { mode: 'move', start: pt, snaps: snapshotSelection(), moved: false };
        return;
      }
      // 3) 空白 → 框选
      if (!e.shiftKey) store.setSelection([]);
      state = { mode: 'marquee', start: pt, cur: pt, keep: e.shiftKey ? new Set(store.selection) : new Set() };
      renderer.invalidate('overlay');
    },

    onMove(e, pt) {
      if (!state) return;
      if (state.mode === 'move') {
        state.moved = true;
        applyMove(pt.x - state.start.x, pt.y - state.start.y);
      } else if (state.mode === 'resize') {
        applyResize(pt, e.shiftKey || onlyImages());
      } else if (state.mode === 'marquee') {
        state.cur = pt;
        renderer.invalidate('overlay');
      }
    },

    onUp() {
      if (!state) return;
      if (state.mode === 'move' || state.mode === 'resize') {
        if (state.mode !== 'move' || state.moved) commitGesture();
      } else if (state.mode === 'marquee') {
        const r = rectFromPoints(state.start.x, state.start.y, state.cur.x, state.cur.y);
        const ids = new Set([...state.keep, ...rectSelect(store, r)]);
        store.setSelection([...ids]);
      }
      state = null;
      renderer.invalidate('overlay');
    },

    onDblClick(e, pt) {
      const hit = hitTest(store, pt.x, pt.y, 6 / store.camera.zoom);
      if (hit && (hit.type === 'text' || hit.type === 'note')) {
        store.setSelection([hit.id]);
        editor.beginEdit(hit);
      } else if (!hit) {
        // 空白双击 = 快速建文本
        const fontSize = 16;
        editor.beginNew({
          id: genId(), type: 'text', rotation: 0,
          x: pt.x, y: pt.y - fontSize * 0.7, w: 260, h: fontSize * 1.4,
          fontSize, text: '', align: 'left',
          stroke: store.ink, strokeWidth: 0, fill: null, opacity: 1,
        });
      }
    },

    drawOverlay(ctx, { zoom }) {
      if (state?.mode === 'marquee') {
        const r = rectFromPoints(state.start.x, state.start.y, state.cur.x, state.cur.y);
        ctx.fillStyle = 'rgba(242,183,5,.08)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#F2B705';
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      }
      if (!store.selection.size || store.view.editingId) return;
      const b = selBounds();
      if (!b) return;
      ctx.strokeStyle = '#F2B705';
      ctx.lineWidth = 1.5 / zoom;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      const s = 8 / zoom;
      const hp = handlePoints(b);
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = 1 / zoom;
      ctx.strokeStyle = '#2A2A2A';
      for (const id of HANDLE_IDS) {
        const [hx, hy] = hp[id];
        ctx.beginPath();
        ctx.rect(hx - s / 2, hy - s / 2, s, s);
        ctx.fill();
        ctx.stroke();
      }
    },
  };

  function onlyImages() {
    const sel = store.selectedElements();
    return sel.length > 0 && sel.every(el => el.type === 'image');
  }
}
