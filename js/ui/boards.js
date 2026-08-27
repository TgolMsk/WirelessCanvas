import { dialogPrompt, dialogConfirm } from './dialog.js';

export function createBoards({ store, persistence }) {
  const $ = id => document.getElementById(id);
  const list = $('board-list');
  const knob = $('knob');
  const nameEl = $('board-name');

  function render() {
    list.innerHTML = '';
    const n = store.boards.length;
    let activeIdx = 0;
    store.boards.forEach((b, i) => {
      if (b.id === store.activeBoardId) activeIdx = i;
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'board';
      input.value = b.id;
      input.checked = b.id === store.activeBoardId;
      input.addEventListener('change', () => persistence.switchBoard(b.id));
      const span = document.createElement('span');
      span.textContent = b.name;
      label.append(input, span);
      list.appendChild(label);
    });
    // 旋钮指针：把 n 档铺在 -110° ~ 110° 上
    const angle = n <= 1 ? 0 : -110 + activeIdx * (220 / (n - 1));
    knob.style.setProperty('--a', angle + 'deg');
    const active = store.boards[activeIdx];
    nameEl.textContent = active ? active.name.toUpperCase() : '—';
  }

  $('btn-new-board').addEventListener('click', async () => {
    const name = await dialogPrompt({
      title: '新建画板',
      placeholder: '留空自动命名',
      confirmText: '新建画板',
    });
    if (name === null) return;
    persistence.createBoard(name.trim() || undefined);
  });

  $('btn-rename-board').addEventListener('click', async () => {
    const b = store.boards.find(x => x.id === store.activeBoardId);
    if (!b) return;
    const name = await dialogPrompt({
      title: '重命名画板',
      value: b.name,
      confirmText: '保存名称',
    });
    if (name === null || !name.trim()) return;
    persistence.renameBoard(b.id, name.trim());
  });

  $('btn-del-board').addEventListener('click', async () => {
    const b = store.boards.find(x => x.id === store.activeBoardId);
    if (!b) return;
    const n = store.elements.length;
    const ok = await dialogConfirm({
      title: '删除画板',
      message: `「${b.name}」上的 ${n} 个元素将一并删除，且无法撤销。需要保留的话，先用「导出 JSON」备份。`,
      confirmText: '删除画板',
    });
    if (ok) persistence.deleteBoard(b.id);
  });

  store.subscribe(type => { if (type === 'boards') render(); });
  render();
}
