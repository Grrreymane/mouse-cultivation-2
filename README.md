# 🐭 鼠鼠修仙 2 — Sprite Sheet Edition

像素风挂机修仙小游戏，基于 [鼠鼠修仙 v2.6](https://grrreymane.github.io/feifan-daily/game/) 的全新美术架构重制版。

## ✨ 核心变化

- **Sprite Sheet 架构**：所有生物使用预渲染 PNG 精灵图集，告别逐像素 Canvas 绘制
- **画质飞跃**：从 ~30 个色块 → 专业像素画（32×32 / 48×48），支持抗锯齿和半透明
- **性能最优**：`drawImage()` 直接 GPU 加速，零运行时计算开销
- **游戏玩法完整保留**：修仙境界、灵根、功法、丹药、灵兽、坐骑、皮肤系统等全部继承

## 📁 项目结构

```
mouse-cultivation-2/
├── public/
│   ├── index.html          # 游戏主页
│   ├── engine.js           # 游戏引擎（玩法逻辑）
│   ├── sprites.js          # 精灵渲染层（Sprite Sheet 版）
│   └── assets/
│       ├── monsters.png    # 怪物精灵图集
│       ├── beasts.png      # 灵兽精灵图集
│       ├── mounts.png      # 坐骑精灵图集
│       └── effects.png     # 特效精灵图集
├── art/                    # 美术资源源文件
│   ├── thumbs/             # 参考图缩略图
│   └── raw/                # 原始素材
├── tools/                  # 构建工具
│   └── pack-sprites.js     # 精灵图集打包脚本
├── server.js               # 本地开发服务器
└── README.md
```

## 🚀 开发

```bash
# 本地运行
node server.js
# 访问 http://localhost:3001
```

## 📋 迁移计划

1. ~~创建仓库 + 复制 v2.6 玩法代码~~ ✅
2. 设计 Sprite Sheet 加载系统
3. 制作精灵图集（LightAI 生成 → 像素画处理 → 打包）
4. 逐步替换 sprites.js 中的绘制函数
5. 联调测试 → 部署上线

## 🔗 链接

- 原版游戏：https://grrreymane.github.io/feifan-daily/game/
- 原版仓库：https://github.com/Grrreymane/feifan-daily
