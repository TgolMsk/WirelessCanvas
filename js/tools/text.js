import { genId } from '../core/geometry.js';

export function createTextTool({ store, editor }) {
  return {
    id: 'text',
    onDown(e, pt) {
      const fontSize = 16;
      editor.beginNew({
        id: genId(), type: 'text', rotation: 0,
        x: pt.x, y: pt.y - fontSize * 0.7,
        w: 260, h: fontSize * 1.4, fontSize,
        text: '', align: 'left',
        stroke: store.ink, strokeWidth: 0, fill: null, opacity: 1,
      });
      store.setTool('select');
    },
  };
}
