# 🛡️ vue-watermark-plus

> 一个高性能的Vue3企业级水印工具，支持Canvas / SVG 双渲染引擎，零侵入一键使用，双重防篡改，让你的内容保护变得简单又高效。

[![npm version](https://img.shields.io/npm/v/vue-watermark-plus)](https://www.npmjs.com/package/vue-watermark-plus)
[![license](https://img.shields.io/npm/l/vue-watermark-plus?cachebust=slm)](https://github.com/shilimingY/vue-watermark-plus/blob/master/LICENSE)

## ✨ 特点

- **双模式渲染**：Canvas 与 SVG 自由切换，SVG 矢量文字清晰，Canvas 兼容性好。
- **文字 + 图片水印**：支持多行文本、自定义字体/颜色/大小，也支持上传 Logo 图片并控制缩放与间距。
- **防篡改监控**：实时监听水印节点的删除与样式修改并自动恢复。可通过 `monitor` 选项自由开启/关闭，适应不同安全需求。
- **零侵入指令**：通过 `v-watermark` 使用，不增加额外组件，不破坏现有布局。
- **TypeScript 完备**：完整的类型定义，配置清晰，开发体验极佳。
- **轻量高性能**：仅生成一个背景单元图片并复用，内存与 DOM 开销极低。

## 🆚 与常见方案对比

| 特性 | vue-watermark-plus | 普通 Vue 水印组件 | 纯 CSS 水印 |
|------|-------------------|------------------|------------|
| 渲染方式 | Canvas / SVG 可选 | 多数仅 Canvas | 仅文本 |
| 防篡改 | ✅ MutationObserver + 定时校验 | 部分仅监听 DOM 删除 | ❌ 极易被删除 |
| 样式篡改防御（`el.style.display='none'`） | ✅ 定时检测计算样式，自动恢复 | ❌ | ❌ |
| 图片水印 | ✅ 支持，可控制缩放与间距 | 少数支持 | ❌ | 部分支持 |
| 使用方式 | 指令 `v-watermark`，挂载即用 | 组件包裹，可能改变结构 | 手动添加样式 |
| 动态更新配置 | ✅ 响应式，修改绑定值即更新 | 部分支持 | ❌ |
| TypeScript 支持 | ✅ 完整类型定义 | 部分 | - |
| 包体积（gzip） | ~5 KB | 5~15 KB | - |

## 📦 安装

```bash
npm install vue-watermark-plus
# 或
yarn add vue-watermark-plus
# 或
pnpm add vue-watermark-plus
```

## 🚀 快速上手

### 全局注册
```ts
// main.ts
import { createApp } from 'vue'
import VueWatermarkPlus from 'vue-watermark-plus'
import App from './App.vue'

const app = createApp(App)
app.use(VueWatermarkPlus)
app.mount('#app')
```
### 在组件中使用指令
```vue
<template>
  <div
    v-watermark="{
      text: '仅供内部使用',
      opacity: 0.2,
      rotate: -20,
      density: 'medium',
      mode: 'svg'
    }"
  >
    <!-- 你的页面内容 -->
  </div>
</template>
```

## ⚙️ 配置参数
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `text` | `string \| string[]` | `'CONFIDENTIAL'` | 水印文本，可传入多行数组，如 `['绝密', '内部使用']` |
| `image` | `string` | `''` | 图片水印 URL（优先级高于文本） |
| `mode` | `'canvas' \| 'svg'` | `'svg'` | 渲染模式：`svg` 矢量清晰，`canvas` 兼容性好 |
| `rotate` | `number` | `-20` | 倾斜角度（deg） |
| `opacity` | `number` | `0.2` | 水印透明度 (0-1) |
| `fontSize` | `number` | `16` | 字体大小（px） |
| `fontFamily` | `string` | `'sans-serif'` | 字体族 |
| `color` | `string` | `'#000'` | 文字颜色 |
| `density` | `'low' \| 'medium' \| 'high' \| number` | `'medium'` | 密度预设（low: 200px 间距 / medium: 120px / high: 60px）或自定义数字 |
| `gapX` | `number` | — | 水平间距（px），优先级高于 `density` |
| `gapY` | `number` | — | 垂直间距（px），优先级高于 `density` |
| `zIndex` | `number` | `9999` | 水印层 z-index |
| `monitor` | `boolean` | `true` | 是否启用防篡改监控（MutationObserver + 定时校验） |
| `imageWidth` | `number` | `100`（当未设置时） | 图片水印显示宽度（px），高度等比缩放 |
| `imageHeight` | `number` | 等比计算 | 图片水印显示高度（px），若不传则按宽度等比 |

## 🔧 进阶用法

### 1. 图片水印
```js
import logoUrl from './assets/safe.png'
```
```vue
<div v-watermark="{
  image: logoUrl,
  opacity: 0.2,
  rotate: -10,
  gapX: 150,
  gapY: 100,
  imageWidth: 25
}">
  <h1>一行指令，即刻为您的页面穿上隐形防护衣</h1>
  <h1>无需额外组件</h1>
  <h1>不影响页面交互与性能</h1>
</div>
```
**图片水印效果**

![alt text](/src/assets/image-1.png)

### 2. 多行文本水印

```vue
<div v-watermark="{
  text: ['绝密文件', '仅供内部使用', '禁止外传'],
  opacity: 0.2,
  density: 'high'
}">
  <h1>一行指令，即刻为您的页面穿上隐形防护衣</h1>
  <h1>无需额外组件</h1>
  <h1>不影响页面交互与性能</h1>
</div>
```
**多行文本水印效果**

![alt text](/src/assets/image.png)

> 如果你在使用过程中遇到任何问题，欢迎提交 [Issue](https://github.com/shilimingY/vue-watermark-plus/issues)。

