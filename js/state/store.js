import { createHistory } from './history.js';

// 所有场景变更的唯一收口。op 形态：
//   { op:'add',    entries:[{ index?, element }] }
//   { op:'remove', ids:[...] }
//   { op:'update', items:[{ id, patch }] }
export function createStore() {
  const listeners = new Set();

  const store = {
    // 画板索引
    boards: [],
    activeBoardId: null,
    // 当前画板
    elements: [],
    assets: {},
    camera: { x: 0, y: 0, zoom: 1 },
    // 会话状态
    selection: new Set(),
    view: { editingId: null, fadeIds: new Set() },
    tool: 'select',
    ink: '#2A2A2A',
    strokeWidth: 2,
    fillMode: 'none',
    history: createHistory(),

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(type, payload) { for (const fn of [...listeners]) fn(type, payload); },

    byId(id) { return this.elements.find(e => e.id === id); },
    selectedElements() { return this.elements.filter(e => this.selection.has(e.id)); },

    // 应用 op 并返回逆 op
    applyOp(op) {
      if (op.op === 'add') {
        for (const en of op.entries) {
          if (en.index != null && en.index <= this.elements.length) this.elements.splice(en.index, 0, en.element);
          else this.elements.push(en.element);
        }
        return { op: 'remove', ids: op.entries.map(en => en.element.id) };
      }
      if (op.op === 'remove') {
        const idSet = new Set(op.ids);
        const removed = [];
        for (let i = this.elements.length - 1; i >= 0; i--) {
          if (idSet.has(this.elements[i].id)) removed.unshift({ index: i, element: this.elements[i] });
        }
        for (let i = removed.length - 1; i >= 0; i--) this.elements.splice(removed[i].index, 1);
        return { op: 'add', entries: removed };
      }
      if (op.op === 'update') {
        const inverse = [];
        for (const it of op.items) {
          const el = this.byId(it.id);
          if (!el) continue;
          const before = {};
          for (const k of Object.keys(it.patch)) before[k] = structuredClone(el[k]);
          Object.assign(el, structuredClone(it.patch));
          inverse.push({ id: it.id, patch: before });
        }
        return { op: 'update', items: inverse };
      }
      throw new Error('unknown op ' + op.op);
    },

    commit(op) {
      const inv = this.applyOp(op);
      this.history.push({ redo: op, undo: inv });
      this.emit('elements');
      this.emit('history');
    },

    addElements(els, { select = false } = {}) {
      if (!els.length) return;
      this.commit({ op: 'add', entries: els.map(element => ({ element })) });
      if (select) this.setSelection(els.map(e => e.id));
    },

    removeElements(ids) {
      ids = [...ids];
      if (!ids.length) return;
      this.commit({ op: 'remove', ids });
      this.pruneSelection();
    },

    updateElements(items) {
      if (!items.length) return;
      this.commit({ op: 'update', items });
    },

    // 拖拽等手势中元素已被直接修改；此处只补记历史
    recordApplied(items) {
      items = items.filter(it => Object.keys(it.after).length);
      if (!items.length) return;
      this.history.push({
        redo: { op: 'update', items: items.map(it => ({ id: it.id, patch: it.after })) },
        undo: { op: 'update', items: items.map(it => ({ id: it.id, patch: it.before })) },
      });
      this.emit('elements');
      this.emit('history');
    },

    undo() {
      const e = this.history.popUndo();
      if (!e) return;
      this.applyOp(e.undo);
      this.pruneSelection();
      this.emit('elements');
      this.emit('history');
    },

    redo() {
      const e = this.history.popRedo();
      if (!e) return;
      this.applyOp(e.redo);
      this.pruneSelection();
      this.emit('elements');
      this.emit('history');
    },

    pruneSelection() {
      const ids = new Set(this.elements.map(e => e.id));
      let changed = false;
      for (const id of this.selection) if (!ids.has(id)) { this.selection.delete(id); changed = true; }
      if (changed) this.emit('selection');
    },

    setSelection(ids) {
      this.selection = new Set(ids);
      this.emit('selection');
    },

    setTool(t) {
      if (this.tool === t) return;
      this.tool = t;
      this.emit('tool');
    },

    setCamera(patch) {
      Object.assign(this.camera, patch);
      this.emit('camera');
    },
  };
  return store;
}
