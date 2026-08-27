// rams-panel 风格对话框，替代原生 prompt/confirm
// 黄键 = 建设性主操作；黑键 = 危险操作；每个对话框只有一个强调键

let dlg = null, titleEl = null, msgEl = null, input = null, btnCancel = null, btnOk = null;

function build() {
  if (dlg) return;
  dlg = document.createElement('dialog');
  dlg.className = 'dlg';
  dlg.innerHTML = `
    <form method="dialog">
      <h2 class="label"></h2>
      <p class="msg"></p>
      <input type="text" autocomplete="off" spellcheck="false">
      <div class="btns">
        <button type="button" class="pb" value="cancel">取消</button>
        <button type="submit" class="pb" value="ok"></button>
      </div>
    </form>`;
  document.body.appendChild(dlg);
  titleEl = dlg.querySelector('h2');
  msgEl = dlg.querySelector('.msg');
  input = dlg.querySelector('input');
  btnCancel = dlg.querySelector('[value=cancel]');
  btnOk = dlg.querySelector('[value=ok]');
  btnCancel.addEventListener('click', () => dlg.close('cancel'));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); dlg.close('ok'); }
  });
  // 点击面板外（backdrop）等同取消
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close('cancel'); });
}

function open({ title, message, confirmText, danger, withInput, value, placeholder }) {
  build();
  titleEl.textContent = title;
  msgEl.textContent = message || '';
  msgEl.style.display = message ? '' : 'none';
  input.style.display = withInput ? '' : 'none';
  input.value = value || '';
  input.placeholder = placeholder || '';
  btnOk.textContent = confirmText;
  btnOk.className = 'pb ' + (danger ? 'k' : 'y');
  return new Promise(resolve => {
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'ok' ? (withInput ? input.value : true) : null);
    }, { once: true });
    dlg.returnValue = 'cancel';      // Esc 关闭不触发按钮，需显式重置避免残留上次的 ok
    dlg.showModal();
    if (withInput) { input.focus(); input.select(); }
    else btnOk.focus();
  });
}

// 返回输入的字符串；取消 / Esc 返回 null
export function dialogPrompt({ title, message, value = '', placeholder = '', confirmText = '保存' }) {
  return open({ title, message, confirmText, withInput: true, value, placeholder });
}

// 确认返回 true；取消 / Esc 返回 false
export async function dialogConfirm({ title, message, confirmText = '删除', danger = true }) {
  return (await open({ title, message, confirmText, danger })) === true;
}
