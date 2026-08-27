import { genId } from '../core/geometry.js';

const MAX_SIDE = 2048;        // 入库最长边
const DISPLAY_MAX = 480;      // 初始摆放最长边（世界单位）

function hashStr(s) {
  let h = 5381;
  const step = Math.max(1, Math.floor(s.length / 20000));
  for (let i = 0; i < s.length; i += step) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36) + '-' + s.length.toString(36);
}

async function loadBitmap(blob) {
  if ('createImageBitmap' in window) return createImageBitmap(blob);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function hasAlpha(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 64) if (data[i] < 255) return true;
  return false;
}

// 压缩 → dataURL（无透明通道转 JPEG）
export async function blobToAsset(blob) {
  const bmp = await loadBitmap(blob);
  const nw = bmp.width, nh = bmp.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0, w, h);
  const keepPng = blob.type !== 'image/jpeg' && hasAlpha(ctx, w, h);
  const dataURL = keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);
  return { dataURL, w, h };
}

export async function insertImageBlob(store, blob, centerWorld) {
  const { dataURL, w, h } = await blobToAsset(blob);
  const assetId = 'a' + hashStr(dataURL);
  if (!store.assets[assetId]) store.assets[assetId] = dataURL;
  const scale = Math.min(1, DISPLAY_MAX / Math.max(w, h));
  const ew = w * scale, eh = h * scale;
  store.addElements([{
    id: genId(), type: 'image', rotation: 0,
    x: centerWorld.x - ew / 2, y: centerWorld.y - eh / 2, w: ew, h: eh,
    assetId, naturalW: w, naturalH: h,
    stroke: null, strokeWidth: 0, fill: null, opacity: 1,
  }], { select: true });
}
