import { bboxOf, drawElement } from '../elements/registry.js';
import { unionRects, expandRect } from '../core/geometry.js';

const PAD = 40;         // 世界单位留白
const MAX_SIDE = 8192;

function ensureImage(env, assets, assetId) {
  let img = env.imageCache.get(assetId);
  if (img && img.complete) return Promise.resolve();
  return new Promise(resolve => {
    if (!img) {
      img = new Image();
      env.imageCache.set(assetId, img);
      img.src = assets[assetId] || '';
    }
    if (img.complete) return resolve();
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
  });
}

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// 选中优先，否则导出全部；返回 false 表示画布为空
export async function exportPng({ store, env, boardName }) {
  const els = store.selection.size
    ? store.elements.filter(e => store.selection.has(e.id))
    : store.elements;
  if (!els.length) return false;

  await document.fonts?.ready;
  await Promise.all(els.filter(e => e.type === 'image').map(e => ensureImage(env, store.assets, e.assetId)));

  const bbox = expandRect(unionRects(els.map(bboxOf)), PAD);
  const scale = Math.min(2, MAX_SIDE / Math.max(bbox.w, bbox.h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(bbox.w * scale));
  canvas.height = Math.max(1, Math.ceil(bbox.h * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F4F4F0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, -bbox.x * scale, -bbox.y * scale);

  const drawEnv = { assets: store.assets, imageCache: env.imageCache, invalidate() {} };
  for (const el of els) drawElement(ctx, el, drawEnv);

  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) return false;
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  download(blob, `${boardName || '画布'}-${stamp}.png`);
  return true;
}
