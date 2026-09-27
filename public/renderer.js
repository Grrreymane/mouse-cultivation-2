// ============================================================
// renderer.js — 鼠鼠修仙 v3 战斗画面
// 世界层：低分辨率像素缓冲（1像素=1方块）→ 最近邻放大
// 界面层：高清画布（伤害数字 / 血条 / 名字）
// ============================================================

const Renderer = (() => {
  'use strict';

  let canvas, ctx;              // 高清主画布
  let world, wctx;              // 低分辨率世界缓冲
  let W = 320, H = 180, PX = 3, DPR = 1;
  let groundY = 140;
  let animFrame = 0;
  let bgCache = null, bgKey = '';

  // 动画状态
  let particles = [], texts = [], effects = [], coins = [];
  let mouseAtk = 0, mouseHit = 0, monsterHit = 0, monsterLunge = 0, monsterWalkIn = 1;
  let beastAtk = 0, shake = 0, flash = 0, flashColor = '#FFFFFF';
  let dying = null;             // 正在消散的怪物
  let trib = null;              // 渡劫演出
  let levelBeam = 0;
  let lastMouseY = 0;
  let lastState = null;

  // ========== 初始化 ==========
  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    world = document.createElement('canvas');
    wctx = world.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const cssW = Math.max(200, r.width), cssH = Math.max(150, r.height);
    PX = Math.max(2, Math.floor(Math.min(cssH / 170, cssW / 280)));
    W = Math.ceil(cssW / PX); H = Math.ceil(cssH / PX);
    world.width = W; world.height = H;
    canvas.width = Math.round(cssW * DPR); canvas.height = Math.round(cssH * DPR);
    canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    groundY = H - Math.round(Math.max(24, Math.min(44, H * 0.2)));
    bgKey = '';
  }

  // 世界坐标
  function mousePos() { return { x: Math.floor(W * 0.34), y: groundY }; }
  function monsterPos() { return { x: Math.floor(W * 0.68), y: groundY }; }
  // 世界 → 屏幕(CSS像素)
  function toScreen(x, y) { return { x: x * PX, y: y * PX }; }

  // ========== 工具 ==========
  function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
  function prect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function lerpColor(a, b, t) {
    const pa = hex(a), pb = hex(b);
    const r = Math.round(pa[0] + (pb[0] - pa[0]) * t), g = Math.round(pa[1] + (pb[1] - pa[1]) * t), bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function hex(c) { const h = c.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }

  // 像素化的天空渐变（分带 + 棋盘抖动过渡）
  function skyBands(c, stops, y0, y1) {
    const n = stops.length - 1;
    const bandH = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      const top = Math.floor(y0 + i * bandH), bot = Math.floor(y0 + (i + 1) * bandH);
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const yy = top + Math.floor((bot - top) * s / steps), hh = Math.ceil((bot - top) / steps);
        prect(c, 0, yy, W, hh, lerpColor(stops[i], stops[i + 1], s / steps));
      }
      // 抖动过渡线
      c.fillStyle = stops[i + 1];
      for (let x = (i % 2); x < W; x += 2) c.fillRect(x, bot - 1, 1, 1);
    }
  }

  function ridge(c, baseY, amp, freq, color, seed, rough) {
    const r = rng(seed);
    const p1 = r() * 100, p2 = r() * 100;
    c.fillStyle = color;
    for (let x = 0; x < W; x++) {
      let y = baseY - (Math.sin(x * freq + p1) * 0.6 + Math.sin(x * freq * 2.3 + p2) * 0.3 + Math.sin(x * freq * 5.1) * 0.1 * (rough || 1)) * amp - amp * 0.3;
      y = Math.round(y / 1) ;
      c.fillRect(x, y, 1, H - y);
    }
  }

  function pixelCircle(c, cx, cy, r, color) {
    c.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
  }

  function pixelCloud(c, x, y, w, color, shade) {
    const r = Math.max(2, Math.floor(w / 5));
    pixelCircle(c, x + r, y, r, color);
    pixelCircle(c, x + w * 0.45, y - r * 0.6, r * 1.4, color);
    pixelCircle(c, x + w - r, y, r * 1.1, color);
    prect(c, x + r, y, w - r * 2, r + 1, color);
    if (shade) prect(c, x + r, y + r - 1, w - r * 2, 2, shade);
  }

  // ========== 场景 ==========
  const SCENES = [
    { // 0 黄枫谷：秋日山谷
      sky: ['#4E6FB5', '#7FA6DA', '#B9D2EA', '#F4DDB0'], far: '#8FA3C8', mid: '#6E8E7A',
      ground: '#5E9A45', groundDark: '#3F7233', dirt: '#6E4E33', dirtDark: '#553A26', grass: '#82C25A',
      sun: '#FFF1C4', stars: false, props: 'maple',
    },
    { // 1 乱星海：落日海岸
      sky: ['#2B2E6E', '#6A4C8E', '#D9776A', '#FFC58A'], far: '#5B4A7E', mid: '#3E3A6A',
      ground: '#D9BE86', groundDark: '#B89A62', dirt: '#C9A870', dirtDark: '#A88A56', grass: '#E8D3A0',
      sun: '#FFE3A8', stars: true, props: 'sea',
    },
    { // 2 天南竹海：雾中竹林
      sky: ['#7FC4B8', '#A9DCCB', '#D8EEDD', '#EEF6E6'], far: '#A7CDB7', mid: '#7FB295',
      ground: '#4E8C4A', groundDark: '#356A36', dirt: '#4A3A2A', dirtDark: '#3A2C20', grass: '#6DB05E',
      sun: '#FFFFFF', stars: false, props: 'bamboo',
    },
    { // 3 星宫：星夜仙宫
      sky: ['#070A24', '#141A4A', '#26306E', '#3E4C8E'], far: '#1C2356', mid: '#141A40',
      ground: '#5A6AA0', groundDark: '#3E4A7E', dirt: '#2E3868', dirtDark: '#222A52', grass: '#7C8CC8',
      sun: '#E8ECFF', stars: true, props: 'palace', night: true,
    },
    { // 4 灵界：紫霞浮岛
      sky: ['#1E0F3A', '#4B2A7A', '#9A5AB8', '#E6A6D6'], far: '#6A4A9A', mid: '#4A3078',
      ground: '#7A5AB0', groundDark: '#5A3E8A', dirt: '#3E2A62', dirtDark: '#2E1E4A', grass: '#A88AE0',
      sun: '#FFE0FF', stars: true, props: 'isles',
    },
    { // 5 真仙界：金霞天门
      sky: ['#3A0E2A', '#8E2A3E', '#E07A4A', '#FFE0A0'], far: '#C0604A', mid: '#8E3A3A',
      ground: '#F2E8D8', groundDark: '#CFC0A8', dirt: '#B8A48A', dirtDark: '#978468', grass: '#FFF6E6',
      sun: '#FFF6D0', stars: true, props: 'heaven',
    },
  ];

  function buildBackground(ri) {
    const sc = SCENES[ri] || SCENES[0];
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const b = c.getContext('2d');
    const gy = groundY;
    skyBands(b, sc.sky, 0, gy + 2);
    const r = rng(ri * 17 + 3);

    if (sc.stars) {
      for (let i = 0; i < W * 0.35; i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * gy * 0.55);
        b.fillStyle = r() > 0.8 ? '#FFFFFF' : 'rgba(255,255,255,0.55)';
        b.fillRect(x, y, 1, 1);
      }
    }

    // 天体
    if (sc.props === 'palace') {
      pixelCircle(b, W * 0.82, gy * 0.22, 9, '#E8ECFF'); pixelCircle(b, W * 0.82 + 3, gy * 0.22 - 2, 8, sc.sky[0]);
    } else if (sc.props === 'sea') {
      pixelCircle(b, W * 0.64, gy * 0.62, 14, '#FFB070'); pixelCircle(b, W * 0.64, gy * 0.62, 11, '#FFD9A0');
    } else if (sc.props === 'heaven') {
      pixelCircle(b, W * 0.5, gy * 0.35, 18, '#FFE6A8'); pixelCircle(b, W * 0.5, gy * 0.35, 14, '#FFF6D8');
    } else if (sc.props === 'maple' || sc.props === 'bamboo') {
      pixelCircle(b, W * 0.8, gy * 0.2, 8, sc.sun);
    }

    // 远山
    ridge(b, gy * 0.72, gy * 0.22, 0.02, sc.far, ri + 1, 1.5);

    // 场景道具（中景）
    const props = {
      maple() {
        ridge(b, gy * 0.9, gy * 0.12, 0.035, sc.mid, ri + 7);
        const trees = [0.06, 0.16, 0.48, 0.58, 0.9, 0.98];
        trees.forEach((t, i) => drawMaple(b, Math.floor(W * t), gy + 1, 10 + (i % 3) * 3, i));
      },
      sea() {
        // 海面
        const seaTop = Math.floor(gy * 0.7);
        prect(b, 0, seaTop, W, gy - seaTop, '#3E5A9A');
        for (let y = seaTop; y < gy; y += 3) {
          b.fillStyle = y % 2 ? '#5A78B8' : '#35508C';
          for (let x = (y * 7) % 11; x < W; x += 11) b.fillRect(x, y, 5, 1);
        }
        prect(b, Math.floor(W * 0.64) - 12, seaTop, 24, 1, '#FFD9A0');
        prect(b, Math.floor(W * 0.64) - 7, seaTop + 3, 14, 1, '#FFB070');
        // 远岛
        [[0.15, 18], [0.36, 10], [0.86, 22]].forEach(([t, w]) => {
          const x = Math.floor(W * t);
          for (let i = 0; i < w; i++) { const h = Math.floor(Math.sin(i / w * Math.PI) * w * 0.35) + 1; prect(b, x + i, seaTop - h, 1, h, '#2E2A58'); }
        });
        // 礁石
        drawRock(b, Math.floor(W * 0.08), gy + 1, 7, '#8E7A6A', '#6A5A4E');
        drawRock(b, Math.floor(W * 0.93), gy + 1, 9, '#8E7A6A', '#6A5A4E');
      },
      bamboo() {
        ridge(b, gy * 0.86, gy * 0.14, 0.03, sc.mid, ri + 5);
        // 雾
        b.fillStyle = 'rgba(255,255,255,0.35)'; b.fillRect(0, Math.floor(gy * 0.78), W, 6);
        for (let i = 0; i < 9; i++) drawBamboo(b, Math.floor(W * (0.02 + i * 0.12 + (i % 2) * 0.03)), gy + 1, Math.floor(gy * (0.55 + (i % 3) * 0.12)), i % 2 ? '#5E9E5A' : '#4C8A4A');
      },
      palace() {
        ridge(b, gy * 0.88, gy * 0.1, 0.025, sc.mid, ri + 9);
        drawPalace(b, Math.floor(W * 0.5), Math.floor(gy * 0.62));
        // 星河
        for (let i = 0; i < W; i += 2) {
          const y = Math.floor(gy * 0.15 + Math.sin(i * 0.02) * 10 + i * 0.12);
          b.fillStyle = 'rgba(160,180,255,0.18)'; b.fillRect(i, y, 2, 4);
        }
        drawLantern(b, Math.floor(W * 0.1), gy - 1); drawLantern(b, Math.floor(W * 0.92), gy - 1);
      },
      isles() {
        ridge(b, gy * 0.9, gy * 0.08, 0.03, sc.mid, ri + 11);
        [[0.18, 0.3, 26], [0.55, 0.18, 18], [0.86, 0.42, 30]].forEach(([tx, ty, w], i) => drawIsle(b, Math.floor(W * tx), Math.floor(gy * ty), w, i));
        drawCrystal(b, Math.floor(W * 0.05), gy + 1, '#E6A6FF'); drawCrystal(b, Math.floor(W * 0.95), gy + 1, '#A6E6FF');
      },
      heaven() {
        for (let i = 0; i < 6; i++) pixelCloud(b, Math.floor(W * (i / 6) - 10), Math.floor(gy * (0.7 + (i % 2) * 0.08)), 40, '#FFE6C8', '#F2C8A0');
        drawGate(b, Math.floor(W * 0.5), gy + 1);
      },
    };
    props[sc.props]();

    // 地面
    prect(b, 0, gy, W, H - gy, sc.dirt);
    prect(b, 0, gy, W, 3, sc.ground);
    prect(b, 0, gy + 3, W, 1, sc.groundDark);
    const rr = rng(ri * 31 + 7);
    for (let i = 0; i < W * 0.6; i++) {
      const x = Math.floor(rr() * W), y = gy + 5 + Math.floor(rr() * (H - gy - 5));
      b.fillStyle = rr() > 0.5 ? sc.dirtDark : sc.groundDark;
      b.fillRect(x, y, rr() > 0.7 ? 2 : 1, 1);
    }
    if (sc.props === 'heaven') { // 白玉台阶金边
      prect(b, 0, gy + 3, W, 1, '#E0B84A');
      for (let x = 0; x < W; x += 16) prect(b, x, gy + 4, 1, H - gy, '#D8CBB4');
    }
    if (sc.props === 'palace') { for (let x = 0; x < W; x += 12) prect(b, x, gy + 4, 1, H - gy, '#26305E'); }
    return c;
  }

  function drawMaple(b, x, gy, size, seed) {
    const r = rng(seed + 40);
    prect(b, x - 1, gy - size, 2, size, '#5A3A26');
    prect(b, x - 3, gy - Math.floor(size * 0.6), 2, 1, '#5A3A26');
    const cols = ['#F2A33A', '#E0662E', '#F6C84A', '#C9482A'];
    for (let i = 0; i < 5; i++) {
      pixelCircle(b, x + Math.floor((r() - 0.5) * size), gy - size - Math.floor(r() * size * 0.5), Math.floor(size * 0.35 + r() * 2), cols[i % cols.length]);
    }
    for (let i = 0; i < 6; i++) { b.fillStyle = cols[i % 4]; b.fillRect(x - size + Math.floor(r() * size * 2), gy - Math.floor(r() * 2), 1, 1); }
  }
  function drawRock(b, x, gy, s, c1, c2) {
    for (let i = 0; i < s * 2; i++) { const h = Math.floor(Math.sin(i / (s * 2) * Math.PI) * s * 0.8) + 1; prect(b, x - s + i, gy - h, 1, h, i < s ? c1 : c2); }
  }
  function drawBamboo(b, x, gy, h, col) {
    prect(b, x, gy - h, 3, h, col);
    prect(b, x + 2, gy - h, 1, h, '#3A6A36');
    for (let y = gy - h + 6; y < gy; y += 9) prect(b, x - 1, y, 5, 1, '#8ACB7A');
    for (let k = 0; k < 4; k++) {
      const ly = gy - h + 4 + k * 12, dir = k % 2 ? 1 : -1;
      for (let i = 0; i < 6; i++) b.fillStyle = '#6DB05E', b.fillRect(x + 1 + dir * (2 + i), ly + Math.floor(i / 2), 1, 1);
    }
  }
  function drawPalace(b, cx, y) {
    const c1 = '#232A5E', c2 = '#2E3874', lit = '#FFD86A';
    prect(b, cx - 34, y + 14, 68, 18, c1);
    prect(b, cx - 40, y + 10, 80, 4, c2); prect(b, cx - 44, y + 12, 4, 2, c2); prect(b, cx + 40, y + 12, 4, 2, c2);
    prect(b, cx - 24, y - 2, 48, 12, c1);
    prect(b, cx - 30, y - 6, 60, 4, c2); prect(b, cx - 33, y - 4, 3, 2, c2); prect(b, cx + 30, y - 4, 3, 2, c2);
    prect(b, cx - 12, y - 16, 24, 10, c1);
    prect(b, cx - 17, y - 19, 34, 3, c2);
    prect(b, cx - 1, y - 24, 2, 5, lit);
    for (let i = -3; i <= 3; i++) prect(b, cx + i * 9 - 1, y + 19, 3, 4, lit);
    for (let i = -2; i <= 2; i++) prect(b, cx + i * 8 - 1, y + 2, 2, 3, lit);
    prect(b, cx - 3, y - 12, 6, 3, lit);
    // 云托
    pixelCloud(b, cx - 50, y + 32, 40, '#3E4C8E'); pixelCloud(b, cx + 10, y + 34, 44, '#3E4C8E');
  }
  function drawLantern(b, x, gy) {
    prect(b, x, gy - 20, 1, 20, '#3A3A5A');
    prect(b, x - 3, gy - 24, 7, 6, '#FF6A4A'); prect(b, x - 2, gy - 23, 5, 4, '#FFB06A'); prect(b, x - 1, gy - 25, 3, 1, '#3A3A5A');
  }
  function drawIsle(b, x, y, w, seed) {
    const r = rng(seed + 90);
    prect(b, x - w / 2, y, w, 3, '#8E6AC8');
    prect(b, x - w / 2, y + 3, w, 2, '#5A3E8A');
    for (let i = 0; i < w; i++) { const d = Math.floor(Math.sin(i / w * Math.PI) * w * 0.4 * (0.7 + r() * 0.3)); prect(b, x - w / 2 + i, y + 5, 1, d, i % 3 ? '#3E2A62' : '#4A3474'); }
    prect(b, x + w * 0.2, y + 5, 2, w * 0.9, 'rgba(180,220,255,0.55)'); // 瀑布
    pixelCircle(b, x - w * 0.2, y - 3, 4, '#B69AF0'); prect(b, x - w * 0.2, y - 2, 1, 3, '#5A3E8A');
  }
  function drawCrystal(b, x, gy, col) {
    for (let i = 0; i < 6; i++) prect(b, x - i, gy - 16 + i * 2, i * 2 + 1, 2, col);
    prect(b, x - 5, gy - 4, 11, 4, col);
    prect(b, x - 1, gy - 14, 1, 10, '#FFFFFF');
  }
  function drawGate(b, cx, gy) {
    const red = '#C2383A', dark = '#8E2228', gold = '#FFD24A';
    prect(b, cx - 44, gy - 60, 6, 60, red); prect(b, cx + 38, gy - 60, 6, 60, red);
    prect(b, cx - 44, gy - 60, 2, 60, dark); prect(b, cx + 38, gy - 60, 2, 60, dark);
    prect(b, cx - 56, gy - 66, 112, 6, dark); prect(b, cx - 60, gy - 70, 120, 4, red);
    prect(b, cx - 62, gy - 72, 4, 2, red); prect(b, cx + 58, gy - 72, 4, 2, red);
    prect(b, cx - 48, gy - 52, 96, 4, red);
    prect(b, cx - 10, gy - 64, 20, 10, gold); prect(b, cx - 8, gy - 62, 16, 6, dark);
    prect(b, cx - 4, gy - 60, 8, 2, gold);
  }

  // ========== 动态背景元素 ==========
  const driftClouds = [];
  function drawAmbient(gs) {
    const ri = gs.realmIndex;
    const sc = SCENES[ri] || SCENES[0];
    // 漂浮云
    if (driftClouds.length === 0) for (let i = 0; i < 4; i++) driftClouds.push({ x: Math.random() * W, y: 6 + Math.random() * H * 0.3, w: 20 + Math.random() * 26, v: 0.03 + Math.random() * 0.05 });
    const cloudCol = ['#DCE8F6', '#C98AA0', '#F4FBF4', '#2E3A78', '#B98AD8', '#FFE2C0'][ri] || '#FFFFFF';
    const cloudShade = ['#B9CCE6', '#A86A88', '#D6EBDD', '#243064', '#9A6AC0', '#F2C49A'][ri] || '#DDDDDD';
    for (const c of driftClouds) {
      c.x += c.v; if (c.x > W + 30) { c.x = -c.w - 10; c.y = 6 + Math.random() * H * 0.3; }
      pixelCloud(wctx, Math.round(c.x), Math.round(c.y), Math.round(c.w), cloudCol, cloudShade);
    }
    // 星星闪烁
    if (sc.stars) {
      for (let i = 0; i < 10; i++) {
        const x = (i * 97 + 13) % W, y = (i * 53 + 7) % Math.floor(groundY * 0.5);
        if (Math.sin(animFrame * 0.05 + i * 1.7) > 0.6) { wctx.fillStyle = '#FFFFFF'; wctx.fillRect(x - 1, y, 3, 1); wctx.fillRect(x, y - 1, 1, 3); }
      }
    }
    // 海面波光
    if (sc.props === 'sea') {
      const seaTop = Math.floor(groundY * 0.7);
      for (let i = 0; i < 8; i++) {
        const x = (i * 41 + Math.floor(animFrame * 0.2)) % W, y = seaTop + 2 + (i * 5) % (groundY - seaTop - 2);
        wctx.fillStyle = 'rgba(255,230,190,0.7)'; wctx.fillRect(x, y, 3, 1);
      }
    }
    // 草丛摇曳
    wctx.fillStyle = sc.grass;
    for (let x = 3; x < W; x += 7) {
      const sway = Math.sin(animFrame * 0.04 + x * 0.3) > 0.3 ? 1 : 0;
      wctx.fillRect(x + sway, groundY - 2, 1, 2); wctx.fillRect(x + 2, groundY - 1, 1, 1);
    }
  }

  // 环境粒子（萤火/灵气/落叶/星光/紫焰/金屑）
  let env = [];
  function updateEnv(ri) {
    const kinds = [
      { col: ['#F2A33A', '#E0662E', '#F6C84A'], type: 'leaf' },
      { col: ['#FFE3A8', '#BFE8FF'], type: 'spark' },
      { col: ['#C8FFB0', '#FFFFFF'], type: 'firefly' },
      { col: ['#BFD0FF', '#FFFFFF'], type: 'spark' },
      { col: ['#F0A6FF', '#C9A2FF'], type: 'rise' },
      { col: ['#FFE08A', '#FFFFFF'], type: 'rise' },
    ][ri] || { col: ['#FFFFFF'], type: 'spark' };
    if (Math.random() < 0.12 && env.length < 30) {
      env.push({
        x: Math.random() * W, y: kinds.type === 'leaf' ? -2 : Math.random() * groundY,
        vx: kinds.type === 'leaf' ? 0.15 + Math.random() * 0.2 : (Math.random() - 0.5) * 0.15,
        vy: kinds.type === 'leaf' ? 0.2 + Math.random() * 0.15 : kinds.type === 'rise' ? -0.15 - Math.random() * 0.1 : (Math.random() - 0.5) * 0.08,
        life: 300 + Math.random() * 200, col: kinds.col[Math.floor(Math.random() * kinds.col.length)], type: kinds.type, ph: Math.random() * 6,
      });
    }
    for (let i = env.length - 1; i >= 0; i--) {
      const p = env[i];
      p.x += p.vx + (p.type === 'leaf' ? Math.sin(animFrame * 0.05 + p.ph) * 0.2 : 0); p.y += p.vy; p.life--;
      if (p.life <= 0 || p.y > groundY + 2 || p.y < -4 || p.x > W + 4) { env.splice(i, 1); continue; }
      if (p.type === 'firefly' && Math.sin(animFrame * 0.08 + p.ph) < 0) continue;
      wctx.fillStyle = p.col;
      wctx.fillRect(Math.round(p.x), Math.round(p.y), p.type === 'leaf' ? 2 : 1, 1);
    }
  }

  // ========== 主循环 ==========
  let lastStep = 0;
  function step() {
    lastStep = performance.now();
    animFrame++;
    const gs = GameEngine.getState();
    if (gs) {
      lastState = gs;
      drawWorld(gs);
      blit();
      drawOverlay(gs);
    }
  }
  function render() { step(); requestAnimationFrame(render); }

  function blit() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    let sx = 0, sy = 0;
    if (shake > 0) { sx = Math.round((Math.random() - 0.5) * shake) * PX; sy = Math.round((Math.random() - 0.5) * shake) * PX; shake *= 0.85; if (shake < 0.3) shake = 0; }
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(world, sx * DPR, sy * DPR, W * PX * DPR, H * PX * DPR);
  }

  function mouseFloat(ri) {
    return [0, 0, Math.sin(animFrame * 0.04) * 2, Math.sin(animFrame * 0.04) * 3 - 3, Math.sin(animFrame * 0.03) * 4 - 6, Math.sin(animFrame * 0.03) * 5 - 9][ri] || 0;
  }

  function drawWorld(gs) {
    const ri = gs.realmIndex;
    const key = `${ri}_${W}_${H}`;
    if (key !== bgKey) { bgCache = buildBackground(ri); bgKey = key; }
    wctx.imageSmoothingEnabled = false;
    wctx.drawImage(bgCache, 0, 0);
    drawAmbient(gs);
    updateEnv(ri);

    // 昼夜
    const phase = (Date.now() / 480000) % 1;
    const night = SCENES[ri].night ? 0 : Math.max(0, Math.cos(phase * Math.PI * 2)) * 0.28;
    if (night > 0.01) { wctx.fillStyle = `rgba(10,12,40,${night})`; wctx.fillRect(0, 0, W, H); }

    // 渡劫乌云
    if (trib || gs.needTribulation) drawStormSky(gs);

    const mp = mousePos(), op = monsterPos();
    const fl = mouseFloat(ri);

    // 影子
    shadow(mp.x, groundY + 1, 9);

    // 坐骑：鼠鼠骑坐在背上（关闭自身浮空，坐骑前半身盖住腿和衣摆）
    const mount = gs.visualEquip && gs.visualEquip.mount;
    const mountName = mount === '仙鹤' ? 'mount_crane' : mount === '麒麟' ? 'mount_qilin' : null;
    const riding = !!(mountName && !gs.isDead);
    let mouseY = groundY - 7;
    let mountDraw = null;
    if (riding) {
      const crane = mountName === 'mount_crane';
      const bob = Math.round(Math.sin(animFrame * (crane ? 0.05 : 0.09)) * 1);
      const my = groundY + bob - (crane ? 3 + Math.round(Math.sin(animFrame * 0.03) * 2) : 0);
      const seat = my - (crane ? 25 : 29);
      const mframe = Math.floor(animFrame / 20) % 2;
      mountDraw = { name: mountName, x: mp.x - 3, y: my, frame: mframe, seat };
      PixelArt.draw(wctx, mountName, mountDraw.x, my, { frame: mframe });
      mouseY = seat - 4;
    }
    lastMouseY = mouseY;

    // 灵兽
    if (gs.activeBeast && !gs.isDead) {
      const mounted = !!mountName;
      let bx = mp.x - (mounted ? 44 : 34), by = groundY + Math.round(Math.sin(animFrame * 0.06) * 1);
      const flying = ['thunder_eagle', 'phoenix', 'jade_dragon'].includes(gs.activeBeast.templateId);
      if (flying) by -= (mounted ? 30 : 16) + Math.round(Math.sin(animFrame * 0.05) * 2);
      if (beastAtk > 0) {
        const t = 1 - beastAtk / 18;
        const k = t < 0.5 ? t * 2 : (1 - t) * 2;
        bx += Math.round((op.x - 16 - bx) * k);
      }
      PixelArt.draw(wctx, gs.activeBeast.templateId, bx, by, { frame: Math.floor(animFrame / 15) % 2 });
    }

    // 护盾
    const shieldOn = gs.shield && gs.shield.amount > 0;

    // 鼠鼠
    if (!gs.isDead || Math.floor(animFrame / 6) % 2) {
      wctx.save();
      if (gs.isDead) wctx.globalAlpha = 0.35;
      const hitX = mouseHit > 0 ? Math.round(-mouseHit * 0.4) : 0;
      Sprites.drawMouseByRealm(wctx, mp.x + hitX, mouseY, 1, ri, animFrame, mouseAtk > 0 ? mouseAtk : 0, {
        equippedWeaponSkin: gs.equippedWeaponSkin || null,
        equippedArmorSkin: gs.equippedArmorSkin || null,
        riding,
      });
      wctx.restore();
    }
    if (mountDraw) { // 坐骑前半身盖住鼠鼠的腿
      wctx.save();
      wctx.beginPath(); wctx.rect(0, mountDraw.seat + 1, W, H); wctx.clip();
      PixelArt.draw(wctx, mountDraw.name, mountDraw.x, mountDraw.y, { frame: mountDraw.frame });
      wctx.restore();
    }
    if (shieldOn) drawShield(mp.x, mouseY + (riding ? 0 : fl) - 4);

    // 怪物
    const m = gs.currentMonster;
    if (m && !gs.isDead && PixelArt.has(m.name)) {
      if (monsterWalkIn < 1) monsterWalkIn = Math.min(1, monsterWalkIn + 0.05);
      const walkOff = Math.round((1 - easeOut(monsterWalkIn)) * (W - op.x + 30));
      const lunge = monsterLunge > 0 ? -Math.round(Math.sin((1 - monsterLunge / 12) * Math.PI) * 8) : 0;
      const knock = monsterHit > 0 ? Math.round(monsterHit * 0.35) : 0;
      const mx = op.x + walkOff + lunge + knock;
      const sz = PixelArt.size(m.name);
      shadow(mx, groundY + 1, Math.max(6, Math.floor(sz.w * 0.35)));
      const frame = Math.floor(animFrame / (monsterWalkIn < 1 ? 6 : 22)) % 2;
      if (m.isElite) drawEliteAura(m.name, mx, groundY, frame);
      PixelArt.draw(wctx, m.name, mx, groundY, { frame, flash: monsterHit > 6 ? 0.85 : 0 });
      m._screenX = mx; m._top = groundY - sz.ay;
    }

    // 正在消散的怪物像素
    if (dying) {
      dying.t++;
      for (const p of dying.px) {
        p.vy += 0.06; p.x += p.vx; p.y += p.vy;
        if (p.y > groundY) { p.y = groundY; p.vy *= -0.3; p.vx *= 0.6; }
        wctx.globalAlpha = Math.max(0, 1 - dying.t / 45);
        wctx.fillStyle = p.color; wctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
      wctx.globalAlpha = 1;
      if (dying.t > 45) dying = null;
    }

    drawCoins();
    drawEffects(gs);
    drawParticles();
    drawFortune(gs);
    if (levelBeam > 0) drawLevelBeam(mp.x, mouseY);
    if (trib) drawTribulation(gs, mp.x, mouseY);

    // 全屏闪光
    if (flash > 0) {
      wctx.globalAlpha = Math.min(1, flash); wctx.fillStyle = flashColor; wctx.fillRect(0, 0, W, H); wctx.globalAlpha = 1;
      flash -= 0.06;
    }

    // 衰减
    if (mouseAtk > 0) mouseAtk = Math.max(0, mouseAtk - 0.5);
    if (mouseHit > 0) mouseHit = Math.max(0, mouseHit - 0.5);
    if (monsterHit > 0) monsterHit = Math.max(0, monsterHit - 0.5);
    if (monsterLunge > 0) monsterLunge = Math.max(0, monsterLunge - 0.6);
    if (beastAtk > 0) beastAtk = Math.max(0, beastAtk - 0.6);
    if (levelBeam > 0) levelBeam--;
  }

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  function shadow(x, y, rx) {
    wctx.fillStyle = 'rgba(0,0,0,0.22)';
    wctx.fillRect(x - rx, y - 1, rx * 2, 2);
    wctx.fillRect(x - rx + 2, y - 2, rx * 2 - 4, 1);
  }

  function drawEliteAura(name, x, y, frame) {
    const sp = PixelArt.getSprite(name);
    if (!sp) return;
    const img = sp.flashes[frame % sp.flashes.length];
    const pulse = 0.45 + Math.sin(animFrame * 0.1) * 0.25;
    wctx.save();
    wctx.globalAlpha = pulse;
    // 金色描边光：白色剪影 + 叠色
    const tmp = eliteTmp(img);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) wctx.drawImage(tmp, x - sp.ax + dx, y - sp.ay + dy);
    wctx.restore();
  }
  const eliteCache = new WeakMap();
  function eliteTmp(img) {
    if (eliteCache.has(img)) return eliteCache.get(img);
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#FFD24A'; x.fillRect(0, 0, c.width, c.height);
    eliteCache.set(img, c);
    return c;
  }

  function drawShield(x, y) {
    const r = 13 + Math.round(Math.sin(animFrame * 0.1));
    wctx.fillStyle = 'rgba(255,216,107,0.18)';
    for (let yy = -r; yy <= r; yy++) { const w = Math.floor(Math.sqrt(r * r - yy * yy)); wctx.fillRect(x - w, y + yy, w * 2 + 1, 1); }
    wctx.fillStyle = 'rgba(255,230,140,0.9)';
    for (let a = 0; a < 40; a++) {
      const ang = a / 40 * Math.PI * 2 + animFrame * 0.02;
      if ((a + Math.floor(animFrame / 4)) % 5 === 0) continue;
      wctx.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), 1, 1);
    }
  }

  function drawLevelBeam(x, y) {
    const a = levelBeam / 50;
    wctx.fillStyle = `rgba(160,240,255,${0.35 * a})`;
    wctx.fillRect(x - 6, 0, 13, groundY);
    wctx.fillStyle = `rgba(255,255,255,${0.5 * a})`;
    wctx.fillRect(x - 2, 0, 5, groundY);
  }

  // ========== 天降机缘 ==========
  function fortunePos(f) {
    const life = GameEngine.FORTUNE_LIFE;
    const t = Math.max(0, Math.min(1, (Date.now() - f.spawnedAt) / life));
    const x = W + 12 - (W + 24) * t;
    const baseY = Math.floor(H * 0.3 + f.seed * H * 0.18);
    const y = baseY + Math.sin((Date.now() - f.spawnedAt) * 0.003 + f.seed * 6) * 6;
    return { x: Math.round(x), y: Math.round(y), t };
  }

  const FORTUNE_ART = {
    gold: (c, x, y) => { prect(c, x - 3, y - 1, 7, 6, '#8E5A2A'); prect(c, x - 2, y, 5, 4, '#B8783A'); prect(c, x - 1, y - 3, 3, 2, '#8E5A2A'); prect(c, x - 2, y - 4, 5, 1, '#FFD24A'); prect(c, x - 1, y + 1, 3, 2, '#FFD24A'); prect(c, x, y + 1, 1, 1, '#FFF6B0'); },
    herb: (c, x, y) => { prect(c, x, y - 1, 1, 6, '#3F8030'); prect(c, x - 3, y - 3, 3, 2, '#6DB547'); prect(c, x + 1, y - 4, 3, 2, '#8BD150'); prect(c, x - 2, y + 1, 2, 1, '#6DB547'); prect(c, x - 1, y - 6, 3, 3, '#E0566E'); prect(c, x, y - 5, 1, 1, '#FFB0C0'); },
    insight: (c, x, y) => { prect(c, x, y - 5, 1, 11, '#E6FBFF'); prect(c, x - 5, y, 11, 1, '#E6FBFF'); prect(c, x - 1, y - 1, 3, 3, '#FFFFFF'); prect(c, x - 2, y - 2, 1, 1, '#9FE8FF'); prect(c, x + 2, y + 2, 1, 1, '#9FE8FF'); prect(c, x + 2, y - 2, 1, 1, '#9FE8FF'); prect(c, x - 2, y + 2, 1, 1, '#9FE8FF'); },
    token: (c, x, y) => { prect(c, x - 3, y - 4, 7, 9, '#C9641E'); prect(c, x - 2, y - 3, 5, 7, '#FF9A4A'); prect(c, x - 1, y - 2, 3, 1, '#FFE0B0'); prect(c, x - 1, y, 3, 1, '#FFE0B0'); prect(c, x, y - 6, 1, 2, '#FFD24A'); },
    star: (c, x, y) => { prect(c, x, y - 5, 1, 11, '#FFD24A'); prect(c, x - 5, y - 1, 11, 2, '#FFD24A'); prect(c, x - 2, y - 3, 5, 6, '#FFD24A'); prect(c, x - 1, y - 2, 3, 3, '#FFF6B0'); prect(c, x - 4, y + 3, 2, 2, '#FFD24A'); prect(c, x + 3, y + 3, 2, 2, '#FFD24A'); },
  };

  function drawFortune(gs) {
    const f = gs.fortune;
    if (!f || Date.now() > f.until) return;
    const p = fortunePos(f);
    const remain = f.until - Date.now();
    if (remain < 2500 && Math.floor(animFrame / 4) % 2) return; // 快消失时闪烁
    // 光晕
    const pulse = 9 + Math.round(Math.sin(animFrame * 0.12) * 1.5);
    wctx.fillStyle = f.kind === 'star' ? 'rgba(255,220,100,0.28)' : 'rgba(255,245,200,0.22)';
    for (let yy = -pulse; yy <= pulse; yy++) { const w = Math.floor(Math.sqrt(pulse * pulse - yy * yy)); wctx.fillRect(p.x - w, p.y + yy, w * 2 + 1, 1); }
    // 拖尾星光
    if (animFrame % 3 === 0) particles.push({ x: p.x + 4, y: p.y + (Math.random() - 0.5) * 6, vx: 0.3, vy: 0.05, life: 22, color: f.kind === 'star' ? '#FFD24A' : '#FFF6C8', g: 0 });
    (FORTUNE_ART[f.kind] || FORTUNE_ART.gold)(wctx, p.x, p.y);
    f._screen = toScreen(p.x, p.y);
  }

  function hitFortune(clientX, clientY) {
    const gs = lastState;
    const f = gs && gs.fortune;
    if (!f || Date.now() > f.until) return false;
    const r = canvas.getBoundingClientRect();
    const wx = (clientX - r.left) / PX, wy = (clientY - r.top) / PX;
    const p = fortunePos(f);
    return Math.hypot(wx - p.x, wy - p.y) < 14;
  }

  function fortuneClaimFx(d) {
    const f = lastState && lastState.fortune;
    const p = f ? fortunePos(f) : { x: W / 2, y: H * 0.35 };
    const col = { gold: '#FFD24A', herb: '#8BD150', insight: '#BFF4FF', token: '#FF9A4A', star: '#FFE27A' }[d.kind] || '#FFFFFF';
    addParticlesWorld(p.x, p.y, col, 30, 2.2);
    addParticlesWorld(p.x, p.y, '#FFFFFF', 10, 1.6);
    addEffect({ type: 'ring', x: p.x, y: p.y, color: col });
    addText(p.x, p.y - 8, d.name, col, { pixel: false, size: 15, jitter: false, float: true, life: 60 });
    addText(p.x, p.y + 6, d.text, '#FFFFFF', { pixel: false, size: 12, jitter: false, float: true, life: 70 });
    if (d.kind === 'star') { flash = 0.35; flashColor = '#FFE8A0'; }
  }

  // ========== 渡劫演出 ==========
  function drawStormSky(gs) {
    const k = trib ? Math.min(1, trib.t / 30) : 0.5 + Math.sin(animFrame * 0.03) * 0.1;
    wctx.fillStyle = `rgba(20,8,40,${0.35 * k})`; wctx.fillRect(0, 0, W, H);
    const mp = mousePos();
    for (let i = 0; i < 6; i++) {
      const cx = mp.x - 40 + i * 16 + Math.sin(animFrame * 0.01 + i) * 4;
      pixelCloud(wctx, Math.round(cx), 8 + (i % 2) * 4, 26, `rgba(60,40,90,${0.8 * k})`, `rgba(30,20,50,${0.8 * k})`);
    }
    if (!trib && Math.random() < 0.01) { flash = 0.25; flashColor = '#C9A2FF'; }
  }

  function playTribulation(onResolve) {
    const t = { t: 0, bolts: [], resolved: false, onResolve, result: null };
    trib = t;
    if (typeof Sound !== 'undefined') Sound.play('storm');
    // 画面不在绘制（后台标签页）时也要能结算
    setTimeout(() => {
      if (t.resolved) return;
      t.resolved = true;
      t.result = t.onResolve ? t.onResolve() : null;
      if (trib === t) trib = null;
    }, 3500);
  }

  function drawTribulation(gs, x, y) {
    trib.t++;
    const strikeAt = [50, 85, 120];
    strikeAt.forEach((t, i) => {
      if (trib.t === t) {
        trib.bolts.push({ life: 14, seed: Math.random() * 1000, big: i === 2 });
        flash = i === 2 ? 0.9 : 0.6; flashColor = '#FFFFFF'; shake = i === 2 ? 10 : 6; mouseHit = 10;
        addParticlesWorld(x, y - 6, '#FFF6A0', 16, 2.5);
        if (typeof Sound !== 'undefined') Sound.play('thunder');
      }
    });
    for (const b of trib.bolts) {
      if (b.life-- <= 0) continue;
      const r = rng(Math.floor(b.seed));
      let px = x + Math.floor((r() - 0.5) * 30), py = 0;
      wctx.fillStyle = b.life > 8 ? '#FFFFFF' : '#C9E8FF';
      while (py < y - 4) {
        const nx = px + Math.floor((r() - 0.5) * 8), ny = py + 4 + Math.floor(r() * 4);
        const tx = nx + (x - nx) * (ny / y) * 0.5;
        lineW(px, py, tx, ny, b.big ? 3 : 2);
        px = tx; py = ny;
      }
      wctx.fillStyle = 'rgba(200,230,255,0.5)'; wctx.fillRect(x - 8, y - 12, 17, 14);
    }
    if (trib.t === 150 && !trib.resolved) {
      trib.resolved = true;
      const res = trib.onResolve ? trib.onResolve() : null;
      trib.result = res;
      if (res && res.success) {
        flash = 1; flashColor = '#FFF6C8'; shake = 4;
        addParticlesWorld(x, y - 8, '#FFD86A', 60, 3.5);
        addParticlesWorld(x, y - 8, '#FFFFFF', 30, 2.5);
        levelBeam = 90;
      } else {
        flash = 0.5; flashColor = '#FF4A6A'; shake = 8;
        addParticlesWorld(x, y - 8, '#8A6AB0', 30, 3);
      }
    }
    if (trib.t > 190) trib = null;
  }

  function lineW(x0, y0, x1, y1, w) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      wctx.fillRect(Math.round(x0 + (x1 - x0) * t) - Math.floor(w / 2), Math.round(y0 + (y1 - y0) * t), w, 1);
    }
  }

  // ========== 特效 ==========
  function addEffect(e) { effects.push({ t: 0, ...e }); }

  function drawEffects(gs) {
    const mp = mousePos();
    const m = gs.currentMonster;
    const tx = m && m._screenX ? m._screenX : monsterPos().x;
    const ty = groundY - 10;
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.t++;
      if (e.type === 'slash') {
        const k = e.t / 8;
        wctx.fillStyle = e.color || '#FFFFFF';
        for (let a = 0; a < 10; a++) {
          const ang = -1.2 + a * 0.25 + k * 0.4;
          const r = 10 + (e.big ? 4 : 0);
          wctx.fillRect(Math.round(tx - 2 + Math.cos(ang) * r * 0.6), Math.round(ty - 4 + Math.sin(ang) * r), e.big ? 2 : 1, 2);
        }
        if (e.t > 7) effects.splice(i, 1);
      } else if (e.type === 'swordqi') {
        const dur = 14;
        const p = Math.min(1, e.t / dur);
        const x = mp.x + 8 + (tx - mp.x - 8) * p;
        wctx.fillStyle = '#E6FBFF';
        for (let j = -6; j <= 6; j++) wctx.fillRect(Math.round(x - Math.abs(j) * 0.5), ty - 6 + j, 2, 1);
        wctx.fillStyle = '#7FDFFF';
        for (let j = -5; j <= 5; j++) wctx.fillRect(Math.round(x - 2 - Math.abs(j) * 0.5), ty - 6 + j, 1, 1);
        wctx.fillStyle = 'rgba(160,230,255,0.35)'; wctx.fillRect(Math.round(x - 20), ty - 7, 18, 2);
        if (e.t === dur) { addParticlesWorld(tx, ty - 6, '#BFF4FF', 18, 2.5); shake = Math.max(shake, 4); }
        if (e.t > dur) effects.splice(i, 1);
      } else if (e.type === 'myriad') {
        if (!e.swords) e.swords = Array.from({ length: 16 }, (_, k) => ({ x: tx + (Math.random() - 0.5) * 36, d: k * 2 + Math.random() * 3, hit: false }));
        let alive = false;
        for (const s of e.swords) {
          const tt = e.t - s.d;
          if (tt < 0) { alive = true; continue; }
          const y = -10 + tt * 9;
          if (y < groundY - 4) {
            alive = true;
            wctx.fillStyle = '#E8D8FF'; wctx.fillRect(Math.round(s.x), Math.round(y), 1, 7);
            wctx.fillStyle = '#C9A2FF'; wctx.fillRect(Math.round(s.x) - 1, Math.round(y) - 1, 3, 1);
            wctx.fillStyle = 'rgba(200,170,255,0.4)'; wctx.fillRect(Math.round(s.x), Math.round(y) - 8, 1, 8);
          } else if (!s.hit) { s.hit = true; addParticlesWorld(s.x, groundY - 4, '#C9A2FF', 4, 1.6); shake = Math.max(shake, 2); }
        }
        if (!alive) effects.splice(i, 1);
      } else if (e.type === 'heal') {
        wctx.fillStyle = '#7CF29A';
        for (let k = 0; k < 6; k++) {
          const x = mp.x - 10 + ((k * 7 + e.t) % 20), y = groundY - 4 - ((e.t * 0.8 + k * 9) % 28);
          wctx.fillRect(x, y - 1, 1, 3); wctx.fillRect(x - 1, y, 3, 1);
        }
        if (e.t > 40) effects.splice(i, 1);
      } else if (e.type === 'beam') {
        wctx.fillStyle = e.color; wctx.globalAlpha = 1 - e.t / 16;
        lineW(mp.x - 16, groundY - 8, tx, ty - 4, 2);
        wctx.globalAlpha = 1;
        if (e.t > 15) effects.splice(i, 1);
      } else if (e.type === 'ring') {
        const r = e.t * 1.5;
        wctx.fillStyle = e.color; wctx.globalAlpha = Math.max(0, 1 - e.t / 20);
        for (let a = 0; a < 32; a++) { const ang = a / 32 * Math.PI * 2; wctx.fillRect(Math.round(e.x + Math.cos(ang) * r), Math.round(e.y + Math.sin(ang) * r * 0.5), 1, 1); }
        wctx.globalAlpha = 1;
        if (e.t > 20) effects.splice(i, 1);
      } else effects.splice(i, 1);
    }
  }

  function addParticlesWorld(x, y, color, count, speed) {
    speed = speed || 1.5;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * speed;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, life: 25 + Math.random() * 25, color, g: 0.08 });
    }
  }

  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--;
      if (p.y > groundY) { p.y = groundY; p.vy *= -0.3; p.vx *= 0.7; }
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      wctx.globalAlpha = Math.min(1, p.life / 15);
      wctx.fillStyle = p.color; wctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    wctx.globalAlpha = 1;
    if (particles.length > 400) particles.splice(0, particles.length - 400);
  }

  function spawnCoins(x, y, n) {
    for (let i = 0; i < n; i++) coins.push({ x, y, vx: (Math.random() - 0.5) * 1.6, vy: -1.5 - Math.random() * 1.2, life: 60 + Math.random() * 20 });
  }
  function drawCoins() {
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.x += c.vx; c.y += c.vy; c.vy += 0.1; c.life--;
      if (c.y > groundY - 1) { c.y = groundY - 1; c.vy *= -0.45; c.vx *= 0.7; }
      if (c.life <= 0) { coins.splice(i, 1); continue; }
      const blink = c.life < 20 && Math.floor(c.life / 3) % 2;
      if (blink) continue;
      wctx.fillStyle = '#FFD24A'; wctx.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 1, 2, 2);
      wctx.fillStyle = '#FFF6B0'; wctx.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 1, 1, 1);
    }
  }

  // ========== 高清界面层 ==========
  function drawOverlay(gs) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const m = gs.currentMonster;
    if (m && !gs.isDead && m._screenX !== undefined && monsterWalkIn > 0.6) drawMonsterBar(m);
    if (!gs.isDead) drawPlayerBar(gs);
    if (gs.fortune && gs.fortune._screen && Date.now() < gs.fortune.until) {
      const sp = gs.fortune._screen;
      ctx.font = 'bold 11px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
      ctx.globalAlpha = 0.6 + Math.sin(animFrame * 0.15) * 0.4;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText('点我', sp.x, sp.y - 13 * PX / 2 - 6);
      ctx.fillStyle = '#FFF2B0'; ctx.fillText('点我', sp.x, sp.y - 13 * PX / 2 - 6);
      ctx.globalAlpha = 1;
    }
    drawTexts();
  }

  function drawMonsterBar(m) {
    const s = toScreen(m._screenX, groundY);
    const bw = 76, bh = 6;
    const x = Math.round(s.x - bw / 2), y = Math.round(s.y + PX * 5 + 18);
    // 名字
    ctx.font = 'bold 12px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const name = (m.isElite ? '★ ' : '') + m.name;
    const traitIcon = m.trait && GameEngine.TRAIT_INFO[m.trait] ? GameEngine.TRAIT_INFO[m.trait].icon + ' ' : '';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(traitIcon + name, s.x, y - 5);
    ctx.fillStyle = m.isElite ? '#FFD86A' : '#F2EEE6';
    ctx.fillText(traitIcon + name, s.x, y - 5);
    // 血条
    ctx.fillStyle = 'rgba(10,8,20,0.85)'; ctx.fillRect(x - 2, y - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#3A2230'; ctx.fillRect(x, y, bw, bh);
    const pct = Math.max(0, m.hp / m.maxHp);
    const barCols = ['#E8485A', '#F08A3A', '#F2C84A', '#6AD06A', '#5AA8F0'];
    ctx.fillStyle = m.hpBars > 1 ? barCols[Math.min(barCols.length - 1, m.currentBar - 1)] : (pct > 0.5 ? '#E8485A' : pct > 0.25 ? '#F08A3A' : '#FF5A5A');
    if (m.hpBars > 1 && m.currentBar > 1) { ctx.fillStyle = '#3A2230'; ctx.fillRect(x, y, bw, bh); ctx.fillStyle = barCols[Math.min(barCols.length - 1, m.currentBar - 2)]; ctx.fillRect(x, y, bw, bh); ctx.fillStyle = barCols[Math.min(barCols.length - 1, m.currentBar - 1)]; }
    ctx.fillRect(x, y, Math.round(bw * pct), bh);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, Math.round(bw * pct), 2);
    if (m.hpBars > 1) {
      ctx.font = 'bold 10px "Press Start 2P",monospace'; ctx.textAlign = 'left';
      ctx.fillStyle = '#FFD86A'; ctx.fillText('×' + m.currentBar, x + bw + 5, y + 7);
    }
  }

  function drawPlayerBar(gs) {
    const mp = mousePos();
    const s = toScreen(mp.x, groundY);
    const bw = 60, bh = 5;
    const x = Math.round(s.x - bw / 2), y = Math.round(s.y + PX * 5 + 6);
    ctx.font = 'bold 12px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText('鼠鼠', s.x, y - 6); ctx.fillStyle = '#E8F6FF'; ctx.fillText('鼠鼠', s.x, y - 6);
    const pct = Math.max(0, gs.hp / gs.computed.maxHp);
    ctx.fillStyle = 'rgba(10,8,20,0.85)'; ctx.fillRect(x - 2, y - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#233024'; ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = pct > 0.5 ? '#5AD06A' : pct > 0.25 ? '#E8C84A' : '#E8485A';
    ctx.fillRect(x, y, Math.round(bw * pct), bh);
    if (gs.shield && gs.shield.amount > 0) {
      const sp = Math.min(1, gs.shield.amount / gs.computed.maxHp);
      ctx.fillStyle = '#FFD86A'; ctx.fillRect(x, y - 4, Math.round(bw * sp), 2);
    }
  }

  // 伤害数字（屏幕坐标）
  function addText(wx, wy, text, color, opts) {
    opts = opts || {};
    const s = toScreen(wx, wy);
    let oy = 0;
    for (const t of texts) if (Math.abs(t.x - s.x) < 50 && Math.abs(t.y0 - (s.y + oy)) < 16 && t.life > t.max - 16) oy -= 16;
    texts.push({
      x: s.x + (opts.jitter === false ? 0 : (Math.random() - 0.5) * 24), y: s.y + oy, y0: s.y + oy, text, color,
      size: opts.size || 13, life: opts.life || 55, max: opts.life || 55, vy: opts.float ? -0.6 : -2.2, pixel: opts.pixel !== false, crit: !!opts.crit, stroke: opts.stroke,
    });
    if (texts.length > 60) texts.splice(0, texts.length - 60);
  }

  function drawTexts() {
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life--;
      t.y += t.vy; t.vy = Math.min(0.8, t.vy + 0.09);
      if (t.vy > 0 && t.y > t.y0) t.vy = 0;
      if (t.life <= 0) { texts.splice(i, 1); continue; }
      const age = t.max - t.life;
      const pop = age < 5 ? 1 + (5 - age) * (t.crit ? 0.14 : 0.06) : 1;
      ctx.globalAlpha = Math.min(1, t.life / 14);
      const fs = Math.round(t.size * pop);
      ctx.font = t.pixel ? `${fs}px "Press Start 2P",monospace` : `bold ${fs + 2}px "PingFang SC","Microsoft YaHei",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = t.pixel ? 4 : 4; ctx.strokeStyle = t.stroke || 'rgba(10,6,18,0.9)'; ctx.lineJoin = 'round';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  // ========== 对外事件接口 ==========
  function monsterTopWorld() {
    const gs = lastState;
    const m = gs && gs.currentMonster;
    const x = m && m._screenX ? m._screenX : monsterPos().x;
    const top = m && m._top ? m._top : groundY - 20;
    return { x, y: top };
  }
  function mouseTopWorld() { const mp = mousePos(); const gs = lastState; const riding = gs && gs.visualEquip && gs.visualEquip.mount; return { x: mp.x, y: (lastMouseY || groundY - 7) - 19 + (gs && !riding ? mouseFloat(gs.realmIndex) : 0) }; }

  let lastAttackFx = 0;
  const FX = {
    attack(d) {
      const now = performance.now();
      if (now - lastAttackFx < 180) { lastAttackFx = now + 220; setTimeout(() => FX._attack(d), 220); return; }
      lastAttackFx = now;
      FX._attack(d);
    },
    _attack(d) {
      mouseAtk = 10; monsterHit = 9;
      const t = monsterTopWorld();
      addEffect({ type: 'slash', big: d.isCrit, color: d.isCrit ? '#FFE27A' : '#FFFFFF' });
      if (d.isCrit) { shake = Math.max(shake, 4); addText(t.x, t.y - 4, GameEngine.formatNumber(d.damage) + '!', '#FFD24A', { size: 17, crit: true }); }
      else addText(t.x, t.y - 2, GameEngine.formatNumber(d.damage), '#FFFFFF', { size: 12 });
      if (d.thunder) addText(t.x, t.y - 16, '天雷!', '#9FD0FF', { pixel: false, size: 12 });
      addParticlesWorld(t.x - 4, groundY - 10, d.isCrit ? '#FFE27A' : '#FFFFFF', d.isCrit ? 10 : 4, 1.4);
    },
    skillCast(d) {
      const mp = mouseTopWorld(), t = monsterTopWorld();
      if (d.id === 'sword_qi') {
        mouseAtk = 12;
        addEffect({ type: 'swordqi' });
        setTimeout(() => { monsterHit = 12; addText(t.x, t.y - 6, GameEngine.formatNumber(d.damage) + (d.isCrit ? '!' : ''), '#9FE8FF', { size: d.isCrit ? 18 : 15, crit: true }); }, 230);
        addText(mp.x, mp.y - 6, '剑气斩', '#BFF4FF', { pixel: false, size: 13, float: true, jitter: false, life: 45 });
      } else if (d.id === 'myriad_swords') {
        mouseAtk = 12;
        addEffect({ type: 'myriad' });
        flash = 0.25; flashColor = '#C9A2FF';
        setTimeout(() => { monsterHit = 14; shake = 7; addText(t.x, t.y - 8, GameEngine.formatNumber(d.damage) + '!', '#E0C8FF', { size: 20, crit: true }); }, 420);
        addText(mp.x, mp.y - 6, '万剑归宗', '#E0C8FF', { pixel: false, size: 15, float: true, jitter: false, life: 60 });
      } else if (d.id === 'heal_spring') {
        addEffect({ type: 'heal' });
        addEffect({ type: 'ring', x: mousePos().x, y: groundY - 2, color: '#7CF29A' });
        addText(mp.x, mp.y, '+' + GameEngine.formatNumber(d.heal), '#7CF29A', { size: 13 });
      } else if (d.id === 'golden_shield') {
        addEffect({ type: 'ring', x: mousePos().x, y: groundY - 8, color: '#FFD86A' });
        addText(mp.x, mp.y - 6, '金光罩', '#FFD86A', { pixel: false, size: 13, float: true, jitter: false, life: 45 });
      }
    },
    beastAttack(d) {
      beastAtk = 18;
      const t = monsterTopWorld();
      setTimeout(() => {
        monsterHit = Math.max(monsterHit, 6);
        const col = { fire_cat: '#FF8A4A', ice_wolf: '#9FD8FF', thunder_eagle: '#FFE27A', shadow_serpent: '#C9A2FF', jade_dragon: '#7CF2C8', phoenix: '#FF6A5A' }[d.templateId] || '#FF88FF';
        addParticlesWorld(t.x - 6, groundY - 8, col, 6, 1.5);
        addText(t.x + 10, t.y + 4, GameEngine.formatNumber(d.damage), col, { size: 11 });
      }, 180);
    },
    monsterAttack(d) {
      monsterLunge = 12;
      setTimeout(() => {
        mouseHit = 8;
        const mp = mouseTopWorld();
        addText(mp.x, mp.y + 4, '-' + GameEngine.formatNumber(d.damage), d.isCrit ? '#FF4A6A' : '#FF8A8A', { size: d.isCrit ? 15 : 11, crit: d.isCrit });
        addParticlesWorld(mousePos().x, groundY - 10, '#FF6A7A', 3, 1);
        if (d.isCrit) shake = Math.max(shake, 5);
      }, 160);
    },
    shieldAbsorb(d) { const mp = mouseTopWorld(); addText(mp.x + 12, mp.y + 8, '护盾', '#FFD86A', { pixel: false, size: 10 }); },
    dodge() { const mp = mouseTopWorld(); addText(mp.x, mp.y, '闪避', '#9FE8FF', { pixel: false, size: 12 }); },
    monsterDodge() { const t = monsterTopWorld(); addText(t.x, t.y, 'MISS', '#AAAAAA', { size: 11 }); },
    dotDamage(d) { const mp = mouseTopWorld(); addText(mp.x + 14, mp.y + 10, '-' + GameEngine.formatNumber(d.damage), d.type === 'poison' ? '#8BE06A' : '#FF9A4A', { size: 10 }); },
    traitTrigger(d) { const t = monsterTopWorld(); addText(t.x, t.y - 20, d.msg, '#F0A6FF', { pixel: false, size: 12, jitter: false }); },
    hpBarBreak(d) { const t = monsterTopWorld(); shake = 5; addParticlesWorld(t.x, groundY - 12, '#FFD86A', 14, 2); addText(t.x, t.y - 22, `破防！剩${d.barsLeft}管`, '#FFD86A', { pixel: false, size: 13, jitter: false }); },
    kill(d) {
      const gs = lastState;
      const m = d.monster;
      monsterWalkIn = 0;
      if (performance.now() - lastStep > 400) return;
      const x = m._screenX || monsterPos().x;
      const px = PixelArt.samplePixels(m.name, 160).map(p => ({ x: x + p.x, y: groundY + p.y, color: p.color, vx: (Math.random() - 0.3) * 1.4, vy: -Math.random() * 1.6 }));
      dying = { t: 0, px };
      spawnCoins(x, groundY - 10, Math.min(8, 2 + (m.isElite ? 6 : 0)));
      const t = { x, y: groundY - 30 };
      addText(t.x, t.y - 10, '+' + GameEngine.formatNumber(d.goldGain), '#FFD86A', { size: 10, jitter: false, float: true, life: 50 });
      if (m.isElite) { addText(t.x, t.y - 26, '精英击杀！', '#FFD86A', { pixel: false, size: 15, jitter: false }); flash = 0.3; flashColor = '#FFE8A0'; }
      monsterWalkIn = 0;
      const ks = gs ? gs.consecutiveKills : 0;
      if ([10, 25, 50, 100, 200].includes(ks)) addText(W / 2, H * 0.3, `${ks} 连斩！`, '#FF9A4A', { pixel: false, size: 22, jitter: false, float: true, life: 70 });
    },
    spawn() { /* 走入动画在击杀时重置 */ },
    levelup(d) { levelBeam = 50; const mp = mouseTopWorld(); addText(mp.x, mp.y - 12, 'LEVEL UP', '#9FF0FF', { size: 14, jitter: false, float: true, life: 70 }); addParticlesWorld(mousePos().x, groundY - 10, '#9FF0FF', 16, 1.8); },
    death() { shake = 8; flash = 0.35; flashColor = '#FF3A4A'; addParticlesWorld(mousePos().x, groundY - 10, '#FF6A7A', 24, 2.2); },
    revive() { addEffect({ type: 'ring', x: mousePos().x, y: groundY - 6, color: '#7CF29A' }); addParticlesWorld(mousePos().x, groundY - 10, '#7CF29A', 20, 1.8); },
    autoHeal() { const mp = mouseTopWorld(); addText(mp.x, mp.y - 10, '回元丹', '#7CF29A', { pixel: false, size: 12, jitter: false }); addEffect({ type: 'heal' }); },
    equipDrop(d) { const t = monsterTopWorld(); if (d.equip.qualityIdx >= 2) addText(t.x, t.y - 34, '装备!', d.equip.qualityColor, { pixel: false, size: 14, jitter: false, float: true }); },
    tokenDrop(d) { const t = monsterTopWorld(); addText(t.x + 16, t.y - 40, `+${d.amount} 天机令`, '#FF9A4A', { pixel: false, size: 12, jitter: false, float: true }); },
    encounter() { flash = 0.2; flashColor = '#FFE8A0'; addParticlesWorld(mousePos().x, groundY - 16, '#FFD86A', 20, 2); },
    beastCapture() { flash = 0.25; flashColor = '#FFB0E8'; addParticlesWorld(mousePos().x - 20, groundY - 10, '#FFB0E8', 30, 2.4); },
    achievement() { addParticlesWorld(mousePos().x, groundY - 20, '#FFD86A', 20, 2.2); },
    tribulationFail() { },
    breakthrough() { },
    ascension() { flash = 1; flashColor = '#FFFFFF'; levelBeam = 120; addParticlesWorld(mousePos().x, groundY - 10, '#FFD86A', 80, 4); },
    fortuneClaim(d) { fortuneClaimFx(d); },
    pillUse(d) {
      if (d.auto) return; const mp = mouseTopWorld(); addText(mp.x, mp.y - 10, d.recipe.name, '#FFB0E8', { pixel: false, size: 12, jitter: false, float: true }); addEffect({ type: 'ring', x: mousePos().x, y: groundY - 6, color: '#FFB0E8' }); },
  };

  // 画面没有在绘制（标签页在后台）时不堆积特效
  function handleEvent(type, data) {
    if (!FX[type]) return;
    if (performance.now() - lastStep > 400 && !['kill', 'spawn'].includes(type)) return;
    FX[type](data || {});
  }

  function isTribulating() { return !!trib; }

  return {
    init, render, step, resize, handleEvent, hitFortune, playTribulation, isTribulating,
    getCanvas: () => canvas,
    addParticlesWorld,
  };
})();
