// 统一的文本换行/度量：canvas 渲染与 textarea 编辑共用同一算法
const measureCanvas = document.createElement('canvas');
export const measureCtx = measureCanvas.getContext('2d');

export const LINE_HEIGHT = 1.4;
export const FONT_STACK = "'Jost','Futura','Avenir Next','Helvetica Neue',sans-serif";

export function fontFor(fontSize) {
  return `400 ${fontSize}px ${FONT_STACK}`;
}

const CJK = /[⺀-鿿豈-﫿＀-￯　-〿぀-ヿ가-힯]/;

// 把一行拆成最小换行单元：空格串 / 拉丁词 / 单个 CJK 字符
function tokenize(line) {
  const tokens = [];
  let word = '';
  for (const ch of line) {
    if (CJK.test(ch)) {
      if (word) { tokens.push(word); word = ''; }
      tokens.push(ch);
    } else if (ch === ' ' || ch === '\t') {
      if (word) { tokens.push(word); word = ''; }
      tokens.push(ch === '\t' ? '  ' : ch);
    } else {
      word += ch;
    }
  }
  if (word) tokens.push(word);
  return tokens;
}

// 返回 { lines, width, height, lineHeight }，坐标为世界单位
export function layoutText(text, fontSize, maxWidth) {
  measureCtx.font = fontFor(fontSize);
  const lineHeight = fontSize * LINE_HEIGHT;
  const out = [];
  let maxW = 0;
  for (const para of String(text ?? '').split('\n')) {
    if (para === '') { out.push(''); continue; }
    let cur = '';
    let curW = 0;
    for (const tok of tokenize(para)) {
      const tokW = measureCtx.measureText(tok).width;
      if (cur !== '' && curW + tokW > maxWidth) {
        out.push(cur);
        maxW = Math.max(maxW, curW);
        cur = tok === ' ' ? '' : tok;          // 行首不留空格
        curW = cur ? tokW : 0;
        // 单词本身超宽：按字符硬切
        while (curW > maxWidth && cur.length > 1) {
          let i = cur.length - 1;
          while (i > 1 && measureCtx.measureText(cur.slice(0, i)).width > maxWidth) i--;
          out.push(cur.slice(0, i));
          maxW = Math.max(maxW, measureCtx.measureText(cur.slice(0, i)).width);
          cur = cur.slice(i);
          curW = measureCtx.measureText(cur).width;
        }
      } else {
        cur += tok;
        curW += tokW;
      }
    }
    out.push(cur);
    maxW = Math.max(maxW, curW);
  }
  return { lines: out, width: maxW, height: out.length * lineHeight, lineHeight };
}

// 在 (x,y) 起绘制已排版文本；ctx 需已处于世界变换
export function drawLines(ctx, layout, x, y, fontSize, color, align = 'left', boxW = 0) {
  ctx.font = fontFor(fontSize);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  for (let i = 0; i < layout.lines.length; i++) {
    const line = layout.lines[i];
    if (!line) continue;
    let lx = x;
    if (align !== 'left' && boxW > 0) {
      const w = measureCtx.measureText(line).width;
      lx = align === 'center' ? x + (boxW - w) / 2 : x + boxW - w;
    }
    ctx.fillText(line, lx, y + i * layout.lineHeight + layout.lineHeight / 2);
  }
}
