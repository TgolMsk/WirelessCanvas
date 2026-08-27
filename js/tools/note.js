import { genId } from '../core/geometry.js';

// 便签底色由当前墨色派生，只有这几档（token 的浅调）
const NOTE_COLORS = {
  '#2A2A2A': '#FBFBF6',
  '#7A7A74': '#ECECE6',
  '#F2B705': '#F8E9B0',
  '#2E8B57': '#DDE9E1',
  '#D0342C': '#F3DEDB',
  '#F4F4F0': '#FFFFFC',
};

export function noteColorFor(ink) {
  return NOTE_COLORS[ink] || '#FBFBF6';
}

export function createNoteTool({ store, editor }) {
  return {
    id: 'note',
    onDown(e, pt) {
      editor.beginNew({
        id: genId(), type: 'note', rotation: 0,
        x: pt.x - 90, y: pt.y - 60, w: 180, h: 120,
        fontSize: 14, text: '',
        noteColor: noteColorFor(store.ink),
        stroke: '#2A2A2A', strokeWidth: 0, fill: null, opacity: 1,
      });
      store.setTool('select');
    },
  };
}
