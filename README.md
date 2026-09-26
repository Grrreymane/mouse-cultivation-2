# 🐭 鼠鼠修仙 v3

> 像素风放置类修仙游戏 · 纯前端 · 零框架依赖

**线上地址**: https://grrreymane.github.io/mouse-cultivation-2/

v3 的方向：**主角回到 v1 的手绘像素鼠鼠**，其余生物与场景用同一套像素画风重做；数值重写，让每个境界都有「突破 → 瓶颈 → 渡劫」的节奏；界面整体重构。详见 [迭代记录](public/changelog.html) 与 [GDD.md](GDD.md)。

## 项目结构

```
mouse-cultivation-2/
├── GDD.md                 — 玩法设计文档（v3 数值模型）
├── server.js              — 本地静态服务器（端口 3001）
├── public/                — 部署目录（GitHub Pages）
│   ├── index.html         — 页面结构
│   ├── style.css          — 界面样式
│   ├── engine.js          — 游戏引擎：状态、数值、战斗、存档（无 DOM 依赖）
│   ├── sprites.js         — v1 手绘像素鼠鼠 + 武器 + 外观皮肤
│   ├── pixelart.js        — 像素雕刻 DSL：18 怪物 / 6 灵兽 / 2 坐骑
│   ├── renderer.js        — 战斗画面：像素缓冲、六境界场景、特效、渡劫演出
│   ├── ui.js              — HUD、神通栏、修行指引、各标签页
│   ├── sound.js           — 8-bit 合成音效（WebAudio）
│   ├── main.js            — 入口：事件委托、战斗事件分发、离线收益
│   └── changelog.html     — 迭代记录
├── tools/
│   ├── balance-sim.js     — 无头数值模拟器
│   └── slice_sprites.py   — （v2 遗留）AI 精灵图切割脚本
└── art/                   — （v2 遗留）AI 生成的精灵图原稿，v3 已不使用
```

## 开发

```bash
npm start                  # http://localhost:3001
```

也可以直接用任意静态服务器打开 `public/`。

### 数值模拟

```bash
node tools/balance-sim.js 8 1 --quiet          # 模拟8小时、1倍速，输出各境界到达时间
node tools/balance-sim.js 4 1 --trace --quiet  # 逐级输出攻防血、怪物血量、几刀砍死/几下被砍死
```

参数：`--lazy`（不手动放技能、花钱保守）、`--notower`、`--norealm`。

### 调试

浏览器控制台：

```js
GameEngine._debug.cheat({ level: 30, gold: 1e6 })   // 直接修改存档字段
```

## 美术

- 主角：`sprites.js` 中的 `drawMouseBody` / `drawMouseRealm0~5`（v1 原稿，未改动）
- 生物：`pixelart.js` 的 `def('名字', { w, h, ax, ay, frames, outline, draw(T, f) })`
  - `T.E` 球面光照椭圆、`T.R` 矩形、`T.T` 三角、`T.L` 线段、`T.P/PS` 像素、`T.eye/evilEye` 眼睛
  - 调色板在文件顶部 `M`（亮/中/暗三色阶），描边自动生成
