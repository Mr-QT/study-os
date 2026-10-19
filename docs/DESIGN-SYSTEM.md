# Modern Calm Study OS — 设计系统

## 风格定位
现代 SaaS 的秩序感 + 柔和治愈的学习氛围；清晰、克制、信息丰富但不过载。优先易读、可操作，不追求炫技。

## 初始色彩 tokens（设计建议，最终需视觉验收）

```css
:root {
  --color-primary: #8275D6;       /* lavender */
  --color-mint: #B6DCD0;
  --color-peach: #F5D7CE;
  --color-canvas: #FAFAFC;
  --color-surface: #FFFFFF;
  --color-text: #242636;
  --color-text-muted: #62677A;
  --radius-card: 16px;
  --radius-control: 10px;
}
```

以上仅为品牌基础色，文本/状态/边框颜色须通过对比度验证；不保证原始品牌色在所有组合下达到 WCAG AA。

## 基础组件
Button、Input、Select、Dialog、Drawer、Tabs、Toast、Tooltip、Dropdown、DataTable、Calendar、Kanban、Chart、Command Palette、Sidebar、Widget Frame、Rich Editor、File Preview、AI Chat、Source Citation、Sync Status、Permission Gate、Conflict Resolver。

## 关键布局
- 桌面：可折叠侧栏 + 主内容 + 可选 AI 上下文面板。
- iPad：更大触控目标、可折叠分栏、手写/键盘混合操作。
- 手机：底部主导航/抽屉、单列卡片、浮动快速捕获；避免直接缩小桌面布局。
- 首页组件支持拖动/缩放/固定、按场景保存布局；AI 只能更改动态组件内容，不得擅自重排布局。

## 状态与动效
每个组件需有 loading、empty、error、success、offline、sync-pending、conflict、permission-denied 状态。动效轻量且遵循 `prefers-reduced-motion`。勿扰与专注模式避免打断性动画。

## 视觉验收
- Playwright 截图覆盖桌面 1440、平板 834、手机 390 宽度（可按测试设备调整）。
- 浅色/深色/高对比度；中英文长文本；200% 缩放；键盘焦点；屏幕阅读器标签。
- 组件展示页作为设计系统的真实样本；禁止孤立模块私自创建不兼容样式。
