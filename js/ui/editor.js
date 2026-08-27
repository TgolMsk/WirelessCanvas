import { reflowElement } from '../elements/registry.js';
import { NOTE_PAD, NOTE_RADIUS } from '../elements/note.js';
import { FONT_STACK, LINE_HEIGHT } from '../elements/textlayout.js';

// canvas 上叠加 textarea 的文本编辑态；text 与 note 共用
export function createEditor({ store, camera, stage, renderer }) {
  let ta = null, el = null, mode = null, unsubCam = null;
  let snapText = null, snapH = null;

  function position() {
    if (!ta || !el) return;
    const z = store.camera.zoom;
    const s = camera.worldToScreen(el.x, el.y);
    ta.style.left = s.x + 'px';
    ta.style.top = s.y + 'px';
    ta.style.fontFamily = FONT_STACK;
    ta.style.lineHeight = String(LINE_HEIGHT);
    ta.style.fontSize = el.fontSize * z + 'px';
    if (el.type === 'note') {
      ta.style.width = el.w * z + 'px';
      ta.style.minHeight = el.h * z + 'px';
      ta.style.padding = NOTE_PAD * z + 'px';
      ta.style.background = el.noteColor;
      ta.style.borderRadius = NOTE_RADIUS * z + 'px';
      ta.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,.14), 0 0 0 2px var(--yellow)';
      ta.style.color = '#2A2A2A';
    } else {
      ta.style.width = el.w * z + 4 + 'px';
      ta.style.padding = '0';
      ta.style.background = 'transparent';
      ta.style.boxShadow = 'none';
      ta.style.color = el.stroke;
    }
    autosize();
  }

  function autosize() {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  function begin(target, m) {
    end(true);
    el = target;
    mode = m;
    if (m === 'edit') {
      snapText = el.text;
      snapH = el.h;
      store.view.editingId = el.id;
      renderer.invalidate('both');
    }
    ta = document.createElement('textarea');
    ta.className = 'editor';
    ta.value = el.text || '';
    stage.appendChild(ta);
    position();
    ta.addEventListener('input', autosize);
    ta.addEventListener('blur', () => end(true));
    ta.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); end(false); }
    });
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    unsubCam = store.subscribe(t => { if (t === 'camera') position(); });
  }

  function end(commit) {
    if (!ta) return;
    const t = ta; ta = null;
    unsubCam?.(); unsubCam = null;
    const target = el; el = null;
    const m = mode; mode = null;
    const text = t.value;
    t.remove();                       // remove 触发的 blur 已被 ta=null 挡掉
    store.view.editingId = null;

    if (m === 'new') {
      if (commit && text.trim()) {
        target.text = text;
        reflowElement(target);
        store.addElements([target], { select: true });
      }
    } else if (commit && text !== snapText) {
      const before = { text: snapText, h: snapH };
      target.text = text;
      reflowElement(target);
      store.recordApplied([{ id: target.id, before, after: { text: target.text, h: target.h } }]);
    }
    renderer.invalidate('both');
  }

  return {
    beginNew: target => begin(target, 'new'),
    beginEdit: target => begin(target, 'edit'),
    commit: () => end(true),
    get active() { return !!ta; },
  };
}
