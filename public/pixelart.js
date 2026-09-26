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
    serpent:  ['#8B6BD0', '#5B3FA0', '#35216A'],
    dragonJ:  ['#9CF0D0', '#46C7A0', '#23866A'],
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
  def('灰毛妖鼠', { w: 26, h: 18, ax: 12, ay: 17, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    // 尾巴（向右上卷）
    T.L(18, 13, 22, 12, 'pink', 1, 1); T.L(22, 12, 24, 9 + b, 'pink', 1, 1); T.P(24, 8 + b, 'pink', 1);
    T.E(13, 12, 7, 4.2, 'ratFur');                  // 身体
    T.E(12, 13.5, 4, 2.2, 'ratBelly');
    T.E(6, 9 - b * 0.4, 5, 4.2, 'ratFur');          // 头
    T.E(9, 4.5, 2.2, 2.4, 'ratFur'); T.E(9, 4.7, 1.2, 1.4, 'pink'); // 耳朵
    T.E(4.5, 5.5, 1.8, 2, 'ratFur'); T.P(4, 6, 'pink');
    T.E(2.5, 10.5, 2.2, 1.6, 'ratFur');             // 吻部
    T.P(0, 10, 'pink', 1);                            // 鼻
    T.evilEye(4, 8, '#FF4A5A');
    T.P(2, 12, '#FFFFFF'); T.P(3, 12, '#FFFFFF');     // 龅牙
    T.R(8, 15, 2, 2, 'ratFur'); T.R(15, 15, 2, 2, 'ratFur'); T.P(7, 16, 'pink', 2); T.P(14, 16, 'pink', 2);
    T.L(-1, 9, 1, 9, '#6F6682'); T.L(-1, 11, 1, 11, '#6F6682');
  } });

  def('毒蟾蜍', { w: 26, h: 20, ax: 13, ay: 19, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    T.E(14, 12 + b * 0.5, 10, 6.5 - b * 0.5, 'toad');
    T.E(12, 15, 7, 3, 'toadBelly');
    T.E(8, 6.5 + b * 0.5, 3.2, 3, 'toad'); T.E(16, 6.5 + b * 0.5, 3.2, 3, 'toad'); // 眼包
    T.eye(7, 5 + b, '#1A1020'); T.eye(15, 5 + b, '#1A1020');
    T.L(4, 12, 11, 13, '#2D5A22'); T.P(4, 11, '#2D5A22');           // 大嘴
    T.E(18, 9, 1.4, 1.2, 'wart'); T.E(21, 12, 1.6, 1.4, 'wart'); T.E(16, 12, 1.1, 1, 'wart'); T.E(22, 8.5, 1, 1, 'wart');
    T.R(5, 17, 4, 2, 'toad'); T.R(19, 17, 5, 2, 'toad');            // 脚
    // 毒气泡
    if (f) { T.P(24, 3, '#B6F27A'); T.P(23, 1, '#8BD150'); } else { T.P(22, 4, '#B6F27A'); T.P(24, 2, '#8BD150'); }
  } });

  def('赤狐妖', { w: 30, h: 22, ax: 13, ay: 21, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    // 两条尾巴
    T.E(23, 9 - b, 5, 3, 'fox', { lx: -0.2, ly: -0.9 }); T.E(26, 7 - b, 2, 1.8, 'foxWhite');
    T.E(22, 13 + b, 5, 2.6, 'fox', { lx: -0.2, ly: -0.9 }); T.E(26, 13 + b, 1.8, 1.5, 'foxWhite');
    T.E(14, 14, 7, 4.5, 'fox');
    T.E(12, 16, 4, 2, 'foxWhite');
    T.E(7, 9, 5, 4.5, 'fox');
    T.T(5, 5, 7, 0, 9, 5, 'fox', 1); T.T(6, 5, 7, 2, 8, 5, 'foxWhite', 1);   // 耳
    T.T(10, 5, 12, 0, 13, 6, 'fox', 2);
    T.E(3.5, 11, 3, 2, 'foxWhite');
    T.P(0, 10, '#2A1418'); T.P(1, 10, '#2A1418');
    T.evilEye(5, 8, '#FFD23A');
    T.R(8, 17, 2, 4, 'fox'); T.R(17, 17, 2, 4, 'fox'); T.R(12, 18, 2, 3, 'fox', { flat: true });
    T.P(8, 20, '#2A1418'); T.P(17, 20, '#2A1418');
  } });

  // ===== 筑基期 =====
  def('铁甲傀儡', { w: 26, h: 30, ax: 13, ay: 29, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    T.R(8, 22, 4, 7, 'iron'); T.R(15, 22, 4, 7, 'iron');           // 腿
    T.R(6, 11 + b, 15, 12, 'iron');                                  // 躯干
    T.R(8, 13 + b, 11, 3, 'bronze');                                 // 铜纹
    T.E(13, 19 + b, 2, 2, '#58E0FF', { flat: true }); T.P(12, 18 + b, '#FFFFFF'); // 灵核
    T.R(2, 12 + b, 4, 9, 'iron'); T.R(21, 12 + b, 4, 9, 'iron');     // 手臂
    T.R(1, 20 + b, 5, 3, 'bronze'); T.R(21, 20 + b, 5, 3, 'bronze');
    T.R(8, 3, 11, 8, 'iron');                                        // 头
    T.R(9, 6, 9, 2, '#1B1B2A', { flat: true });
    T.P(10, 6, '#FF6A3A'); T.P(11, 6, '#FFB07A'); T.P(15, 6, '#FF6A3A');
    T.R(12, 0, 3, 3, 'bronze');
    T.PS([[7, 14 + b], [19, 14 + b], [7, 20 + b], [19, 20 + b]], 'bronze', 0); // 铆钉
  } });

  def('墨蛟蛇', { w: 32, h: 22, ax: 16, ay: 21, frames: 2, outline: OL, draw(T, f) {
    const w = f ? 1 : -1;
    // S形身体（从尾到头依次叠圆）
    const pts = [[29, 18], [26, 19], [23, 18 + w * 0.5], [20, 16], [18, 13 - w * 0.5], [16, 11], [13, 12], [10, 15], [8, 17]];
    pts.forEach(([x, y], i) => T.E(x, y, 2 + i * 0.25, 2 + i * 0.2, 'ink'));
    pts.slice(3).forEach(([x, y]) => T.P(x, y + 2, 'inkBelly', 0));
    T.E(7, 9, 5, 4, 'ink');                                    // 头
    T.E(4, 11, 3, 2, 'ink');
    T.T(9, 5, 12, 2, 11, 7, 'inkBelly', 1);                    // 小角
    T.evilEye(6, 8, '#FFE04A');
    T.L(1, 12, 5, 12, '#12131E');
    T.L(-1, 13, 1, 12, '#FF4A6A'); T.P(-1, 14, '#FF4A6A');     // 信子
    T.PS([[14, 10], [18, 12], [21, 15], [25, 17]], 'ink', 0);
  } });

  def('暴猿妖', { w: 32, h: 32, ax: 16, ay: 31, frames: 2, outline: OL, draw(T, f) {
    const b = f ? 1 : 0;
    T.E(17, 18, 10, 9, 'ape');                                   // 躯干
    T.E(15, 21, 6, 5, 'apeFace');                                // 胸
    T.E(5, 21 + b, 4, 7, 'ape'); T.E(28, 21 - b, 4, 7, 'ape');   // 长臂
    T.E(4, 28 + b, 3.5, 2.5, 'apeFace'); T.E(29, 28 - b, 3.5, 2.5, 'apeFace'); // 拳
    T.R(10, 26, 5, 5, 'ape'); T.R(19, 26, 5, 5, 'ape');
    T.E(13, 8, 7, 6.5, 'ape');                                   // 头
    T.E(11, 10, 5, 4, 'apeFace');
    T.R(7, 5, 10, 2, '#4A2A14', { flat: true });                 // 怒眉
    T.evilEye(8, 7, '#FF3A3A'); T.evilEye(13, 7, '#FF3A3A');
    T.L(8, 12, 13, 12, '#4A2014'); T.P(9, 13, '#FFFFFF'); T.P(12, 13, '#FFFFFF');
    T.E(4, 8, 2, 2, 'ape'); T.E(21, 8, 2, 2, 'ape');             // 耳
    T.PS([[22, 14], [24, 17], [21, 20]], 'ape', 2);
  } });

  // ===== 金丹期 =====
  def('冰魄蜘蛛', { w: 36, h: 24, ax: 17, ay: 23, frames: 2, outline: '#16233A', draw(T, f) {
    const b = f ? 1 : 0;
    // 四对长腿：从身体拱起再落地
    const legs = [[9, 2, 20], [12, 6, 21], [18, 26, 21], [21, 31, 20]];
    legs.forEach(([hip, foot, top], i) => {
      const lift = (i % 2 === b) ? -2 : 0;
      const kneeX = (hip + foot) / 2 + (foot < hip ? -1 : 1);
      T.L(hip, 13, kneeX, 5 + lift, 'iceDark', 1, 1);
      T.L(kneeX, 5 + lift, foot, 22, 'iceDark', 1, 1);
      T.P(kneeX, 5 + lift, 'ice', 0);
    });
    T.E(24, 13, 8, 6.5, 'ice');                                   // 腹
    T.PS([[24, 10], [23, 11], [25, 11], [24, 12], [24, 13], [22, 13], [26, 13], [24, 15]], '#FFFFFF');
    T.E(12, 15, 6, 5, 'ice');                                     // 头胸
    T.eye(8, 13, '#16325A'); T.eye(12, 13, '#16325A');
    T.P(10, 12, '#16325A'); T.P(14, 12, '#16325A');
    T.L(7, 18, 6, 21, 'iceDark'); T.L(10, 19, 10, 21, 'iceDark');  // 螯
    T.PS(b ? [[33, 4], [34, 3], [33, 2]] : [[31, 3], [32, 2], [31, 1]], '#E6FBFF');
  } });

  def('三眼火鸦', { w: 32, h: 28, ax: 15, ay: 27, frames: 2, outline: '#1A0F1E', draw(T, f) {
    const up = f === 0;
    // 翅膀
    if (up) { T.T(14, 12, 28, 1, 26, 14, 'crow', 1); T.T(18, 12, 30, 3, 28, 12, 'fire', 1); }
    else { T.T(14, 13, 30, 18, 24, 21, 'crow', 1); T.T(18, 15, 30, 19, 26, 20, 'fire', 1); }
    T.E(16, 15, 7, 6, 'crow');
    T.T(20, 18, 29, 24, 22, 22, 'crow', 2);                       // 尾羽
    T.T(21, 20, 27, 25, 23, 22, 'fire', 2);
    T.E(9, 10, 5.5, 5, 'crow');                                    // 头
    T.T(4, 9, -1, 12, 4, 13, 'fire', 1);                           // 喙
    T.evilEye(6, 9, '#FFB03A'); T.evilEye(10, 9, '#FFB03A');
    T.P(8, 6, '#FF5A2A'); T.P(8, 7, '#FFE27A');                    // 第三只眼
    T.L(12, 20, 12, 26, '#E0A040'); T.L(16, 20, 17, 26, '#E0A040');
    T.PS([[10, 3], [11, 2], [12, 4]], 'fire', f);                  // 头顶火焰
  } });

  def('豹形雷兽', { w: 34, h: 24, ax: 16, ay: 23, frames: 2, outline: '#1E1810', draw(T, f) {
    const b = f ? 1 : 0;
    T.L(26, 12, 32, 6 + b, 'leopard', 2);                          // 尾
    T.E(18, 13, 10, 5, 'leopard');
    T.R(9, 16, 3, 7, 'leopard'); T.R(14, 17, 3, 6, 'leopard'); T.R(21, 17, 3, 6, 'leopard'); T.R(26, 16, 3, 7, 'leopard');
    T.E(8, 9, 5.5, 5, 'leopard');
    T.E(4, 11, 3, 2.3, 'leopard');
    T.T(5, 5, 6, 1, 9, 5, 'leopard', 2); T.T(10, 5, 11, 2, 13, 6, 'leopard', 2);
    T.evilEye(5, 8, '#6AE0FF');
    T.P(1, 10, '#2A1A10'); T.L(2, 13, 5, 13, '#2A1A10');
    // 雷纹斑点
    T.PS([[15, 10], [16, 11], [20, 9], [21, 10], [24, 12], [18, 14], [13, 13]], '#3A62D8');
    // 电弧
    const zz = b ? [[30, 2], [31, 3], [30, 4], [31, 5]] : [[1, 2], [2, 3], [1, 4], [2, 5]];
    T.PS(zz, '#BFF4FF');
  } });

  // ===== 元婴期 =====
  def('鬼影修士', { w: 26, h: 34, ax: 13, ay: 33, frames: 2, outline: '#1A1A36', draw(T, f) {
    const b = f ? 1 : 0;
    // 飘渺下摆（锯齿）
    T.T(4, 18, 22, 18, 13, 33, 'ghost', 1);
    for (let i = 0; i < 5; i++) T.T(4 + i * 4, 26, 8 + i * 4, 26, 6 + i * 4, 31 - ((i + b) % 2) * 2, 'ghost', 2);
    T.R(5, 13, 16, 14, 'robeDark');
    T.L(13, 13, 13, 26, 'ghost', 1, 0);
    T.E(13, 9, 6, 6, 'ghost');                                     // 头（兜帽）
    T.E(12, 10, 4, 4, '#171833', { flat: true });
    T.P(10, 10, '#7CF7FF'); T.P(13, 10, '#7CF7FF');                // 幽光双眼
    T.E(3, 18 + b, 2, 3, 'ghost'); T.E(23, 18 - b, 2, 3, 'ghost');  // 袖
    // 魂火
    T.E(1, 13 + b, 1.4, 1.8, '#7CF7FF', { flat: true }); T.P(1, 11 + b, '#D8FFFF');
  } });

  def('化龙妖蛟', { w: 38, h: 28, ax: 18, ay: 27, frames: 2, outline: '#10281E', draw(T, f) {
    const w = f ? 1 : -1;
    const pts = [[35, 20], [32, 22], [28, 22 + w * 0.5], [24, 20], [21, 17], [18, 15 - w * 0.5], [15, 16], [12, 18]];
    pts.forEach(([x, y], i) => T.E(x, y, 2.2 + i * 0.35, 2.2 + i * 0.3, 'jiao'));
    pts.slice(2).forEach(([x, y]) => { T.P(x, y + 2, 'jiaoBelly', 0); T.P(x - 1, y + 2, 'jiaoBelly', 1); });
    T.T(24, 16, 27, 11, 28, 17, 'jiaoBelly', 1);                   // 背鳍
    T.T(18, 13, 21, 8, 22, 14, 'jiaoBelly', 1);
    T.E(9, 11, 6, 5, 'jiao');                                       // 头
    T.E(4, 13, 4, 2.6, 'jiao');
    T.T(9, 7, 13, 1, 13, 7, 'horn', 1); T.T(6, 7, 7, 2, 9, 7, 'horn', 1);  // 角
    T.evilEye(7, 10, '#FFE04A');
    T.L(0, 14, 6, 14, '#10281E'); T.P(1, 15, '#FFFFFF');
    T.L(2, 11, -1, 8, 'jiaoBelly', 1, 0);                          // 龙须
    T.R(14, 20, 2, 4, 'jiao'); T.P(13, 23, 'horn');                 // 小爪
  } });

  def('血衣魔修', { w: 30, h: 36, ax: 15, ay: 35, frames: 2, outline: '#240A12', draw(T, f) {
    const b = f ? 1 : 0;
    // 喇叭形长袍
    for (let y = 14; y <= 34; y++) { const half = 7 + (y - 14) * 0.38; T.L(15 - half, y, 15 + half, y, 'blood', 1, y > 30 ? 2 : 1); }
    T.L(15, 16, 15, 34, '#5A0E1C');
    T.L(8, 33, 22, 33, '#5A0E1C');
    T.R(8, 22, 14, 2, '#2A0A10', { flat: true }); T.P(15, 22, '#FFD24A');
    T.E(15, 9, 5, 5.5, 'skin');
    T.R(9, 3, 12, 4, '#1A0A12', { flat: true }); T.R(9, 7, 2, 7, '#1A0A12', { flat: true }); T.R(19, 7, 3, 9, '#1A0A12', { flat: true });
    T.evilEye(11, 9, '#FF2A3A'); T.evilEye(16, 9, '#FF2A3A');
    T.L(13, 12, 16, 12, '#8E1F2E');
    T.E(5, 18, 3, 4, 'blood'); T.E(25, 18, 3, 4, 'blood');         // 广袖
    T.P(3, 21, 'skin'); T.P(27, 21, 'skin');
    // 血刃
    T.L(1, 24, 1, 11 + b, '#FFB0B0', 1); T.L(2, 24, 2, 12 + b, '#D23A48', 1); T.R(0, 22, 4, 1, 'gold', { flat: true });
    T.PS([[22 + b, 2], [24, 1 + b], [26 - b, 3]], '#FF4A5A');
  } });

  // ===== 化神期 =====
  def('天魔老祖', { w: 36, h: 40, ax: 18, ay: 39, frames: 2, outline: '#12081E', draw(T, f) {
    const b = f ? 1 : 0;
    for (let y = 16; y <= 38; y++) { const half = 9 + (y - 16) * 0.35; T.L(18 - half, y, 18 + half, y, 'demon', 1, y > 34 ? 2 : 1); }
    T.L(18, 20, 18, 38, '#40226E');
    T.R(11, 18, 14, 3, 'gold'); T.E(18, 26, 3, 3, '#1A0A2A', { flat: true }); T.P(18, 26, '#FF3AD8'); T.P(17, 25, '#FFA6F0');
    T.E(5, 22, 4, 6, 'demon'); T.E(31, 22, 4, 6, 'demon');          // 大袖
    T.E(18, 10, 6.5, 6.5, 'skin');
    T.E(18, 15, 5, 3, '#E6E6F0', { flat: true }); T.R(16, 16, 5, 5, '#E6E6F0', { flat: true }); T.P(18, 21, '#E6E6F0');
    T.T(11, 7, 7, -1, 14, 5, 'horn', 1); T.T(25, 7, 29, -1, 22, 5, 'horn', 1);
    T.evilEye(14, 9, '#FF3AD8'); T.evilEye(20, 9, '#FF3AD8');
    T.R(13, 7, 4, 1, '#3A2040', { flat: true }); T.R(19, 7, 4, 1, '#3A2040', { flat: true });
    T.PS([[1, 12 - b], [2, 10 - b], [34, 12 + b], [35, 9 + b], [31, 5], [5, 5]], '#B06AFF');
  } });

  def('九尾天狐', { w: 42, h: 34, ax: 16, ay: 33, frames: 2, outline: '#2A2440', draw(T, f) {
    const b = f ? 1 : 0;
    // 九条尾巴扇形展开（每条由根到尖逐渐变细）
    for (let i = 0; i < 9; i++) {
      const a = -2.25 + i * 0.3 + (b ? 0.06 : -0.06) * (i % 2 ? 1 : -1);
      for (let k = 0; k <= 10; k++) {
        const r = 3 + k * 1.1;
        const x = 24 + Math.cos(a) * r, y = 19 + Math.sin(a) * r;
        const rad = 2.2 - k * 0.12;
        T.E(x, y, rad, rad, k > 8 ? '#FFC2E2' : 'fox9', k > 8 ? { flat: true } : undefined);
      }
    }
    T.E(18, 23, 8, 5, 'fox9');
    T.R(12, 26, 3, 7, 'fox9'); T.R(21, 26, 3, 7, 'fox9');
    T.E(10, 16, 6, 5.5, 'fox9');
    T.T(6, 12, 7, 5, 11, 11, 'fox9', 1); T.T(7, 11, 7, 7, 9, 11, '#FFB0D8', 1);
    T.T(12, 11, 14, 5, 16, 12, 'fox9', 2);
    T.E(5, 18, 3, 2.2, 'fox9');
    T.P(2, 17, '#6A3A6A');
    T.L(7, 15, 9, 16, '#8A3AB0'); T.P(9, 15, '#E04AA0');
    T.PS([[12, 13], [13, 14], [12, 15]], '#E04AA0');
    T.PS([[3, 8 - b], [2, 24 + b]], '#FF9AD8');
  } });

  def('血魔宗主', { w: 36, h: 42, ax: 18, ay: 41, frames: 2, outline: '#1E0610', draw(T, f) {
    const b = f ? 1 : 0;
    // 披风
    T.T(2, 14, 34, 14, 18, 41, '#5A0E1C');
    T.T(2, 14, 8, 41, 18, 41, '#3A0812'); T.T(34, 14, 28, 41, 18, 41, '#3A0812');
    T.R(8, 16, 20, 16, 'blood');
    T.R(10, 18, 16, 6, '#2A0A10', { flat: true });
    T.PS([[12, 20], [14, 21], [16, 20], [18, 21], [20, 20], [22, 21], [24, 20]], '#FF4A5A');
    T.R(10, 32, 6, 9, '#2A0A10'); T.R(20, 32, 6, 9, '#2A0A10');
    T.E(5, 18, 4, 3, 'blood'); T.E(31, 18, 4, 3, 'blood');           // 肩甲
    T.T(2, 16, 1, 10, 6, 15, 'bone', 1); T.T(34, 16, 35, 10, 30, 15, 'bone', 1);
    T.E(18, 10, 6, 6, 'skin');
    T.R(12, 3, 12, 5, '#FFFFFF', { flat: true }); T.R(11, 5, 3, 9, '#E8E4DA', { flat: true }); T.R(23, 5, 3, 9, '#E8E4DA', { flat: true });
    T.evilEye(14, 10, '#FF1A2A'); T.evilEye(19, 10, '#FF1A2A');
    T.L(15, 14, 20, 14, '#8E1F2E');
    // 血剑
    T.L(31, 34, 31, 18 - b, '#FF8A8A', 2); T.R(29, 33, 6, 2, 'gold'); T.R(31, 35, 2, 3, '#3A0812');
  } });

  // ===== 大乘期 =====
  def('劫雷真龙', { w: 48, h: 36, ax: 22, ay: 35, frames: 2, outline: '#0C1A36', draw(T, f) {
    const w = f ? 1 : -1;
    const pts = [[45, 14], [42, 11 + w], [38, 11], [35, 14], [33, 18 + w * 0.5], [30, 22], [26, 24], [22, 23], [18, 20], [15, 18]];
    pts.forEach(([x, y], i) => T.E(x, y, 2.4 + i * 0.35, 2.4 + i * 0.3, 'thunder'));
    pts.slice(3).forEach(([x, y]) => { T.P(x, y + 2, 'gold', 0); T.P(x + 1, y + 2, 'gold', 1); });
    [[38, 8], [33, 14], [27, 19], [21, 18]].forEach(([x, y]) => T.T(x - 2, y, x, y - 4, x + 2, y, 'gold', 1)); // 背鳍
    T.R(20, 25, 3, 5, 'thunder'); T.R(28, 25, 3, 5, 'thunder'); T.PS([[19, 30], [21, 30], [27, 30], [29, 30]], 'horn');
    T.E(10, 15, 7, 6, 'thunder');                                     // 龙头
    T.E(4, 17, 5, 3.2, 'thunder');
    T.T(10, 10, 16, 2, 15, 11, 'horn', 1); T.T(7, 10, 8, 3, 11, 10, 'horn', 1);
    T.evilEye(7, 13, '#FFF06A');
    T.L(-1, 18, 7, 19, '#0C1A36'); T.PS([[1, 19], [3, 19]], '#FFFFFF');
    T.L(3, 15, -1, 11, 'gold', 1, 0); T.L(5, 20, 0, 24, 'gold', 1, 0);   // 龙须
    T.E(15, 11, 2, 3, '#DDE8FF');                                     // 鬃
    // 雷光
    const bolt = f ? [[44, 2], [43, 3], [44, 4], [43, 5], [44, 6]] : [[2, 3], [3, 4], [2, 5], [3, 6], [2, 7]];
    T.PS(bolt, '#FFFFFF');
  } });

  def('混沌古兽', { w: 40, h: 38, ax: 20, ay: 37, frames: 2, outline: '#120A20', draw(T, f) {
    const b = f ? 1 : 0;
    // 四翼
    T.T(22, 12, 38, 1 + b, 36, 14, 'chaos', 2); T.T(22, 16, 39, 18 - b, 33, 22, 'chaos', 2);
    T.T(18, 12, 2, 1 + b, 4, 14, 'chaos', 2); T.T(18, 16, 1, 18 - b, 7, 22, 'chaos', 2);
    T.E(20, 19, 12, 11, 'chaos');                                      // 无面之躯
    T.E(20, 22, 7, 6, '#231A3A', { flat: true });
    // 混沌漩涡
    T.PS([[20, 20], [21, 21], [20, 22], [19, 21], [22, 23], [18, 23], [20, 24], [23, 20], [17, 20]], '#C9A2FF');
    T.P(20, 22, '#FFFFFF');
    T.R(11, 29, 4, 8, 'chaos'); T.R(17, 30, 4, 7, 'chaos'); T.R(23, 30, 4, 7, 'chaos'); T.R(29, 29, 4, 8, 'chaos'); // 六足
    T.PS([[11, 36], [14, 36], [29, 36], [32, 36]], 'horn');
    T.PS([[6, 26 - b], [34, 27 + b], [20, 5 - b]], '#FF7AF0');
  } });

  def('天道魔神', { w: 44, h: 48, ax: 22, ay: 47, frames: 2, outline: '#0A0514', draw(T, f) {
    const b = f ? 1 : 0;
    // 背后法环
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + b * 0.13; T.P(22 + Math.cos(a) * 17, 16 + Math.sin(a) * 15, i % 3 ? '#FFD24A' : '#FF5A6A'); }
    T.T(6, 22, 38, 22, 22, 47, 'godRobe', 1);
    T.R(7, 46, 30, 1, 'godRobe', { flat: true });
    T.R(9, 18, 26, 16, 'godRobe');
    T.R(11, 20, 22, 3, 'gold'); T.R(20, 23, 4, 18, 'gold');
    T.E(22, 29, 3, 3, '#FF2A4A', { flat: true }); T.P(21, 28, '#FFB0B8');
    T.E(5, 22, 5, 4, 'gold'); T.E(39, 22, 5, 4, 'gold');              // 金色肩甲
    T.E(2, 30, 3, 5, 'godRobe'); T.E(42, 30, 3, 5, 'godRobe');
    T.E(22, 11, 7, 7, '#E8D8F0');                                      // 面具般的脸
    T.T(15, 7, 10, -1, 18, 5, 'gold', 1); T.T(29, 7, 34, -1, 26, 5, 'gold', 1); T.T(20, 5, 22, -2, 24, 5, 'gold', 0);
    T.R(17, 10, 4, 2, '#0A0514', { flat: true }); T.R(23, 10, 4, 2, '#0A0514', { flat: true });
    T.P(18, 10, '#FF2A4A'); T.P(25, 10, '#FF2A4A');
    T.P(22, 8, '#FF2A4A'); T.L(20, 15, 24, 15, '#6A4A7A');
    T.PS([[3, 12 - b], [41, 12 + b], [1, 40], [43, 40]], '#FFD24A');
  } });

  // ===== 灵兽（面朝右）=====
  def('fire_cat', { w: 20, h: 16, ax: 10, ay: 15, frames: 2, outline: '#2A1008', draw(T, f) {
    const b = f ? 1 : 0;
    T.L(4, 10, 1, 5 + b, 'catRed', 2); T.PS([[0, 4 + b], [1, 3 + b]], '#FFE27A');   // 火尾
    T.E(9, 10, 5, 3.4, 'catRed');
    T.R(6, 12, 2, 3, 'catRed'); T.R(11, 12, 2, 3, 'catRed');
    T.E(14, 7, 4, 3.6, 'catRed');
    T.T(11, 5, 12, 1, 14, 4, 'catRed', 1); T.T(15, 4, 17, 1, 18, 5, 'catRed', 1);
    T.eye(15, 6); T.P(17, 8, '#FFB0B0');
    T.E(9, 11, 2.5, 1.5, 'fire');
  } });
  def('ice_wolf', { w: 24, h: 18, ax: 11, ay: 17, frames: 2, outline: '#14203A', draw(T, f) {
    const b = f ? 1 : 0;
    T.E(3, 8 + b, 3, 2, 'wolf', { lx: 0.3, ly: -0.9 });
    T.E(10, 10, 7, 4, 'wolf');
    T.R(5, 12, 2, 5, 'wolf'); T.R(9, 13, 2, 4, 'wolf'); T.R(13, 13, 2, 4, 'wolf'); T.R(16, 12, 2, 5, 'wolf');
    T.E(17, 7, 4, 3.6, 'wolf'); T.E(21, 8, 2.4, 1.8, 'wolf');
    T.T(14, 5, 15, 0, 17, 4, 'wolf', 1); T.T(17, 4, 19, 0, 20, 5, 'wolf', 1);
    T.eye(18, 6, '#1A3A6A'); T.P(23, 8, '#1A1A2A');
    T.PS([[8, 6], [10, 5], [12, 6]], '#FFFFFF');                      // 冰晶鬃毛
  } });
  def('thunder_eagle', { w: 24, h: 18, ax: 12, ay: 17, frames: 2, outline: '#231606', draw(T, f) {
    if (f === 0) T.T(10, 8, 1, 0, 4, 10, 'eagle', 1); else T.T(10, 9, 0, 14, 5, 15, 'eagle', 2);
    T.E(11, 10, 5, 4, 'eagle');
    T.T(6, 11, 1, 14, 6, 13, 'eagle', 2);
    T.E(16, 7, 3.5, 3.2, '#F4EEE0');
    T.T(19, 7, 23, 8, 19, 10, 'gold', 1);
    T.eye(16, 6, '#2A1A08');
    T.L(10, 14, 10, 16, '#E0A040'); T.L(13, 14, 13, 16, '#E0A040');
    T.PS([[5, 3], [6, 4], [5, 5]], '#BFF4FF');
  } });
  def('shadow_serpent', { w: 24, h: 14, ax: 12, ay: 13, frames: 2, outline: '#140A24', draw(T, f) {
    const w = f ? 1 : -1;
    const pts = [[2, 10], [5, 11 + w * 0.5], [8, 10], [11, 9 - w * 0.5], [14, 10]];
    pts.forEach(([x, y], i) => T.E(x, y, 1.5 + i * 0.3, 1.5 + i * 0.2, 'serpent'));
    T.E(18, 7, 4, 3.2, 'serpent');
    T.eye(18, 6, '#1A0A2A'); T.P(19, 6, '#C9A2FF');
    T.L(21, 9, 23, 9, '#FF6A9A');
    T.PS([[6, 9], [11, 8], [15, 9]], '#C9A2FF');
  } });
  def('jade_dragon', { w: 28, h: 18, ax: 13, ay: 17, frames: 2, outline: '#0C2A20', draw(T, f) {
    const w = f ? 1 : -1;
    const pts = [[2, 9], [5, 11 + w * 0.5], [8, 12], [11, 11 - w * 0.5], [14, 10]];
    pts.forEach(([x, y], i) => T.E(x, y, 1.6 + i * 0.35, 1.6 + i * 0.3, 'dragonJ'));
    pts.slice(1).forEach(([x, y]) => T.P(x, y + 2, 'jiaoBelly', 0));
    T.E(19, 8, 4.5, 3.8, 'dragonJ'); T.E(23, 9, 3, 2, 'dragonJ');
    T.T(16, 5, 14, 0, 18, 4, 'horn', 1);
    T.eye(20, 7, '#0C2A20');
    T.L(24, 10, 27, 13, 'gold', 1, 0);
    T.R(8, 13, 2, 3, 'dragonJ'); T.R(13, 12, 2, 3, 'dragonJ');
  } });
  def('phoenix', { w: 26, h: 22, ax: 12, ay: 21, frames: 2, outline: '#2A0A10', draw(T, f) {
    if (f === 0) T.T(12, 11, 2, 1, 5, 13, 'phoenix', 1); else T.T(12, 12, 1, 16, 6, 18, 'phoenix', 2);
    T.T(8, 14, 0, 20, 4, 21, 'fire', 1); T.T(9, 14, 2, 21, 7, 21, 'phoenix', 2);   // 长尾
    T.E(13, 13, 5, 4, 'phoenix');
    T.E(18, 8, 3.4, 3.2, 'phoenix');
    T.T(21, 8, 25, 9, 21, 10, 'gold', 1);
    T.eye(18, 7, '#2A0A10');
    T.PS([[17, 4], [18, 3], [19, 4], [18, 2]], '#FFE27A');               // 冠羽
    T.L(12, 17, 12, 20, '#E0A040'); T.L(15, 17, 15, 20, '#E0A040');
  } });

  // ===== 坐骑（面朝右，鼠鼠站在背上）=====
  def('mount_crane', { w: 36, h: 30, ax: 16, ay: 29, frames: 2, outline: '#2A2E3A', draw(T, f) {
    const up = f === 0;
    if (up) T.T(12, 13, 1, 3, 8, 15, 'crane', 1); else T.T(12, 14, 0, 20, 7, 20, 'crane', 2);
    T.T(6, 13, 0, 11, 5, 16, '#2A2A36');                                // 黑尾羽
    T.E(16, 15, 9, 4.5, 'crane');
    T.L(24, 13, 28, 4, 'crane', 2);                                      // 长颈
    T.E(29, 4, 2.6, 2.2, 'crane'); T.P(29, 2, '#FF3A3A'); T.P(30, 2, '#FF3A3A');   // 丹顶
    T.L(31, 4, 35, 6, '#D8B060'); T.P(29, 4, '#1A1A2A');
    T.L(14, 19, 14, 29, '#3A3A48'); T.L(19, 19, 20, 29, '#3A3A48');
    if (up) T.T(14, 13, 22, 2, 22, 14, 'cloud', 1);
  } });
  def('mount_qilin', { w: 40, h: 32, ax: 18, ay: 31, frames: 2, outline: '#2A1606', draw(T, f) {
    const b = f ? 1 : 0;
    // 火焰尾
    T.T(8, 12, 0, 8 - b, 2, 14, 'qilinMane', 1); T.T(8, 13, 1, 15 + b, 5, 16, 'fire', 1);
    T.E(18, 15, 11, 5.5, 'qilin');
    T.PS([[12, 13], [15, 12], [18, 13], [21, 12], [24, 13], [14, 16], [20, 16], [17, 17]], 'qilin', 2);
    T.R(10, 19, 3, 11 - b, 'qilin'); T.R(15, 20, 3, 10, 'qilin'); T.R(22, 20, 3, 10, 'qilin'); T.R(26, 19, 3, 11 - b, 'qilin');
    T.PS([[10, 30 - b], [11, 30 - b], [12, 30 - b], [26, 30 - b], [27, 30 - b], [28, 30 - b]], 'qilinMane', 0);
    T.L(28, 13, 31, 6, 'qilin', 3);                                        // 颈
    T.E(32, 6, 4.5, 4, 'qilin'); T.E(36, 8, 3, 2.2, 'qilin');
    // 鬃毛沿颈背
    T.E(27, 9, 2, 3, 'qilinMane'); T.E(29, 5, 2, 2.5, 'qilinMane'); T.E(26, 13, 1.8, 2, 'qilinMane');
    T.L(31, 2, 30, -2, 'horn', 1, 0); T.L(34, 2, 35, -2, 'horn', 1, 0); T.P(29, -1, 'horn', 0); T.P(36, -1, 'horn', 0);
    T.eye(33, 5, '#2A1606'); T.P(39, 8, '#2A1606');
    T.L(36, 10, 39, 13, 'gold', 1, 0);
  } });

  // ---------- 缓存与绘制 ----------
  const cache = {};

  function getSprite(name) {
    if (cache[name]) return cache[name];
    const d = DEFS[name];
    if (!d) return null;
    const pad = 2;
    const frames = [], flashes = [];
    for (let f = 0; f < (d.frames || 1); f++) {
      const g = makeGrid(d.w + pad * 2, d.h + pad * 2);
      const T = makeTools(g);
      // 平移：DSL 里的坐标以(0,0)为左上，留出描边空间
      const shifted = {};
      for (const k of Object.keys(T)) {
        shifted[k] = T[k];
      }
      const off = (fn, idxs) => (...args) => { idxs.forEach(i => { if (typeof args[i] === 'number') args[i] += pad; }); return fn(...args); };
      const W = {
        E: off(T.E, [0, 1]), R: off(T.R, [0, 1]), T: off(T.T, [0, 1, 2, 3, 4, 5]), L: off(T.L, [0, 1, 2, 3]),
        P: off(T.P, [0, 1]), eye: off(T.eye, [0, 1]), evilEye: off(T.evilEye, [0, 1]),
        PS: (list, c, t) => T.PS(list.map(([x, y]) => [x + pad, y + pad]), c, t), tone: T.tone,
      };
      d.draw(W, f);
      if (d.outline) outline(g, d.outline);
      const c = toCanvas(g);
      frames.push(c);
      flashes.push(silhouette(c, '#FFFFFF'));
    }
    const sp = { frames, flashes, w: d.w + pad * 2, h: d.h + pad * 2, ax: d.ax + pad, ay: d.ay + pad, name };
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

  return { draw, has, size, getSprite, samplePixels, drawToCanvas, DEFS };
})();

if (typeof module !== 'undefined') module.exports = PixelArt;
