// ============================================================
// sprites.js — 鼠鼠修仙 像素精灵绘制系统 v3.1
// 方块像素风格 — 高分辨率像素画，更多像素组成
// v3.1: 鼠鼠精细化 + 中华龙形象重制
// ============================================================
//
// 【美术风格调整指南】
// 1. 颜色调整 → 修改下方 C 对象的颜色常量
// 2. 角色体型/比例 → 修改 drawMouseBody() 中的像素坐标
// 3. 各境界袍服 → 修改 HERO_ROBES / drawHeroBody（头部仍是 v1 原版 drawMouseBody）
// 4. 怪物/灵兽/坐骑 → 见 pixelart.js（v3 起统一由像素雕刻DSL生成）
// 7. 光环/特效 → 修改 drawMouseByRealm 函数中的 ellipse 光晕部分
// 8. 武器 → WEAPON_DEFS（境界默认武器 realm0~5 + 天机阁武器外观 ws_*）
// 9. 衣服皮肤 → 修改 armorSkinColors 颜色表
//
// 核心绘制API:
//   px(ctx, x, y, s, color)     — 画单个像素方块
//   rect(ctx, x, y, w, h, color) — 画矩形方块
//   circle/ellipse              — 仅用于光效/特效（保持柔和）
//   drawMatrix(ctx, matrix, x, y, s) — 从二维颜色矩阵批量绘制
// ============================================================

const Sprites = (() => {

  // ===== 基础绘制辅助 =====
  function px(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), s, s);
  }

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  // 保留circle/ellipse/roundRect用于特效和光效（非角色主体）
  function circle(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(Math.floor(cx), Math.floor(cy), r, 0, Math.PI * 2);
    ctx.fill();
  }

  function ellipse(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(Math.floor(cx), Math.floor(cy), rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  // 从像素矩阵绘制精灵
  function drawMatrix(ctx, matrix, x, y, s) {
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        const c = matrix[row][col];
        if (c && c !== '' && c !== '.') {
          ctx.fillStyle = c;
          ctx.fillRect(
            Math.floor(x + col * s),
            Math.floor(y + row * s),
            s, s
          );
        }
      }
    }
  }

  // ===== 颜色常量 =====
  const C = {
    FUR_GREY: '#9BB0D4',
    FUR_LIGHT: '#B8CCE8',
    FUR_BELLY: '#C8D8F0',
    FUR_DARK: '#7A92B8',
    EAR_PINK: '#C88AAE',
    EAR_INNER: '#E0A0C4',
    NOSE: '#FF99AA',
    EYE: '#111122',
    EYE_SHINE: '#EEEEFF',
    WHISKER: '#A0B8D0',
    TAIL: '#8090B0',
    CHEEK: '#FFBBCC',
    CLOTH_BROWN: '#5A6B8A',
    CLOTH_GOLD: '#4488CC',
    CLOTH_GREEN: '#2E8B8B',
    CLOTH_BLUE: '#4169B4',
    CLOTH_PURPLE: '#7B3EBF',
    CLOTH_RED: '#A02060',
    WOOD: '#6B7B96',
    IRON: '#8899BB',
    STEEL: '#AAB8D0',
    MAGIC_BLUE: '#44CCFF',
    MAGIC_PURPLE: '#AA88FF',
    MAGIC_PINK: '#FF66DD',
    MAGIC_GOLD: '#CCAA44',
    HANDLE: '#4A5570',
    SHADOW: 'rgba(20,10,40,0.25)',
  };

  const _ = '';

  // ================================================================
  // 鼠鼠绘制 — 方块像素风 v3.0
  // 每个角色用更多像素块组成，全部使用 rect/px 绘制
  // ================================================================

  // 通用鼠鼠身体绘制（方块像素版，所有境界共用）— v4.0 参考像素鼠风格
  // 特征：大圆耳、紧凑圆脸、小眼+单高光、小鼻小嘴、细胡须
  function drawMouseBody(ctx, s, furMain, furLight, furBelly, earOuter, earInner) {
    // === 耳朵（大圆耳，像素鼠标志性特征） ===
    // 左耳（圆形轮廓，3层）
    rect(ctx, -8*s, -17*s, 4*s, s, earOuter);   // 顶
    rect(ctx, -9*s, -16*s, 6*s, 2*s, earOuter);  // 上部宽
    rect(ctx, -9*s, -14*s, 5*s, 2*s, earOuter);  // 下部
    rect(ctx, -8*s, -12*s, 3*s, s, earOuter);     // 底部连接头
    // 左耳内粉
    rect(ctx, -7*s, -16*s, 3*s, s, earInner);
    rect(ctx, -8*s, -15*s, 4*s, 2*s, earInner);
    rect(ctx, -7*s, -13*s, 2*s, s, earInner);
    px(ctx, -6*s, -15*s, s, '#F0C0D8'); // 内高光
    // 右耳
    rect(ctx, 5*s, -17*s, 4*s, s, earOuter);
    rect(ctx, 4*s, -16*s, 6*s, 2*s, earOuter);
    rect(ctx, 5*s, -14*s, 5*s, 2*s, earOuter);
    rect(ctx, 6*s, -12*s, 3*s, s, earOuter);
    // 右耳内粉
    rect(ctx, 5*s, -16*s, 3*s, s, earInner);
    rect(ctx, 5*s, -15*s, 4*s, 2*s, earInner);
    rect(ctx, 6*s, -13*s, 2*s, s, earInner);
    px(ctx, 6*s, -15*s, s, '#F0C0D8');

    // === 头部（圆润紧凑，像素鼠风格） ===
    rect(ctx, -4*s, -13*s, 9*s, s, furMain);     // 头顶窄
    rect(ctx, -5*s, -12*s, 11*s, 3*s, furMain);   // 头上部
    rect(ctx, -5*s, -9*s, 11*s, 3*s, furLight);   // 头下部亮色
    rect(ctx, -4*s, -6*s, 9*s, 2*s, furMain);     // 下巴
    // 额头高光
    px(ctx, -s, -12*s, s, furLight);
    px(ctx, 0, -13*s, s, furLight);
    px(ctx, s, -12*s, s, furLight);

    // === 腮红 ===
    rect(ctx, -5*s, -8*s, 2*s, 2*s, C.CHEEK);
    rect(ctx, 4*s, -8*s, 2*s, 2*s, C.CHEEK);

    // === 眼睛（2x2像素，深色+单高光，像素鼠风格） ===
    rect(ctx, -3*s, -10*s, 2*s, 2*s, '#0A0A22');
    px(ctx, -3*s, -10*s, s, '#FFFFFF');
    rect(ctx, 2*s, -10*s, 2*s, 2*s, '#0A0A22');
    px(ctx, 2*s, -10*s, s, '#FFFFFF');

    // === 鼻子（小圆点） ===
    px(ctx, 0, -7*s, s, C.NOSE);

    // === 嘴巴（简洁微笑） ===
    px(ctx, -s, -6*s, s, '#8899AA');
    px(ctx, s, -6*s, s, '#8899AA');

    // === 胡须（细长，左右各3根） ===
    rect(ctx, -8*s, -10*s, 3*s, s, C.WHISKER);
    rect(ctx, -9*s, -8*s, 4*s, s, C.WHISKER);
    rect(ctx, -8*s, -6*s, 3*s, s, C.WHISKER);
    rect(ctx, 6*s, -10*s, 3*s, s, C.WHISKER);
    rect(ctx, 6*s, -8*s, 4*s, s, C.WHISKER);
    rect(ctx, 6*s, -6*s, 3*s, s, C.WHISKER);
  }

  // 绘制尾巴（方块版）— v4.0 简洁卷尾
  function drawMouseTail(ctx, s, frame, color) {
    const c = color || C.TAIL;
    const wave = Math.sin(frame * 0.06) * 2;
    rect(ctx, -4*s, 2*s, 2*s, s, c);
    rect(ctx, -6*s, s + wave*s, 2*s, s, c);
    rect(ctx, -8*s, 0 + wave*s, 2*s, s, c);
    rect(ctx, -9*s, -s + wave*s, s, s, c);
    rect(ctx, -9*s, -2*s + wave*0.5*s, s, s, c);
    rect(ctx, -8*s, -3*s + wave*0.3*s, s, s, c);
  }

  // ================================================================
  // 鼠鼠 v3.2 — v1 原版头部（一格不改）+ 六境界独立服装 + 柔和描边
  // 身体坐标沿用 v1：原点在胸口，头部 y∈[-17,-4]，脚底 y=7
  // ================================================================

  // 六境界服装设计
  const HERO_OUTFITS = [
    { name: '粗布短褐', robe: ['#B08458', '#8A6440', '#64462A'], trim: '#C8A060', inner: '#E8DCC0', gem: null, style: 0 },
    { name: '青衫道袍', robe: ['#8EC0EE', '#5E98D8', '#3C6EAE'], trim: '#F2F4FA', inner: '#F2F4FA', gem: '#E8C060', style: 1 },
    { name: '青云法袍', robe: ['#5CC4B6', '#2E9A90', '#1C6E68'], trim: '#7FF0D0', inner: '#E8F4F0', gem: '#FFD86A', style: 2 },
    { name: '星纹华服', robe: ['#6E8CE0', '#4462B8', '#2A4284'], trim: '#E8EEF8', inner: '#1C2E5A', gem: '#9FC8FF', style: 3 },
    { name: '紫霞仙衣', robe: ['#BC8CF0', '#8E56D0', '#6232A4'], trim: '#FFB0E0', inner: '#F4E6FF', gem: '#FF9AD0', style: 4 },
    { name: '九天神衣', robe: ['#E65C88', '#B42458', '#7C123E'], trim: '#FFC83A', inner: '#FFF2D0', gem: '#60E0A0', style: 5 },
  ];
  const GOLD = ['#FFE680', '#FFC83A', '#C8901E'];
  const HERO_GOLD = GOLD;
  const PAW = '#E8A0B0';
  const HERO_OUTLINE = [0x2A, 0x24, 0x40];
  const HERO_OX = 15, HERO_OY = 21, HERO_W = 32, HERO_H = 31;
  const heroCache = new Map();

  function shadeHex(hex, k) {
    const h = hex.replace('#', '');
    const c = [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * k))));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // 境界服装；穿戴天机阁外观时整体换成外观自己的设计
  function heroOutfit(realm, skinId) {
    const base = HERO_OUTFITS[realm] || HERO_OUTFITS[0];
    const def = skinId && SKIN_OUTFITS[skinId];
    if (!def) return { ...base, skin: null };
    return { name: '', robe: def.robe, trim: def.trim, inner: def.inner, gem: def.gem || def.trim, style: def.style, skin: skinId, def };
  }

  // 身后的东西（先画，被身体和头遮住）
  function drawHeroBack(c, realm, O, frame2) {
    if (O.skin) { if (O.def.back) O.def.back(c, frame2); return; }
    const st = O.style;
    if (st === 0) { // 行囊
      rect(c, -8, -4, 3, 4, '#B89A70'); rect(c, -8, -4, 3, 1, '#D8BE94'); px(c, -7, -2, 1, '#8A6A40');
    }
    if (st === 3) { // 披帛（从肩后绕过头顶的飘带）
      const w = frame2 ? 1 : 0;
      for (let x = -8; x <= 8; x++) px(c, x, -5 - Math.round(Math.sqrt(Math.max(0, 64 - x * x)) * 0.55) - (Math.abs(x) > 6 ? -w : 0), 1, '#9FC8FF');
      px(c, -9, 1 + w, 1, '#9FC8FF'); px(c, 9, 1 - w, 1, '#9FC8FF'); px(c, -9, 0, 1, '#9FC8FF'); px(c, 9, 0, 1, '#9FC8FF');
    }
    if (st === 5) { // 背后光轮
      c.fillStyle = '#FFE9A0';
      for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; px(c, Math.round(Math.cos(t) * 10), Math.round(-10 + Math.sin(t) * 9), 1, a % 4 === 0 ? '#FFFFFF' : '#FFE9A0'); }
    }
  }

  function robeRows(c, O, top, bottom, halfFn) {
    const [lt, md, dk] = O.robe;
    for (let y = top; y <= bottom; y++) {
      const half = halfFn(y);
      rect(c, -half, y, half * 2 + 1, 1, y === bottom ? dk : md);
      px(c, -half, y, 1, y === bottom ? dk : lt);
    }
  }

  function drawHeroBody(c, realm, O, pose, frame2) {
    const [lt, md, dk] = O.robe;
    const st = O.style;
    const atk = pose === 'attack';
    const rArmY = atk ? -3 : -2;
    if (st === 0) {
      // 粗布短褐：短上衣 + 灰裤 + 绑腿 + 草绳腰带 + 补丁
      const pants = (O.def && O.def.pants) || '#5E6072';
      rect(c, -3, 3, 7, 3, pants); px(c, -3, 3, 1, shadeHex(pants, 1.2));
      rect(c, -3, 5, 2, 2, '#D8CCB0'); rect(c, 2, 5, 2, 2, '#D8CCB0'); px(c, -3, 6, 1, '#B8AC90'); px(c, 3, 6, 1, '#B8AC90');
      robeRows(c, O, -4, 3, y => y < -2 ? 3 : 4);
      rect(c, -1, -4, 3, 1, O.inner); px(c, 0, -3, 1, O.inner);
      px(c, -1, -4, 1, dk); px(c, 0, -3, 1, dk); px(c, 1, -2, 1, dk); px(c, 1, -1, 1, dk);
      rect(c, -4, 1, 9, 1, O.trim); px(c, -1, 2, 1, O.trim); px(c, -2, 3, 1, O.trim);
      if (!O.skin) { rect(c, 2, -1, 2, 2, shadeHex(md, 0.85)); px(c, 2, -1, 1, shadeHex(md, 1.15)); } // 补丁
      rect(c, -5, -2, 2, 3, md); px(c, -5, -2, 1, lt);
      rect(c, 4, rArmY, 2, 3, md);
      rect(c, -5, 1, 2, 1, PAW); rect(c, atk ? 5 : 4, rArmY + 3, 2, 1, PAW);
      rect(c, -3, 7, 2, 1, '#9A7A50'); rect(c, 2, 7, 2, 1, '#9A7A50'); // 草鞋
      return;
    }
    if (st === 6) {
      // 铠甲：护胸 + 分片裙甲 + 大肩甲 + 护腿
      rect(c, -3, 3, 2, 4, dk); rect(c, 2, 3, 2, 4, dk); px(c, -3, 3, 1, md); px(c, 2, 3, 1, md);
      robeRows(c, O, -4, 1, y => y < -2 ? 3 : 4);
      rect(c, -4, 2, 4, 2, md); rect(c, 1, 2, 4, 2, md); rect(c, -4, 3, 4, 1, dk); rect(c, 1, 3, 4, 1, dk); px(c, -4, 2, 1, lt);
      rect(c, -4, 1, 9, 1, O.trim); px(c, 0, 1, 1, O.gem);
      rect(c, -2, -4, 5, 1, O.inner); px(c, 0, -3, 1, O.inner);
      rect(c, -5, -2, 2, 3, md); rect(c, 4, rArmY, 2, 3, md);
      rect(c, -5, 1, 2, 1, PAW); rect(c, atk ? 5 : 4, rArmY + 3, 2, 1, PAW);
      rect(c, -7, -5, 4, 3, md); rect(c, -7, -5, 4, 1, lt); px(c, -7, -3, 1, dk);
      rect(c, 4, -5, 4, 3, md); rect(c, 4, -5, 4, 1, lt); px(c, 7, -3, 1, dk);
      rect(c, -3, 7, 2, 1, dk); rect(c, 2, 7, 2, 1, dk);
      return;
    }
    // 其余境界：长袍
    const flare = [0, 0.2, 0.25, 0.3, 0.3, 0.35][st];
    robeRows(c, O, -4, 6, y => Math.round(3 + (y + 4) * flare));
    const acc = !O.skin; // 境界专属配饰只在不穿外观时出现
    if (st === 3) { // 双层衣摆
      rect(c, -5, 4, 11, 2, O.inner); px(c, -5, 4, 1, shadeHex(O.inner, 1.4));
      for (let x = -4; x <= 4; x += 2) px(c, x, 5, 1, '#E8F0FF');
    }
    // 领口
    if (st === 1) { // 白色宽领
      rect(c, -2, -4, 5, 1, O.inner); rect(c, -1, -3, 3, 1, O.inner); px(c, 0, -2, 1, O.inner);
      px(c, -2, -4, 1, '#C8D0E0'); px(c, 2, -4, 1, '#C8D0E0');
      px(c, 0, -2, 1, dk); px(c, 1, -1, 1, dk);
    } else if (st === 3) { // 高立领
      rect(c, -2, -5, 5, 1, O.trim); px(c, -2, -4, 1, O.trim); px(c, 2, -4, 1, O.trim);
      rect(c, -1, -4, 3, 1, '#E8F0FF'); px(c, 0, -3, 1, dk);
    } else {
      rect(c, -1, -4, 3, 1, O.inner); px(c, 0, -3, 1, O.inner);
      px(c, -1, -4, 1, dk); px(c, 0, -3, 1, dk); px(c, 1, -2, 1, dk); px(c, 2, -4, 1, dk);
    }
    // 腰带与配饰
    if (st === 1) {
      rect(c, -4, 0, 9, 1, (O.def && O.def.belt) || (O.skin ? shadeHex(dk, 0.7) : '#2E4E86'));
      if (acc) { px(c, 2, 1, 1, O.gem); px(c, 2, 2, 1, O.gem); px(c, 2, 3, 1, shadeHex(O.gem, 0.7)); } // 流苏
    } else if (st === 2) {
      rect(c, -4, 0, 9, 1, dk); px(c, 0, 0, 1, O.gem);
      if (acc) { rect(c, -6, 1, 2, 3, '#D8A040'); px(c, -6, 1, 1, '#F0C870'); px(c, -5, 0, 1, '#8A5A20'); } // 葫芦
      if (acc) for (let x = -4; x <= 4; x += 3) px(c, x, 5, 1, O.trim); // 云纹
    } else if (st === 3) {
      rect(c, -4, 0, 9, 1, O.trim); px(c, 0, 0, 1, O.gem);
      if (acc) for (const [x, y] of [[-2, -2], [2, 1], [-3, 2], [1, -3]]) px(c, x, y, 1, '#E8F0FF'); // 星纹
    } else if (st === 4) {
      rect(c, -4, 0, 9, 1, O.trim); px(c, 0, 1, 1, O.gem); px(c, 0, 2, 1, O.gem);
      if (acc) for (const [x, y] of [[-2, 3], [2, -2], [0, 4]]) px(c, x, y, 1, '#E0C8FF'); // 灵纹
    } else if (st === 5) {
      const gold = acc ? GOLD : [shadeHex(O.trim, 1.2), O.trim, shadeHex(O.trim, 0.7)];
      rect(c, -4, 0, 9, 1, gold[1]); px(c, 0, 0, 1, O.gem); px(c, -1, 0, 1, gold[0]);
      rect(c, -6, 5, 13, 1, gold[1]); px(c, -6, 5, 1, gold[0]); // 金边衣摆
      if (acc) for (let x = -4; x <= 4; x += 4) px(c, x, 3, 1, GOLD[0]);
    }
    // 披肩（金丹）/ 肩甲（元婴、大乘）
    if (st === 2) {
      rect(c, -4, -4, 9, 2, O.inner); px(c, -4, -4, 1, '#FFFFFF'); rect(c, -3, -2, 7, 1, O.inner);
      px(c, 0, -3, 1, O.gem); px(c, 0, -2, 1, shadeHex(O.gem, 0.8)); // 金丹纹
    }
    // 袖子
    if (st === 4) { // 长垂袖
      rect(c, -6, -2, 2, 6, md); px(c, -6, -2, 1, lt); px(c, -6, 3, 1, dk); px(c, -5, 3, 1, dk);
      rect(c, 5, rArmY, 2, 6, md); px(c, 6, rArmY + 5, 1, dk);
      px(c, -7, 2 + frame2, 1, O.trim); px(c, -7, 3 + frame2, 1, O.trim); px(c, 7, 2 - frame2, 1, O.trim); px(c, 7, 3 - frame2, 1, O.trim); // 飘带
      rect(c, -5, 4, 2, 1, PAW); rect(c, atk ? 6 : 5, rArmY + 6, 2, 1, PAW);
    } else {
      rect(c, -5, -2, 2, 4, md); px(c, -5, -2, 1, lt);
      rect(c, 4, rArmY, 2, 4, md);
      const cuff = st === 1 ? O.inner : O.trim;
      rect(c, -5, 1, 2, 1, cuff); rect(c, 4, rArmY + 3, 2, 1, cuff);
      rect(c, -5, 2, 2, 1, PAW); rect(c, atk ? 5 : 4, rArmY + 4, 2, 1, PAW);
    }
    if (st === 3) { rect(c, -5, -4, 2, 2, O.trim); rect(c, 4, -4, 2, 2, O.trim); px(c, -5, -4, 1, '#FFFFFF'); }
    if (st === 5) { // 云纹金肩
      const GOLD = acc ? HERO_GOLD : [shadeHex(O.trim, 1.2), O.trim, shadeHex(O.trim, 0.7)];
      rect(c, -6, -4, 3, 2, GOLD[1]); px(c, -6, -4, 1, GOLD[0]); px(c, -7, -3, 1, GOLD[2]);
      rect(c, 4, -4, 3, 2, GOLD[1]); px(c, 6, -3, 1, GOLD[2]); px(c, 7, -3, 1, GOLD[2]);
    }
    // 小脚
    rect(c, -3, 7, 2, 1, PAW); rect(c, 2, 7, 2, 1, PAW);
  }

  function drawHeroHeadwear(c, realm, O) {
    if (O.skin) { if (O.def.head) O.def.head(c); return; }
    const st = O.style;
    if (st === 1) { rect(c, -1, -15, 3, 2, O.robe[2]); px(c, -2, -15, 1, '#B08050'); px(c, 2, -15, 1, '#B08050'); } // 发髻木簪
    else if (st === 2) { rect(c, -1, -15, 3, 2, O.robe[1]); px(c, 0, -16, 1, O.trim); px(c, -2, -14, 1, O.trim); } // 玉簪
    else if (st === 3) { rect(c, -2, -14, 5, 1, '#E8EEF8'); px(c, -2, -15, 1, '#E8EEF8'); px(c, 2, -15, 1, '#E8EEF8'); px(c, 0, -15, 1, '#9FC8FF'); } // 银冠
    else if (st === 4) { px(c, -2, -14, 1, '#FF9AD0'); px(c, 2, -14, 1, '#FF9AD0'); rect(c, -1, -15, 3, 2, '#FFB0E0'); px(c, 0, -16, 1, '#FFE0F0'); } // 莲花冠
    else if (st === 5) { // 金冠
      rect(c, -2, -15, 5, 2, GOLD[1]); px(c, -2, -16, 1, GOLD[1]); px(c, 0, -17, 1, GOLD[1]); px(c, 2, -16, 1, GOLD[1]);
      px(c, 0, -16, 1, GOLD[0]); px(c, 0, -15, 1, '#FF5A6A');
    }
  }

  // 天机阁衣服外观：每款自带轮廓(style) / 配色 / 背饰(back) / 前饰(front) / 头饰(head)
  // style: 0 短褐 1 长袍 2 披肩袍 3 华服 4 长袖仙衣 5 神衣 6 铠甲
  const SKIN_OUTFITS = {
    as_patched: { style: 0, robe: ['#A8A884', '#84845E', '#5E5E42'], trim: '#8A6A40', inner: '#E0DAC0',
      front: c => { rect(c, -3, -2, 2, 2, '#6A8AB0'); rect(c, 2, 1, 2, 2, '#B07A5A'); rect(c, -2, 2, 2, 1, '#8AB06A'); px(c, -1, -2, 1, '#F0E8D0'); px(c, 3, 2, 1, '#F0E8D0'); },
      head: c => { rect(c, -5, -13, 11, 1, '#8A6A40'); px(c, -6, -13, 1, '#8A6A40'); px(c, -7, -12, 1, '#8A6A40'); px(c, -7, -11, 1, '#A8845A'); } },
    as_farmer: { style: 0, robe: ['#D8C498', '#B8A070', '#8A7448'], trim: '#6A8A3A', inner: '#F4F0E0',
      front: c => { rect(c, -3, -4, 7, 1, '#FFFFFF'); px(c, 3, -3, 1, '#FFFFFF'); px(c, 3, -2, 1, '#E0E0E0'); },
      head: c => { rect(c, -7, -14, 15, 1, '#C8A860'); rect(c, -5, -15, 11, 1, '#D8BE78'); rect(c, -3, -16, 7, 1, '#E8D090'); px(c, 0, -17, 1, '#E8D090'); px(c, -7, -14, 1, '#A88840'); px(c, 7, -14, 1, '#A88840'); } },
    as_scholar: { style: 1, robe: ['#FFFFFF', '#EEF0F4', '#C8CCD8'], trim: '#2A2A3A', inner: '#FFFFFF', belt: '#2A2A3A',
      front: c => { rect(c, -3, 1, 2, 3, '#3A5A9A'); px(c, -3, 1, 1, '#5A7ABA'); px(c, -2, 2, 1, '#E8E0C8'); },
      head: c => { rect(c, -2, -15, 5, 2, '#2A2A3A'); rect(c, -3, -14, 7, 1, '#2A2A3A'); px(c, 3, -15, 1, '#3A3A4A'); },
      back: c => { px(c, 4, -12, 1, '#2A2A3A'); px(c, 5, -11, 1, '#2A2A3A'); px(c, 5, -10, 1, '#3A3A4A'); } },
    as_bamboo: { style: 1, robe: ['#8AC87A', '#5A9E4A', '#3A7430'], trim: '#C8E8A0', inner: '#EEF8E0',
      front: c => { for (const [x, y] of [[-3, -1], [-2, 2], [2, -2], [3, 3], [-1, 4]]) { px(c, x, y, 1, '#2E5E22'); px(c, x + 1, y - 1, 1, '#2E5E22'); } },
      head: c => { px(c, 0, -14, 1, '#6DAA3E'); px(c, 1, -15, 1, '#8BD150'); px(c, 2, -16, 1, '#8BD150'); px(c, -1, -14, 1, '#4A8B2A'); },
      back: c => { for (let i = 0; i < 9; i++) px(c, -7 + i, -2 - i, 1, i % 3 === 2 ? '#2E5E1E' : '#6DAA3E'); } },
    as_cloud: { style: 2, robe: ['#D0E0F4', '#A8C0E0', '#7890BC'], trim: '#FFFFFF', inner: '#FFFFFF',
      front: c => { for (const [x, y] of [[-3, 3], [2, 1], [-1, 5]]) { px(c, x, y, 1, '#FFFFFF'); px(c, x + 1, y, 1, '#FFFFFF'); px(c, x, y - 1, 1, '#FFFFFF'); } },
      head: c => { rect(c, -3, -14, 3, 1, '#FFFFFF'); rect(c, 1, -14, 3, 1, '#FFFFFF'); rect(c, -1, -15, 3, 2, '#FFFFFF'); px(c, 0, -16, 1, '#E8F0FF'); },
      back: c => { rect(c, -9, 1, 3, 2, '#FFFFFF'); px(c, -8, 0, 1, '#FFFFFF'); rect(c, 7, -1, 3, 2, '#FFFFFF'); px(c, 8, -2, 1, '#FFFFFF'); } },
    as_fire_robe: { style: 1, robe: ['#FF6A4A', '#D8341E', '#9A1E10'], trim: '#FFB030', inner: '#FFE0B0', belt: '#6A1008',
      front: c => { for (let x = -5; x <= 5; x++) { const h = [3, 5, 2, 4, 6, 3, 5, 2, 4, 3, 5][x + 5]; for (let y = 0; y < h; y++) px(c, x, 6 - y, 1, y > h - 2 ? '#FFE060' : y > h - 4 ? '#FFB030' : '#FF6A1A'); } },
      head: c => { px(c, 0, -14, 1, '#FF6A1A'); px(c, -1, -15, 1, '#FFB030'); px(c, 0, -16, 1, '#FFE060'); px(c, 1, -15, 1, '#FF6A1A'); px(c, 1, -17, 1, '#FFE060'); } },
    as_ice_silk: { style: 6, robe: ['#E6FBFF', '#A8E0F4', '#6AAED6'], trim: '#FFFFFF', inner: '#D8F4FF',
      front: c => { px(c, 0, -2, 1, '#FFFFFF'); px(c, -1, -1, 1, '#FFFFFF'); px(c, 1, -1, 1, '#FFFFFF'); px(c, 0, 0, 1, '#FFFFFF'); },
      head: c => { px(c, -2, -14, 1, '#E6FBFF'); px(c, 0, -14, 1, '#E6FBFF'); px(c, 2, -14, 1, '#E6FBFF'); px(c, 0, -15, 1, '#FFFFFF'); px(c, -2, -15, 1, '#A8E0F4'); px(c, 2, -15, 1, '#A8E0F4'); },
      back: c => { for (const x of [-8, 8]) { px(c, x, -6, 1, '#E6FBFF'); px(c, x, -7, 1, '#FFFFFF'); px(c, x + (x < 0 ? 1 : -1), -5, 1, '#A8E0F4'); } } },
    as_night: { style: 0, robe: ['#3A3A58', '#26263E', '#14142A'], trim: '#4A148C', inner: '#3A3A58', pants: '#1A1A2E',
      head: c => {
        rect(c, -5, -8, 11, 2, '#26263E'); rect(c, -4, -6, 9, 2, '#26263E');
        rect(c, -4, -8, 9, 1, '#3E3E62'); px(c, 0, -7, 1, '#1A1A2E'); px(c, -2, -6, 1, '#1A1A2E'); px(c, 2, -6, 1, '#1A1A2E');
        rect(c, -4, -13, 9, 1, '#26263E'); px(c, -5, -12, 1, '#26263E'); px(c, -6, -12, 1, '#3E3E62'); px(c, -7, -11, 1, '#3E3E62');
      },
      back: c => { for (let i = 0; i < 10; i++) px(c, 6 - i, -6 + i, 1, i < 2 ? '#8A7A5A' : '#C8D0E0'); } },
    as_dragon_scale: { style: 6, robe: ['#5ED8B8', '#2E9A80', '#1A6654'], trim: '#DAA520', inner: '#44CCAA',
      front: c => { for (let y = -3; y <= 2; y += 2) for (let x = -3 + (y & 1); x <= 3; x += 2) px(c, x, y, 1, '#8AF0D0'); },
      head: c => { px(c, -3, -14, 1, '#FFD700'); px(c, -4, -15, 1, '#FFD700'); px(c, -3, -16, 1, '#FFE680'); px(c, 3, -14, 1, '#FFD700'); px(c, 4, -15, 1, '#FFD700'); px(c, 3, -16, 1, '#FFE680'); } },
    as_flower: { style: 4, robe: ['#FFA8D0', '#E070A8', '#B04880'], trim: '#FFE0F0', inner: '#FFF0F8',
      front: c => { for (const [x, y] of [[-2, -2], [2, 1], [-3, 3], [1, 4], [3, -1]]) { px(c, x, y, 1, '#FFFFFF'); px(c, x + 1, y, 1, '#FFD24A'); } },
      head: c => { for (const [x, col] of [[-3, '#FF88CC'], [-1, '#FFD24A'], [1, '#FFFFFF'], [3, '#FF88CC']]) px(c, x, -14, 1, col); px(c, -2, -14, 1, '#6DAA3E'); px(c, 0, -14, 1, '#6DAA3E'); px(c, 2, -14, 1, '#6DAA3E'); },
      back: c => { px(c, -8, -3, 1, '#FFB0D0'); px(c, 8, 0, 1, '#FFB0D0'); px(c, -9, 2, 1, '#FFE0F0'); } },
    as_star_robe: { style: 3, robe: ['#3A4AA0', '#232E78', '#141A4A'], trim: '#FFE680', inner: '#0A0F3A',
      front: c => { for (const [x, y] of [[-3, -1], [2, -2], [0, 2], [-2, 4], [3, 3]]) px(c, x, y, 1, '#FFF6B0'); },
      head: c => { rect(c, -1, -14, 3, 1, '#FFE680'); px(c, 1, -15, 1, '#FFE680'); px(c, 2, -16, 1, '#FFE680'); px(c, 1, -16, 1, '#FFF6C0'); },
      back: c => { for (let x = -9; x <= 9; x++) { const y = -2 + Math.round(Math.abs(x) * 0.3); px(c, x, y, 1, '#141A4A'); } for (const x of [-8, -5, 6, 9]) px(c, x, -1, 1, '#FFF6B0'); } },
    as_blood_armor: { style: 6, robe: ['#C83030', '#8B0000', '#5A0000'], trim: '#3A0A0A', inner: '#CC2222',
      front: c => { px(c, -1, -2, 1, '#E8E0D0'); px(c, 1, -2, 1, '#E8E0D0'); px(c, 0, -1, 1, '#E8E0D0'); px(c, 0, 0, 1, '#E8E0D0'); },
      head: c => { rect(c, -4, -14, 9, 1, '#5A0000'); px(c, 0, -15, 1, '#FF3030'); px(c, -1, -16, 1, '#FF3030'); px(c, -2, -17, 1, '#CC1010'); px(c, -3, -17, 1, '#CC1010'); } },
    as_jade_emperor: { style: 5, robe: ['#FFE680', '#FFC83A', '#C8901E'], trim: '#60E0A0', inner: '#FFF6D0', gem: '#60E0A0',
      front: c => { rect(c, -1, -2, 3, 3, '#60E0A0'); px(c, 0, -1, 1, '#FFFFFF'); },
      head: c => { rect(c, -4, -15, 9, 1, '#2A2A3A'); rect(c, -1, -14, 3, 1, '#FFC83A'); for (const x of [-4, -3, 3, 4]) { px(c, x, -14, 1, '#60E0A0'); px(c, x, -13, 1, '#FFE680'); } } },
    as_ghost: { style: 1, robe: ['#C8FFE0', '#88E0B0', '#58B088'], trim: '#E8FFF0', inner: '#F0FFF8', ghost: true,
      front: c => { for (let x = -5; x <= 5; x += 2) c.clearRect(x, 6, 1, 1); c.clearRect(-4, 5, 1, 1); c.clearRect(2, 5, 1, 1); },
      head: c => { px(c, -1, -13, 1, '#FFFFFF'); px(c, 0, -13, 1, '#FFFFFF'); px(c, 1, -13, 1, '#FFFFFF'); px(c, 0, -12, 1, '#FFFFFF'); px(c, 0, -14, 1, '#E8E8E8'); },
      back: c => { for (const [x, y] of [[-8, -4], [8, -6], [-9, 2]]) { px(c, x, y, 1, '#88FFCC'); px(c, x, y - 1, 1, '#C8FFE8'); } } },
    as_thunder_armor: { style: 6, robe: ['#FFE680', '#DAA520', '#9A7010'], trim: '#4A5568', inner: '#FFEB3B',
      front: c => { px(c, 0, -3, 1, '#FFFFF0'); px(c, -1, -2, 1, '#FFFFF0'); px(c, 0, -1, 1, '#FFFFF0'); px(c, -1, 0, 1, '#FFFFF0'); },
      head: c => { rect(c, -4, -14, 9, 1, '#4A5568'); px(c, -4, -15, 1, '#FFEB3B'); px(c, -5, -16, 1, '#FFEB3B'); px(c, 4, -15, 1, '#FFEB3B'); px(c, 5, -16, 1, '#FFEB3B'); },
      back: c => { for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; const x = Math.round(Math.cos(t) * 10), y = Math.round(-6 + Math.sin(t) * 8); rect(c, x - 1, y - 1, 2, 2, '#B83A2A'); px(c, x - 1, y - 1, 1, '#FFD24A'); } } },
    as_phoenix_robe: { style: 5, robe: ['#FF7A4A', '#E0401E', '#A02410'], trim: '#FFD700', inner: '#FFE0A0', gem: '#FFD700',
      head: c => { px(c, 0, -14, 1, '#FFD700'); px(c, -1, -15, 1, '#FF6A1A'); px(c, 1, -15, 1, '#FF6A1A'); px(c, 0, -16, 1, '#FFD700'); px(c, 0, -17, 1, '#FFF6A0'); },
      back: c => { for (let i = 0; i < 5; i++) { const t = -0.9 - i * 0.35; for (let r = 4; r < 12; r++) px(c, Math.round(-3 + Math.cos(t) * r), Math.round(1 + Math.sin(t) * r * 0.9), 1, r > 9 ? '#FFD700' : r > 6 ? '#FF8A1A' : '#E0401E'); } } },
    as_void_cloak: { style: 1, robe: ['#3A2A5A', '#1A1030', '#0A0518'], trim: '#7C4DFF', inner: '#2A1A4A', belt: '#4A148C',
      front: c => { px(c, 0, 1, 1, '#B388FF'); px(c, -1, 1, 1, '#7C4DFF'); px(c, 1, 1, 1, '#7C4DFF'); px(c, 0, 2, 1, '#1A0033'); },
      back: c => { for (let y = -5; y <= 7; y++) { const half = 7 + Math.round((y + 5) * 0.2); rect(c, -half, y, half * 2 + 1, 1, y > 5 ? '#050510' : '#0A0A1A'); } rect(c, -7, -5, 15, 1, '#4A148C'); } },
    as_celestial: { style: 6, robe: ['#FFF6C0', '#FFD86A', '#C8A030'], trim: '#FFFFFF', inner: '#FFF6C0',
      head: c => { rect(c, -4, -14, 9, 1, '#FFD86A'); px(c, -5, -15, 1, '#FFFFFF'); px(c, -6, -16, 1, '#FFFFFF'); px(c, 5, -15, 1, '#FFFFFF'); px(c, 6, -16, 1, '#FFFFFF'); px(c, 0, -15, 1, '#FF5A6A'); },
      back: c => { for (const sgn of [-1, 1]) for (let i = 0; i < 6; i++) { rect(c, sgn > 0 ? 6 + i : -7 - i, -6 + i, 1, 6 - i, i % 2 ? '#FFFFFF' : '#F0F0F8'); } } },
    as_primordial_robe: { style: 5, robe: ['#5A5A6A', '#2A2A36', '#14141C'], trim: '#F4F4F4', inner: '#F4F4F4', gem: '#FFFFFF',
      front: c => { px(c, -1, 1, 1, '#FFFFFF'); px(c, 0, 1, 1, '#FFFFFF'); px(c, -1, 2, 1, '#FFFFFF'); px(c, 1, 2, 1, '#111111'); px(c, 0, 3, 1, '#111111'); px(c, 1, 3, 1, '#111111'); px(c, 0, 2, 1, '#888888'); },
      head: c => { rect(c, -1, -15, 3, 2, '#14141C'); px(c, 0, -16, 1, '#F4F4F4'); },
      back: c => { for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d = x * x + y * y; if (d > 81 || d < 64) continue; px(c, x, y - 7, 1, x < 0 ? '#F4F4F4' : '#2A2A36'); } } },
    as_universe: { style: 4, robe: ['#3A6AD8', '#1A3A9A', '#0A1A5A'], trim: '#00E5FF', inner: '#0A1A5A',
      front: c => { for (const [x, y] of [[-3, -2], [2, -1], [-1, 1], [3, 3], [-3, 4], [1, 5]]) px(c, x, y, 1, (x + y) & 1 ? '#FFFFFF' : '#00E5FF'); },
      head: c => { for (const [x, y] of [[-2, -14], [0, -15], [2, -14]]) { px(c, x, y, 1, '#00E5FF'); px(c, x, y - 1, 1, '#FFFFFF'); } rect(c, -2, -14, 5, 1, '#1A3A9A'); },
      back: c => { for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; px(c, Math.round(Math.cos(t) * 11), Math.round(-4 + Math.sin(t) * 4), 1, '#00E5FF'); } rect(c, -12, -6, 3, 3, '#FF8A5A'); rect(c, 10, -3, 2, 2, '#8AE0FF'); } },
  };

  function buildHero(realm, skinId, tailUp, blink, pose) {
    const cv = document.createElement('canvas');
    cv.width = HERO_W; cv.height = HERO_H;
    const c = cv.getContext('2d');
    c.translate(HERO_OX, HERO_OY);
    const O = heroOutfit(realm, skinId);
    const f2 = tailUp ? 1 : 0;
    drawHeroBack(c, realm, O, f2);
    drawMouseTail(c, 1, tailUp ? 26 : 0, C.TAIL);
    drawHeroBody(c, realm, O, pose, f2);
    drawMouseBody(c, 1, C.FUR_GREY, C.FUR_LIGHT, C.FUR_BELLY, C.EAR_PINK, C.EAR_INNER);
    if (blink) {
      rect(c, -3, -10, 2, 2, C.FUR_GREY); rect(c, 2, -10, 2, 2, C.FUR_GREY);
      rect(c, -3, -9, 2, 1, '#0A0A22'); rect(c, 2, -9, 2, 1, '#0A0A22');
    }
    if (O.skin && O.def.front) O.def.front(c);
    drawHeroHeadwear(c, realm, O);
    c.setTransform(1, 0, 0, 1, 0, 0);
    outlineSprite(c, HERO_W, HERO_H, { keepEars: true });
    return cv;
  }

  // 柔和描边 + 明暗：胡须不描、耳朵保持原版、描边颜色跟随相邻像素
  function outlineSprite(c, W, H, opts) {
    const img = c.getImageData(0, 0, W, H), d = img.data, out = new Uint8ClampedArray(d);
    const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
    const same = (j, rgb) => d[j] === rgb[0] && d[j + 1] === rgb[1] && d[j + 2] === rgb[2];
    const WH = hex(C.WHISKER);
    const EARS = opts && opts.keepEars ? [C.EAR_PINK, C.EAR_INNER, '#F0C0D8'].map(hex) : [];
    const isEar = j => EARS.some(e => same(j, e));
    const solid = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) solid[i] = d[i * 4 + 3] >= 200 && !same(i * 4, WH) ? 1 : 0;
    const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && solid[y * W + x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (d[i * 4 + 3] >= 200) {
        if (!solid[i] || isEar(i * 4)) continue;
        let k = 1;
        if (!at(x, y - 1)) k = 1.2; else if (!at(x, y + 1) || !at(x + 1, y)) k = 0.8;
        if (k !== 1) for (let ch = 0; ch < 3; ch++) out[i * 4 + ch] = Math.min(255, d[i * 4 + ch] * k);
        continue;
      }
      const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, b]) => at(a, b));
      if (!nb.length || nb.some(([a, b]) => isEar((b * W + a) * 4))) continue;
      let r = 0, g = 0, bl = 0;
      for (const [a, b] of nb) { const j = (b * W + a) * 4; r += d[j]; g += d[j + 1]; bl += d[j + 2]; }
      const n = nb.length;
      out[i * 4] = Math.round(r / n * 0.42 + HERO_OUTLINE[0] * 0.35);
      out[i * 4 + 1] = Math.round(g / n * 0.42 + HERO_OUTLINE[1] * 0.35);
      out[i * 4 + 2] = Math.round(bl / n * 0.42 + HERO_OUTLINE[2] * 0.35);
      out[i * 4 + 3] = 255;
    }
    c.putImageData(new ImageData(out, W, H), 0, 0);
  }

  function getHero(realm, skinId, tailUp, blink, pose) {
    const key = `${realm}|${skinId || ''}|${tailUp ? 1 : 0}|${blink ? 1 : 0}|${pose || ''}`;
    let cv = heroCache.get(key);
    if (!cv) { cv = buildHero(realm, skinId, tailUp, blink, pose); heroCache.set(key, cv); }
    return cv;
  }

  // 境界浮空高度（与 v1 一致）
  function heroFloat(realm, frame, s) {
    if (realm <= 1) return Math.sin(frame * 0.08) * 1.5 * s;
    if (realm === 2) return Math.sin(frame * 0.04) * 2 * s;
    if (realm === 3) return Math.sin(frame * 0.04) * 3 * s - 3 * s;
    if (realm === 4) return Math.sin(frame * 0.03) * 4 * s - 6 * s;
    return Math.sin(frame * 0.03) * 5 * s - 9 * s;
  }

  // ================================================================
  // 武器 v3.2 — 像素武器（竖直绘制、握把为原点、自动描边、缓存后旋转）
  // ================================================================
  // 通用形制：sword 剑 / staff 杖 / dao 刀 / dagger 匕 / hammer 锤 / great 巨剑
  function forgeWeapon(c, w) {
    const [bl, bm, bd] = w.blade;
    const len = w.len;
    const hilt = w.hilt || '#4A3A30', guard = w.guard || '#8A7A5A';
    if (w.type === 'staff') {
      for (let y = -len; y <= 3; y++) { px(c, 0, y, 1, bm); px(c, -1, y, 1, bl); }
      if (w.nodes) for (let y = -len + 2; y < 2; y += 3) { px(c, -1, y, 1, bd); px(c, 0, y, 1, bd); }
      return;
    }
    if (w.type === 'hammer') {
      for (let y = -len + 3; y <= 3; y++) { px(c, 0, y, 1, hilt); px(c, -1, y, 1, shadeHex(hilt, 1.3)); }
      rect(c, -3, -len, 6, 4, bm); rect(c, -3, -len, 6, 1, bl); rect(c, -3, -len + 3, 6, 1, bd);
      return;
    }
    // 握柄 + 护手
    rect(c, -1, 1, 2, 3, hilt); px(c, -1, 1, 1, shadeHex(hilt, 1.3)); px(c, -1, 4, 1, guard); px(c, 0, 4, 1, guard);
    const gw = w.type === 'dagger' ? 1 : 2;
    rect(c, -gw - 1, 0, gw * 2 + 2, 1, guard); px(c, -gw - 1, 0, 1, shadeHex(guard, 1.3));
    if (w.type === 'dao') { // 单刃刀：刀背直、刀刃外弧
      for (let y = -len; y < 0; y++) {
        const extra = y < -len + 3 ? 0 : 1;
        px(c, -1, y, 1, bd); px(c, 0, y, 1, bm); if (extra) px(c, 1, y, 1, bl);
      }
      px(c, 0, -len - 1, 1, bl);
      return;
    }
    const half = w.type === 'great' ? 1 : 0;
    // 护手两端下垂，更有形
    if (w.type !== 'dagger') { px(c, -gw - 2, 1, 1, guard); px(c, gw + 1, 1, 1, shadeHex(guard, 0.8)); }
    px(c, 0, 1, 1, w.gem || shadeHex(guard, 0.7));
    for (let y = -len; y < 0; y++) {
      px(c, -1 - half, y, 1, bl); px(c, 0, y, 1, bm);
      if (half) { px(c, -1, y, 1, bl); px(c, 1, y, 1, bd); } else px(c, 0, y, 1, bm);
      if (w.type !== 'dagger' && !half) px(c, 1, y, 1, bd);
    }
    px(c, 0, -len - 1, 1, bl);
    if (half) { px(c, -1, -len - 1, 1, bm); px(c, 1, -len - 1, 1, bd); }
  }

  const WEAPON_DEFS = {
    // 境界默认武器
    realm0: { name: '竹杖', type: 'staff', len: 12, blade: ['#A8D86A', '#6DAA3E', '#3E6E26'], nodes: true, deco: c => { px(c, -2, -12, 1, '#8BD150'); px(c, -3, -13, 1, '#A8E070'); px(c, 1, -10, 1, '#8BD150'); } },
    realm1: { name: '青钢剑', type: 'sword', len: 8, blade: ['#E0E8F4', '#AEBCD0', '#76849C'], hilt: '#3C4A6A', guard: '#8C9CB8' },
    realm2: { name: '青竹蜂云剑', type: 'sword', len: 9, blade: ['#E0FFF6', '#8FE0C8', '#4AA890'], hilt: '#1C6E68', guard: '#7FF0D0', glow: '#7FF0D0' },
    realm3: { name: '八灵飞剑', type: 'sword', len: 9, blade: ['#EEF4FF', '#A8C4F4', '#6A86C8'], hilt: '#2A4284', guard: '#E8EEF8', glow: '#9FC8FF', deco: c => { px(c, 0, -4, 1, '#9FC8FF'); px(c, 0, -8, 1, '#9FC8FF'); } },
    realm4: { name: '玄天斩灵剑', type: 'great', len: 10, blade: ['#F4E8FF', '#C8A4F4', '#8A5ACC'], hilt: '#4A2A7A', guard: '#FF9AD0', glow: '#E0C8FF', deco: c => { px(c, 0, -3, 1, '#FF9AD0'); } },
    realm5: { name: '乾坤化灵剑', type: 'great', len: 11, blade: ['#FFF6C0', '#FFD86A', '#C8901E'], hilt: '#7C123E', guard: '#FFC83A', glow: '#FFE680', deco: c => { px(c, 0, -2, 1, '#FF5A6A'); px(c, 0, -7, 1, '#FFFFFF'); } },
    // 天机阁武器外观
    ws_bamboo: { type: 'sword', len: 9, blade: ['#A8E070', '#6DAA3E', '#3E6E26'], hilt: '#2E5E1E', guard: '#4A8B2A', deco: c => { for (let y = -8; y < 0; y += 3) { px(c, -1, y, 1, '#2E5E1E'); px(c, 1, y, 1, '#2E5E1E'); } } },
    ws_rusty: { type: 'sword', len: 8, blade: ['#C0A070', '#8B6914', '#5D4A1A'], hilt: '#5D4037', guard: '#8B7355', deco: c => { px(c, 1, -6, 1, '#CC6600'); px(c, -1, -3, 1, '#996633'); px(c, 0, -8, 1, '#AA5500'); } },
    ws_bone: { type: 'dao', len: 9, blade: ['#FFFFFF', '#E8DCC8', '#B8A888'], hilt: '#8B7355', guard: '#DDD', deco: c => { px(c, 2, -7, 1, '#E8DCC8'); px(c, 2, -3, 1, '#E8DCC8'); } },
    ws_jade: { type: 'sword', len: 9, blade: ['#C8F0C8', '#66BB6A', '#2E7D32'], hilt: '#1B5E20', guard: '#A5D6A7', glow: '#A5D6A7' },
    ws_flame: { type: 'dao', len: 10, blade: ['#FFE080', '#FF8F00', '#C43E00'], hilt: '#5D4037', guard: '#FF6F00', glow: '#FFB030', fx: 'flame' },
    ws_frost: { type: 'sword', len: 10, blade: ['#FFFFFF', '#AEE4F8', '#5DADE2'], hilt: '#1A5276', guard: '#D6EAF8', glow: '#D6F4FF', fx: 'frost', deco: c => { px(c, -2, -9, 1, '#FFFFFF'); px(c, 2, -9, 1, '#FFFFFF'); } },
    ws_wind: { type: 'dagger', len: 6, blade: ['#F0FFF8', '#B8F0D8', '#6AC8A0'], hilt: '#2E6E5A', guard: '#8AE0C0', fx: 'wind' },
    ws_thunder: { type: 'hammer', len: 11, blade: ['#FFF6A0', '#ECC94B', '#A8861E'], hilt: '#4A5568', fx: 'thunder', deco: c => { px(c, -1, -10, 1, '#FFFFFF'); px(c, 0, -9, 1, '#FFFFFF'); } },
    ws_blood: { type: 'dao', len: 10, blade: ['#FF6A6A', '#CC0000', '#6A0000'], hilt: '#2A0000', guard: '#800000', glow: '#FF4040', fx: 'blood' },
    ws_shadow: { type: 'dagger', len: 7, blade: ['#7C4DFF', '#311B92', '#1A0A4A'], hilt: '#1A1A2E', guard: '#4A148C', glow: '#7C4DFF' },
    ws_starfall: { type: 'sword', len: 11, blade: ['#E8EEFF', '#5C6BC0', '#283593'], hilt: '#1A237E', guard: '#C5CAE9', fx: 'stars', deco: c => { for (const y of [-9, -6, -3]) px(c, 0, y, 1, '#FFF6B0'); } },
    ws_dragon: { type: 'great', len: 11, blade: ['#A8E0B0', '#2E7D32', '#1B4E20'], hilt: '#1B5E20', guard: '#DAA520', glow: '#FFD700', deco: c => { for (let y = -10; y < -1; y += 3) { px(c, -1, y, 1, '#FFD700'); px(c, 1, y + 1, 1, '#FFD700'); } px(c, -4, -1, 1, '#FFD700'); px(c, 3, -1, 1, '#FFD700'); } },
    ws_phoenix: { type: 'dao', len: 11, blade: ['#FFE680', '#FF8F00', '#BF360C'], hilt: '#BF360C', guard: '#FFD600', glow: '#FFB030', fx: 'flame', deco: c => { px(c, 2, -6, 1, '#FF6F00'); px(c, 2, -9, 1, '#FFD600'); } },
    ws_void: { type: 'great', len: 12, blade: ['#4A2A7A', '#1A0033', '#0A0014'], hilt: '#0D0D0D', guard: '#4A148C', glow: '#7C4DFF', fx: 'void', deco: c => { px(c, 0, -5, 1, '#B388FF'); px(c, 0, -9, 1, '#B388FF'); } },
    ws_moonlight: { type: 'sword', len: 11, blade: ['#FFFFFF', '#E0E8F4', '#A0B0C8'], hilt: '#2C3E50', guard: '#BDC3C7', glow: '#F0F3F4', deco: c => { px(c, -2, -11, 1, '#FFFFFF'); px(c, -3, -10, 1, '#E0E8F4'); } },
    ws_golden_lotus: { type: 'staff', len: 13, blade: ['#FFE680', '#DAA520', '#8A6A10'], glow: '#FFE680', deco: c => { rect(c, -3, -15, 5, 2, '#FFB0D0'); px(c, -1, -16, 1, '#FFE0F0'); px(c, -4, -14, 1, '#FF88CC'); px(c, 2, -14, 1, '#FF88CC'); px(c, -1, -14, 1, '#FFD24A'); } },
    ws_chaos: { type: 'great', len: 12, blade: ['#C8A0E8', '#6A4A8A', '#2A1A3A'], hilt: '#1A0A1A', guard: '#FF5AA0', glow: '#FF5AA0', fx: 'void', deco: c => { px(c, 1, -4, 1, '#FF5AA0'); px(c, -1, -8, 1, '#5AE0FF'); px(c, 1, -11, 1, '#FF5AA0'); } },
    ws_heavenly: { type: 'sword', len: 12, blade: ['#FFFDE0', '#FFC107', '#B8860B'], hilt: '#0D47A1', guard: '#FFD700', glow: '#FFF6A0', fx: 'thunder' },
    ws_primordial: { type: 'great', len: 14, blade: ['#FFFFE0', '#FFD700', '#B8860B'], hilt: '#880000', guard: '#FFD700', glow: '#FFFFAA', fx: 'stars', deco: c => { px(c, 0, -3, 1, '#FF3040'); px(c, 0, -8, 1, '#FFFFFF'); px(c, 0, -12, 1, '#FFFFFF'); } },
    ws_cosmic: { type: 'great', len: 14, blade: ['#3A5ABF', '#1A237E', '#0A0F3A'], hilt: '#0D0D2B', guard: '#00BCD4', glow: '#00E5FF', fx: 'stars', deco: c => { for (const [x, y] of [[-1, -12], [1, -9], [0, -6], [-1, -3], [1, -2]]) px(c, x, y, 1, x & 1 ? '#FFFFFF' : '#00E5FF'); } },
  };
  const WEAPON_OX = 8, WEAPON_OY = 18, WEAPON_W = 16, WEAPON_H = 24;
  const weaponCache = new Map();

  function getWeaponSprite(key) {
    if (weaponCache.has(key)) return weaponCache.get(key);
    const w = WEAPON_DEFS[key];
    if (!w) return null;
    const cv = document.createElement('canvas'); cv.width = WEAPON_W; cv.height = WEAPON_H;
    const c = cv.getContext('2d');
    c.translate(WEAPON_OX, WEAPON_OY);
    forgeWeapon(c, w);
    if (w.deco) w.deco(c);
    c.setTransform(1, 0, 0, 1, 0, 0);
    outlineSprite(c, WEAPON_W, WEAPON_H, {});
    weaponCache.set(key, cv);
    return cv;
  }

  // 动态特效：火焰 / 冰霜 / 风 / 雷 / 血 / 星 / 虚空
  function weaponFx(ctx, w, s, frame) {
    const len = w.len;
    const t = frame;
    if (w.glow) { ctx.globalAlpha = 0.18 + Math.sin(t * 0.06) * 0.1; rect(ctx, -2 * s, -(len + 1) * s, 4 * s, (len + 1) * s, w.glow); ctx.globalAlpha = 1; }
    const fx = w.fx;
    if (!fx) return;
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.05 + i * 0.33) % 1;
      const y = -ph * (len + 2) * s;
      ctx.globalAlpha = 1 - ph;
      if (fx === 'flame') px(ctx, Math.round(Math.sin(t * 0.2 + i) * 2) * s, y - 2 * s, s, i % 2 ? '#FFD600' : '#FF6F00');
      else if (fx === 'frost') px(ctx, (i - 1) * 2 * s, y, s, '#E6FBFF');
      else if (fx === 'wind') px(ctx, (2 + i) * s, y, s, '#B8F0D8');
      else if (fx === 'thunder') { if ((t + i * 7) % 20 < 3) px(ctx, (i - 1) * 2 * s, -(len - i * 3) * s, s, '#FFFFF0'); }
      else if (fx === 'blood') px(ctx, s, (ph * 4 - 2) * s, s, '#FF2020');
      else if (fx === 'stars') { if (Math.sin(t * 0.1 + i * 2) > 0.3) px(ctx, (i - 1) * 2 * s, -(3 + i * 4) * s, s, '#FFFFFF'); }
      else if (fx === 'void') px(ctx, Math.round(Math.cos(t * 0.05 + i * 2) * 3) * s, -(4 + i * 3) * s, s, '#B388FF');
    }
    ctx.globalAlpha = 1;
  }

  function drawWeaponSprite(ctx, key, x, y, s, frame, angle) {
    const img = getWeaponSprite(key);
    if (!img) return false;
    const w = WEAPON_DEFS[key];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.imageSmoothingEnabled = false;
    weaponFx(ctx, w, s, frame);
    ctx.drawImage(img, -WEAPON_OX * s, -WEAPON_OY * s, WEAPON_W * s, WEAPON_H * s);
    ctx.restore();
    return true;
  }

  function weaponAngle(attacking) { return attacking > 0 ? -0.8 + Math.sin(attacking * 0.5) * 1.5 : 0; }

  function drawWeapon(ctx, x, y, s, tier, frame, attacking) {
    drawWeaponSprite(ctx, 'realm' + Math.max(0, Math.min(5, tier)), x, y, s, frame, weaponAngle(attacking));
  }

  const armorSkinColors = {
    'as_patched':{ main:'#8B8B6B',accent:'#6B6B4B',trim:'#A0A080' },
    'as_farmer':{ main:'#A09060',accent:'#807040',trim:'#C0B080' },
    'as_scholar':{ main:'#F0F0F0',accent:'#D8D8D8',trim:'#FFFFFF' },
    'as_bamboo':{ main:'#4A8B4A',accent:'#367836',trim:'#6BAF6B' },
    'as_cloud':{ main:'#B0C4DE',accent:'#8AAABE',trim:'#D0E4FE' },
    'as_fire_robe':{ main:'#CC3300',accent:'#AA2200',trim:'#FF6644' },
    'as_ice_silk':{ main:'#88CCEE',accent:'#66AACC',trim:'#AAEEFF' },
    'as_night':{ main:'#1A1A2E',accent:'#0D0D1A',trim:'#333366' },
    'as_dragon_scale':{ main:'#228877',accent:'#116655',trim:'#44CCAA' },
    'as_flower':{ main:'#DD66AA',accent:'#BB4488',trim:'#FF88CC' },
    'as_star_robe':{ main:'#1A237E',accent:'#0D1557',trim:'#3F51B5' },
    'as_blood_armor':{ main:'#8B0000',accent:'#660000',trim:'#CC2222' },
    'as_jade_emperor':{ main:'#FFD700',accent:'#DAA520',trim:'#FFEE88' },
    'as_ghost':{ main:'#228B4588',accent:'#1A6B3588',trim:'#44FF8888' },
    'as_thunder_armor':{ main:'#DAA520',accent:'#B8860B',trim:'#FFEB3B' },
    'as_phoenix_robe':{ main:'#FF4500',accent:'#CC3700',trim:'#FFD700' },
    'as_void_cloak':{ main:'#0A0A1A',accent:'#050510',trim:'#4A148C' },
    'as_celestial':{ main:'#FFD700',accent:'#FFC107',trim:'#FFFFF0' },
    'as_primordial_robe':{ main:'#4A148C',accent:'#311B92',trim:'#FFD700' },
    'as_universe':{ main:'#0D47A1',accent:'#1A237E',trim:'#00BCD4' },
  };

  function drawWeaponWithSkin(ctx, x, y, s, tier, frame, attacking, skinId) {
    const key = skinId && WEAPON_DEFS[skinId] ? skinId : 'realm' + Math.max(0, Math.min(5, tier));
    drawWeaponSprite(ctx, key, x, y, s, frame, weaponAngle(attacking));
  }

  // ================================================================
  // 公开接口
  // ================================================================
  function drawMouseByRealm(ctx, x, y, s, realmIndex, frame, attacking, options) {
    const opts = options || {};
    const realm = Math.max(0, Math.min(5, realmIndex || 0));
    // 境界光环
    if (realm >= 1) {
      const glowColors = [null, 'rgba(68,136,204,0.08)', 'rgba(46,139,139,0.10)', 'rgba(65,105,180,0.12)', 'rgba(123,62,191,0.15)', 'rgba(160,32,96,0.18)'];
      const r = (12 + realm * 4) * s * (1 + Math.sin(frame * 0.03) * 0.1);
      ctx.save(); ctx.globalAlpha = 0.4;
      ellipse(ctx, x, y - 2 * s, r, r * 0.7, glowColors[realm]);
      ctx.restore();
    }
    const bob = opts.riding ? 0 : heroFloat(realm, frame, s); // 骑乘时由坐骑带动起伏
    const atkX = attacking ? Math.sin(attacking * 0.4) * (6 + realm * 2) * s : 0;
    const hero = getHero(realm, opts.equippedArmorSkin, Math.sin(frame * 0.06) > 0, (frame % 230) > 222, attacking > 3 ? 'attack' : '');
    const dx = x + atkX, dy = y + bob;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(hero, Math.round(dx - HERO_OX * s), Math.round(dy - HERO_OY * s), HERO_W * s, HERO_H * s);
    ctx.restore();
    // 高境界：环绕的灵光
    if (realm >= 2) {
      const col = ['', '', '#7FF0D0', '#9FC8FF', '#E0C8FF', '#FFD86A'][realm];
      ctx.save(); ctx.globalAlpha = 0.55;
      for (let i = 0; i < realm; i++) {
        const a = frame * 0.02 + i * (Math.PI * 2 / realm);
        px(ctx, dx + Math.cos(a) * 11 * s, dy - 3 * s + Math.sin(a) * 6 * s, s, col);
      }
      ctx.restore();
    }
    // 右手持剑
    drawWeaponWithSkin(ctx, dx + 7 * s, dy + 2 * s, s, realm, frame, attacking, opts.equippedWeaponSkin);
  }

  return {
    drawMouseByRealm, drawWeaponWithSkin, getWeaponSprite, HERO_OUTFITS, WEAPON_DEFS,
    armorSkinColors, rect, px, circle, ellipse, roundRect,
  };
})();

if (typeof module !== 'undefined') module.exports = Sprites;
