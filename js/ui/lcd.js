const SEGMENTS = 20;

export function createLcd({ store }) {
  const $ = id => document.getElementById(id);
  const zoomEl = $('lcd-zoom'), posEl = $('lcd-pos'), toolEl = $('lcd-tool'), selEl = $('lcd-sel');
  const segWrap = $('lcd-seg');

  const segs = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const s = document.createElement('i');
    segWrap.appendChild(s);
    segs.push(s);
  }

  let pendingPos = null, posScheduled = false;

  function fmt(v) {
    const n = Math.round(v);
    return (n >= 0 ? '+' : '−') + Math.abs(n);
  }

  store.subscribe((type, payload) => {
    if (type === 'camera') {
      zoomEl.textContent = Math.round(store.camera.zoom * 100);
    } else if (type === 'pointer') {
      pendingPos = payload;
      if (!posScheduled) {
        posScheduled = true;
        requestAnimationFrame(() => {
          posScheduled = false;
          if (pendingPos) posEl.textContent = `X ${fmt(pendingPos.x)} · Y ${fmt(pendingPos.y)}`;
        });
      }
    } else if (type === 'tool') {
      toolEl.textContent = store.tool.toUpperCase();
    } else if (type === 'selection') {
      selEl.textContent = 'SEL ' + store.selection.size;
    } else if (type === 'usage') {
      // 分段条 = 存储占用；超过 80% 的已填段转红
      const filled = Math.min(SEGMENTS, Math.round(payload.ratio * SEGMENTS));
      segs.forEach((s, i) => {
        s.className = i < filled ? (payload.ratio > 0.8 ? 'h' : 'f') : '';
      });
    }
  });

  zoomEl.textContent = Math.round(store.camera.zoom * 100);
}
