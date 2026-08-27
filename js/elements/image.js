import { rectContains } from '../core/geometry.js';

// env: { assets, imageCache: Map<assetId, HTMLImageElement>, invalidate() }
export const imageType = {
  draw(ctx, el, env) {
    let img = env.imageCache.get(el.assetId);
    if (!img) {
      const src = env.assets[el.assetId];
      img = new Image();
      env.imageCache.set(el.assetId, img);
      if (src) {
        img.onload = () => env.invalidate('main');
        img.src = src;
      }
    }
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, el.x, el.y, el.w, el.h);
    } else {
      // 加载占位：凹槽色块 + 对角线
      ctx.fillStyle = 'rgba(0,0,0,.06)';
      ctx.fillRect(el.x, el.y, el.w, el.h);
      ctx.strokeStyle = 'rgba(0,0,0,.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      ctx.beginPath();
      ctx.moveTo(el.x, el.y); ctx.lineTo(el.x + el.w, el.y + el.h);
      ctx.moveTo(el.x + el.w, el.y); ctx.lineTo(el.x, el.y + el.h);
      ctx.stroke();
    }
  },
  hit(el, px, py, tol) {
    return rectContains({ x: el.x - tol, y: el.y - tol, w: el.w + tol * 2, h: el.h + tol * 2 }, px, py);
  },
  bbox(el) {
    return { x: el.x, y: el.y, w: el.w, h: el.h };
  },
};
