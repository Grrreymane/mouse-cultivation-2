# 🐭 鼠鼠修仙 2 — Sprite Sheet 重制版

> 像素风放置类修仙游戏 · 纯前端 · 零框架依赖

**线上地址**: https://grrreymane.github.io/mouse-cultivation-2/

## 项目结构

```
mouse-cultivation-2/
├── GDD.md                 — Game Design Document（完整玩法设计文档）
├── README.md              — 本文件
├── server.js              — 开发用静态服务器（端口3001）
├── package.json
├── public/
│   ├── index.html         — HTML结构 + CSS样式（508行，纯标记无逻辑）
│   ├── engine.js          — 游戏引擎（2565行，状态管理+全部游戏逻辑）
│   ├── renderer.js        — Canvas渲染系统（789行，场景/动画/粒子/特效）
│   ├── ui.js              — DOM UI更新（651行，标签页渲染/状态面板）
│   ├── main.js            — 初始化入口（337行，启动/事件/操作函数）
│   ├── sprites.js         — 像素精灵（2030行，Canvas手绘，过渡期保留）
│   ├── sprite-loader.js   — Sprite Sheet加载系统（581行，PNG图集支持）
│   └── assets/            — 精灵图集PNG（待生成）
├── art/                   — 美术资源目录
└── .github/workflows/     — GitHub Actions部署配置
```

## 架构说明

v2.0 清洁重构后的代码模块划分：

| 模块 | 职责 | 依赖 |
|------|------|------|
| `engine.js` | 全部游戏逻辑、数值计算、存档系统 | 无 |
| `renderer.js` | Canvas渲染循环、场景、动画、粒子特效 | `engine.js`, `Sprites` |
| `ui.js` | DOM UI更新、标签页渲染、状态面板 | `engine.js`, `Sprites` |
| `main.js` | 启动入口、事件绑定、操作函数、离线处理 | 所有模块 |
| `sprites.js` | 像素精灵Canvas手绘（过渡用，将被Sprite Sheet替代） | 无 |
| `sprite-loader.js` | Sprite Sheet加载系统（PNG→drawImage桥接） | `sprites.js` |
| `index.html` | HTML结构 + CSS样式 | 无 |

## 开发

```bash
npm start          # 启动开发服务器 http://localhost:3001
```

## 版本历史

- **v2.0** — 清洁重构 + Game Design Doc 留档
- **v1.2** — 凡人修仙传世界观 + 视觉修复（基线版本）
