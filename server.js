// 简单的静态文件服务器（仅用于本地预览）
// 游戏逻辑已全部移至前端，此服务器可选
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐭 鼠鼠修仙 — 静态服务器启动！端口: ${PORT}`);
  console.log(`🎮 打开浏览器访问 http://localhost:${PORT}`);
  console.log(`📦 游戏已完全前端化，可直接部署到 GitHub Pages`);
});
