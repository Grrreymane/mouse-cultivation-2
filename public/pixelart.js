// ============================================================
// pixelart.js — 鼠鼠修仙 像素生物（怪物 / 灵兽 / 坐骑）
// 用一个很小的"像素雕刻"DSL 生成：椭圆/矩形/三角形体块 +
// 球面光照三色阶 + 自动描边 + 手点五官。每帧缓存成离屏画布，
// 与 sprites.js 里 v1 手绘鼠鼠同样是 1 像素 = 1 个方块。
// 怪物默认面朝左（朝向鼠鼠），灵兽/坐骑面朝右。
// ============================================================

const PixelArt = (() => {
  'use strict';

  // ---------- 调色板（亮 / 中 / 暗）----------
  const M = {
    ratFur:   ['#B9B1C9', '#8C829F', '#5F5673'],
    ratBelly: ['#DCD6E4', '#C4BCD2', '#A49BB4'],
    pink:     ['#F4B6C8', '#E08AA6', '#B8627F'],
    toad:     ['#A6E07A', '#6DB547', '#3F8030'],
    toadBelly:['#F2F0B0', '#D9D48A', '#B3AD62'],
    wart:     ['#C77DDB', '#9B4FB5', '#6E3288'],
    fox:      ['#FFB070', '#F07A36', '#B8501F'],
    foxWhite: ['#FFF6EA', '#F1DFC8', '#CDB8A0'],
    iron:     ['#C9D3E0', '#8F9CB0', '#5E6A7E'],
    bronze:   ['#E3B86A', '#B98A3E', '#80592A'],
    ink:      ['#6C7390', '#3E4460', '#23273A'],
    inkBelly: ['#B9C3D6', '#8E99B2', '#66708A'],
    inkFin:   ['#4A8A9A', '#2E6070', '#1A3A48'],
    leopardDark:['#D8A838', '#A87C20', '#704E10'],
    leopardBelly:['#FFF6D0', '#F4E4A8', '#CDB878'],
    jiaoFin:  ['#3A8A6A', '#22664C', '#123E2E'],
    ape:      ['#C08A5A', '#8E5E36', '#603C20'],
    apeFace:  ['#F0CDA8', '#D9A882', '#B0805E'],
    ice:      ['#E6FBFF', '#A8E4F5', '#6AB3D6'],
    iceDark:  ['#8FC6E8', '#5B93C4', '#3A6497'],
    crow:     ['#5B4A6E', '#3A2D4A', '#231A2E'],
    fire:     ['#FFE27A', '#FFA23A', '#E0561E'],
    leopard:  ['#FFE58A', '#F2C23E', '#C48E20'],
    ghost:    ['#E6E9FF', '#AEB5E8', '#7A80BE'],
    robeDark: ['#5E5F8E', '#3C3D66', '#252645'],
    jiao:     ['#8FE0B4', '#4DB889', '#2D7F5E'],
    jiaoBelly:['#F4F0C0', '#DDD38E', '#B3A762'],
    blood:    ['#FF7A7A', '#D23A48', '#8E1F2E'],
    skin:     ['#F6E0D0', '#E2BFA8', '#B8917C'],
    demon:    ['#9B6BD6', '#6A3FA8', '#40226E'],
    gold:     ['#FFF0A0', '#FFD24A', '#C9941E'],
    fox9:     ['#FFFDF6', '#EDE4F7', '#BDB0D6'],
    thunder:  ['#9FD0FF', '#4F8FE8', '#2B56A8'],
    chaos:    ['#8A7BA8', '#574878', '#33284D'],
    godRobe:  ['#3B2C5A', '#26193F', '#150D26'],
    catRed:   ['#FF9E6A', '#F26A3A', '#B8421E'],
    wolf:     ['#D8E8FF', '#9FBCE6', '#6A88BA'],
    eagle:    ['#E8C48A', '#B98A4E', '#7E5A2C'],
    serpent:  ['#5A4A78', '#342A50', '#1A142C'],
    dragonJ:  ['#9CF0D0', '#46C7A0', '#23866A'],
    dragonT:  ['#86E4D6', '#3AAEAA', '#1E6E78'],
    dragonFin:['#3A9A9A', '#1E6E78', '#12464E'],
    dragonBelly:['#FFF4C8', '#EAD89A', '#C4AE66'],
    dragonMane:['#A8F4C8', '#5CD2A0', '#2E9A74'],
    antler:   ['#E8C898', '#B8844E', '#7A5230'],
    catCream: ['#FFF4E4', '#F6D8B8', '#D8B090'],
    catPink:  ['#FFC8D0', '#F09AAA', '#C87080'],
    wolfDark: ['#8FA8CE', '#6A86B0', '#4A6490'],
    wolfLight:['#FFFFFF', '#E6F0FF', '#BFD0EA'],
    eagleDark:['#C89A5A', '#8E6430', '#5E3E18'],
    eagleLight:['#FFF4D0', '#F0DCA0', '#C8B070'],
    eagleHead:['#FFFFFF', '#F4ECD8', '#CFC2A0'],
    serpentBelly:['#E0B8FF', '#A868E8', '#6A30A8'],
    phoenixDark:['#E0503A', '#B02A20', '#7A1418'],
    phoenixTail:['#FFB24A', '#FF7A1A', '#C8440E'],
    craneWing:['#FFFFFF', '#E8ECF4', '#C0C6D4'],
    qilinDark:['#D8A040', '#A87424', '#704814'],
    qilinBelly:['#FFF4C8', '#F0DC98', '#C8AE66'],
    phoenix:  ['#FFB27A', '#FF5A4A', '#B8243A'],
    crane:    ['#FFFFFF', '#E6EAF2', '#B6BDCC'],
    qilin:    ['#FFE9A0', '#F2B94A', '#B97F22'],
    qilinMane:['#FF9A6A', '#E65A3A', '#A83424'],
    horn:     ['#FFF6D8', '#E8D8A8', '#B8A474'],
    bone:     ['#FFFFFF', '#E8E4DA', '#B8B2A4'],
    cloud:    ['#FFFFFF', '#E3ECFF', '#A9BCE6'],
    stone:    ['#A8A2B8', '#7A7390', '#4E4863'],
  };

  // ---------- 建模画布 ----------
  function makeGrid(w, h) {
    return { w, h, px: new Array(w * h).fill(null), mat: new Array(w * h).fill(null) };
  }

  function makeTools(g) {
    const set = (x, y, color, mat) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= g.w || y >= g.h) return;
      g.px[y * g.w + x] = color; g.mat[y * g.w + x] = mat || null;
    };
    const tone = (mat, t) => (M[mat] || [mat, mat, mat])[t];
    const T = {
      // 球面光照椭圆（光从左上来）
      E(cx, cy, rx, ry, mat, opt) {
        opt = opt || {};
        const lx = opt.lx !== undefined ? opt.lx : -0.55, ly = opt.ly !== undefined ? opt.ly : -0.75;
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
          for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
            const u = (x - cx) / (rx + 0.35), v = (y - cy) / (ry + 0.35);
            if (u * u + v * v > 1) continue;
            const d = u * lx + v * ly;
            const t = opt.flat ? 1 : (d > 0.42 ? 0 : d < -0.38 ? 2 : 1);
            set(x, y, tone(mat, t), mat);
          }
        }
      },
      // 矩形：顶部一行亮、底部一行暗
      R(x, y, w, h, mat, opt) {
        opt = opt || {};
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          let t = 1;
          if (!opt.flat) { if (j === 0 && h > 2) t = 0; else if (j === h - 1 && h > 1) t = 2; }
          set(x + i, y + j, tone(mat, t), mat);
        }
      },
      // 三角形（重心坐标填充）
      T(x1, y1, x2, y2, x3, y3, mat, t) {
        const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
        const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
        const area = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
        if (!area) return;
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
          const w1 = ((x2 - x) * (y3 - y) - (x3 - x) * (y2 - y)) / area;
          const w2 = ((x3 - x) * (y1 - y) - (x1 - x) * (y3 - y)) / area;
          const w3 = 1 - w1 - w2;
          if (w1 >= -0.02 && w2 >= -0.02 && w3 >= -0.02) set(x, y, tone(mat, t === undefined ? 1 : t), mat);
        }
      },
      // 线段（Bresenham），可指定粗细
      L(x0, y0, x1, y1, colorOrMat, thick, t) {
        const c = M[colorOrMat] ? tone(colorOrMat, t === undefined ? 1 : t) : colorOrMat;
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          for (let a = 0; a < (thick || 1); a++) for (let b = 0; b < (thick || 1); b++) set(x0 + a, y0 + b, c, M[colorOrMat] ? colorOrMat : null);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      },
      // 单像素（直接颜色或材质色阶）
      P(x, y, colorOrMat, t) { set(x, y, M[colorOrMat] ? tone(colorOrMat, t === undefined ? 1 : t) : colorOrMat, M[colorOrMat] ? colorOrMat : null); },
      // 像素串：P([[x,y],...], color)
      PS(list, color, t) { for (const [x, y] of list) T.P(x, y, color, t); },
      // Q版眼睛：2×2 深色 + 1 高光（与鼠鼠同款）
      eye(x, y, color, size) {
        const s = size || 2;
        for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) set(x + i, y + j, color || '#141022');
        set(x, y, '#FFFFFF');
      },
      // 凶眼：带颜色的眼白 + 竖瞳
      evilEye(x, y, color) {
        set(x, y, color); set(x + 1, y, color); set(x, y + 1, color); set(x + 1, y + 1, '#1A0A10');
      },
      clear(x, y) { set(x, y, null, null); },
      tone,
    };
    return T;
  }

  // 描边：透明像素若四邻有实心像素则着描边色
  function outline(g, color) {
    const out = g.px.slice();
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (g.px[y * g.w + x]) continue;
      const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < g.w && yy < g.h && g.px[yy * g.w + xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out[y * g.w + x] = color;
    }
    g.px = out;
  }

  function toCanvas(g) {
    const c = document.createElement('canvas');
    c.width = g.w; c.height = g.h;
    const cx = c.getContext('2d');
    const img = cx.createImageData(g.w, g.h);
    for (let i = 0; i < g.px.length; i++) {
      const col = g.px[i];
      if (!col) continue;
      const rgba = parseColor(col);
      img.data[i * 4] = rgba[0]; img.data[i * 4 + 1] = rgba[1]; img.data[i * 4 + 2] = rgba[2]; img.data[i * 4 + 3] = rgba[3];
    }
    cx.putImageData(img, 0, 0);
    return c;
  }

  const colorCache = {};
  function parseColor(c) {
    if (colorCache[c]) return colorCache[c];
    let r = 0, g = 0, b = 0, a = 255;
    if (c[0] === '#') {
      const h = c.slice(1);
      if (h.length === 3 || h.length === 4) {
        r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16);
        if (h.length === 4) a = parseInt(h[3] + h[3], 16);
      } else {
        r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
        if (h.length === 8) a = parseInt(h.slice(6, 8), 16);
      }
    }
    return (colorCache[c] = [r, g, b, a]);
  }

  function silhouette(src, color) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const cx = c.getContext('2d');
    cx.drawImage(src, 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = color; cx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // ---------- 生物定义 ----------
  // w,h: 画布尺寸（含描边留白）；ax,ay: 脚底锚点；frames: 帧数；draw(T, f)
  const DEFS = {};
  const def = (name, spec) => { DEFS[name] = spec; };
  const OL = '#1B1428';

  // ===== 炼气期 =====
  // ===== 炼气期 v3.3（面朝左）=====
  def('灰毛妖鼠', { w: 36, h: 24, ax: 16, ay: 23, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    // 长尾
    T.tube([[24, 18], [29, 17], [32, 13 - b], [34, 8 - b], [32, 5 - b]], 1.4, 0.8, 'pink');
    // 远侧腿
    T.R(20, 18, 3, 4, 'ratFur', { flat: true }); T.R(20, 18, 3, 4, '#5F5673', { flat: true });
    // 弓背的身体
    T.E(18, 15, 9, 6, 'ratFur');
    T.E(16, 19, 6, 2.4, 'ratBelly');
    for (const x of [14, 18, 22]) T.L(x, 10, x + 1, 13, 'ratFur', 1, 2);   // 毛纹
    T.PS([[15, 9], [19, 9], [23, 10]], 'ratFur', 0);
    // 近侧腿 + 爪
    T.R(10, 18 - b, 3, 4 + b, 'ratFur'); T.R(24, 18 + b, 3, 4 - b, 'ratFur');
    T.PS([[9, 22], [11, 22], [23, 22], [25, 22]], 'pink', 1);
    // 头
    T.E(8, 12, 6, 5, 'ratFur');
    T.E(3, 14, 3.4, 2.4, 'ratFur');                    // 尖吻
    T.P(0, 13, 'pink', 1); T.P(0, 14, 'pink', 2);      // 鼻
    T.E(12, 6, 3, 3.2, 'ratFur'); T.E(12, 6.3, 1.8, 2, 'pink');   // 耳
    T.E(6, 7, 2.2, 2.4, 'ratFur'); T.P(6, 7, 'pink');
    T.P(5, 5, OL);                                     // 耳朵缺口
    T.evilEye(5, 10, '#FF3A4A');
    T.L(4, 9, 7, 10, '#3A3050');                      // 怒眉
    T.P(2, 16, '#FFFFF0'); T.P(3, 16, '#FFFFF0'); T.P(2, 17, '#E8E0C8');   // 龅牙
  }, post(T) {
    T.L(-1, 13, 2, 12, '#8E86A0'); T.L(-1, 15, 2, 15, '#8E86A0');
  } });

  def('毒蟾蜍', { w: 36, h: 26, ax: 18, ay: 25, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    // 后腿
    T.E(27, 20, 5, 4, 'toad'); T.R(28, 22, 6, 2, 'toad');
    // 身体（呼吸起伏）
    T.E(18, 15 - b * 0.5, 12, 8.5 + b * 0.5, 'toad');
    T.E(15, 19, 9, 4, 'toadBelly');
    // 暗斑 + 毒疣
    for (const [x, y, r] of [[22, 10, 1.6], [26, 14, 1.8], [19, 8, 1.2], [28, 9, 1.2]]) T.E(x, y, r, r, 'wart');
    for (const [x, y] of [[17, 12], [24, 18], [13, 9]]) { T.P(x, y, 'toad', 2); T.P(x + 1, y, 'toad', 2); }
    // 前腿
    T.R(7, 19, 3, 5, 'toad'); T.R(5, 23, 5, 1, 'toad', { flat: true });
    // 眼包 + 大眼
    T.E(10, 7 + b * 0.5, 3.6, 3.4, 'toad'); T.E(17, 6 + b * 0.5, 3.6, 3.4, 'toad');
    for (const ex of [9, 16]) { T.E(ex + 1, 6 + b * 0.5 + (ex === 9 ? 1 : 0), 1.6, 1.6, '#FFE070', { flat: true }); T.P(ex + 1, 6 + (ex === 9 ? 1 : 0) + b, '#1A1020'); T.P(ex, 5 + (ex === 9 ? 1 : 0) + b, '#FFFFFF'); }
    // 大嘴
    T.L(3, 14, 14, 15, '#2D5A22'); T.P(3, 13, '#2D5A22'); T.P(8, 16, '#C85070');
  }, post(T, f) {
    // 毒泡
    const b = f ? 1 : 0;
    T.E(30 - b, 3 - b, 1.2, 1.2, '#B6F27A', { flat: true }); T.P(33, 6 + b, '#8BD150'); T.P(26, 1 + b, '#DCFFB0');
  } });

  def('赤狐妖', { w: 42, h: 28, ax: 16, ay: 27, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    // 两条大尾巴（白尖）
    T.tube([[26, 16], [31, 12], [36, 9 - b], [40, 10 - b]], 2.6, 3.2, 'fox');
    T.E(40, 10 - b, 2.4, 2.4, 'foxWhite');
    T.tube([[26, 18], [32, 18], [37, 20 + b], [40, 23 + b]], 2.4, 3, 'fox');
    T.E(40, 23 + b, 2.2, 2.2, 'foxWhite');
    // 远侧腿（黑袜）
    T.R(12, 19, 2, 7, 'fox', { flat: true }); T.R(22, 19, 2, 7, 'fox', { flat: true }); T.R(12, 23, 2, 3, '#3A1E14', { flat: true }); T.R(22, 23, 2, 3, '#3A1E14', { flat: true });
    // 身体
    T.E(18, 16, 9, 5, 'fox');
    T.E(13, 18, 4, 3, 'foxWhite');
    // 近侧腿
    T.R(9, 19 - b, 3, 8 + b, 'fox'); T.R(24, 19 + b, 3, 8 - b, 'fox');
    T.R(9, 23, 3, 4, '#3A1E14', { flat: true }); T.R(24, 23, 3, 4, '#3A1E14', { flat: true });
    // 头
    T.E(8, 10, 5.5, 4.8, 'fox');
    T.E(3, 12, 3.4, 2, 'fox'); T.E(4, 13.5, 3, 1.2, 'foxWhite');
    T.E(10, 12.5, 2.4, 2, 'foxWhite');                     // 颊毛
    T.T(5, 7, 6, 0, 10, 6, 'fox', 1); T.T(6.3, 6, 6.8, 2.5, 8.8, 5.6, '#3A1E14', 1);
    T.T(10, 6, 13, 0, 14, 8, 'fox', 2); T.T(11.5, 5.5, 12.8, 2.5, 13.2, 6.8, '#3A1E14', 1);
    T.P(0, 11, '#2A1418'); T.P(1, 11, '#2A1418');
    // 狭长狐眼
    T.P(4, 9, '#FFD23A'); T.P(5, 9, '#FFD23A'); T.P(6, 8, '#2A1418'); T.P(5, 10, '#2A1418');
  }, post(T, f) {
    // 狐火（青白色）
    const b = f ? 1 : 0;
    for (const [x, y] of [[36, 3], [30, 5]]) { T.P(x, y - b, '#E0FFFF'); T.P(x, y + 1 - b, '#8AE8FF'); T.P(x - 1, y + 1 - b, '#5AC8F0'); T.P(x + 1, y + 1 - b, '#5AC8F0'); T.P(x, y + 2 - b, '#3AA0E0'); }
  } });

  // ===== 筑基期 v3.3 =====
  def('铁甲傀儡', { w: 34, h: 40, ax: 17, ay: 39, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    // 腿
    T.R(9, 29, 6, 10, 'iron'); T.R(19, 29, 6, 10, 'iron');
    T.R(9, 33, 6, 2, 'bronze'); T.R(19, 33, 6, 2, 'bronze');
    T.R(8, 37, 8, 2, 'iron', { flat: true }); T.R(18, 37, 8, 2, 'iron', { flat: true });
    // 躯干（分块甲板）
    T.R(6, 13 + b, 22, 17, 'iron');
    T.R(7, 14 + b, 20, 3, 'iron', { flat: true }); T.L(6, 21 + b, 27, 21 + b, 'iron', 1, 2); T.L(17, 14 + b, 17, 29 + b, 'iron', 1, 2);
    T.R(8, 25 + b, 18, 2, 'bronze');
    // 灵核
    T.E(17, 20 + b, 3, 3, '#1A2A3A', { flat: true }); T.E(17, 20 + b, 2, 2, '#58E0FF', { flat: true }); T.P(16, 19 + b, '#FFFFFF');
    // 铆钉 + 青苔
    T.PS([[8, 15 + b], [26, 15 + b], [8, 28 + b], [26, 28 + b]], 'bronze', 0);
    T.PS([[23, 23 + b], [24, 23 + b], [25, 22 + b]], '#6AA84A');
    // 肩甲 + 手臂 + 大拳头
    T.R(1, 13 + b, 6, 5, 'bronze'); T.R(27, 13 + b, 6, 5, 'bronze');
    T.R(2, 18 + b, 4, 9, 'iron'); T.R(28, 18 + b, 4, 9, 'iron');
    T.R(0, 26 + b, 7, 6, 'iron'); T.R(27, 26 + b, 7, 6, 'iron'); T.L(1, 28 + b, 6, 28 + b, 'iron', 1, 2); T.L(28, 28 + b, 33, 28 + b, 'iron', 1, 2);
    // 头
    T.R(10, 3, 14, 10, 'iron');
    T.R(11, 7, 12, 3, '#1B1B2A', { flat: true });
    T.L(12, 8, 21, 8, '#FF6A3A'); T.P(13, 8, '#FFD0A0');       // 眼缝红光
    T.R(15, 0, 4, 3, 'bronze'); T.P(16, 0, 'bronze', 0);
    T.PS([[11, 4], [22, 4], [11, 11], [22, 11]], 'bronze', 0);
  } });

  def('墨蛟蛇', { w: 46, h: 30, ax: 22, ay: 29, frames: 2, outline: OL, draw(T, f) {
    const ph = f ? Math.PI : 0;
    const ctrl = [[45, 22], [40, 26], [34, 25], [28, 21], [22, 22], [16, 25], [11, 22], [9, 16], [10, 12]].map(([x, y], i) => [x, y + (i > 0 && i < 7 ? Math.sin(i * 1.2 + ph) * 1.2 : 0)]);
    T.tube(ctrl, 1.8, 4.2, 'ink', { belly: 'inkBelly', bellyStart: 4, fins: 'inkFin', finEvery: 8, finLen: 3.5, scales: true, sideX: 1 });
    // 头
    T.E(8, 9, 5.4, 4.2, 'ink');
    T.E(3, 11, 3.6, 2.4, 'ink');
    T.E(5, 13.5, 3.4, 1.2, 'inkBelly');
    T.T(10, 5, 14, 1, 13, 7, 'inkBelly', 1);                  // 独角
    T.T(12, 7, 17, 5, 13, 10, 'inkFin', 1);                   // 腮鳍
    T.evilEye(6, 7, '#FFE04A');
    T.L(0, 12, 6, 12, '#12131E'); T.P(1, 13, '#FFFFFF');
  }, post(T, f) {
    const b = f ? 1 : 0;
    T.L(-1, 12, -3, 11 + b, '#FF4A6A');                       // 信子
    for (const [x, y] of [[20, 29], [30, 29], [40, 29]]) { T.P(x + b, y, '#8AD8F0'); T.P(x + 1 + b, y - 1, '#C8F0FF'); }  // 水花
  } });

  def('暴猿妖', { w: 42, h: 40, ax: 21, ay: 39, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    // 短腿
    T.R(13, 30, 6, 9, 'ape'); T.R(24, 30, 6, 9, 'ape');
    T.R(12, 37, 8, 2, 'apeFace', { flat: true }); T.R(23, 37, 8, 2, 'apeFace', { flat: true });
    // 魁梧躯干
    T.E(22, 22, 13, 11, 'ape');
    T.E(20, 25, 8, 6, 'apeFace');
    T.L(20, 20, 20, 30, 'apeFace', 1, 2); T.L(15, 24, 25, 24, 'apeFace', 1, 2);   // 胸肌
    // 巨臂（捶胸/落地交替）
    T.tube([[31, 15], [37, 20], [38, 28 + b], [37, 34 + b]], 4, 3.4, 'ape');
    T.E(37, 35 + b, 4, 3, 'apeFace');
    T.tube([[12, 15], [6, 20], [4, 27 - b * 3], [5, 33 - b * 6]], 4, 3.4, 'ape');
    T.E(5, 34 - b * 6, 4, 3, 'apeFace');
    // 毛发层次
    for (const [x, y] of [[26, 14], [30, 18], [14, 13], [24, 11]]) { T.P(x, y, 'ape', 0); T.P(x + 1, y + 1, 'ape', 2); }
    // 头
    T.E(17, 10, 8, 7.5, 'ape');
    T.E(15, 12, 6, 4.8, 'apeFace');
    T.R(10, 6, 12, 2, '#3A2010', { flat: true });              // 横眉
    T.evilEye(11, 8, '#FF3A3A'); T.evilEye(16, 8, '#FF3A3A');
    T.L(11, 14, 18, 14, '#4A2014'); T.P(12, 15, '#FFFFFF'); T.P(17, 15, '#FFFFFF'); T.P(13, 14, '#FFFFFF'); T.P(16, 14, '#FFFFFF');   // 獠牙
    T.E(7, 10, 2.4, 2.4, 'ape'); T.E(26, 10, 2.4, 2.4, 'ape');  // 耳
    // 战纹
    T.L(10, 11, 12, 11, '#D83A2A'); T.L(19, 11, 21, 11, '#D83A2A');
  } });



  // ===== 筑基期 =====



  // ===== 金丹期 =====
  // ===== 金丹期 v3.3 =====
  def('冰魄蜘蛛', { w: 44, h: 30, ax: 20, ay: 29, frames: 2, outline: '#16233A', draw(T, f) {
    const b = f ? 1 : 0;
    // 八条腿：高拱的膝关节，冰晶关节
    // 左右各三对腿，膝盖向外拱起、脚掌撒开
    const legs = [[13, 1, 7, 10], [15, 5, 9, 8], [18, 10, 12, 7], [22, 30, 28, 7], [24, 36, 32, 8], [26, 42, 37, 10]];
    legs.forEach(([hip, foot, kx, ky], i) => {
      const lift = (i % 2 === b) ? -2 : 0;
      T.L(hip, 17, kx, ky + lift, 'iceDark', 1, 1);
      T.L(kx, ky + lift, foot, 28, 'iceDark', 1, 1);
      T.P(kx, ky + lift, 'ice', 0); T.P(foot, 28, 'ice', 0);
    });
    // 腹部 + 冰晶
    T.E(30, 17, 9, 7, 'ice');
    T.crystal(27, 12, 5, -1); T.crystal(31, 11, 7, 0); T.crystal(35, 12, 5, 1);
    T.PS([[29, 17], [31, 18], [33, 17], [31, 20]], '#FFFFFF');
    T.L(24, 19, 36, 19, 'iceDark', 1, 1);
    // 头胸部 + 多眼
    T.E(15, 18, 6.5, 5.2, 'ice');
    T.PS([[10, 16], [13, 15], [16, 15]], '#16325A'); T.PS([[11, 18], [14, 17]], '#3A5AAA');
    T.P(10, 15, '#FFFFFF'); T.P(13, 14, '#FFFFFF');
    // 螯牙
    T.L(10, 21, 9, 24, 'iceDark'); T.L(13, 22, 13, 24, 'iceDark'); T.P(9, 24, '#FFFFFF'); T.P(13, 24, '#FFFFFF');
  }, post(T, f) {
    const b = f ? 1 : 0;
    T.P(40, 5 + b, '#E6FBFF'); T.P(41, 4 + b, '#FFFFFF'); T.P(38, 3 - b, '#BFEFFF'); T.P(5, 10 + b, '#E6FBFF');
  } });

  def('三眼火鸦', { w: 42, h: 36, ax: 20, ay: 35, frames: 2, outline: '#1A0F1E', draw(T, f) {
    const up = f === 0;
    // 远侧翅膀
    if (up) T.wing(22, 15, 40, 3, 6, 'crow', 'crow', 4, -1); else T.wing(22, 16, 39, 25, 5, 'crow', 'crow', 4, 1);
    // 尾羽（火焰色羽尖）
    T.T(26, 22, 38, 28, 30, 30, 'crow', 2); T.T(26, 24, 36, 32, 28, 31, 'crow', 1);
    T.P(37, 28, 'fire', 1); T.P(35, 31, 'fire', 1);
    // 身体
    T.E(21, 20, 7.5, 6, 'crow');
    T.E(18, 23, 4, 3, 'crow', { lx: -0.2, ly: -0.2 });
    // 爪
    T.L(18, 25, 18, 32, '#E0A040', 1); T.L(22, 25, 23, 32, '#E0A040', 1);
    T.PS([[16, 33], [17, 33], [18, 33], [22, 33], [23, 33], [24, 33]], '#2A1A08');
    // 近侧翅膀
    if (up) T.wing(20, 17, 34, 0, 7, 'crow', 'fire', 5, -1); else T.wing(20, 18, 35, 27, 6, 'crow', 'fire', 5, 1);
    // 头
    T.E(12, 12, 5.4, 5, 'crow');
    T.T(7, 11, 0, 14, 7, 15, 'fire', 1); T.P(2, 14, '#8A3A10');       // 喙
    T.evilEye(9, 10, '#FFB03A'); T.evilEye(13, 10, '#FFB03A');
    T.E(11, 7, 1.3, 1.6, '#FF5A2A', { flat: true }); T.P(11, 7, '#FFE27A');   // 第三只眼
  }, post(T, f) {
    const b = f ? 1 : 0;
    T.flame(12, 5, 5 + b, 1); T.flame(15, 6, 3, 2); T.flame(9, 6, 3 - b, -1);    // 头顶火冠
    T.flame(37, 28, 3, 1);
  } });

  def('豹形雷兽', { w: 48, h: 30, ax: 22, ay: 29, frames: 2, outline: '#1E1810', draw(T, f) {
    const b = f ? 1 : 0;
    // 尾巴（尾尖雷光）
    T.tube([[33, 15], [39, 13], [43, 9 - b], [44, 4 - b]], 1.8, 1.4, 'leopard');
    // 远侧腿
    T.R(14, 20, 3, 8, 'leopardDark', { flat: true }); T.R(28, 20, 3, 8, 'leopardDark', { flat: true });
    // 流线身体
    T.E(22, 16, 12, 5.5, 'leopard');
    T.E(20, 19.5, 8, 2, 'leopardBelly');
    // 玫瑰斑
    for (const [x, y] of [[14, 14], [18, 12], [22, 15], [26, 12], [30, 15], [16, 17], [26, 17]]) { T.P(x, y, '#5A3A10'); T.P(x + 1, y, '#5A3A10'); T.P(x, y + 1, '#5A3A10'); T.P(x + 1, y + 1, '#D8A020'); }
    // 背脊电光鬃
    for (let x = 13; x <= 29; x += 3) T.T(x - 2, 12, x - 1, 6 - ((x >> 1) & 1) * 2, x + 2, 12, 'thunder', 0);
    // 近侧腿（扑击姿态）
    T.R(11, 19 - b, 3, 10 + b, 'leopard'); T.R(31, 19 + b, 3, 10 - b, 'leopard');
    T.PS([[10, 28], [11, 28], [12, 28], [30, 28], [31, 28], [32, 28]], '#2A1A10');
    // 头
    T.E(8, 12, 6, 5, 'leopard');
    T.E(3, 14, 3.4, 2.4, 'leopard'); T.E(4, 16, 2.6, 1, 'leopardBelly');
    T.T(6, 8, 6, 2, 10, 7, 'leopard', 2); T.T(10, 8, 12, 3, 14, 9, 'leopard', 2);
    T.evilEye(5, 11, '#6AE0FF');
    T.P(0, 13, '#2A1A10'); T.L(1, 16, 5, 16, '#2A1A10'); T.P(2, 17, '#FFFFFF');
    T.L(4, 10, 7, 10, '#5A3A10');
  }, post(T, f) {
    T.bolt(44, 4, 47, f ? 0 : 2, '#DFFBFF', 5 + f);
    T.bolt(16, 6, 12, f ? 0 : 2, '#BFF4FF', 9 + f);
    T.bolt(34, 20, 38, 26, '#9FE8FF', 13 + f);
  } });

  // ===== 元婴期 v3.3 =====
  def('鬼影修士', { w: 34, h: 44, ax: 17, ay: 43, frames: 2, outline: '#1A1A36', draw(T, f) {
    const b = f ? 1 : 0;
    // 飘忽的长袍（破碎下摆）
    for (let y = 16; y <= 36; y++) { const half = 6 + (y - 16) * 0.28; T.L(17 - half, y, 17 + half, y, y > 32 ? 'robeDark' : 'robeDark', 1, y > 30 ? 2 : 1); }
    for (let i = 0; i < 6; i++) T.T(10 + i * 3 - 1, 36, 10 + i * 3 + 2, 36, 10 + i * 3 + 0.5, 41 - ((i + b) % 2) * 3, 'robeDark', 2);
    T.L(17, 18, 17, 36, 'ghost', 1, 0);
    // 锁链腰带
    for (let x = 11; x <= 23; x += 2) T.P(x, 24, '#8A8AB0');
    T.P(24, 25, '#8A8AB0'); T.P(25, 26, '#AAAAD0');
    // 袖 + 枯手
    T.E(6, 22 + b, 3, 5, 'robeDark'); T.E(28, 22 - b, 3, 5, 'robeDark');
    T.PS([[5, 27 + b], [6, 27 + b], [28, 27 - b], [29, 27 - b]], 'ghost', 2);
    // 兜帽 + 黑暗的脸
    T.E(17, 11, 7, 7, 'ghost');
    T.E(17, 8, 7, 5, 'ghost', { lx: -0.4, ly: -0.9 });
    T.E(16, 12, 4.6, 4.6, '#0E0E22', { flat: true });
    T.P(14, 12, '#7CF7FF'); T.P(18, 12, '#7CF7FF'); T.P(14, 11, '#E0FFFF'); T.P(18, 11, '#E0FFFF');
    T.L(15, 15, 17, 15, '#2A2A50');
  }, post(T, f) {
    const b = f ? 1 : 0;
    // 魂火
    for (const [x, y] of [[2, 14], [32, 18], [4, 34]]) { T.P(x, y - b, '#D8FFFF'); T.P(x, y + 1 - b, '#7CF7FF'); T.P(x - 1, y + 2 - b, '#3AC0E0'); T.P(x + 1, y + 2 - b, '#3AC0E0'); T.P(x, y + 2 - b, '#7CF7FF'); }
  } });

  def('化龙妖蛟', { w: 56, h: 38, ax: 26, ay: 37, frames: 2, outline: '#10281E', draw(T, f) {
    const ph = f ? Math.PI : 0;
    const ctrl = [[55, 30], [49, 33], [42, 31], [36, 27], [30, 29], [24, 32], [19, 28], [17, 21], [15, 15], [12, 11]].map(([x, y], i) => [x, y + (i > 0 && i < 7 ? Math.sin(i * 1.2 + ph) * 1.3 : 0)]);
    T.T(55, 30, 58, 24, 53, 28, 'jiaoFin', 1); T.T(55, 30, 58, 35, 53, 32, 'jiaoFin', 2);
    T.tube(ctrl, 1.4, 4, 'jiao', { belly: 'jiaoBelly', bellyStart: 5, fins: 'jiaoFin', finEvery: 8, finLen: 4, scales: true, sideX: 1 });
    // 爪
    T.L(23, 33, 22, 36, 'jiao', 1, 2); T.PS([[21, 37], [22, 37], [23, 37]], 'horn', 1);
    T.L(37, 30, 38, 34, 'jiao', 1, 2); T.PS([[37, 35], [38, 35], [39, 35]], 'horn', 1);
    // 头
    T.E(11, 10, 6, 4.8, 'jiao');
    T.E(4, 12, 4.4, 2.8, 'jiao');
    T.E(5, 15, 3.8, 1.2, 'jiaoBelly');
    T.L(1, 14, 9, 14, '#10281E'); T.P(2, 15, '#FFFFFF'); T.P(6, 15, '#FFFFFF');
    T.T(11, 6, 15, 0, 15, 6, 'horn', 1); T.T(8, 6, 8, 1, 11, 6, 'horn', 1);
    T.evilEye(8, 8, '#FFE04A');
    T.L(7, 7, 11, 6, '#1A4A36');
    T.E(15, 12, 2, 3, 'jiaoFin');
  }, post(T, f) {
    const w = f ? 1 : 0;
    T.L(2, 12, -2, 9 - w, 'jiaoBelly', 1, 0); T.L(3, 15, -1, 19 + w, 'jiaoBelly', 1, 0);
    // 毒雾
    for (const [x, y] of [[30, 20], [44, 22]]) { T.P(x + w, y, '#8AE0B0'); T.P(x + 1 + w, y - 1, '#C0F0D0'); }
  } });

  def('血衣魔修', { w: 34, h: 42, ax: 17, ay: 41, frames: 2, outline: '#240A12', draw(T, f) {
    const b = f ? 1 : 0;
    // 背后血雾披风
    T.T(4, 14, 30, 14, 17, 40, '#5A0E1C');
    // 喇叭形血袍
    for (let y = 16; y <= 39; y++) { const half = 7 + (y - 16) * 0.36; T.L(17 - half, y, 17 + half, y, 'blood', 1, y > 35 ? 2 : 1); }
    T.L(17, 18, 17, 39, '#5A0E1C'); T.L(9, 38, 25, 38, '#5A0E1C');
    for (let x = 8; x <= 26; x += 3) T.P(x, 36, '#FF6A7A');               // 血纹衣摆
    T.R(9, 24, 16, 2, '#2A0A10', { flat: true }); T.P(17, 24, '#FFD24A'); T.P(17, 25, '#FFD24A');
    // 广袖
    T.E(6, 21, 3.4, 5, 'blood'); T.E(28, 21, 3.4, 5, 'blood');
    T.P(4, 26, 'skin'); T.P(5, 26, 'skin'); T.P(29, 26, 'skin');
    // 头
    T.E(17, 10, 5.4, 6, 'skin');
    T.R(11, 3, 13, 4, '#1A0A12', { flat: true }); T.R(11, 7, 2, 9, '#1A0A12', { flat: true }); T.R(22, 7, 3, 11, '#1A0A12', { flat: true });
    T.L(13, 3, 20, 2, '#3A1A22');
    T.evilEye(13, 10, '#FF2A3A'); T.evilEye(18, 10, '#FF2A3A');
    T.L(15, 14, 19, 14, '#8E1F2E'); T.P(16, 15, '#FF4A5A');
    T.P(12, 8, '#8E1F2E'); T.P(21, 8, '#8E1F2E');                         // 血纹
    // 血刃
    T.L(1, 30, 1, 13 + b, '#FFB0B0', 1); T.L(2, 30, 2, 14 + b, '#D23A48', 1); T.R(0, 28, 4, 1, 'gold', { flat: true }); T.R(1, 29, 2, 3, '#2A0A10', { flat: true });
  }, post(T, f) {
    const b = f ? 1 : 0;
    for (const [x, y] of [[26 + b, 2], [30, 6 + b], [6 - b, 6], [31, 30 - b]]) { T.P(x, y, '#FF4A5A'); T.P(x, y + 1, '#A01828'); }
    T.P(2, 12 + b, '#FF4A5A');
  } });



  // ===== 元婴期 =====



  // ===== 化神期 =====
  def('天魔老祖', { w: 40, h: 46, ax: 20, ay: 45, frames: 2, outline: '#12081E', draw(T, f) {
    const b = f ? 1 : 0;
    // 背后魔焰（紫色火舌）
    for (const [x, h, l] of [[8, 14, -2], [13, 19, -1], [20, 22, 0], [27, 19, 1], [32, 14, 2]]) {
      T.T(x - 3, 30, x + l, 30 - h - (x === 20 ? b : 0), x + 3, 30, '#6A3FA8', 1);
      T.T(x - 1.5, 30, x + l * 0.7, 33 - h, x + 1.5, 30, '#B06AFF', 0);
    }
    // 喇叭形魔袍
    for (let y = 18; y <= 44; y++) { const half = 8 + (y - 18) * 0.42; T.L(20 - half, y, 20 + half, y, 'demon', 1, y > 40 ? 2 : 1); }
    T.L(20, 22, 20, 44, '#40226E');
    for (let x = 11; x <= 30; x += 3) T.P(x, 42, '#C9941E');
    T.L(10, 43, 30, 43, '#C9941E');
    // 金色腰封 + 魔眼宝珠
    T.R(12, 25, 16, 3, 'gold');
    T.E(20, 31, 3, 3, '#1A0A2A', { flat: true }); T.P(20, 31, '#FF3AD8'); T.P(19, 30, '#FFA6F0');
    // 大袖
    T.E(7, 25, 4, 6.5, 'demon'); T.E(33, 25, 4, 6.5, 'demon');
    T.R(4, 30, 7, 1, 'gold', { flat: true }); T.R(29, 30, 7, 1, 'gold', { flat: true });
    // 骷髅法杖（左手）
    T.L(4, 44, 4, 8, '#3A2040', 2);
    T.E(4, 6, 3.2, 3, 'bone'); T.P(3, 6, '#12081E'); T.P(5, 6, '#12081E'); T.P(4, 8, '#12081E');
    T.P(4, 31, 'skin'); T.P(5, 31, 'skin');
    // 头
    T.E(20, 12, 6.5, 6.5, 'skin');
    // 长白须
    T.E(20, 18, 5.5, 3.2, '#E6E6F0', { flat: true }); T.T(15, 18, 25, 18, 20 + b, 28, '#E6E6F0', 0);
    T.L(20, 20, 20 + b, 26, '#B8B8CC');
    // 冠 + 魔角
    T.R(15, 4, 10, 3, 'gold'); T.P(20, 3, '#FF3AD8');
    T.T(13, 8, 7, 0, 16, 6, 'horn', 1); T.T(27, 8, 33, 0, 24, 6, 'horn', 1);
    // 眼 + 白眉
    T.evilEye(15, 11, '#FF3AD8'); T.evilEye(21, 11, '#FF3AD8');
    T.L(13, 9, 17, 10, '#E6E6F0'); T.L(21, 10, 25, 9, '#E6E6F0');
    T.L(18, 16, 22, 16, '#8A6A7A');
  }, post(T, f) {
    const b = f ? 1 : 0;
    for (const [x, y] of [[1, 20 - b], [37, 14 + b], [36, 5 - b], [10, 2 + b]]) { T.P(x, y, '#E6B0FF'); T.P(x, y + 1, '#8A4AD0'); }
    T.P(4, 2 - b, '#FF3AD8');
  } });

  def('九尾天狐', { w: 54, h: 40, ax: 20, ay: 39, frames: 2, outline: '#2A2440', draw(T, f) {
    const b = f ? 1 : 0;
    // 九尾：从尾根扇形铺开，每条是渐细的曲线尾
    const tips = [];
    for (let i = 0; i < 9; i++) {
      const a = -2.0 + i * 0.32 + (i % 2 ? 1 : -1) * (b ? 0.05 : -0.05);
      const r = 17 + (i % 2) * 2;
      const mx = 30 + Math.cos(a + 0.25) * r * 0.5, my = 25 + Math.sin(a + 0.25) * r * 0.5;
      const ex = 30 + Math.cos(a) * r, ey = 25 + Math.sin(a) * r;
      const ctrl = [[30, 26], [mx, my], [ex, ey]];
      T.curve(ctrl, 6).forEach(([x, y], k, arr) => { const r = 3.2 - 1.6 * k / (arr.length - 1) + 0.9; T.E(x, y, r, r, '#9A8CC0', { flat: true }); });
      T.tube(ctrl, 3.2, 1.6, 'fox9', { step: 6 });
      tips.push([ex, ey]);
    }
    tips.forEach(([x, y]) => { T.E(x, y, 1.8, 1.8, '#FFC2E2', { flat: true }); T.P(x, y, '#FF8AC8'); });
    // 身体
    T.E(22, 28, 9, 5.5, 'fox9');
    T.E(17, 31, 4, 3, '#FFFFFF', { flat: true });
    // 四腿（前腿交替踏步）
    T.L(15, 31, 14 - b, 37, 'fox9', 2, 1); T.L(19, 32, 19 + b, 37, 'fox9', 2, 1);
    T.L(26, 32, 26 + b, 37, 'fox9', 2, 1); T.L(29, 31, 30 - b, 37, 'fox9', 2, 2);
    T.PS([[13 - b, 38], [14 - b, 38], [19 + b, 38], [20 + b, 38], [26 + b, 38], [27 + b, 38], [30 - b, 38], [31 - b, 38]], '#BDB0D6');
    // 颈毛
    T.E(15, 25, 5, 5, 'fox9');
    T.T(12, 28, 14, 33, 17, 28, '#FFFFFF', 0);
    // 头
    T.E(11, 19, 6, 5.2, 'fox9');
    T.E(5, 21, 4, 2.5, 'fox9');
    T.E(5, 22.5, 3.2, 1.2, '#FFFFFF', { flat: true });
    T.P(1, 20, '#4A2A5A');
    // 耳
    T.T(8, 15, 7, 7, 12, 14, 'fox9', 1); T.T(8.6, 14, 8, 10, 10.5, 14, '#FFB0D8', 0);
    T.T(13, 14, 16, 7, 17, 15, 'fox9', 2);
    // 狐媚眼 + 额纹
    T.L(7, 18, 10, 19, '#8A3AB0'); T.P(9, 18, '#E04AA0'); T.P(7, 17, '#2A2440');
    T.PS([[12, 15], [13, 16], [12, 17]], '#E04AA0');
    T.P(3, 22, '#8A6A9A');
  }, post(T, f) {
    const b = f ? 1 : 0;
    // 狐火
    for (const [x, y] of [[3, 10 - b], [48, 30 + b], [44, 3 + b]]) {
      T.P(x, y, '#FFE6F6'); T.P(x, y + 1, '#FF8AC8'); T.P(x - 1, y + 1, '#C24AA0'); T.P(x + 1, y + 1, '#C24AA0'); T.P(x, y + 2, '#C24AA0');
    }
  } });

  def('血魔宗主', { w: 42, h: 48, ax: 21, ay: 47, frames: 2, outline: '#1E0610', draw(T, f) {
    const b = f ? 1 : 0;
    // 破损披风
    T.T(4, 15, 38, 15, 21, 46, '#5A0E1C');
    T.T(4, 15, 2, 45, 14, 46, '#3A0812'); T.T(38, 15, 40, 45, 28, 46, '#3A0812');
    for (let x = 3; x <= 39; x += 4) T.T(x, 44, x + 2, 47, x + 4, 44, '#3A0812', 1);
    // 铠甲躯干
    for (let y = 17; y <= 33; y++) { const half = 12 - (y - 17) * 0.22; T.L(21 - half, y, 21 + half, y, 'blood', 1, y > 29 ? 2 : 1); }
    T.R(12, 19, 18, 7, '#2A0A10', { flat: true });
    T.PS([[13, 21], [15, 22], [17, 21], [19, 22], [21, 21], [23, 22], [25, 21], [27, 22], [29, 21]], '#FF4A5A');
    T.E(21, 23, 2.5, 2.5, '#FF2A3A', { flat: true }); T.P(20, 22, '#FFB0B0');
    T.R(10, 31, 22, 3, 'gold');
    // 腿 + 靴
    T.R(12, 34, 7, 10, '#2A0A10'); T.R(23, 34, 7, 10, '#2A0A10');
    T.R(11, 43, 9, 3, 'blood'); T.R(22, 43, 9, 3, 'blood');
    // 骨刺肩甲
    T.E(7, 19, 5, 4, 'blood'); T.E(35, 19, 5, 4, 'blood');
    T.T(3, 17, 1, 9, 7, 16, 'bone', 1); T.T(7, 16, 7, 8, 10, 16, 'bone', 1);
    T.T(39, 17, 41, 9, 35, 16, 'bone', 1); T.T(35, 16, 35, 8, 32, 16, 'bone', 1);
    // 手臂
    T.E(6, 26, 3, 5, 'blood'); T.E(36, 26, 3, 5, 'blood');
    // 头盔
    T.E(21, 10, 6.5, 6.5, 'skin');
    T.R(14, 3, 14, 5, '#3A0812'); T.R(14, 5, 3, 10, '#3A0812'); T.R(25, 5, 3, 10, '#3A0812');
    T.T(15, 4, 11, -2, 18, 3, 'bone', 1); T.T(27, 4, 31, -2, 24, 3, 'bone', 1);
    T.P(21, 4, '#FF2A3A');
    T.evilEye(17, 10, '#FF1A2A'); T.evilEye(22, 10, '#FF1A2A');
    T.L(18, 14, 23, 14, '#8E1F2E'); T.P(19, 15, '#FFFFFF'); T.P(22, 15, '#FFFFFF');
    // 巨型血剑（左手前伸斜举）
    T.T(4, 29, 7, 29, 1, 3 - b, '#E8D0D0', 1); T.L(5, 28, 2, 6 - b, '#D23A48', 1);
    T.L(2, 29, 9, 31, 'gold', 2); T.L(6, 31, 7, 35, '#2A0A10', 2);
  }, post(T, f) {
    const b = f ? 1 : 0;
    for (const [x, y] of [[38, 4 + b], [34, 1 - b], [10, 40 + b], [36, 40 - b]]) { T.P(x, y, '#FF4A5A'); T.P(x, y + 1, '#A01828'); }
    T.P(0, 3 - b, '#FFFFFF');
  } });

  def('劫雷真龙', { w: 82, h: 60, ax: 34, ay: 59, frames: 2, outline: '#0C1A36', draw(T, f) {
    const ph = f ? Math.PI : 0;
    const wob = (pts, from, to) => pts.map(([x, y], i) => [x, y + (i >= from && i <= to ? Math.sin(i * 0.9 + ph) * 1.5 : 0)]);
    // S 形龙身：尾巴在右上高高扬起 → 背部拱峰 → 俯冲到地面打一个大弯 → 昂首
    const tail = wob([[81, 10], [77, 20], [70, 26], [62, 23], [56, 15], [49, 11], [42, 15], [38, 26], [34, 38], [28, 47], [20, 49]], 1, 8);
    const neck = [[20, 49], [13, 45], [11, 36], [13, 28], [17, 23]];
    // 尾尖雷羽
    T.T(81, 10, 84, 2, 78, 7, 'gold', 1); T.T(81, 10, 86, 13, 79, 13, 'gold', 2); T.T(81, 10, 80, 1, 78, 9, 'gold', 1);
    // 后爪（在拱峰下方抓空）
    T.L(60, 24, 63, 32, 'thunder', 2, 2); T.L(63, 32, 60, 35, 'thunder', 2, 2); T.PS([[58, 36], [59, 36], [60, 36], [61, 36]], 'horn', 1);
    T.tube(tail, 1.8, 6.2, 'thunder', { belly: 'gold', bellyStart: 8, fins: 'gold', finEvery: 7, finLen: 5, scales: true, sideX: 1 });
    T.tube(neck, 6.2, 4.6, 'thunder', { belly: 'gold', fins: 'gold', finEvery: 8, finLen: 4, finStart: 4, finEnd: 6, scales: true, sideX: 1 });
    // 前爪（落地）
    T.L(22, 50, 20, 57, 'thunder', 3, 1); T.PS([[17, 58], [18, 58], [19, 58], [20, 58], [21, 58]], 'horn', 1);
    T.L(33, 44, 35, 57, 'thunder', 3, 2); T.PS([[33, 58], [34, 58], [35, 58], [36, 58], [37, 58]], 'horn', 1);
    // 鬃毛（向后飘）
    T.L(21, 13, 30, 10, '#DDE8FF', 3, 1); T.L(22, 18, 31, 17, '#DDE8FF', 3, 1); T.L(20, 23, 27, 26, '#DDE8FF', 2, 2);
    T.P(31, 9, '#FFFFFF', 0); T.P(32, 17, '#FFFFFF', 0);
    // 龙头（更大、张口）
    T.E(15, 17, 8.5, 7.5, 'thunder');
    T.E(6, 20, 7, 4.2, 'thunder');
    T.E(7, 25, 6, 1.8, 'gold');
    T.L(0, 23, 11, 23, '#0C1A36'); T.L(1, 24, 9, 24, '#6A1A2A');
    T.PS([[2, 22], [5, 22], [8, 22], [3, 25], [7, 25]], '#FFFFFF');
    T.P(0, 18, '#0C1A36');
    // 龙角（分叉）
    T.L(15, 10, 22, 1, 'horn', 2, 1); T.L(19, 5, 24, 5, 'horn', 1, 1); T.P(23, 0, 'horn', 0);
    T.L(11, 11, 10, 3, 'horn', 2, 2); T.L(10, 6, 7, 4, 'horn', 1, 2);
    T.evilEye(9, 14, '#FFF06A'); T.P(10, 14, '#FFFFFF');
    T.L(7, 12, 13, 11, '#1A2E60', 1);
  }, post(T, f) {
    const w = f ? 1 : 0;
    // 长龙须
    T.L(2, 19, -2, 14 - w, 'gold', 1, 0); T.L(-2, 14 - w, -1, 9 - w, 'gold', 1, 1);
    T.L(5, 26, 1, 32 + w, 'gold', 1, 0); T.L(1, 32 + w, 3, 37 + w, 'gold', 1, 1);
    // 雷光
    if (f) { T.bolt(52, -1, 46, 8, '#FFFFFF', 3); T.bolt(74, 30, 72, 50, '#BFF4FF', 7); T.bolt(3, 40, 1, 56, '#FFFFFF', 4); }
    else { T.bolt(34, 0, 37, 12, '#FFFFFF', 5); T.bolt(78, 34, 80, 54, '#BFF4FF', 2); T.bolt(50, 28, 48, 44, '#BFF4FF', 9); }
  } });

  def('混沌古兽', { w: 52, h: 46, ax: 26, ay: 45, frames: 2, outline: '#120A20', draw(T, f) {
    const up = f === 0;
    // 蝠翼：肩 → 翼尖，指骨间的膜，后缘呈扇贝状
    T.wing = (sx, sy, tx, ty, w, m1, m2, n, side) => {
      const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy);
      const nx = -dy / len * side, ny = dx / len * side;
      const ends = [[tx, ty]];
      for (let k = 1; k <= 3; k++) { const t = 1 - k * 0.28; ends.push([sx + dx * t + nx * w * (0.6 + k * 0.35), sy + dy * t + ny * w * (0.6 + k * 0.35)]); }
      for (let k = 0; k < ends.length - 1; k++) {
        const [ax, ay] = ends[k], [bx, by] = ends[k + 1];
        const mx = (ax + bx) / 2 - (nx * 1.6), my = (ay + by) / 2 - (ny * 1.6);
        T.T(sx, sy, ax, ay, mx, my, '#4A3A6A', 1); T.T(sx, sy, mx, my, bx, by, '#4A3A6A', 1);
      }
      T.T(sx, sy, ends[3][0], ends[3][1], sx + nx * w * 0.8, sy + ny * w * 0.8, '#4A3A6A', 1);
      ends.forEach(([ex, ey]) => T.L(sx, sy, ex, ey, m1, 1, 0));
      T.P(tx, ty, 'horn', 1);
    };
    // 后侧两翼
    if (up) { T.wing(30, 16, 50, 2, 6, 'chaos', 'demon', 4, -1); T.wing(30, 20, 51, 16, 5, 'chaos', 'demon', 3, 1); }
    else { T.wing(30, 17, 51, 8, 6, 'chaos', 'demon', 4, -1); T.wing(30, 21, 49, 26, 5, 'chaos', 'demon', 3, 1); }
    // 六足
    for (const [x, d] of [[13, -1], [18, 0], [23, 1], [29, -1], [34, 0], [39, 1]]) {
      const lift = (x % 2 === (up ? 0 : 1)) ? -1 : 0;
      T.L(x, 32, x + d, 43 + lift, 'chaos', 2, 2);
      T.PS([[x + d - 1, 44 + lift], [x + d, 44 + lift], [x + d + 1, 44 + lift]], 'horn', 1);
    }
    // 无面之躯（浑圆肉囊）
    T.E(26, 25, 15, 11, 'chaos');
    T.E(26, 30, 11, 5, '#6A5A8A', { flat: true });
    for (let x = 16; x <= 36; x += 4) T.P(x, 34, '#33284D');
    // 混沌漩涡：螺旋纹
    for (let k = 0; k < 26; k++) {
      const a = k * 0.55 + (up ? 0 : 0.8), r = 0.5 + k * 0.28;
      T.P(24 + Math.cos(a) * r * 1.2, 23 + Math.sin(a) * r, k > 18 ? '#8A6ACC' : k > 8 ? '#C9A2FF' : '#FFFFFF');
    }
    // 前侧两翼
    if (up) { T.wing(20, 16, 2, 1, 6, 'chaos', 'demon', 4, 1); T.wing(20, 20, 1, 16, 5, 'chaos', 'demon', 3, -1); }
    else { T.wing(20, 17, 1, 8, 6, 'chaos', 'demon', 4, 1); T.wing(20, 21, 3, 26, 5, 'chaos', 'demon', 3, -1); }
  }, post(T, f) {
    const b = f ? 1 : 0;
    for (const [x, y] of [[4, 34 - b], [48, 33 + b], [26, 9 - b], [44, 40]]) { T.P(x, y, '#FF7AF0'); T.P(x + 1, y + 1, '#8A3AB0'); }
  } });

  def('天道魔神', { w: 54, h: 58, ax: 27, ay: 57, frames: 2, outline: '#0A0514', draw(T, f) {
    const b = f ? 1 : 0;
    // 背后双重法环
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 + b * 0.08; T.P(27 + Math.cos(a) * 22, 18 + Math.sin(a) * 18, i % 4 ? '#FFD24A' : '#FF5A6A'); }
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 - b * 0.1; T.P(27 + Math.cos(a) * 16, 18 + Math.sin(a) * 13, '#C9941E'); }
    // 长袍下摆
    T.T(9, 26, 45, 26, 27, 57, 'godRobe', 1);
    T.T(9, 26, 7, 56, 27, 57, 'godRobe', 1); T.T(45, 26, 47, 56, 27, 57, 'godRobe', 2);
    T.L(8, 56, 46, 56, 'gold'); for (let x = 10; x <= 44; x += 4) T.P(x, 54, '#FFD24A');
    T.R(24, 34, 6, 22, 'gold'); T.PS([[27, 38], [27, 44], [27, 50]], '#FF2A4A');
    // 金甲胸铠
    T.R(12, 21, 30, 15, 'gold');
    T.R(14, 23, 26, 2, '#C9941E', { flat: true }); T.R(14, 30, 26, 2, '#C9941E', { flat: true });
    T.E(27, 27, 3.5, 3.5, '#FF2A4A', { flat: true }); T.P(26, 26, '#FFB0B8');
    T.R(12, 34, 30, 3, 'godRobe');
    // 巨型肩甲（层叠）
    T.E(8, 23, 6.5, 5, 'gold'); T.E(46, 23, 6.5, 5, 'gold');
    T.E(8, 27, 5, 2.5, '#C9941E', { flat: true }); T.E(46, 27, 5, 2.5, '#C9941E', { flat: true });
    T.T(4, 20, 2, 12, 8, 18, 'gold', 1); T.T(50, 20, 52, 12, 46, 18, 'gold', 1);
    // 手臂 + 掌心法印
    T.E(5, 34, 3.5, 6, 'godRobe'); T.E(49, 34, 3.5, 6, 'godRobe');
    T.E(5, 41, 2.5, 2.5, '#E8D8F0'); T.E(49, 41, 2.5, 2.5, '#E8D8F0');
    // 面具
    T.E(27, 13, 7.5, 8, '#E8D8F0');
    T.R(20, 11, 14, 1, 'gold', { flat: true });
    T.R(21, 13, 5, 2, '#0A0514', { flat: true }); T.R(29, 13, 5, 2, '#0A0514', { flat: true });
    T.P(22, 13, '#FF2A4A'); T.P(32, 13, '#FF2A4A');
    T.P(27, 9, '#FF2A4A'); T.P(27, 8, '#FFB0B8');
    T.L(24, 18, 30, 18, '#6A4A7A'); T.L(27, 15, 27, 17, '#B8A8C8');
    // 天冠
    T.T(19, 8, 13, -3, 22, 6, 'gold', 1); T.T(35, 8, 41, -3, 32, 6, 'gold', 1);
    T.T(24, 6, 27, -4, 30, 6, 'gold', 0); T.P(27, 1, '#FF2A4A');
  }, post(T, f) {
    const b = f ? 1 : 0;
    // 掌心法印光
    T.P(5, 41, '#FFFFFF'); T.P(49, 41, '#FFFFFF');
    for (const [x, y] of [[2, 47 + b], [52, 47 - b], [1, 8 - b], [53, 8 + b]]) { T.P(x, y, '#FFF0A0'); T.P(x, y + 1, '#C9941E'); }
  } });

  // ===== 灵兽（面朝右）=====
  def('jade_dragon', { w: 50, h: 40, ax: 24, ay: 39, frames: 2, outline: '#0A2A30', draw(T, f) {
    const ph = f ? Math.PI : 0;
    // 云朵托着尾巴
    T.E(12, 37, 6, 2.2, 'cloud'); T.E(18, 38, 4, 1.8, 'cloud'); T.E(6, 38, 3.5, 1.5, 'cloud');
    // 身体中线：Catmull-Rom 平滑曲线（尾 → 颈），中段随帧摆动
    const ctrl = [[9, 13], [4, 15], [1, 21], [3, 28], [9, 33], [16, 33], [21, 28], [21, 21], [23, 15], [27, 11], [31, 10]]
      .map(([x, y], i) => [x, y + (i > 1 && i < 8 ? Math.sin(i * 1.3 + ph) * 1.2 : 0)]);
    const pts = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      for (let k = 0; k < 8; k++) {
        const t = k / 8, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    const n = pts.length;
    const rad = i => 1.2 + 3.1 * (i / n);
    const normal = i => { // 指向身体"下/外"侧的法线
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      if (ny < 0 || (Math.abs(ny) < 0.2 && nx < 0)) { nx = -nx; ny = -ny; }
      return [nx, ny];
    };
    // 尾鳍
    T.T(9, 13, 13, 8, 11, 14, 'dragonFin', 1); T.T(9, 13, 14, 16, 10, 11, 'dragonFin', 2);
    // 背鳍：沿身体上侧
    for (let i = 10; i < n - 6; i += 7) {
      const [x, y] = pts[i], [nx, ny] = normal(i), r = rad(i);
      const bx = x - nx * r, by = y - ny * r;
      T.T(bx - ny * 1.6, by + nx * 1.6, bx - nx * 3.2, by - ny * 3.2, bx + ny * 1.6, by - nx * 1.6, 'dragonFin', 1);
    }
    // 身体
    pts.forEach(([x, y], i) => T.E(x, y, rad(i), rad(i), 'dragonT'));
    // 连续的奶黄腹带 + 鳞纹
    pts.forEach(([x, y], i) => {
      if (i < 6) return;
      const [nx, ny] = normal(i), r = rad(i);
      T.P(x + nx * (r - 0.6), y + ny * (r - 0.6), 'dragonBelly', 1);
      if (r > 2.2) T.P(x + nx * (r - 1.6), y + ny * (r - 1.6), 'dragonBelly', 0);
      if (i % 5 === 0) { T.P(x - nx * r * 0.35, y - ny * r * 0.35, 'dragonT', 2); T.P(x - nx * r * 0.35 + 1, y - ny * r * 0.35, 'dragonT', 2); }
    });
    // 爪
    T.L(9, 35, 8, 37, 'dragonT', 1, 2); T.PS([[7, 38], [8, 38], [9, 38]], 'horn', 1);
    T.L(18, 34, 19, 37, 'dragonT', 1, 2); T.PS([[18, 38], [19, 38], [20, 38]], 'horn', 1);
    T.L(24, 17, 27, 20, 'dragonT', 1, 2); T.PS([[27, 21], [28, 21], [29, 20]], 'horn', 1);
    // 鬃毛：向后飘的毛束
    T.L(30, 7, 25, 5, 'dragonMane', 2, 1); T.L(29, 9, 23, 9, 'dragonMane', 2, 1); T.L(29, 11, 24, 13, 'dragonMane', 1, 2);
    T.P(24, 4, 'dragonMane', 0); T.P(22, 9, 'dragonMane', 0);
    // 龙头
    T.E(34, 10, 4.6, 3.8, 'dragonT');
    T.E(40, 10, 4.4, 2.4, 'dragonT');            // 吻部
    T.E(39, 13.5, 3.8, 1.3, 'dragonT', { lx: 0, ly: -1 }); // 下颌（张嘴）
    T.L(36, 12, 43, 12, '#8E1F2E'); T.P(42, 13, '#E0566E'); // 口腔/舌
    T.P(43, 11, '#FFFFFF'); T.P(40, 11, '#FFFFFF'); T.P(41, 14, '#FFFFFF');   // 牙
    T.L(36, 15, 41, 15, 'dragonBelly', 1, 1);    // 下颌奶黄线
    T.P(44, 9, '#0A2A30');                        // 鼻孔
    T.evilEye(34, 8, '#FFE04A');
    T.L(32, 7, 36, 7, 'dragonT', 1, 2);           // 眉骨
    // 鹿角
    T.L(33, 6, 31, 1, 'antler', 1, 1); T.L(32, 3, 29, 2, 'antler', 1, 1); T.P(31, 0, 'antler', 0);
    T.L(36, 6, 37, 1, 'antler', 1, 1); T.L(37, 3, 39, 1, 'antler', 1, 1); T.P(37, 0, 'antler', 0);
  }, post(T, f) {
    const w = f ? 1 : 0;
    // 龙须（描边之后画，保持细长）
    T.L(42, 12, 46, 15 + w, 'gold', 1, 0); T.L(46, 15 + w, 49, 14 + w, 'gold', 1, 1);
    T.L(42, 9, 46, 7 - w, 'gold', 1, 0); T.L(46, 7 - w, 48, 8 - w, 'gold', 1, 1);
    // 身边的小火苗
    T.P(26, 2 + w, '#FF8A3A'); T.P(26, 1 + w, '#FFD060');
    T.P(15, 23 - w, '#FF8A3A'); T.P(15, 22 - w, '#FFD060');
  } });

  // ===== 坐骑（面朝右，鼠鼠站在背上）=====


  // ===== 灵兽（面朝右）v3.3 =====
  def('fire_cat', { w: 40, h: 30, ax: 19, ay: 29, frames: 2, outline: '#2A1008', draw(T, f) {
    const b = f ? 1 : 0;
    // 尾巴（上扬，尾端着火）
    T.tube([[10, 19], [6, 16], [4, 11], [5, 6 + b]], 2.2, 1.6, 'catRed');
    // 远侧腿
    T.R(14, 22, 3, 6, 'catRed', { flat: true }); T.R(24, 22, 3, 6, 'catRed', { flat: true });
    T.R(14, 22, 3, 6, '#C8541E', { flat: true }); T.R(24, 22, 3, 6, '#C8541E', { flat: true });
    // 身体 + 奶白肚皮
    T.E(19, 19, 9.5, 5.5, 'catRed');
    T.E(20, 22.5, 6.5, 2.2, 'catCream');
    // 虎斑
    for (const x of [12, 15, 18, 21]) { T.L(x, 14, x - 1, 17, 'catRed', 1, 2); T.P(x - 1, 18, 'catRed', 2); }
    // 近侧腿 + 爪
    T.R(11, 21 - b, 3, 7 + b, 'catRed'); T.R(26, 21 + b, 3, 7 - b, 'catRed');
    T.R(11, 27, 3, 1, 'catCream', { flat: true }); T.R(26, 27, 3, 1, 'catCream', { flat: true });
    // 头
    T.E(30, 12, 6.2, 5.4, 'catRed');
    T.E(27, 15, 3, 2, 'catCream'); T.E(33, 15, 3, 2, 'catCream');   // 腮毛
    T.E(31.5, 15.5, 2.6, 1.7, 'catCream');                          // 吻部
    T.T(24, 9, 25, 2, 29, 7, 'catRed', 1); T.T(25.5, 7.5, 25.8, 4, 27.5, 7, 'catPink', 1);
    T.T(31, 7, 35, 2, 36, 9, 'catRed', 1); T.T(32.5, 6.5, 34.5, 4, 34.8, 7.5, 'catPink', 1);
    T.L(29, 7, 30, 9, 'catRed', 1, 2); T.L(31, 7, 31, 9, 'catRed', 1, 2);  // 额纹
    // 琥珀猫眼
    for (const ex of [27, 32]) { T.P(ex, 11, '#FFC83A'); T.P(ex + 1, 11, '#FFC83A'); T.P(ex, 12, '#FFA020'); T.P(ex + 1, 12, '#FFA020'); T.P(ex + 1, 11, '#2A1008'); T.P(ex + 1, 12, '#2A1008'); }
    T.P(31, 14, '#E86A7A');
    T.P(30, 16, '#8A3A20'); T.P(32, 16, '#8A3A20');
  }, post(T, f) {
    const b = f ? 1 : 0;
    // 胡须
    T.L(35, 14, 39, 13, '#FFE8D0'); T.L(35, 15, 39, 16, '#FFE8D0');
    // 尾巴火焰 + 背脊火苗
    T.flame(5, 6 + b, 7 + b, -1 + b * 2); T.flame(3, 9, 4, -1);
    T.flame(15, 14, 3 + b, 0); T.flame(19, 13, 4 - b, 1); T.flame(23, 14, 3, 0);
  } });

  def('ice_wolf', { w: 48, h: 32, ax: 22, ay: 31, frames: 2, outline: '#14203A', draw(T, f) {
    const b = f ? 1 : 0;
    T.crystal(9, 31, 3, -1); T.crystal(37, 31, 2, 1); T.crystal(27, 31, 2, 0);   // 脚边碎冰
    // 蓬松冰尾
    T.tube([[12, 17], [7, 15], [3, 16 + b], [1, 20 + b]], 2.6, 3.2, 'wolf');
    T.P(1, 22 + b, 'ice', 0); T.P(2, 23 + b, 'ice', 1);
    // 远侧腿
    T.R(15, 21, 3, 8, 'wolfDark', { flat: true }); T.R(29, 21, 3, 8, 'wolfDark', { flat: true });
    // 身体
    T.E(22, 18, 11, 5.5, 'wolf');
    T.E(30, 20, 4.5, 4.2, 'wolfLight');                               // 胸前绒毛
    T.E(22, 21.5, 7, 1.8, 'wolfLight');
    // 背脊冰晶
    T.crystal(13, 14, 5, -1); T.crystal(17, 13, 7, -1); T.crystal(21, 13, 8, 0); T.crystal(25, 13, 6, 1); T.crystal(28, 14, 4, 1);
    // 近侧腿
    T.R(12, 21 - b, 3, 9 + b, 'wolf'); T.R(31, 21 + b, 3, 9 - b, 'wolf');
    T.R(12, 29, 3, 1, 'wolfDark', { flat: true }); T.R(31, 29, 3, 1, 'wolfDark', { flat: true });
    // 头
    T.E(36, 12, 5.8, 4.8, 'wolf');
    T.E(42, 14, 4.2, 2.3, 'wolf');                                     // 长吻
    T.E(41, 15.5, 3.4, 1.2, 'wolfLight');
    T.T(32, 9, 32, 1, 36, 7, 'wolf', 1); T.T(33, 7.5, 33.2, 3.5, 35, 7, 'wolfDark', 1);
    T.T(36, 7, 38, 0, 40, 8, 'wolf', 1);
    T.E(33, 15, 2.5, 2.5, 'wolfLight');                               // 颊毛
    T.P(46, 13, '#1A1A2A'); T.P(45, 13, '#1A1A2A');                   // 鼻
    T.L(40, 16, 45, 16, '#14203A');
    // 冰蓝眼
    T.P(37, 11, '#9FE8FF'); T.P(38, 11, '#E6FBFF'); T.P(37, 12, '#3A7ABA'); T.P(38, 12, '#14203A');
  }, post(T, f) {
    if (f) { T.P(47, 12, '#E6FBFF'); T.P(48, 11, '#BFEFFF'); } else { T.P(47, 14, '#E6FBFF'); T.P(48, 13, '#BFEFFF'); } // 寒气
    T.P(20, 4, '#FFFFFF'); T.P(26, 6, '#E6FBFF');
  } });

  def('thunder_eagle', { w: 50, h: 36, ax: 24, ay: 35, frames: 2, outline: '#231606', draw(T, f) {
    const up = f === 0;
    // 远侧翅膀
    if (up) T.wing(25, 15, 42, 2, 7, 'eagleDark', 'eagleDark', 4, -1); else T.wing(25, 16, 44, 26, 6, 'eagleDark', 'eagleDark', 4, 1);
    // 尾羽
    T.T(15, 19, 3, 22, 5, 27, 'eagle', 1); T.T(15, 20, 5, 27, 11, 28, 'eagle', 2);
    T.P(4, 23, '#FFF0C0'); T.P(6, 26, '#FFF0C0');
    // 身体
    T.E(22, 19, 8, 5.5, 'eagle');
    T.E(26, 21, 4.5, 3.5, 'eagleLight');
    // 爪
    T.L(20, 24, 19, 29, '#E0A040', 1); T.L(24, 24, 25, 29, '#E0A040', 1);
    T.PS([[18, 30], [19, 30], [20, 30], [24, 30], [25, 30], [26, 30]], '#2A1A08');
    // 近侧大翅膀
    if (up) T.wing(22, 16, 4, 1, 8, 'eagle', 'eagleLight', 5, 1); else T.wing(22, 17, 3, 27, 7, 'eagle', 'eagleLight', 5, -1);
    // 头
    T.E(31, 11, 4.4, 3.8, 'eagleHead');
    T.E(28, 13, 3, 2.4, 'eagleHead');
    T.T(34, 9, 40, 11, 35, 14, 'gold', 1); T.P(39, 12, '#8A5A10'); T.P(38, 13, '#8A5A10');
    T.P(32, 10, '#FFE04A'); T.P(33, 10, '#2A1A08'); T.L(30, 9, 33, 8, '#8A6A30');
    T.P(28, 8, 'eagleHead', 0); T.P(27, 9, 'eagleHead', 0);
  }, post(T, f) {
    T.bolt(6, f ? 26 : 4, 14, f ? 28 : 12, '#9FE8FF', 3 + f);
    T.bolt(40, f ? 20 : 4, 46, f ? 26 : 0, '#DFFBFF', 7 + f);
    T.bolt(28, 22, 33, 27, '#9FE8FF', 11 + f);
  } });

  def('shadow_serpent', { w: 42, h: 32, ax: 20, ay: 31, frames: 2, outline: '#0E0A1A', draw(T, f) {
    const b = f ? 1 : 0;
    // 盘起的身体（一圈）
    T.tube([[3, 25], [8, 30], [18, 31], [28, 29], [32, 25], [27, 21], [17, 21], [11, 24]], 2, 3.4, 'serpent', { belly: 'serpentBelly', bellyStart: 4, scales: true });
    // 昂起的脖子
    T.tube([[11, 24], [13, 18], [18, 12 - b], [24, 8 - b], [29, 7 - b]], 3.4, 2.6, 'serpent', { belly: 'serpentBelly', side: 'down', sideX: 1, scales: true, scaleEvery: 4 });
    // 头
    T.E(32, 7 - b, 4.6, 3.3, 'serpent');
    T.E(36, 8 - b, 3, 2, 'serpent');
    T.L(31, 9 - b, 39, 9 - b, '#0E0A1A');                              // 张开的嘴
    T.E(35, 10.5 - b, 3, 1, 'serpentBelly');                           // 下颚
    T.P(36, 10 - b, '#FFFFFF'); T.P(38, 10 - b, '#FFFFFF');            // 毒牙
    T.P(32, 6 - b, '#F0B0FF'); T.P(33, 6 - b, '#C060FF'); T.P(33, 5 - b, '#0E0A1A'); // 紫瞳
    T.PS([[29, 5 - b], [30, 4 - b], [31, 4 - b]], 'serpent', 0);       // 眉鳞
  }, post(T, f) {
    const b = f ? 1 : 0;
    T.L(39, 9 - b, 41, 8 - b + f, '#FF4A7A'); T.P(41, 10 - b, '#FF4A7A');  // 信子
    // 紫雾
    for (const [x, y] of [[2, 18], [36, 18], [6, 12], [38, 26]]) { T.P(x + b, y, '#B070FF'); T.P(x + 1 + b, y - 1, '#7A3ACC'); T.P(x - 1, y + 1 - b, '#5A2A99'); }
  } });

  def('phoenix', { w: 52, h: 44, ax: 22, ay: 43, frames: 2, outline: '#2A0A10', draw(T, f) {
    const up = f === 0;
    // 长长的凤尾（三根带眼斑的尾羽）
    [[[18, 27], [12, 32], [7, 37], [3, 42]], [[19, 28], [15, 34], [11, 39], [9, 43]], [[20, 28], [18, 34], [16, 39], [17, 43]]].forEach((c, i) => {
      T.tube(c, 1.6, 0.9, i === 1 ? 'phoenixTail' : 'phoenix');
      const e = c[c.length - 1];
      T.E(e[0], e[1] - 1, 1.6, 1.6, 'gold'); T.P(e[0], e[1] - 1, '#2A60C0');
    });
    // 远侧火翼
    if (up) T.wing(26, 19, 42, 3, 7, 'phoenixDark', 'phoenixTail', 4, -1); else T.wing(26, 20, 44, 30, 6, 'phoenixDark', 'phoenixTail', 4, 1);
    // 身体
    T.E(23, 24, 6.5, 5, 'phoenix');
    T.E(26, 26, 3.8, 3.2, 'gold');
    T.L(21, 29, 20, 33, '#E0A040', 1); T.L(24, 29, 25, 33, '#E0A040', 1);
    // 近侧火翼（羽毛渐变）
    if (up) T.wing(22, 21, 5, 3, 8, 'phoenix', 'phoenixTail', 5, 1); else T.wing(22, 22, 4, 32, 7, 'phoenix', 'phoenixTail', 5, -1);
    // 颈与头
    T.tube([[26, 21], [29, 16], [31, 12]], 3, 2.4, 'phoenix');
    T.E(33, 10, 3.6, 3.2, 'phoenix');
    T.T(36, 9, 41, 10, 36, 12, 'gold', 1);                                // 喙
    T.P(34, 9, '#FFE04A'); T.P(35, 9, '#2A0A10');
    // 冠羽
    T.L(32, 7, 28, 1, 'gold', 1, 0); T.L(33, 7, 31, 0, 'gold', 1, 1); T.L(31, 7, 26, 4, 'phoenixTail', 1, 1);
    T.P(28, 1, '#FFF2A8'); T.P(31, 0, '#FFF2A8');
  }, post(T, f) {
    const up = f === 0;
    // 翼尖火焰
    if (up) { T.flame(5, 4, 4, -1); T.flame(10, 2, 3, 0); T.flame(42, 5, 3, 1); }
    else { T.flame(4, 36, 3, -1); T.flame(9, 38, 3, 0); T.flame(45, 31, 3, 1); }
    T.flame(3, 42, 3, -1); T.flame(17, 43, 3, 1);
  } });

  // ===== 坐骑（面朝右，鼠鼠坐在背上）v3.3 =====
  def('mount_crane', { w: 56, h: 46, ax: 24, ay: 45, frames: 2, outline: '#2A2E3A', draw(T, f) {
    const b = f ? 1 : 0;
    // 细长的腿
    T.L(22, 32, 21, 38, '#3A3A48', 1); T.L(21, 38, 22, 44, '#3A3A48', 1);
    T.L(28, 32, 30, 38, '#4A4A58', 1); T.L(30, 38, 29, 44, '#4A4A58', 1);
    T.PS([[20, 45], [21, 45], [23, 45], [28, 45], [30, 45], [31, 45]], '#3A3A48');
    // 黑色尾羽（蓬起的"裙摆"）
    T.T(14, 24, 2, 22 - b, 8, 30, '#2A2A36'); T.T(14, 26, 4, 30, 12, 32, '#1A1A24'); T.T(16, 23, 5, 19 - b, 10, 26, '#3A3A4A');
    // 身体
    T.E(25, 28, 12, 6, 'crane');
    // 收拢的翅膀：层叠羽毛
    T.E(22, 26, 9.5, 4.5, 'craneWing');
    for (let i = 0; i < 5; i++) T.L(15 + i * 3, 27, 13 + i * 3, 30, 'craneWing', 1, 2);
    T.T(13, 25, 6, 27 - b, 14, 29, '#2A2A36');                       // 翼尖黑羽
    // 长颈（前黑后白）
    T.tube([[34, 26], [38, 20], [39, 13], [41, 7]], 2.6, 1.8, 'crane');
    T.tube([[35, 26], [39, 20], [40, 14], [42, 9]], 1.3, 1, '#2A2A36');
    // 头
    T.E(43, 6, 3.2, 2.6, 'crane');
    T.P(42, 3, '#E8283A'); T.P(43, 3, '#E8283A'); T.P(44, 3, '#E8283A'); T.P(43, 4, '#FF5A6A'); // 丹顶
    T.L(45, 7, 53, 9, '#9A9A70', 1); T.L(45, 8, 52, 9, '#7A7A58', 1);    // 长喙
    T.P(43, 6, '#1A1A2A');
    T.L(42, 8, 44, 8, '#2A2A36');
  }, post(T, f) {
    // 仙气
    T.P(6 + f, 36, '#E6F2FF'); T.P(48 - f, 30, '#E6F2FF'); T.P(10, 40 - f, '#FFFFFF');
  } });

  def('mount_qilin', { w: 60, h: 48, ax: 26, ay: 47, frames: 2, outline: '#2A1606', draw(T, f) {
    const b = f ? 1 : 0;
    // 远侧腿
    T.R(16, 32, 3, 12, 'qilinDark', { flat: true }); T.R(34, 32, 3, 12 - b, 'qilinDark', { flat: true });
    // 火焰尾
    T.tube([[14, 27], [9, 24], [6, 18], [7, 12 + b]], 2.2, 1.6, 'qilin');
    // 身体
    T.E(26, 29, 13, 7, 'qilin');
    T.E(27, 33.5, 9, 2.4, 'qilinBelly');
    for (let y = 24; y <= 31; y += 3) for (let x = 16 + ((y / 3) & 1) * 2; x <= 36; x += 4) { T.P(x, y, 'qilin', 2); T.P(x + 1, y + 1, 'qilin', 2); } // 金鳞
    // 近侧腿（奔跑）
    T.R(19, 32, 3, 12 + b, 'qilin'); T.R(37, 32, 3, 12 - b, 'qilin');
    T.R(19, 43 + b, 3, 2, '#7A4A20'); T.R(37, 43 - b, 3, 2, '#7A4A20');
    // 颈
    T.E(38, 22, 4.5, 7, 'qilin');
    // 头
    T.E(45, 15, 6, 4.8, 'qilin');
    T.E(51, 17, 4, 2.8, 'qilin');                                        // 吻
    T.E(50, 19.5, 3, 1.2, 'qilinBelly');
    T.L(47, 19, 54, 18, '#2A1606');
    T.P(55, 16, '#2A1606');                                              // 鼻
    T.P(47, 13, '#FFE04A'); T.P(48, 13, '#2A1606'); T.L(45, 12, 48, 11, '#8A5A20');  // 眼+眉
    // 鹿角
    T.L(43, 10, 40, 3, 'antler', 1, 1); T.L(41, 6, 37, 5, 'antler', 1, 1); T.L(42, 5, 42, 1, 'antler', 1, 0);
    T.L(46, 10, 48, 3, 'antler', 1, 1); T.L(47, 6, 51, 4, 'antler', 1, 1);
    // 须
    T.L(52, 19, 56, 23, 'gold', 1, 0);
  }, post(T, f) {
    const b = f ? 1 : 0;
    // 火焰鬃毛（沿颈背）+ 尾焰 + 火焰蹄
    T.flame(36, 18, 6 + b, -2); T.flame(39, 14, 7 - b, -2); T.flame(42, 11, 5, -1); T.flame(34, 22, 5, -2);
    T.flame(7, 12 + b, 8, -1); T.flame(5, 17, 5, -2);
    T.flame(20, 46, 3, 0); T.flame(38, 46, 3, 0); T.flame(17, 45, 2, 0); T.flame(35, 45, 2, 0);
  } });

  // ---------- 高级笔刷（基于基础笔刷，自动适配缩放）----------
  function makeHelpers(W) {
    const H = {};
    // Catmull-Rom 平滑曲线采样
    H.curve = (ctrl, step) => {
      step = step || 8;
      const pts = [];
      for (let i = 0; i < ctrl.length - 1; i++) {
        const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
        for (let k = 0; k < step; k++) {
          const t = k / step, t2 = t * t, t3 = t2 * t;
          const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      pts.push(ctrl[ctrl.length - 1]);
      return pts;
    };
    // 管状身体（蛇身/龙身/尾巴/脖子）：可选腹带、鳞纹、背鳍
    H.tube = (ctrl, r0, r1, mat, o) => {
      o = o || {};
      const pts = H.curve(ctrl, o.step || 8), n = pts.length;
      const rad = i => r0 + (r1 - r0) * (i / Math.max(1, n - 1));
      const normal = i => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let nx = -(b[1] - a[1]), ny = b[0] - a[0];
        const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const wantDown = o.side !== 'up';
        if ((wantDown && ny < 0) || (!wantDown && ny > 0) || (Math.abs(ny) < 0.15 && nx * (o.sideX || -1) < 0)) { nx = -nx; ny = -ny; }
        return [nx, ny];
      };
      if (o.fins) for (let i = o.finStart || 6; i < n - (o.finEnd || 4); i += o.finEvery || 7) {
        const [x, y] = pts[i], [nx, ny] = normal(i), r = rad(i), fl = o.finLen || 3;
        const bx = x - nx * r, by = y - ny * r;
        W.T(bx - ny * 1.5, by + nx * 1.5, bx - nx * fl, by - ny * fl, bx + ny * 1.5, by - nx * 1.5, o.fins, 1);
      }
      pts.forEach(([x, y], i) => W.E(x, y, rad(i), rad(i), mat));
      pts.forEach(([x, y], i) => {
        const [nx, ny] = normal(i), r = rad(i);
        if (o.belly && i >= (o.bellyStart || 0)) {
          W.P(x + nx * (r - 0.6), y + ny * (r - 0.6), o.belly, 1);
          if (r > 2.2) W.P(x + nx * (r - 1.6), y + ny * (r - 1.6), o.belly, 0);
        }
        if (o.scales && i % (o.scaleEvery || 5) === 0) W.P(x - nx * r * 0.35, y - ny * r * 0.35, mat, 2);
      });
      return { pts, rad, normal };
    };
    // 火焰舌：底部 (x,y)，高 h，lean 为顶端水平偏移
    H.flame = (x, y, h, lean) => {
      lean = lean || 0;
      for (let k = 0; k < h; k++) {
        const t = k / h, w = Math.max(0, Math.round((1 - t) * h * 0.32));
        const cx = Math.round(x + lean * t * t);
        const col = t > 0.75 ? '#FFF2A8' : t > 0.45 ? '#FFD050' : t > 0.2 ? '#FF9A2A' : '#F05A1E';
        for (let dx = -w; dx <= w; dx++) W.P(cx + dx, y - k, Math.abs(dx) === w && w > 0 ? '#E0401E' : col);
      }
    };
    // 冰晶：底部 (x,y)，高 h
    H.crystal = (x, y, h, lean) => {
      lean = lean || 0;
      W.T(x - 1.6, y, x + lean, y - h, x + 1.6, y, 'ice', 1);
      W.L(x - 0.4, y - 1, x + lean * 0.8, y - h + 1, 'ice', 1, 0);
    };
    // 翅膀：肩 (x0,y0) → 翼尖 (x1,y1)，宽度 w；side=1/-1 决定后缘在哪一侧；n 片飞羽
    H.wing = (x0, y0, x1, y1, w, mat, featherMat, n, side) => {
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len * (side || 1), ny = dx / len * (side || 1);
      // 翼面（覆羽）
      W.T(x0, y0, x1, y1, x0 + nx * w, y0 + ny * w, mat, 1);
      W.T(x1, y1, x0 + nx * w, y0 + ny * w, x1 + nx * w * 0.35, y1 + ny * w * 0.35, mat, 1);
      // 飞羽：沿后缘伸出的长羽
      for (let k = 0; k < n; k++) {
        const t = 0.25 + 0.75 * (k / Math.max(1, n - 1));
        const bx = x0 + dx * t + nx * w * (1 - 0.65 * t), by = y0 + dy * t + ny * w * (1 - 0.65 * t);
        const fl = 2.5 + 3 * t;
        const ex = bx + nx * fl + dx / len * 1.5, ey = by + ny * fl + dy / len * 1.5;
        W.L(bx, by, ex, ey, featherMat, 2, k % 2 ? 1 : 0);
      }
      // 覆羽纹
      for (let k = 1; k < 4; k++) { const t = k / 4; W.P(x0 + dx * t + nx * w * 0.45, y0 + dy * t + ny * w * 0.45, mat, 2); }
    };
    // 闪电：从 (x0,y0) 折线到 (x1,y1)
    H.bolt = (x0, y0, x1, y1, color, seed) => {
      let r = (seed || 1) * 9301 % 233280;
      const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
      const steps = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2.5));
      let px0 = x0, py0 = y0;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const nx = x0 + (x1 - x0) * t + (i < steps ? (rnd() - 0.5) * 3 : 0), ny = y0 + (y1 - y0) * t + (i < steps ? (rnd() - 0.5) * 3 : 0);
        W.L(px0, py0, nx, ny, color || '#BFF4FF');
        px0 = nx; py0 = ny;
      }
    };
    return H;
  }

  // ---------- 缓存与绘制 ----------
  const cache = {};

  function getSprite(name) {
    if (cache[name]) return cache[name];
    const d = DEFS[name];
    if (!d) return null;
    const pad = 2;
    const K = d.scale || 1; // 整体放大（坐标、半径同比放大，单像素细节变成 K×K 方块）
    const sw = Math.round(d.w * K), sh = Math.round(d.h * K);
    const frames = [], flashes = [];
    for (let f = 0; f < (d.frames || 1); f++) {
      const g = makeGrid(sw + pad * 2, sh + pad * 2);
      const T = makeTools(g);
      const sq = Math.max(1, Math.round(K));
      const P = (x, y, c, t) => { for (let j = 0; j < sq; j++) for (let i = 0; i < sq; i++) T.P(Math.round(x * K) + pad + i, Math.round(y * K) + pad + j, c, t); };
      const W = {
        E: (cx, cy, rx, ry, m, o) => T.E(cx * K + pad, cy * K + pad, rx * K, ry * K, m, o),
        R: (x, y, w, h, m, o) => T.R(Math.round(x * K) + pad, Math.round(y * K) + pad, Math.round(w * K), Math.round(h * K), m, o),
        T: (x1, y1, x2, y2, x3, y3, m, t) => T.T(x1 * K + pad, y1 * K + pad, x2 * K + pad, y2 * K + pad, x3 * K + pad, y3 * K + pad, m, t),
        L: (x0, y0, x1, y1, c, th, t) => T.L(x0 * K + pad, y0 * K + pad, x1 * K + pad, y1 * K + pad, c, Math.max(1, Math.round((th || 1) * K)), t),
        P,
        PS: (list, c, t) => list.forEach(([x, y]) => P(x, y, c, t)),
        eye: (x, y, color, size) => T.eye(Math.round(x * K) + pad, Math.round(y * K) + pad, color, Math.round((size || 2) * K)),
        evilEye: (x, y, color) => { if (K === 1) return T.evilEye(x + pad, y + pad, color); const xx = Math.round(x * K) + pad, yy = Math.round(y * K) + pad, n = Math.round(2 * K); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) T.P(xx + i, yy + j, i >= n - 1 && j >= n - 1 ? '#1A0A10' : color); },
        tone: T.tone,
      };
      Object.assign(W, makeHelpers(W));
      d.draw(W, f);
      if (d.outline) outline(g, d.outline);
      if (d.post) d.post(W, f); // 描边之后再画的细节（如胡须，保持1像素细线）
      const c = toCanvas(g);
      frames.push(c);
      flashes.push(silhouette(c, '#FFFFFF'));
    }
    const sp = { frames, flashes, w: sw + pad * 2, h: sh + pad * 2, ax: Math.round(d.ax * K) + pad, ay: Math.round(d.ay * K) + pad, name };
    cache[name] = sp;
    return sp;
  }

  // 绘制：x,y 为脚底锚点；opts: { frame, flip, flash(0~1), scale, alpha }
  function draw(ctx, name, x, y, opts) {
    const sp = getSprite(name);
    if (!sp) return false;
    opts = opts || {};
    const s = opts.scale || 1;
    const fi = Math.floor(opts.frame || 0) % sp.frames.length;
    const img = sp.frames[fi];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (opts.flip) ctx.scale(-1, 1);
    if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
    const dx = -sp.ax * s, dy = -sp.ay * s;
    ctx.drawImage(img, dx, dy, sp.w * s, sp.h * s);
    if (opts.flash > 0) {
      ctx.globalAlpha *= Math.min(1, opts.flash);
      ctx.drawImage(sp.flashes[fi], dx, dy, sp.w * s, sp.h * s);
    }
    ctx.restore();
    return true;
  }

  function has(name) { return !!DEFS[name]; }
  function size(name) { const sp = getSprite(name); return sp ? { w: sp.w, h: sp.h, ax: sp.ax, ay: sp.ay } : null; }

  // 采样精灵像素（用于死亡时碎成像素粒子）
  function samplePixels(name, maxCount) {
    const sp = getSprite(name);
    if (!sp) return [];
    const c = sp.frames[0];
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const out = [];
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      if (data[i + 3] > 0) out.push({ x: x - sp.ax, y: y - sp.ay, color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` });
    }
    if (maxCount && out.length > maxCount) {
      const step = out.length / maxCount;
      return Array.from({ length: maxCount }, (_, i) => out[Math.floor(i * step)]);
    }
    return out;
  }

  // 在 DOM 小画布里绘制（图鉴/卡片用）
  function drawToCanvas(canvas, name, opts) {
    const sp = getSprite(name);
    const cctx = canvas.getContext('2d');
    cctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!sp) return;
    opts = opts || {};
    const s = opts.scale || Math.max(1, Math.floor(Math.min((canvas.width - 4) / sp.w, (canvas.height - 4) / sp.h)));
    const x = Math.floor((canvas.width - sp.w * s) / 2) + sp.ax * s;
    const y = Math.floor((canvas.height - sp.h * s) / 2) + sp.ay * s;
    cctx.imageSmoothingEnabled = false;
    if (opts.silhouette) {
      cctx.save(); cctx.globalAlpha = 0.9;
      draw(cctx, name, x, y, { scale: s, flip: opts.flip });
      cctx.globalCompositeOperation = 'source-atop';
      cctx.fillStyle = opts.silhouette; cctx.fillRect(0, 0, canvas.width, canvas.height);
      cctx.restore();
      return;
    }
    draw(cctx, name, x, y, { scale: s, flip: opts.flip, frame: opts.frame });
  }

  // 运行时扩展：新增调色板 / 生物定义
  function addPalette(name, tones) { M[name] = tones; }
  function define(name, spec) { DEFS[name] = spec; delete cache[name]; }

  return { draw, has, size, getSprite, samplePixels, drawToCanvas, DEFS, addPalette, define };
})();

if (typeof module !== 'undefined') module.exports = PixelArt;
