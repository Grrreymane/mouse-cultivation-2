// ============================================================
// sprites.js — 鼠鼠修仙 像素精灵绘制系统 v3.1
// 方块像素风格 — 高分辨率像素画，更多像素组成
// v3.1: 鼠鼠精细化 + 中华龙形象重制
// ============================================================
//
// 【美术风格调整指南】
// 1. 颜色调整 → 修改下方 C 对象的颜色常量
// 2. 角色体型/比例 → 修改 drawMouseBody() 中的像素坐标
// 3. 各境界外观 → 修改 drawMouseRealm0~5 各函数
// 4. 怪物/灵兽/坐骑 → 见 pixelart.js（v3 起统一由像素雕刻DSL生成）
// 7. 光环/特效 → 修改 drawMouseByRealm 函数中的 ellipse 光晕部分
// 8. 武器皮肤 → 修改 weaponSkinDrawers 对象
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

  // 绘制鼠鼠腿脚（方块版）— v4.0
  function drawMouseLegs(ctx, s, furMain) {
    // 左腿（短粗Q版）
    rect(ctx, -3*s, 3*s, 2*s, 3*s, furMain);
    rect(ctx, -3*s, 6*s, 3*s, s, C.FUR_DARK);
    // 右腿
    rect(ctx, 2*s, 3*s, 2*s, 3*s, furMain);
    rect(ctx, 1*s, 6*s, 3*s, s, C.FUR_DARK);
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
  // 六种境界鼠鼠（方块像素风）
  // ================================================================

  // --- 炼气期：小灰鼠，粗布衣 ---
  function drawMouseRealm0(ctx, x, y, s, frame, attacking, opts) {
    const bounce = Math.sin(frame * 0.08) * 1.5 * s;
    const atkX = attacking ? Math.sin(attacking * 0.4) * 6 * s : 0;
    ctx.save();
    ctx.translate(x + atkX, y + bounce);

    const cl = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.main || C.CLOTH_BROWN) : C.CLOTH_BROWN;
    const clAccent = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.accent || '#6E7D99') : '#6E7D99';
    const clTrim = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.trim || '#3D4D66') : '#3D4D66';

    drawMouseTail(ctx, s, frame);

    // 布衣身体（v4.0适配：紧凑躯干）
    rect(ctx, -4*s, -4*s, 9*s, 7*s, cl);
    rect(ctx, -3*s, -3*s, 7*s, 5*s, clAccent);
    rect(ctx, -2*s, -2*s, 5*s, 3*s, C.FUR_BELLY);
    // 腰带
    rect(ctx, -4*s, 0, 9*s, s, clTrim);
    // 衣领（V型像素线）
    px(ctx, -s, -5*s, s, clTrim);
    px(ctx, 0, -4*s, s, clTrim);
    px(ctx, s, -5*s, s, clTrim);

    drawMouseBody(ctx, s, C.FUR_GREY, C.FUR_LIGHT, C.FUR_BELLY, C.EAR_PINK, C.EAR_INNER);
    drawMouseLegs(ctx, s, C.FUR_GREY);

    if (opts.equippedWeaponSkin && weaponSkinDrawers[opts.equippedWeaponSkin]) {
      ctx.save(); ctx.translate(5*s, -4*s);
      const angle = attacking > 0 ? -0.8 + Math.sin(attacking * 0.5) * 1.5 : -0.3;
      ctx.rotate(angle);
      weaponSkinDrawers[opts.equippedWeaponSkin](ctx, s, frame);
      ctx.restore();
    } else {
      drawWeapon(ctx, 5*s, -4*s, s, 0, frame, attacking);
    }

    ctx.restore();
  }

  // --- 筑基期：亮毛色，道袍 ---
  function drawMouseRealm1(ctx, x, y, s, frame, attacking, opts) {
    const bounce = Math.sin(frame * 0.08) * 1.5 * s;
    const atkX = attacking ? Math.sin(attacking * 0.4) * 8 * s : 0;
    ctx.save();
    ctx.translate(x + atkX, y + bounce);

    const f = '#A0B0CC', l = '#B8C8E0';
    const cl = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.main || C.CLOTH_GOLD) : C.CLOTH_GOLD;
    const clAccent = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.accent || '#2A5A8A') : '#2A5A8A';
    const clTrim = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.trim || '#66CCFF') : '#66CCFF';

    drawMouseTail(ctx, s, frame, '#7A8CB0');

    // 道袍身体（v4.0适配）
    rect(ctx, -5*s, -4*s, 11*s, 8*s, cl);
    rect(ctx, -4*s, -3*s, 9*s, 6*s, clAccent);
    rect(ctx, -2*s, -2*s, 5*s, 4*s, C.FUR_BELLY);
    // 腰带
    rect(ctx, -5*s, 0, 11*s, s, clTrim);
    // V领
    px(ctx, -s, -5*s, s, clTrim);
    px(ctx, 0, -4*s, s, clTrim);
    px(ctx, 0, -3*s, s, clTrim);
    px(ctx, s, -5*s, s, clTrim);
    // 飘带
    const ribbonWave = Math.sin(frame * 0.06) > 0 ? s : 0;
    rect(ctx, -5*s, 5*s, s, 2*s + ribbonWave, clTrim);
    rect(ctx, -6*s, 6*s + ribbonWave, s, s, clTrim);

    drawMouseBody(ctx, s, f, l, C.FUR_BELLY, C.EAR_PINK, C.EAR_INNER);
    drawMouseLegs(ctx, s, f);

    if (opts.equippedWeaponSkin && weaponSkinDrawers[opts.equippedWeaponSkin]) {
      ctx.save(); ctx.translate(6*s, -4*s);
      const angle = attacking > 0 ? -0.8 + Math.sin(attacking * 0.5) * 1.5 : -0.3;
      ctx.rotate(angle);
      weaponSkinDrawers[opts.equippedWeaponSkin](ctx, s, frame);
      ctx.restore();
    } else {
      drawWeapon(ctx, 6*s, -4*s, s, 1, frame, attacking);
    }

    ctx.restore();
  }

  // --- 金丹期：法袍+浮空 ---
  function drawMouseRealm2(ctx, x, y, s, frame, attacking, opts) {
    const float = Math.sin(frame * 0.04) * 2 * s;
    const atkX = attacking ? Math.sin(attacking * 0.4) * 10 * s : 0;
    ctx.save();
    ctx.translate(x + atkX, y + float);

    const f = '#A8BBDD', l = '#C0D4F0';
    const cl = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.main || C.CLOTH_GREEN) : C.CLOTH_GREEN;
    const clAccent = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.accent || '#1A6B6B') : '#1A6B6B';
    const clTrim = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.trim || '#44DDBB') : '#44DDBB';

    drawMouseTail(ctx, s, frame, '#6688AA');

    // 法袍（v4.0适配：紧凑躯干+浮空）
    rect(ctx, -5*s, -4*s, 11*s, 9*s, cl);
    rect(ctx, -4*s, -3*s, 9*s, 7*s, clAccent);
    rect(ctx, -2*s, -2*s, 5*s, 4*s, C.FUR_BELLY);
    // 金丹纹饰（闪烁像素块）
    ctx.globalAlpha = 0.3 + Math.sin(frame * 0.04) * 0.15;
    rect(ctx, -s, -s, 3*s, 2*s, '#44FFCC');
    ctx.globalAlpha = 1;
    // 腰带
    rect(ctx, -5*s, 0, 11*s, s, clTrim);
    // 玉佩
    px(ctx, -4*s, 2*s, s, '#44DDBB');
    px(ctx, -4*s, 3*s, s, '#88FFE0');
    // V领
    px(ctx, -2*s, -5*s, s, clTrim);
    px(ctx, -s, -4*s, s, clTrim);
    px(ctx, 0, -4*s, s, clTrim);
    px(ctx, s, -4*s, s, clTrim);
    px(ctx, 2*s, -5*s, s, clTrim);

    // 浮空气流（方块版）
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 3; i++) {
      const py = 8*s + Math.sin(frame * 0.05 + i) * s;
      rect(ctx, -3*s + i * 3*s, py, 2*s, s, '#88CCCC');
    }
    ctx.globalAlpha = 1;

    drawMouseBody(ctx, s, f, l, C.FUR_BELLY, C.EAR_PINK, C.EAR_INNER);
    drawMouseLegs(ctx, s, f);

    if (opts.equippedWeaponSkin && weaponSkinDrawers[opts.equippedWeaponSkin]) {
      ctx.save(); ctx.translate(6*s, -4*s);
      const angle = attacking > 0 ? -0.8 + Math.sin(attacking * 0.5) * 1.5 : -0.3;
      ctx.rotate(angle);
      weaponSkinDrawers[opts.equippedWeaponSkin](ctx, s, frame);
      ctx.restore();
    } else {
      drawWeapon(ctx, 6*s, -4*s, s, 2, frame, attacking);
    }

    ctx.restore();
  }

  // --- 元婴期：华服，浮空更高 ---
  function drawMouseRealm3(ctx, x, y, s, frame, attacking, opts) {
    const float = Math.sin(frame * 0.04) * 3 * s - 3*s;
    const atkX = attacking ? Math.sin(attacking * 0.4) * 12 * s : 0;
    ctx.save();
    ctx.translate(x + atkX, y + float);

    const f = '#B0C0E0', l = '#C8D8F5';
    const cl = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.main || C.CLOTH_BLUE) : C.CLOTH_BLUE;
    const clAccent = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.accent || '#2A4A8A') : '#2A4A8A';
    const clTrim = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.trim || '#66AAFF') : '#66AAFF';

    drawMouseTail(ctx, s, frame, '#5577AA');

    // 华服（v4.0适配：紧凑+高级）
    rect(ctx, -6*s, -4*s, 13*s, 10*s, cl);
    rect(ctx, -5*s, -3*s, 11*s, 8*s, clAccent);
    rect(ctx, -2*s, -2*s, 5*s, 5*s, C.FUR_BELLY);
    // 灵纹（旋转方块像素）
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 3; i++) {
      const a = frame * 0.02 + i * 2.1;
      const rx = Math.cos(a) * 3 * s;
      const ry = Math.sin(a) * 3 * s;
      px(ctx, rx, ry, s, '#88BBFF');
    }
    ctx.globalAlpha = 1;
    // 腰带+宝石
    rect(ctx, -6*s, 0, 13*s, s, clTrim);
    rect(ctx, 0, 0, s, s, '#4488FF');
    // 肩饰（方块）
    rect(ctx, -6*s, -4*s, 2*s, 2*s, clTrim);
    rect(ctx, 5*s, -4*s, 2*s, 2*s, clTrim);
    // V领
    px(ctx, -2*s, -5*s, s, clTrim);
    px(ctx, -s, -4*s, s, clTrim);
    px(ctx, 0, -4*s, s, clTrim);
    px(ctx, s, -4*s, s, clTrim);
    px(ctx, 2*s, -5*s, s, clTrim);
    // 飘带
    const rw = Math.sin(frame * 0.05) > 0 ? s : 0;
    rect(ctx, -6*s, 6*s, s, 2*s + rw, clTrim);
    rect(ctx, -7*s, 7*s + rw, s, s, clTrim);
    rect(ctx, 6*s, 6*s, s, 2*s + rw, clTrim);
    rect(ctx, 7*s, 7*s + rw, s, s, clTrim);

    drawMouseBody(ctx, s, f, l, C.FUR_BELLY, C.EAR_PINK, C.EAR_INNER);
    drawMouseLegs(ctx, s, f);

    if (opts.equippedWeaponSkin && weaponSkinDrawers[opts.equippedWeaponSkin]) {
      ctx.save(); ctx.translate(7*s, -4*s);
      const angle = attacking > 0 ? -0.8 + Math.sin(attacking * 0.5) * 1.5 : -0.3;
      ctx.rotate(angle);
      weaponSkinDrawers[opts.equippedWeaponSkin](ctx, s, frame);
      ctx.restore();
    } else {
      drawWeapon(ctx, 7*s, -4*s, s, 3, frame, attacking);
    }

    ctx.restore();
  }

  // --- 化神期：仙袍飘逸，光效强 ---
  function drawMouseRealm4(ctx, x, y, s, frame, attacking, opts) {
    const float = Math.sin(frame * 0.03) * 4 * s - 6*s;
    const atkX = attacking ? Math.sin(attacking * 0.4) * 14 * s : 0;
    ctx.save();
    ctx.translate(x + atkX, y + float);

    const f = '#B8C8E8', l = '#D0E0FF';
    const cl = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.main || C.CLOTH_PURPLE) : C.CLOTH_PURPLE;
    const clAccent = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.accent || '#5A2A9F') : '#5A2A9F';
    const clTrim = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.trim || '#BB88FF') : '#BB88FF';

    drawMouseTail(ctx, s, frame, '#7788CC');

    // 仙袍（v4.0适配：紧凑+飘逸下摆）
    rect(ctx, -6*s, -4*s, 13*s, 10*s, cl);
    rect(ctx, -7*s, 4*s, 15*s, 3*s, cl); // 下摆
    rect(ctx, -5*s, -3*s, 11*s, 8*s, clAccent);
    rect(ctx, -2*s, -2*s, 5*s, 5*s, C.FUR_BELLY);
    // 符文光（闪烁像素块）
    ctx.globalAlpha = 0.2 + Math.sin(frame * 0.03) * 0.1;
    for (let i = 0; i < 4; i++) {
      const a = frame * 0.015 + i * 1.57;
      const r = (3 + i) * s;
      px(ctx, Math.cos(a) * r, Math.sin(a) * r, s, '#BB88FF');
    }
    ctx.globalAlpha = 1;
    // 腰带
    rect(ctx, -6*s, 0, 13*s, s, clTrim);
    // 紫玉坠
    rect(ctx, 0, 0, s, s, '#9944FF');
    px(ctx, 0, s, s, '#CC88FF');
    // 肩甲（方块+宝石）
    rect(ctx, -6*s, -4*s, 2*s, 2*s, clTrim);
    px(ctx, -5*s, -4*s, s, '#FF88FF');
    rect(ctx, 5*s, -4*s, 2*s, 2*s, clTrim);
    px(ctx, 6*s, -4*s, s, '#FF88FF');
    // V领
    px(ctx, -2*s, -5*s, s, clTrim);
    px(ctx, -s, -4*s, s, clTrim);
    px(ctx, 0, -4*s, s, clTrim);
    px(ctx, s, -4*s, s, clTrim);
    px(ctx, 2*s, -5*s, s, clTrim);
    // 长飘带（方块像素线）
    const rw = Math.sin(frame * 0.04) > 0 ? s : 0;
    rect(ctx, -7*s, 7*s, s, 3*s + rw, clTrim);
    rect(ctx, -8*s, 9*s + rw, s, 2*s, clTrim);
    rect(ctx, -9*s, 10*s + rw, s, s, clTrim);
    rect(ctx, 7*s, 7*s, s, 3*s + rw, clTrim);
    rect(ctx, 8*s, 9*s + rw, s, 2*s, clTrim);
    rect(ctx, 9*s, 10*s + rw, s, s, clTrim);

    drawMouseBody(ctx, s, f, l, C.FUR_BELLY, C.EAR_PINK, C.EAR_INNER);
    drawMouseLegs(ctx, s, f);

    if (opts.equippedWeaponSkin && weaponSkinDrawers[opts.equippedWeaponSkin]) {
      ctx.save(); ctx.translate(7*s, -4*s);
      const angle = attacking > 0 ? -0.8 + Math.sin(attacking * 0.5) * 1.5 : -0.3;
      ctx.rotate(angle);
      weaponSkinDrawers[opts.equippedWeaponSkin](ctx, s, frame);
      ctx.restore();
    } else {
      drawWeapon(ctx, 7*s, -4*s, s, 4, frame, attacking);
    }

    ctx.restore();
  }

  // --- 大乘期：天衣，极强光效 ---
  function drawMouseRealm5(ctx, x, y, s, frame, attacking, opts) {
    const float = Math.sin(frame * 0.03) * 5 * s - 9*s;
    const atkX = attacking ? Math.sin(attacking * 0.4) * 16 * s : 0;
    ctx.save();
    ctx.translate(x + atkX, y + float);

    const f = '#C0D0F0', l = '#D8E8FF';
    const cl = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.main || C.CLOTH_RED) : C.CLOTH_RED;
    const clAccent = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.accent || '#801848') : '#801848';
    const clTrim = opts.equippedArmorSkin ? (armorSkinColors[opts.equippedArmorSkin]?.trim || '#FF88CC') : '#FF88CC';

    drawMouseTail(ctx, s, frame, '#8899DD');

    // 天衣光华（方块光晕）
    ctx.globalAlpha = 0.08 + Math.sin(frame * 0.02) * 0.04;
    rect(ctx, -16*s, -16*s, 33*s, 33*s, '#FF66BB');
    ctx.globalAlpha = 1;

    // 天衣身体（v4.0适配：紧凑+最华丽）
    rect(ctx, -7*s, -4*s, 15*s, 11*s, cl);
    rect(ctx, -8*s, 5*s, 17*s, 4*s, cl); // 大下摆
    rect(ctx, -6*s, -3*s, 13*s, 9*s, clAccent);
    rect(ctx, -3*s, -2*s, 7*s, 6*s, C.FUR_BELLY);

    // 天衣纹饰（旋转像素符文）
    ctx.globalAlpha = 0.25 + Math.sin(frame * 0.025) * 0.1;
    for (let i = 0; i < 6; i++) {
      const a = frame * 0.012 + i * 1.05;
      const r = (3 + i % 3 * 2) * s;
      px(ctx, Math.cos(a) * r, Math.sin(a) * r, s, '#FF88CC');
    }
    ctx.globalAlpha = 1;

    // 天冠（方块版头饰）
    rect(ctx, -s, -16*s, 3*s, 2*s, '#FFD700');
    px(ctx, 0, -17*s, s, '#FFFFAA');
    ctx.globalAlpha = 0.4 + Math.sin(frame * 0.06) * 0.3;
    rect(ctx, -2*s, -17*s, 5*s, 3*s, '#FFD70066');
    ctx.globalAlpha = 1;

    // 腰带
    rect(ctx, -7*s, 0, 15*s, s, clTrim);
    // 神玉
    rect(ctx, 0, 0, s, s, '#FF3388');
    px(ctx, 0, s, s, '#FF88BB');
    // 大型肩甲
    rect(ctx, -7*s, -4*s, 2*s, 2*s, clTrim);
    px(ctx, -6*s, -4*s, s, '#FF44AA');
    rect(ctx, 6*s, -4*s, 2*s, 2*s, clTrim);
    px(ctx, 7*s, -4*s, s, '#FF44AA');
    // V领
    px(ctx, -2*s, -5*s, s, clTrim);
    px(ctx, -s, -4*s, s, clTrim);
    px(ctx, 0, -4*s, s, clTrim);
    px(ctx, s, -4*s, s, clTrim);
    px(ctx, 2*s, -5*s, s, clTrim);

    // 多条长飘带
    const rw = Math.sin(frame * 0.035) > 0 ? s : 0;
    for (let i = 0; i < 2; i++) {
      const c = i === 0 ? clTrim : '#FF88CC88';
      rect(ctx, -8*s - i*s, 9*s, s, 4*s + rw, c);
      rect(ctx, -9*s - i*s, 12*s + rw, s, 2*s, c);
      rect(ctx, -10*s - i*s, 13*s + rw, s, 2*s, c);
      rect(ctx, 8*s + i*s, 9*s, s, 4*s + rw, c);
      rect(ctx, 9*s + i*s, 12*s + rw, s, 2*s, c);
      rect(ctx, 10*s + i*s, 13*s + rw, s, 2*s, c);
    }

    drawMouseBody(ctx, s, f, l, C.FUR_BELLY, C.EAR_PINK, C.EAR_INNER);
    drawMouseLegs(ctx, s, f);

    // 仙气粒子（方块版）
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 5; i++) {
      const a = frame * 0.02 + i * 1.257;
      const pr = 12 * s;
      px(ctx, Math.cos(a) * pr, -2*s + Math.sin(a) * pr * 0.6, s, '#FFAADD');
    }
    ctx.globalAlpha = 1;

    if (opts.equippedWeaponSkin && weaponSkinDrawers[opts.equippedWeaponSkin]) {
      ctx.save(); ctx.translate(8*s, -4*s);
      const angle = attacking > 0 ? -0.8 + Math.sin(attacking * 0.5) * 1.5 : -0.3;
      ctx.rotate(angle);
      weaponSkinDrawers[opts.equippedWeaponSkin](ctx, s, frame);
      ctx.restore();
    } else {
      drawWeapon(ctx, 8*s, -4*s, s, 5, frame, attacking);
    }

    ctx.restore();
  }

  // ================================================================
  // 武器绘制 — 方块像素版
  // ================================================================
  function drawWeapon(ctx, x, y, s, tier, frame, attacking) {
    ctx.save();
    ctx.translate(x, y);
    const angle = attacking > 0 ? -0.8 + Math.sin(attacking * 0.5) * 1.5 : -0.3;
    ctx.rotate(angle);

    const weapons = [
      { blade: C.WOOD, hilt: C.HANDLE, len: 7, w: 2 },
      { blade: C.IRON, hilt: C.HANDLE, len: 8, w: 2 },
      { blade: C.STEEL, hilt: '#5A6B8A', len: 9, w: 2, glow: C.MAGIC_BLUE },
      { blade: '#88AAEE', hilt: '#4A5570', len: 10, w: 2, glow: C.MAGIC_PURPLE },
      { blade: '#BB88FF', hilt: '#3A2A5A', len: 11, w: 2, glow: C.MAGIC_PINK },
      { blade: '#FFD700', hilt: '#880044', len: 12, w: 3, glow: '#FFD700' },
    ];
    const w = weapons[tier] || weapons[0];

    // 剑柄（方块）
    rect(ctx, -s, 0, w.w*s, 3*s, w.hilt);
    // 护手
    rect(ctx, -w.w*s, -s, w.w*2*s, s, w.hilt);
    // 剑身（方块）
    rect(ctx, -s, -w.len*s, w.w*s, w.len*s, w.blade);
    // 剑尖
    rect(ctx, 0, -(w.len+1)*s, s, s, w.blade);

    // 灵光
    if (w.glow) {
      ctx.globalAlpha = 0.25 + Math.sin(frame * 0.06) * 0.15;
      rect(ctx, -s, -w.len*s, w.w*s, w.len*s, w.glow);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }


  // ================================================================
  // 武器皮肤 (已是方块风格)
  // ================================================================
  const weaponSkinDrawers = {
    'ws_bamboo': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#2E5E1E'); rect(ctx,-s,0,3*s,s,'#4A8B2A'); rect(ctx,-s/2,-9*s,2*s,9*s,'#4A8B2A'); for(let i=0;i<3;i++) rect(ctx,-s,-8*s+i*3*s,3*s,s,'#2E5E1E'); rect(ctx,0,-10*s,s,s,'#8BC34A'); },
    'ws_rusty': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#5D4037'); rect(ctx,-s,0,3*s,s,'#8B7355'); rect(ctx,-s/2,-8*s,2*s,8*s,'#8B6914'); rect(ctx,0,-9*s,s,s,'#A08040'); rect(ctx,0,-6*s,s,s,'#CC6600'); rect(ctx,-s/2,-3*s,s,s,'#996633'); },
    'ws_bone': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#8B7355'); rect(ctx,-s,0,3*s,s,'#DDD'); rect(ctx,-s/2,-9*s,2*s,9*s,'#E8DCC8'); rect(ctx,0,-10*s,s,s,'#FFF'); for(let i=0;i<2;i++){rect(ctx,-s,-7*s+i*4*s,s,2*s,'#DDD'); rect(ctx,s,-5*s+i*4*s,s,2*s,'#DDD');} },
    'ws_jade': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#2E7D32'); rect(ctx,-s,0,3*s,s,'#4CAF50'); rect(ctx,-s/2,-9*s,2*s,9*s,'#66BB6A'); ctx.globalAlpha=0.4+Math.sin(frame*0.06)*0.2; rect(ctx,0,-9*s,s,9*s,'#A5D6A7'); ctx.globalAlpha=1; },
    'ws_blood': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#4A0000'); rect(ctx,-s,0,3*s,s,'#800000'); rect(ctx,-s/2,-9*s,2*s,9*s,'#CC0000'); rect(ctx,0,-10*s,s,s,'#FF0000'); ctx.globalAlpha=0.3+Math.sin(frame*0.08)*0.2; for(let i=0;i<3;i++) px(ctx,-s/2+Math.sin(frame*0.05+i)*s,-8*s+i*3*s,s,'#FF0000'); ctx.globalAlpha=1; },
    'ws_ice': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#1A5276'); rect(ctx,-s,0,3*s,s,'#5DADE2'); rect(ctx,-s/2,-10*s,2*s,10*s,'#85C1E9'); rect(ctx,0,-11*s,s,s,'#D6EAF8'); ctx.globalAlpha=0.3+Math.sin(frame*0.07)*0.2; rect(ctx,-s/2,-10*s,2*s,10*s,'#AED6F1'); ctx.globalAlpha=1; },
    'ws_flame': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#5D4037'); rect(ctx,-s,0,3*s,s,'#FF6F00'); rect(ctx,-s/2,-9*s,2*s,9*s,'#FF8F00'); rect(ctx,0,-10*s,s,s,'#FFD600'); ctx.globalAlpha=0.4+Math.sin(frame*0.1)*0.3; for(let i=0;i<4;i++) rect(ctx,-s+Math.sin(frame*0.08+i)*s,-9*s+i*2.5*s,s,s,'#FF6F00'); ctx.globalAlpha=1; },
    'ws_shadow': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#1A1A2E'); rect(ctx,-s,0,3*s,s,'#4A148C'); rect(ctx,-s/2,-10*s,2*s,10*s,'#311B92'); rect(ctx,0,-11*s,s,s,'#7C4DFF'); ctx.globalAlpha=0.25+Math.sin(frame*0.05)*0.15; rect(ctx,-s,-10*s,3*s,10*s,'#7C4DFF'); ctx.globalAlpha=1; },
    'ws_thunder': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#4A5568'); rect(ctx,-s,0,3*s,s,'#F6E05E'); rect(ctx,-s/2,-10*s,2*s,10*s,'#ECC94B'); rect(ctx,0,-11*s,s,s,'#FEFCBF'); ctx.globalAlpha=0.5+Math.sin(frame*0.15)*0.4; for(let i=0;i<3;i++) px(ctx,-s+Math.random()*2*s,-9*s+i*3*s,s,'#FFFFF0'); ctx.globalAlpha=1; },
    'ws_moonlight': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#2C3E50'); rect(ctx,-s,0,3*s,s,'#BDC3C7'); rect(ctx,-s/2,-10*s,2*s,10*s,'#ECF0F1'); rect(ctx,0,-11*s,s,s,'#FFFFFF'); ctx.globalAlpha=0.3+Math.sin(frame*0.04)*0.2; rect(ctx,-s,-10*s,3*s,10*s,'#F0F3F4'); ctx.globalAlpha=1; },
    'ws_vine': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#1B5E20'); rect(ctx,-s,0,3*s,s,'#2E7D32'); rect(ctx,-s/2,-9*s,2*s,9*s,'#4CAF50'); for(let i=0;i<4;i++) rect(ctx,(i%2===0?-s:s),-8*s+i*2*s,s,s,'#81C784'); rect(ctx,0,-10*s,s,s,'#A5D6A7'); },
    'ws_crystal': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#4A148C'); rect(ctx,-s,0,3*s,s,'#CE93D8'); rect(ctx,-s/2,-10*s,2*s,10*s,'#E1BEE7'); rect(ctx,-s,-11*s,3*s,s,'#F3E5F5'); ctx.globalAlpha=0.3+Math.sin(frame*0.06)*0.2; rect(ctx,-s,-10*s,3*s,10*s,'#F3E5F5'); ctx.globalAlpha=1; },
    'ws_demon': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#1A1A1A'); rect(ctx,-2*s,-s,5*s,2*s,'#B71C1C'); rect(ctx,-s,-11*s,3*s,11*s,'#D32F2F'); rect(ctx,-s/2,-12*s,2*s,s,'#FF5252'); ctx.globalAlpha=0.2+Math.sin(frame*0.04)*0.15; rect(ctx,-s,-11*s,3*s,11*s,'#FF1744'); ctx.globalAlpha=1; },
    'ws_dragon': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#1B5E20'); rect(ctx,-2*s,-s,5*s,2*s,'#DAA520'); rect(ctx,-s,-11*s,3*s,11*s,'#2E7D32'); rect(ctx,0,-12*s,s,s,'#FFD700'); /* 龙鳞纹 */ for(let i=0;i<4;i++) px(ctx,-s+((i+1)%2)*s,-10*s+i*2.5*s,s,'#FFD700'); /* 龙首护手 */ rect(ctx,-2*s,-s,s,2*s,'#DAA520'); rect(ctx,2*s,-s,s,2*s,'#DAA520'); px(ctx,-2*s,-2*s,s,'#FFD700'); px(ctx,2*s,-2*s,s,'#FFD700'); ctx.globalAlpha=0.2+Math.sin(frame*0.05)*0.1; rect(ctx,-s,-11*s,3*s,11*s,'#FFD700'); ctx.globalAlpha=1; },
    'ws_phoenix': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#BF360C'); rect(ctx,-2*s,-s,5*s,2*s,'#FF6F00'); rect(ctx,-s,-11*s,3*s,11*s,'#FF8F00'); rect(ctx,0,-12*s,s,s,'#FFD600'); ctx.globalAlpha=0.4+Math.sin(frame*0.08)*0.3; for(let i=0;i<5;i++) px(ctx,-s+Math.sin(frame*0.06+i)*s*1.5,-11*s+i*2.5*s,s,i%2===0?'#FF6F00':'#FFD600'); ctx.globalAlpha=1; },
    'ws_void': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#0D0D0D'); rect(ctx,-2*s,-s,5*s,2*s,'#4A148C'); rect(ctx,-s,-12*s,3*s,12*s,'#1A0033'); rect(ctx,0,-13*s,s,s,'#7C4DFF'); for(let i=0;i<4;i++){ctx.globalAlpha=0.4+Math.sin(frame*0.05+i*0.7)*0.3; px(ctx,-s+Math.sin(i*2.1)*s,-11*s+i*3*s,s,'#B388FF');} ctx.globalAlpha=1; },
    'ws_celestial': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#5D4037'); rect(ctx,-2*s,-s,5*s,2*s,'#FFD700'); rect(ctx,-s,-12*s,3*s,12*s,'#FFC107'); rect(ctx,-s/2,-13*s,2*s,s,'#FFFFF0'); ctx.globalAlpha=0.5+Math.sin(frame*0.035)*0.3; rect(ctx,-s,-12*s,3*s,12*s,'#FFD700'); ctx.globalAlpha=1; },
    'ws_heavenly': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#0D47A1'); rect(ctx,-2*s,-s,5*s,2*s,'#FFD700'); ctx.globalAlpha=0.8+Math.sin(frame*0.04)*0.2; rect(ctx,-s,-11*s,3*s,11*s,'#FFC107'); ctx.globalAlpha=1; },
    'ws_primordial': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#880000'); rect(ctx,-2*s,-s,5*s,2*s,'#FFD700'); rect(ctx,-s,-13*s,3*s,13*s,'#FFD700'); rect(ctx,-s/2,-14*s,2*s,s,'#FFFFAA'); for(let i=0;i<6;i++){const a=frame*0.02+i*Math.PI/3; ctx.globalAlpha=0.6+Math.sin(frame*0.04+i)*0.3; rect(ctx,Math.cos(a)*3*s,-7*s+Math.sin(a)*5*s,s,s,'#FFFFFF');} ctx.globalAlpha=0.5; rect(ctx,-s,-13*s,3*s,13*s,'#FFD700'); ctx.globalAlpha=1; },
    'ws_cosmic': (ctx,s,frame) => { rect(ctx,0,0,s,3*s,'#0D0D2B'); rect(ctx,-2*s,-s,5*s,2*s,'#00BCD4'); const grad=ctx.createLinearGradient(-s,-14*s,2*s,0); grad.addColorStop(0,'#1A237E'); grad.addColorStop(0.5,'#0D47A1'); grad.addColorStop(1,'#01579B'); ctx.fillStyle=grad; ctx.fillRect(-s,-14*s,3*s,14*s); for(let i=0;i<8;i++){ctx.globalAlpha=0.5+Math.sin(frame*0.06+i*0.8)*0.5; rect(ctx,-s+Math.sin(i*1.7)*s*1.5,-13*s+i*1.8*s,s*0.8,s*0.8,'#FFFFFF');} ctx.globalAlpha=0.45+Math.sin(frame*0.025)*0.2; ctx.fillStyle='#00BCD4'; ctx.fillRect(-s,-14*s,3*s,14*s); ctx.globalAlpha=1; },
  };

  // ================================================================
  // 盔甲皮肤颜色 + 覆盖层
  // ================================================================
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

  function drawArmorSkinOverlay(ctx, x, y, s, realmIndex, frame, attacking, skinId) {
    const colors = armorSkinColors[skinId]; if (!colors) return;
    const bounce = realmIndex<=1 ? Math.sin(frame*0.08)*1.5*s : (realmIndex<=3 ? Math.sin(frame*0.04)*2*s : Math.sin(frame*0.03)*(3+realmIndex)*s);
    const atkX = attacking>0 ? Math.sin(attacking*0.4)*(6+realmIndex*2)*s : 0;
    const floatExtra = realmIndex>=3 ? -(realmIndex-2)*3*s : 0;
    ctx.save(); ctx.translate(x+atkX, y+bounce+floatExtra); ctx.globalAlpha=0.75;
    // v4.0适配：缩小衣服覆盖层
    const bw = realmIndex>=4 ? 7 : (realmIndex>=2 ? 6 : (realmIndex>=1 ? 5 : 4));
    const bh = realmIndex>=4 ? 6 : (realmIndex>=2 ? 5 : (realmIndex>=1 ? 4 : 4));
    rect(ctx,-bw*s,-(bh-1)*s,bw*2*s,bh*2*s,colors.main);
    rect(ctx,-(bw-1)*s,-(bh-2)*s,(bw-1)*2*s,(bh-1)*2*s,colors.accent);
    px(ctx,-s,-(bh)*s,s,colors.trim); px(ctx,0,-(bh-1)*s,s,colors.trim); px(ctx,s,-(bh)*s,s,colors.trim);
    rect(ctx,-bw*s,0,bw*2*s,s,colors.trim);
    if(skinId.includes('phoenix')||skinId.includes('celestial')||skinId.includes('primordial')||skinId.includes('universe')){
      ctx.globalAlpha=0.25+Math.sin(frame*0.04)*0.15; rect(ctx,-bw*s,-(bh-1)*s,bw*2*s,bh*2*s,colors.trim);
    }
    ctx.globalAlpha=1; ctx.restore();
  }

  function drawWeaponWithSkin(ctx, x, y, s, tier, frame, attacking, skinId) {
    if(skinId && weaponSkinDrawers[skinId]){
      ctx.save(); ctx.translate(x,y);
      const angle = attacking>0 ? -0.8+Math.sin(attacking*0.5)*1.5 : -0.3;
      ctx.rotate(angle); weaponSkinDrawers[skinId](ctx,s,frame); ctx.restore();
    } else { drawWeapon(ctx,x,y,s,tier,frame,attacking); }
  }

  // ================================================================
  // 公开接口
  // ================================================================
  function drawMouseByRealm(ctx, x, y, s, realmIndex, frame, attacking, options) {
    const opts = options || {};
    const drawFns = [drawMouseRealm0,drawMouseRealm1,drawMouseRealm2,drawMouseRealm3,drawMouseRealm4,drawMouseRealm5];
    // 境界光环（用circle绘制柔和的椭圆光晕，不是方块）
    if(realmIndex >= 1){
      const glowColors = [null,'rgba(68,136,204,0.08)','rgba(46,139,139,0.10)','rgba(65,105,180,0.12)','rgba(123,62,191,0.15)','rgba(160,32,96,0.18)'];
      const glowR = (12+realmIndex*4)*s;
      const pulse = 1+Math.sin(frame*0.03)*0.1;
      ctx.save(); ctx.globalAlpha=0.4;
      const r = glowR*pulse;
      ellipse(ctx, x, y-2*s, r, r*0.7, glowColors[realmIndex]||'transparent');
      ctx.globalAlpha=1; ctx.restore();
    }
    const fn = drawFns[realmIndex] || drawFns[0];
    fn(ctx, x, y, s, frame, attacking, opts);
  }

  return {
    drawMouseByRealm, drawWeaponWithSkin, drawArmorSkinOverlay,
    armorSkinColors, rect, px, circle, ellipse, roundRect,
  };
})();

if (typeof module !== 'undefined') module.exports = Sprites;
