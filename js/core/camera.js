import { clamp } from './geometry.js';

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;

// camera = { x, y, zoom }：x,y 是屏幕左上角对应的世界坐标，单位 CSS px
export function createCamera(store, stage) {
  const cam = {
    get raw() { return store.camera; },

    screenToWorld(sx, sy) {
      const c = store.camera;
      return { x: c.x + sx / c.zoom, y: c.y + sy / c.zoom };
    },
    worldToScreen(wx, wy) {
      const c = store.camera;
      return { x: (wx - c.x) * c.zoom, y: (wy - c.y) * c.zoom };
    },
    // 事件坐标 → 画布内屏幕坐标
    eventPoint(e) {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    },
    eventWorld(e) {
      const p = cam.eventPoint(e);
      return cam.screenToWorld(p.x, p.y);
    },
    // 可见世界矩形
    viewRect() {
      const c = store.camera;
      return { x: c.x, y: c.y, w: stage.clientWidth / c.zoom, h: stage.clientHeight / c.zoom };
    },
    panBy(dxScreen, dyScreen) {
      const c = store.camera;
      store.setCamera({ x: c.x + dxScreen / c.zoom, y: c.y + dyScreen / c.zoom });
    },
    // 以画布内屏幕点 (sx,sy) 为锚缩放
    zoomAt(sx, sy, nextZoom) {
      const c = store.camera;
      const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      if (z === c.zoom) return;
      const wx = c.x + sx / c.zoom, wy = c.y + sy / c.zoom;
      store.setCamera({ zoom: z, x: wx - sx / z, y: wy - sy / z });
    },
    zoomStep(factor, anchor) {
      const a = anchor || { x: stage.clientWidth / 2, y: stage.clientHeight / 2 };
      cam.zoomAt(a.x, a.y, store.camera.zoom * factor);
    },
    setZoom(z) {
      cam.zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, z);
    },
    // 让世界矩形完整可见
    fitRect(rect, pad = 60) {
      const vw = stage.clientWidth, vh = stage.clientHeight;
      if (!rect || rect.w <= 0 || rect.h <= 0 || vw === 0) return;
      const z = clamp(Math.min(vw / (rect.w + pad * 2), vh / (rect.h + pad * 2)), MIN_ZOOM, MAX_ZOOM);
      store.setCamera({
        zoom: z,
        x: rect.x + rect.w / 2 - vw / z / 2,
        y: rect.y + rect.h / 2 - vh / z / 2,
      });
    },
  };
  return cam;
}
