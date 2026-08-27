// undo/redo 栈；条目 { undo: op, redo: op }，op 的应用由 store 负责
export function createHistory(limit = 100) {
  let undoStack = [];
  let redoStack = [];
  return {
    get canUndo() { return undoStack.length > 0; },
    get canRedo() { return redoStack.length > 0; },
    push(entry) {
      undoStack.push(entry);
      if (undoStack.length > limit) undoStack.shift();
      redoStack = [];
    },
    popUndo() {
      const e = undoStack.pop();
      if (e) redoStack.push(e);
      return e || null;
    },
    popRedo() {
      const e = redoStack.pop();
      if (e) undoStack.push(e);
      return e || null;
    },
    clear() { undoStack = []; redoStack = []; },
  };
}
