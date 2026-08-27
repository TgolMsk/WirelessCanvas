# WIRELESS CANVAS · 无限画布

自建的网页版个人无限画布，用于自由创作：手绘、形状、箭头、文本、便签、图片，全部在一块可以无限平移缩放的画布上。UI 遵循 rams-panel 铝壳面板设计系统（Dieter Rams / Braun 仪器风格）。

纯前端零依赖：原生 HTML / CSS / JS（ES modules），无构建步骤、无后端。

## 运行

任意静态服务器指向本目录即可（Chrome 不允许 `file://` 直开 ES modules）：

```bash
python3 -m http.server 8123 --directory /Users/ws/Project/WirelessCanvas
```

然后打开 http://localhost:8123 。Safari / Firefox 也可以直接双击 `index.html` 打开。

## 功能

- **无限画布**：滚轮/触控板平移，Ctrl(⌘)+滚轮或触控板捏合缩放（0.05x–8x），空格或中键拖拽抓手，右下角液晶窗显示缩放/指针坐标/工具/选中数
- **创作元素**：画笔（平滑笔迹）、矩形、椭圆、直线、箭头（Shift 锁 45°/正方形）、文本（画布空白处双击即建）、便签、图片（粘贴 / 拖入 / IMAGE 键选文件，入库自动压缩）
- **编辑**：点选 / Shift 加选 / 框选、拖拽移动、八向手柄缩放、双击编辑文字、橡皮擦、撤销重做、复制粘贴、墨色 / 线宽 / 填充档位（选中元素后点档位直接改）
- **多画板**：顶部旋钮切换，新建 / 重命名 / 删除
- **持久化**：localStorage 自动保存（存储指示灯：绿=已保存 黄=写入中 红=空间不足/失败）；液晶窗分段条显示存储占用，超 80% 转红——此时请用「导出 JSON」备份
- **导出**：PNG（选中优先，否则全部，2x 清晰度）、JSON 全量备份 / 导入

## 快捷键

| 键 | 作用 |
|---|---|
| V / H / P / R / O / L / A / T / N / E | 选择 / 平移 / 画笔 / 矩形 / 椭圆 / 直线 / 箭头 / 文本 / 便签 / 橡皮 |
| 空格拖拽、中键拖拽 | 临时抓手平移 |
| ⌘Z / ⇧⌘Z | 撤销 / 重做 |
| ⌘C / ⌘X / ⌘V / ⌘D | 复制 / 剪切 / 粘贴 / 副本 |
| ⌘A / Esc / Delete | 全选 / 取消选择 / 删除 |
| + / − / ⌘0 / ⌘1 | 放大 / 缩小 / 100% / 适配全部 |
| Alt+拖形状 | 画完不切回选择工具，连续创建 |

## 结构

```
index.html          入口与面板骨架
css/tokens.css      rams-panel 设计令牌（唯一取色源，勿改）
css/app.css         布局与画布样式
js/core/            camera 视口、renderer 双层渲染、geometry、hittest
js/elements/        各元素类型的 draw/hit/bbox 纯函数 + 文本排版
js/tools/           工具状态机（select/pen/shape/text/note/eraser/pan）
js/state/           store（所有变更收口）、history（命令反演撤销）、persistence
js/io/              剪贴板、图片入库压缩、PNG 导出
js/ui/              面板、液晶窗、画板旋钮、文本编辑叠层
```

数据存在浏览器 `localStorage`（`wc:*` 键），约 5MB 上限。换浏览器或备份用「导出 JSON / 导入 JSON」。
