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
// 4. 怪物外观 → 修改 monsterDrawers / monsterDrawersExtra 对象
// 5. 灵兽外观 → 修改 drawActiveBeast 函数
// 6. 坐骑外观 → 修改 drawMountCrane / drawMountQilin 函数
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
  // 灵兽 — 方块像素风 v2.0 (基于 mouse_beasts_01 参考升级)
  // 特点：更多细节像素、描边轮廓、3-4层色阶、动态特效
  // ================================================================

  // 小蛇（装饰性）
  function drawPetSnake(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    const wave = Math.sin(frame * 0.06);
    // 描边（暗色轮廓）
    rect(ctx, -7*s, -s+wave*s, 3*s, 3*s, '#1A3300');
    rect(ctx, -4*s, wave*s, 3*s, 3*s, '#1A3300');
    rect(ctx, -s, -s+wave*s, 3*s, 3*s, '#1A3300');
    rect(ctx, 2*s, -2*s, 4*s, 4*s, '#1A3300');
    // 蛇身（S形，多节渐变）
    rect(ctx, -6*s, 0+wave*s, 2*s, s, '#2D8B2D');
    px(ctx, -6*s, s+wave*s, s, '#44AA44');
    rect(ctx, -4*s, -s+wave*s, 2*s, s, '#3DA63D');
    px(ctx, -3*s, 0+wave*s, s, '#55BB55');
    rect(ctx, -2*s, 0, 2*s, s, '#2D8B2D');
    px(ctx, -s, s, s, '#44AA44');
    rect(ctx, 0, -s+wave*s, 2*s, s, '#3DA63D');
    // 鳞片纹理
    ctx.globalAlpha=0.4;
    px(ctx, -5*s, 0+wave*s, s, '#66DD66'); px(ctx, -s, -s+wave*s, s, '#66DD66');
    ctx.globalAlpha=1;
    // 头（更精细）
    rect(ctx, 2*s, -s, 3*s, 3*s, '#44AA44');
    rect(ctx, 3*s, 0, 2*s, s, '#66CC66');
    px(ctx, 4*s, -s, s, '#FF2200'); // 眼
    px(ctx, 3*s, -s, s, '#FFEE44'); // 眼高光
    // 信子
    const tongue = Math.sin(frame*0.12)>0 ? s : 0;
    px(ctx, 5*s, 0, s, '#FF3344');
    if(tongue) px(ctx, 6*s, -s, s, '#FF3344');
    if(tongue) px(ctx, 6*s, s, s, '#FF3344');
    // 尾（渐细）
    px(ctx, -7*s, s+wave*s, s, '#226622');
    px(ctx, -8*s, s, s, '#115511');
    ctx.restore();
  }

  // 蛟龙（灵兽）— 中华龙风格 v2.0：更细腻的鳞片、描边、云纹特效
  function drawPetDragon(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    const bob = Math.sin(frame * 0.04) * s;
    ctx.translate(0, bob);
    const bd='#2266AA', sc='#44AADD', bl='#88DDFF', ol='#113366';
    // 描边轮廓（暗色底层）
    rect(ctx, -6*s, -s, 4*s, 4*s, ol); rect(ctx, -3*s, -2*s, 4*s, 4*s, ol);
    rect(ctx, 0, -3*s, 4*s, 4*s, ol); rect(ctx, 3*s, -4*s, 3*s, 4*s, ol);
    // 身段1
    rect(ctx, -5*s, 0, 3*s, 2*s, bd); rect(ctx, -5*s, s, 3*s, s, sc);
    px(ctx, -4*s, s, s, bl);
    // 身段2
    rect(ctx, -2*s, -s, 3*s, 2*s, bd); rect(ctx, -2*s, 0, 3*s, s, sc);
    px(ctx, -s, 0, s, bl);
    // 身段3
    rect(ctx, s, -2*s, 3*s, 2*s, bd); rect(ctx, s, -s, 3*s, s, sc);
    px(ctx, 2*s, -s, s, bl);
    // 身段4
    rect(ctx, 4*s, -3*s, 2*s, 2*s, bd); px(ctx, 4*s, -2*s, s, bl);
    // 鳞片纹理（更多细节）
    ctx.globalAlpha=0.35;
    px(ctx,-4*s,-s,s,sc); px(ctx,-s,-2*s,s,sc); px(ctx,2*s,-3*s,s,sc); px(ctx,5*s,-4*s,s,sc);
    px(ctx,-3*s,0,s,'#66CCEE'); px(ctx,0,-s,s,'#66CCEE'); px(ctx,3*s,-2*s,s,'#66CCEE');
    ctx.globalAlpha=1;
    // 龙背脊（小锯齿）
    px(ctx,-4*s,-s,s,'#5599CC'); px(ctx,-s,-2*s,s,'#5599CC'); px(ctx,2*s,-3*s,s,'#5599CC');
    // 龙头（更精细，分层）
    rect(ctx, 6*s, -6*s, 4*s, 4*s, ol); // 描边
    rect(ctx, 6*s, -5*s, 3*s, 3*s, bd);
    rect(ctx, 7*s, -4*s, 2*s, s, sc); // 面部
    rect(ctx, 6*s, -3*s, 3*s, s, bl); // 下颚
    px(ctx, 8*s, -5*s, s, '#FFEE44'); // 龙眼
    px(ctx, 8*s, -5*s, s, '#FFCC00'); // 瞳
    // 鹿角（更精致分叉）
    px(ctx,7*s,-6*s,s,'#DAA520'); px(ctx,7*s,-7*s,s,'#DAA520'); px(ctx,6*s,-8*s,s,'#FFD700');
    px(ctx,8*s,-6*s,s,'#B8860B'); px(ctx,9*s,-7*s,s,'#DAA520'); px(ctx,9*s,-8*s,s,'#FFD700');
    // 龙须
    const ww=Math.sin(frame*0.06)*s;
    px(ctx,9*s,-4*s,s,bl); px(ctx,10*s,-3*s+ww,s,bl); px(ctx,11*s,-3*s+ww,s,'#AADDFF');
    px(ctx,9*s,-3*s,s,bl); px(ctx,10*s,-2*s-ww,s,bl);
    // 龙口（牙齿）
    px(ctx,9*s,-3*s,s,'#FFFFFF');
    // 四小爪
    px(ctx,-4*s,2*s,s,bd); px(ctx,-3*s,3*s,s,ol);
    px(ctx,1*s,0,s,bd); px(ctx,2*s,s,s,ol);
    // 尾巴（渐细+尾鳍）
    rect(ctx,-7*s,s,2*s,s,bd); px(ctx,-8*s,2*s,s,'#2277AA');
    px(ctx,-9*s,s,s,'#2277AA'); px(ctx,-9*s,3*s,s,'#2277AA'); // 尾鳍分叉
    // 云纹祥瑞（更柔和的光效）
    ctx.globalAlpha=0.1;
    ellipse(ctx,0,0,9*s,5*s,'#88DDFF');
    // 飘动小云朵
    for(let i=0;i<2;i++){const a=frame*0.015+i*3,r=7*s;
      px(ctx,Math.cos(a)*r,-s+Math.sin(a)*r*0.4,s,'#CCEEFF');
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // 金龙（灵兽）— 中华神龙风格 v2.0：金鳞蛇身、双鹿角、五爪、龙珠
  function drawPetDragonGold(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    const bob = Math.sin(frame * 0.03) * 1.5 * s;
    ctx.translate(0, bob);
    const bg='#B8860B', sg='#DAA520', fg='#FFD700', bl='#FFFFAA', ol='#6B4400';
    // 描边轮廓
    rect(ctx,-8*s,0,4*s,5*s,ol); rect(ctx,-5*s,-s,4*s,5*s,ol);
    rect(ctx,-2*s,-2*s,4*s,5*s,ol); rect(ctx,1*s,-3*s,4*s,5*s,ol);
    rect(ctx,4*s,-4*s,3*s,5*s,ol);
    // 蛇形身体（更壮更长）
    rect(ctx,-7*s,s,3*s,3*s,bg); rect(ctx,-7*s,2*s,3*s,s,sg);
    px(ctx,-6*s,2*s,s,bl);
    rect(ctx,-4*s,0,3*s,3*s,bg); rect(ctx,-4*s,s,3*s,s,sg);
    px(ctx,-3*s,s,s,bl);
    rect(ctx,-s,-s,3*s,3*s,bg); rect(ctx,-s,0,3*s,s,sg);
    px(ctx,0,0,s,bl);
    rect(ctx,2*s,-2*s,3*s,3*s,bg); rect(ctx,2*s,-s,3*s,s,sg);
    px(ctx,3*s,-s,s,bl);
    rect(ctx,5*s,-3*s,2*s,3*s,bg); px(ctx,5*s,-2*s,s,bl);
    // 金鳞纹理
    ctx.globalAlpha=0.45;
    px(ctx,-6*s,0,s,fg); px(ctx,-3*s,-s,s,fg); px(ctx,0,-2*s,s,fg); px(ctx,3*s,-3*s,s,fg);
    px(ctx,-5*s,s,s,'#FFE066'); px(ctx,-2*s,0,s,'#FFE066'); px(ctx,s,-s,s,'#FFE066');
    ctx.globalAlpha=1;
    // 龙背脊（金色锯齿）
    px(ctx,-6*s,0,s,fg); px(ctx,-3*s,-s,s,fg); px(ctx,0,-2*s,s,fg); px(ctx,3*s,-3*s,s,fg);
    // 五爪（两对精致小爪）
    px(ctx,-5*s,4*s,s,bg); px(ctx,-4*s,5*s,s,ol); px(ctx,-6*s,5*s,s,ol);
    px(ctx,1*s,2*s,s,bg); px(ctx,2*s,3*s,s,ol); px(ctx,0,3*s,s,ol);
    // 龙头（威严方正，更精细）
    rect(ctx,7*s,-6*s,5*s,5*s,ol); // 描边
    rect(ctx,7*s,-5*s,4*s,4*s,sg);
    rect(ctx,8*s,-4*s,3*s,2*s,fg); // 面部亮色
    rect(ctx,7*s,-3*s,4*s,2*s,bl); // 下颚
    rect(ctx,7*s,-6*s,4*s,s,bg); // 额头
    // 龙眼（红色金圈）
    px(ctx,9*s,-5*s,s,'#FF2200');
    px(ctx,10*s,-4*s,s,'#FFFFFF');
    // 龙口
    px(ctx,11*s,-3*s,s,'#CC3300'); px(ctx,11*s,-2*s,s,'#AA2200');
    // 龙牙
    px(ctx,10*s,-2*s,s,'#FFFFFF'); px(ctx,11*s,-3*s,s,'#FFFFFF');
    // 鹿角（金色双叉，更精致）
    rect(ctx,8*s,-7*s,s,s,fg); rect(ctx,7*s,-8*s,s,s,fg); rect(ctx,6*s,-9*s,s,s,'#FFFFCC');
    px(ctx,8*s,-8*s,s,bl);
    rect(ctx,10*s,-7*s,s,s,fg); rect(ctx,11*s,-8*s,s,s,fg);
    px(ctx,10*s,-8*s,s,bl); px(ctx,12*s,-9*s,s,s,'#FFFFCC');
    // 龙须（金色长须飘动）
    const wh=Math.sin(frame*0.05)*s;
    rect(ctx,11*s,-4*s,s,s,fg); px(ctx,12*s,-3*s+wh,s,'#FFE066'); px(ctx,13*s,-3*s+wh,s,'#FFE066');
    rect(ctx,11*s,-2*s,s,s,fg); px(ctx,12*s,-s-wh,s,'#FFE066');
    // 龙珠（闪烁火球+光环）
    ctx.globalAlpha=0.6+Math.sin(frame*0.08)*0.3;
    circle(ctx,14*s,-5*s,2*s,'#FF6600');
    circle(ctx,14*s,-5*s,s,'#FFFF88');
    px(ctx,14*s,-6*s,s,'#FFFFCC');
    ctx.globalAlpha=1;
    // 尾巴（渐细+尾鳍+火焰尾尖）
    rect(ctx,-9*s,2*s,2*s,s,bg);
    px(ctx,-10*s,3*s,s,ol); px(ctx,-11*s,2*s,s,ol); px(ctx,-11*s,4*s,s,ol);
    ctx.globalAlpha=0.5+Math.sin(frame*0.1)*0.3;
    px(ctx,-12*s,2*s,s,'#FF6600'); px(ctx,-12*s,4*s,s,'#FFAA00');
    ctx.globalAlpha=1;
    // 神龙光环（金光）
    ctx.globalAlpha=0.08+Math.sin(frame*0.04)*0.04;
    ellipse(ctx,0,0,14*s,7*s,'#FFD700');
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // ================================================================
  // 出战灵兽 — 方块像素风
  // ================================================================

  // 赤炎灵猫 v2.0 — 参考图：橘猫+火焰条纹+火尾
  function drawPetFireCat(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(frame * 0.08) * s;
    ctx.translate(0, bob);
    const ol='#662200', bd='#CC4400', md='#FF6633', lt='#FF8855', bl='#FFAA66';
    // 描边底层
    rect(ctx,-5*s,-3*s,11*s,7*s,ol); rect(ctx,-8*s,-6*s,7*s,6*s,ol);
    // 身体（分层）
    rect(ctx,-4*s,-2*s,9*s,5*s,bd); rect(ctx,-3*s,-s,7*s,3*s,md);
    rect(ctx,-2*s,0,5*s,s,lt); // 肚子亮色
    // 虎纹花纹
    ctx.globalAlpha=0.5;
    rect(ctx,-3*s,-2*s,s,2*s,ol); rect(ctx,0,-2*s,s,2*s,ol); rect(ctx,3*s,-2*s,s,2*s,ol);
    px(ctx,-s,-s,s,ol); px(ctx,2*s,-s,s,ol);
    ctx.globalAlpha=1;
    // 头（更圆更精致）
    rect(ctx,-7*s,-5*s,6*s,5*s,md); rect(ctx,-6*s,-4*s,4*s,3*s,lt);
    rect(ctx,-5*s,-3*s,2*s,s,bl); // 嘴部白色
    // 三角耳（带粉内耳）
    rect(ctx,-7*s,-7*s,2*s,2*s,bd); px(ctx,-7*s,-7*s,s,'#FF9966');
    rect(ctx,-3*s,-7*s,2*s,2*s,bd); px(ctx,-3*s,-7*s,s,'#FF9966');
    // 猫眼（竖瞳+高光）
    rect(ctx,-6*s,-4*s,s,2*s,'#FFDD00'); px(ctx,-6*s,-4*s,s,'#111100');
    rect(ctx,-3*s,-4*s,s,2*s,'#FFDD00'); px(ctx,-3*s,-4*s,s,'#111100');
    px(ctx,-6*s,-3*s,s,'#FFFFFF'); px(ctx,-3*s,-3*s,s,'#FFFFFF'); // 高光
    // 鼻+嘴
    px(ctx,-5*s,-2*s,s,'#FF3300');
    px(ctx,-6*s,-s,s,'#AA5533'); px(ctx,-4*s,-s,s,'#AA5533'); // 胡须根
    // 胡须
    rect(ctx,-10*s,-4*s,3*s,s,'#FFCCAA'); rect(ctx,-10*s,-2*s,3*s,s,'#FFCCAA');
    rect(ctx,-1*s,-4*s,3*s,s,'#FFCCAA'); rect(ctx,-1*s,-2*s,3*s,s,'#FFCCAA');
    // 火焰尾巴（更华丽，参照参考图）
    rect(ctx,5*s,-3*s,s,3*s,bd); rect(ctx,6*s,-5*s,s,3*s,md);
    rect(ctx,7*s,-6*s,s,2*s,'#FFAA00'); rect(ctx,7*s,-7*s,s,s,'#FFCC00');
    // 尾尖火焰粒子
    ctx.globalAlpha=0.5+Math.sin(frame*0.15)*0.3;
    px(ctx,8*s,-8*s,s,'#FFDD44'); px(ctx,6*s,-7*s,s,'#FF6600');
    px(ctx,8*s,-6*s,s,'#FF4400');
    ctx.globalAlpha=1;
    // 脚（带火焰印记）
    rect(ctx,-4*s,3*s,2*s,s,ol); rect(ctx,0,3*s,2*s,s,ol); rect(ctx,3*s,3*s,2*s,s,ol);
    // 地面火花
    ctx.globalAlpha=0.2+Math.sin(frame*0.12)*0.15;
    px(ctx,-3*s,4*s,s,'#FF4400'); px(ctx,s,4*s,s,'#FFAA00'); px(ctx,4*s,4*s,s,'#FF6600');
    ctx.globalAlpha=1;
    // 火焰光效
    ctx.globalAlpha=0.08+Math.sin(frame*0.12)*0.06;
    rect(ctx,-6*s,-4*s,14*s,9*s,'#FF6633');
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // 玄冰狼 v2.0 — 参考图：银蓝狼+冰晶刺+寒霜
  function drawPetIceWolf(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(frame * 0.07) * s;
    ctx.translate(0, bob);
    const ol='#334466', dk='#5577AA', md='#8899BB', lt='#AABBDD', wh='#CCDDEE';
    // 描边底层
    rect(ctx,-5*s,-3*s,12*s,7*s,ol); rect(ctx,-9*s,-6*s,7*s,7*s,ol);
    // 身体（分层渐变）
    rect(ctx,-4*s,-2*s,10*s,5*s,dk); rect(ctx,-3*s,-s,8*s,3*s,md);
    rect(ctx,-2*s,0,6*s,s,lt); // 腹部
    // 毛皮纹理
    ctx.globalAlpha=0.3; px(ctx,-2*s,-2*s,s,wh); px(ctx,s,-2*s,s,wh); px(ctx,4*s,-2*s,s,wh); ctx.globalAlpha=1;
    // 头（方正狼头，更精细）
    rect(ctx,-8*s,-5*s,6*s,6*s,md); rect(ctx,-7*s,-4*s,4*s,4*s,lt);
    rect(ctx,-6*s,-3*s,2*s,s,wh); // 嘴部
    // 尖耳
    rect(ctx,-8*s,-7*s,2*s,2*s,dk); px(ctx,-8*s,-7*s,s,'#99AACC');
    rect(ctx,-4*s,-7*s,2*s,2*s,dk); px(ctx,-4*s,-7*s,s,'#99AACC');
    // 狼眼（冰蓝+高光）
    rect(ctx,-7*s,-4*s,s,s,'#44DDFF'); px(ctx,-7*s,-4*s,s,'#111133');
    rect(ctx,-4*s,-4*s,s,s,'#44DDFF'); px(ctx,-4*s,-4*s,s,'#111133');
    px(ctx,-7*s,-5*s,s,'#88EEFF'); px(ctx,-4*s,-5*s,s,'#88EEFF'); // 高光
    // 獠牙
    px(ctx,-7*s,-s,s,'#FFFFFF'); px(ctx,-4*s,-s,s,'#FFFFFF');
    px(ctx,-6*s,0,s,'#DDDDEE'); // 下颚
    // 冰晶刺（背部，参考图中的ice spikes）
    const iceFlicker=0.5+Math.sin(frame*0.08)*0.3;
    ctx.globalAlpha=iceFlicker;
    rect(ctx,-2*s,-5*s,s,3*s,'#AADDFF'); rect(ctx,0,-4*s,s,2*s,'#88CCFF');
    rect(ctx,s,-5*s,s,3*s,'#CCDDFF'); rect(ctx,3*s,-4*s,s,2*s,'#88CCFF');
    ctx.globalAlpha=1;
    // 冰刺底座
    px(ctx,-2*s,-3*s,s,dk); px(ctx,0,-3*s,s,dk); px(ctx,s,-3*s,s,dk); px(ctx,3*s,-3*s,s,dk);
    // 尾（蓬松冰尾）
    rect(ctx,6*s,-3*s,s,3*s,dk); rect(ctx,7*s,-4*s,s,3*s,md);
    rect(ctx,8*s,-5*s,s,2*s,'#88CCFF'); px(ctx,8*s,-6*s,s,wh);
    // 脚（带冰霜印记）
    rect(ctx,-4*s,3*s,2*s,s,ol); rect(ctx,0,3*s,2*s,s,ol); rect(ctx,4*s,3*s,2*s,s,ol);
    // 地面冰霜
    ctx.globalAlpha=0.15;
    rect(ctx,-5*s,4*s,14*s,s,'#88CCFF');
    for(let i=0;i<4;i++) px(ctx,-4*s+i*3*s,4*s,s,'#CCDDFF');
    ctx.globalAlpha=1;
    // 寒气光效
    ctx.globalAlpha=0.08+Math.sin(frame*0.1)*0.05;
    rect(ctx,-6*s,-4*s,15*s,9*s,'#88CCFF');
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // 雷鸣鹰 v2.0 — 参考图：金色巨鹰+翼尖闪电+暴风羽
  function drawPetThunderEagle(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    const flap = Math.sin(frame * 0.1) * 2 * s;
    const ol='#664400', dk='#996600', md='#CC9900', lt='#DAA520', gd='#FFD700';
    // 描边
    rect(ctx,-4*s,-2*s,9*s,6*s,ol); rect(ctx,-10*s,-5*s+flap,6*s,4*s,ol); rect(ctx,5*s,-5*s+flap,6*s,4*s,ol);
    // 身体（分层）
    rect(ctx,-3*s,-s,7*s,4*s,dk); rect(ctx,-2*s,0,5*s,2*s,md);
    px(ctx,-s,0,s,lt); px(ctx,s,0,s,lt); // 胸部亮色
    // 翅膀（展开，更多层次）
    rect(ctx,-9*s,-4*s+flap,5*s,3*s,md); rect(ctx,-8*s,-3*s+flap,3*s,s,lt);
    rect(ctx,-10*s,-3*s+flap,s,2*s,dk); // 翼尖
    rect(ctx,5*s,-4*s+flap,5*s,3*s,md); rect(ctx,6*s,-3*s+flap,3*s,s,lt);
    rect(ctx,10*s,-3*s+flap,s,2*s,dk);
    // 翼尖闪电
    ctx.globalAlpha=0.5+Math.sin(frame*0.15)*0.4;
    px(ctx,-11*s,-2*s+flap,s,'#FFFF44'); px(ctx,-12*s,-3*s+flap,s,'#FFFF88');
    px(ctx,11*s,-2*s+flap,s,'#FFFF44'); px(ctx,12*s,-3*s+flap,s,'#FFFF88');
    ctx.globalAlpha=1;
    // 头（更精致鹰头）
    rect(ctx,-2*s,-5*s,4*s,4*s,ol); // 描边
    rect(ctx,-s,-4*s,3*s,3*s,lt);
    px(ctx,0,-4*s,s,gd); // 额头金冠
    // 鹰喙（弯钩喙）
    rect(ctx,0,-3*s,s,2*s,'#FF8800'); px(ctx,0,-4*s,s,'#FF6600');
    px(ctx,s,-2*s,s,'#CC5500'); // 喙尖
    // 鹰眼（锐利白+黑瞳）
    px(ctx,-s,-3*s,s,'#FFFFFF'); px(ctx,s,-3*s,s,'#FFFFFF');
    px(ctx,-s,-4*s,s,'#FF8800'); px(ctx,s,-4*s,s,'#FF8800'); // 眉纹
    // 翅膀上的羽毛纹
    ctx.globalAlpha=0.3;
    px(ctx,-7*s,-4*s+flap,s,gd); px(ctx,-6*s,-3*s+flap,s,gd);
    px(ctx,7*s,-4*s+flap,s,gd); px(ctx,8*s,-3*s+flap,s,gd);
    ctx.globalAlpha=1;
    // 尾羽（扇形展开）
    rect(ctx,-2*s,3*s,s,2*s,dk); rect(ctx,0,3*s,s,3*s,md); rect(ctx,2*s,3*s,s,2*s,dk);
    // 利爪
    rect(ctx,-2*s,3*s,s,s,ol); px(ctx,-3*s,4*s,s,'#996600');
    rect(ctx,2*s,3*s,s,s,ol); px(ctx,3*s,4*s,s,'#996600');
    // 全身雷电弧
    ctx.globalAlpha=0.25+Math.sin(frame*0.15)*0.2;
    for(let i=0;i<3;i++){const a=frame*0.12+i*2.1,r=5*s;
      px(ctx,Math.cos(a)*r,-s+Math.sin(a)*r*0.5,s,'#FFFF00');
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // 暗鳞蛇 v2.0 — 参考图：深紫蛇+暗影缠绕+毒性光芒
  function drawPetShadowSerpent(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    const wave = Math.sin(frame * 0.06);
    const ol='#1A0033', dk='#330066', md='#4A0088', lt='#5500AA', hl='#7722DD';
    // 描边轮廓
    rect(ctx,-5*s,-s,4*s,4*s,ol); rect(ctx,-2*s,-2*s+wave*s,4*s,4*s,ol);
    rect(ctx,s,-s,4*s,4*s,ol); rect(ctx,4*s,-2*s+wave*s,3*s,4*s,ol);
    rect(ctx,-8*s,-3*s,4*s,6*s,ol);
    // 蛇身（锯齿方块，多节渐变）
    rect(ctx,-4*s,0,3*s,2*s,md); px(ctx,-3*s,s,s,lt);
    rect(ctx,-s,-s+wave*s,3*s,2*s,lt); px(ctx,0,0+wave*s,s,hl);
    rect(ctx,2*s,0,3*s,2*s,md); px(ctx,3*s,s,s,lt);
    rect(ctx,5*s,-s+wave*s,2*s,2*s,lt); px(ctx,5*s,0+wave*s,s,hl);
    // 暗色鳞片纹理
    ctx.globalAlpha=0.4;
    px(ctx,-3*s,0,s,dk); px(ctx,0,-s+wave*s,s,dk); px(ctx,3*s,0,s,dk); px(ctx,5*s,-s+wave*s,s,dk);
    px(ctx,-2*s,s,s,'#8844CC'); px(ctx,s,0+wave*s,s,'#8844CC');
    ctx.globalAlpha=1;
    // 头（更精致，带毒牙）
    rect(ctx,-7*s,-2*s,3*s,4*s,lt); rect(ctx,-6*s,-s,2*s,2*s,hl);
    // 头顶鳞冠
    px(ctx,-7*s,-3*s,s,md); px(ctx,-6*s,-3*s,s,dk);
    // 蛇眼（发光紫瞳+高光）
    px(ctx,-7*s,-2*s,s,'#FF00FF'); px(ctx,-7*s,-s,s,'#CC00CC');
    px(ctx,-7*s,s,s,'#FF00FF'); px(ctx,-7*s,0,s,'#CC00CC');
    px(ctx,-8*s,-2*s,s,'#FF88FF'); // 眼部发光
    // 毒牙
    px(ctx,-8*s,0,s,'#DDCCFF'); px(ctx,-8*s,s,s,'#DDCCFF');
    // 尾（渐细+暗影飘散）
    px(ctx,7*s,0+wave*s,s,dk); px(ctx,8*s,0,s,ol);
    // 暗影粒子
    ctx.globalAlpha=0.2+Math.sin(frame*0.08)*0.15;
    for(let i=0;i<4;i++){const a=frame*0.02+i*1.57,r=6*s;
      px(ctx,Math.cos(a)*r,-s+Math.sin(a)*r*0.4,s,'#9944FF');
    }
    ctx.globalAlpha=1;
    // 暗影光效
    ctx.globalAlpha=0.06+Math.sin(frame*0.08)*0.04;
    rect(ctx,-9*s,-3*s,19*s,7*s,'#6600CC');
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // 天凤 v2.0 — 参考图：红金凤凰+火焰冠+展翅火羽
  function drawPetPhoenix(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    const flap = Math.sin(frame * 0.08) * 2 * s;
    const ol='#660000', dk='#CC2200', md='#FF4444', lt='#FF6666', gd='#FFD700', or='#FF8800';
    // 描边
    rect(ctx,-4*s,-2*s,10*s,6*s,ol); rect(ctx,-10*s,-4*s+flap,6*s,4*s,ol); rect(ctx,6*s,-4*s+flap,6*s,4*s,ol);
    // 身体（分层火红）
    rect(ctx,-3*s,-s,8*s,4*s,dk); rect(ctx,-2*s,0,6*s,2*s,md);
    px(ctx,-s,0,s,lt); px(ctx,s,0,s,lt); px(ctx,0,s,s,gd); // 胸前金纹
    // 翅膀（展开，渐变火色）
    rect(ctx,-9*s,-3*s+flap,5*s,3*s,dk); rect(ctx,-8*s,-2*s+flap,3*s,s,md);
    rect(ctx,-10*s,-2*s+flap,s,2*s,or); // 翼尖金色
    px(ctx,-11*s,-s+flap,s,gd);
    rect(ctx,6*s,-3*s+flap,5*s,3*s,dk); rect(ctx,7*s,-2*s+flap,3*s,s,md);
    rect(ctx,11*s,-2*s+flap,s,2*s,or);
    px(ctx,12*s,-s+flap,s,gd);
    // 翅膀羽纹
    ctx.globalAlpha=0.3;
    px(ctx,-7*s,-3*s+flap,s,gd); px(ctx,-6*s,-2*s+flap,s,or);
    px(ctx,8*s,-3*s+flap,s,gd); px(ctx,9*s,-2*s+flap,s,or);
    ctx.globalAlpha=1;
    // 头（精致凤头）
    rect(ctx,-2*s,-5*s,4*s,4*s,ol); // 描边
    rect(ctx,-s,-4*s,3*s,3*s,md); px(ctx,0,-4*s,s,lt);
    // 火焰冠（三叉华丽凤冠）
    rect(ctx,-s,-6*s,s,2*s,gd); rect(ctx,0,-7*s,s,3*s,or);
    rect(ctx,s,-6*s,s,2*s,gd);
    px(ctx,0,-8*s,s,'#FFFF44'); // 冠顶光点
    px(ctx,-2*s,-5*s,s,or); px(ctx,2*s,-5*s,s,or); // 侧冠
    // 凤喙
    px(ctx,0,-3*s,s,or); px(ctx,s,-2*s,s,'#CC5500');
    // 凤眼（圆形+高光，参考图特色）
    px(ctx,-s,-4*s,s,'#FFFFFF'); px(ctx,s,-4*s,s,'#FFFFFF');
    px(ctx,-s,-3*s,s,gd); px(ctx,s,-3*s,s,gd); // 彩虹色
    // 华丽尾羽（火焰尾，参考图风格）
    rect(ctx,5*s,-2*s,s,4*s,dk); rect(ctx,6*s,-3*s,s,5*s,md);
    rect(ctx,7*s,-4*s,s,6*s,or); rect(ctx,8*s,-3*s,s,5*s,gd);
    rect(ctx,9*s,-2*s,s,3*s,or);
    // 尾羽尖端火焰
    ctx.globalAlpha=0.4+Math.sin(frame*0.1)*0.3;
    px(ctx,9*s,-3*s,s,'#FFFF44'); px(ctx,8*s,-4*s,s,'#FFFF44');
    px(ctx,10*s,-s,s,'#FFDD00');
    ctx.globalAlpha=1;
    // 火焰粒子（更多更华丽）
    ctx.globalAlpha=0.25;
    for(let i=0;i<6;i++){const a=frame*0.02+i*1.047,r=10*s;
      const c=i%3===0?gd:i%3===1?'#FF4400':or;
      px(ctx,Math.cos(a)*r,-s+Math.sin(a)*r*0.5,s,c);
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // 灵兽独立绘制接口
  function drawActiveBeast(ctx, x, y, s, beastTemplateId, frame) {
    switch (beastTemplateId) {
      case 'fire_cat':       drawPetFireCat(ctx, x, y, s, frame); break;
      case 'ice_wolf':       drawPetIceWolf(ctx, x, y, s, frame); break;
      case 'thunder_eagle':  drawPetThunderEagle(ctx, x, y, s, frame); break;
      case 'shadow_serpent': drawPetShadowSerpent(ctx, x, y, s, frame); break;
      case 'jade_dragon':    drawPetDragon(ctx, x, y, s, frame); break;
      case 'phoenix':        drawPetPhoenix(ctx, x, y, s, frame); break;
      default:
        if (beastTemplateId && beastTemplateId.includes('dragon')) {
          drawPetDragonGold(ctx, x, y, s, frame);
        } else {
          drawPetSnake(ctx, x, y, s, frame);
        }
    }
  }

  // ================================================================
  // 坐骑 — 方块像素风
  // ================================================================

  function drawMountCrane(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    const glide = Math.sin(frame * 0.04) * 2 * s;
    ctx.translate(0, glide);
    const ol='#888888', wh='#FFFFFF', lt='#F5F5F5', dk='#DDDDDD', bk='#222222';
    // 身体描边
    rect(ctx,-7*s,-3*s,14*s,7*s,ol);
    // 身体（白色分层，更圆润）
    rect(ctx,-6*s,-2*s,12*s,5*s,wh); rect(ctx,-5*s,-3*s,10*s,s,lt); rect(ctx,-5*s,3*s,10*s,s,lt);
    // 背部羽毛纹理
    ctx.globalAlpha=0.15;
    for(let i=0;i<4;i++) rect(ctx,-4*s+i*3*s,-2*s,2*s,s,dk);
    ctx.globalAlpha=1;
    // 颈部（优雅S形弯曲，更多节点）
    rect(ctx,-5*s,-4*s,2*s,2*s,wh); rect(ctx,-6*s,-6*s,2*s,2*s,wh);
    rect(ctx,-6*s,-8*s,2*s,2*s,wh); rect(ctx,-5*s,-10*s,2*s,2*s,wh);
    // 颈部描边
    px(ctx,-6*s,-4*s,s,ol); px(ctx,-7*s,-6*s,s,ol); px(ctx,-7*s,-8*s,s,ol); px(ctx,-6*s,-10*s,s,ol);
    // 头（更精致）
    rect(ctx,-7*s,-13*s,5*s,4*s,ol); // 描边
    rect(ctx,-6*s,-12*s,4*s,3*s,wh);
    // 丹顶（红冠，更大更明显）
    rect(ctx,-5*s,-13*s,3*s,s,'#FF2222'); px(ctx,-4*s,-14*s,s,'#FF4444');
    // 喙（更长更精致）
    rect(ctx,-9*s,-11*s,3*s,s,'#FF8800'); px(ctx,-9*s,-12*s,s,'#CC6600');
    // 眼
    px(ctx,-6*s,-11*s,s,bk); px(ctx,-6*s,-12*s,s,'#FF4444'); // 红色眼周
    // 翅膀（更大更精致，黑白分层）
    const wingFlap = Math.sin(frame * 0.06) * 2;
    rect(ctx,-11*s,-s+wingFlap*s,5*s,2*s,lt); rect(ctx,-12*s,0+wingFlap*s,2*s,s,dk);
    rect(ctx,-13*s,s+wingFlap*s,s,s,bk); // 翼尖黑色
    rect(ctx,7*s,-s+wingFlap*s,5*s,2*s,lt); rect(ctx,10*s,0+wingFlap*s,2*s,s,dk);
    rect(ctx,12*s,s+wingFlap*s,s,s,bk);
    // 翅膀羽纹
    ctx.globalAlpha=0.2;
    px(ctx,-10*s,-s+wingFlap*s,s,ol); px(ctx,-9*s,0+wingFlap*s,s,ol);
    px(ctx,8*s,-s+wingFlap*s,s,ol); px(ctx,9*s,0+wingFlap*s,s,ol);
    ctx.globalAlpha=1;
    // 尾羽（黑色华丽扇形）
    rect(ctx,5*s,-2*s,s,4*s,bk); rect(ctx,6*s,-s,s,4*s,'#333333');
    rect(ctx,7*s,0,s,4*s,bk); rect(ctx,8*s,s,s,3*s,'#333333');
    px(ctx,9*s,2*s,s,bk);
    // 腿（更细长优雅）
    rect(ctx,-2*s,4*s,s,5*s,'#777777'); px(ctx,-2*s,9*s,s,'#555555');
    rect(ctx,2*s,4*s,s,5*s,'#777777'); px(ctx,2*s,9*s,s,'#555555');
    // 脚蹼
    rect(ctx,-3*s,9*s,3*s,s,'#777777'); rect(ctx,1*s,9*s,3*s,s,'#777777');
    ctx.restore();
  }

  function drawMountQilin(ctx, x, y, s, frame) {
    ctx.save();
    ctx.translate(x, y);
    const trot = Math.sin(frame * 0.08) * s;
    const ol='#6B4400', dk='#AA7700', md='#CC8800', lt='#DDAA33', gd='#FFD700', fl='#FF4400';
    // 身体描边
    rect(ctx,-8*s,-4*s,16*s,9*s,ol);
    // 身体（金鳞，分层）
    rect(ctx,-7*s,-3*s,14*s,7*s,md); rect(ctx,-6*s,-2*s,12*s,5*s,lt);
    // 金色鳞片纹理（更密集）
    ctx.globalAlpha=0.25;
    for(let i=0;i<6;i++) for(let j=0;j<3;j++) px(ctx,-5*s+i*2*s,-2*s+j*2*s,s,dk);
    // 鳞片高光
    for(let i=0;i<3;i++) px(ctx,-3*s+i*3*s,-s,s,gd);
    ctx.globalAlpha=1;
    // 头（龙面，更精致）
    rect(ctx,-11*s,-7*s,6*s,6*s,ol); // 描边
    rect(ctx,-10*s,-6*s,5*s,5*s,lt); rect(ctx,-9*s,-5*s,3*s,3*s,gd);
    // 双角（金色鹿角，更华丽）
    const hornGlow=0.7+Math.sin(frame*0.06)*0.3;
    ctx.globalAlpha=hornGlow;
    rect(ctx,-9*s,-9*s,s,3*s,gd); px(ctx,-10*s,-10*s,s,'#FFFFAA'); px(ctx,-9*s,-10*s,s,gd);
    rect(ctx,-7*s,-9*s,s,3*s,gd); px(ctx,-6*s,-10*s,s,'#FFFFAA'); px(ctx,-7*s,-10*s,s,gd);
    ctx.globalAlpha=1;
    // 火焰鬃毛（更华丽波动）
    const flameOff=Math.sin(frame*0.12)>0?s:0;
    for(let i=0;i<5;i++){const mx=-5*s+i*3*s, c=i%3===0?fl:i%3===1?'#FF6600':'#FFAA00';
      rect(ctx,mx,-5*s+flameOff,s,2*s,c); px(ctx,mx,-6*s+flameOff,s,'#FFDD44');
    }
    // 眼（红色发光+金色瞳）
    px(ctx,-10*s,-5*s,s,'#FF0000'); px(ctx,-10*s,-6*s,s,gd);
    px(ctx,-10*s,-4*s,s,'#FFAAAA'); // 高光
    // 嘴/下颚
    rect(ctx,-12*s,-3*s,3*s,s,dk); px(ctx,-12*s,-2*s,s,'#CC8800');
    // 龙须
    const wk=Math.sin(frame*0.05)*s;
    px(ctx,-12*s,-5*s,s,gd); px(ctx,-13*s,-4*s+wk,s,'#FFE066');
    px(ctx,-12*s,-4*s,s,gd); px(ctx,-13*s,-3*s-wk,s,'#FFE066');
    // 腿（更粗壮，有鳞纹）
    const legs=[[-4,trot],[-s,-trot],[2,trot],[5,-trot]];
    legs.forEach(([lx,ly])=>{
      rect(ctx,lx*s,4*s+ly,2*s,4*s,md); rect(ctx,lx*s,5*s+ly,2*s,2*s,lt);
      px(ctx,lx*s,6*s+ly,s,dk); // 鳞纹
      rect(ctx,lx*s,8*s+ly,2*s,s,ol); // 蹄
    });
    // 火焰蹄（更华丽）
    ctx.globalAlpha=0.5+Math.sin(frame*0.1)*0.3;
    legs.forEach(([lx,ly])=>{
      px(ctx,lx*s,9*s+ly,s,fl); px(ctx,(lx+1)*s,9*s+ly,s,'#FFAA00');
      px(ctx,lx*s,10*s+ly,s,'#FFDD44');
    });
    ctx.globalAlpha=1;
    // 火焰尾巴（更长更华丽）
    rect(ctx,7*s,-3*s,s,3*s,fl); rect(ctx,8*s,-5*s,s,4*s,'#FF6600');
    rect(ctx,9*s,-6*s,s,3*s,'#FFAA00'); rect(ctx,10*s,-7*s,s,2*s,gd);
    px(ctx,10*s,-8*s,s,'#FFFF44'); // 尾尖光点
    // 全身灵光（金色光环）
    ctx.globalAlpha=0.05+Math.sin(frame*0.04)*0.03;
    rect(ctx,-10*s,-8*s,22*s,18*s,gd);
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // ================================================================
  // 怪物绘制 — 方块像素风
  // ================================================================
  const monsterDrawers = {
    '灰毛妖鼠': (ctx, x, y, s, frame) => {
      const ol='#333333', dk='#666666', md='#888888', lt='#AAAAAA', bl='#BBBBBB';
      // 描边底层
      rect(ctx,-5*s,-3*s,11*s,7*s,ol); rect(ctx,-7*s,-6*s,6*s,6*s,ol);
      // 身体（灰色分层）
      rect(ctx,-4*s,-2*s,9*s,5*s,md); rect(ctx,-3*s,-s,7*s,3*s,lt);
      px(ctx,-2*s,0,s,bl); px(ctx,0,0,s,bl); px(ctx,2*s,0,s,bl); // 腹部
      // 毛皮纹理
      ctx.globalAlpha=0.3; px(ctx,-3*s,-2*s,s,dk); px(ctx,0,-2*s,s,dk); px(ctx,3*s,-2*s,s,dk); ctx.globalAlpha=1;
      // 头（更圆润的鼠头）
      rect(ctx,-6*s,-5*s,5*s,5*s,md); rect(ctx,-5*s,-4*s,3*s,3*s,lt);
      // 大耳朵（粉色内耳）
      rect(ctx,-6*s,-7*s,2*s,2*s,md); px(ctx,-6*s,-7*s,s,'#F8A0B0');
      rect(ctx,-3*s,-7*s,2*s,2*s,md); px(ctx,-3*s,-7*s,s,'#F8A0B0');
      // 红色恶眼
      px(ctx,-5*s,-4*s,s,'#FF0000'); px(ctx,-3*s,-4*s,s,'#FF0000');
      px(ctx,-5*s,-5*s,s,'#FF6666'); px(ctx,-3*s,-5*s,s,'#FF6666'); // 高光
      // 鼻子+嘴
      px(ctx,-4*s,-2*s,s,'#FFA0A0');
      px(ctx,-5*s,-s,s,ol); px(ctx,-3*s,-s,s,ol); // 獠牙
      // 胡须
      rect(ctx,-9*s,-4*s,3*s,s,'#999999'); rect(ctx,-9*s,-2*s,3*s,s,'#999999');
      rect(ctx,-1*s,-4*s,3*s,s,'#999999'); rect(ctx,-1*s,-2*s,3*s,s,'#999999');
      // 锯齿尾巴
      const tw=Math.sin(frame*0.08)*s;
      rect(ctx,5*s,-s,s,s,md); rect(ctx,6*s,-2*s+tw,s,s,dk); rect(ctx,7*s,-3*s,s,s,md);
      px(ctx,8*s,-4*s+tw,s,dk);
      // 腿脚
      rect(ctx,-3*s,3*s,2*s,s,dk); rect(ctx,2*s,3*s,2*s,s,dk);
      px(ctx,-3*s,4*s,s,ol); px(ctx,2*s,4*s,s,ol); // 爪
    },
    '毒蟾蜍': (ctx, x, y, s, frame) => {
      const hop = Math.abs(Math.sin(frame * 0.08)) * 2 * s;
      ctx.translate(0, -hop);
      const ol='#004400', dk='#1A6B1A', md='#228B22', lt='#44AA44', bl='#90EE90';
      // 描边
      rect(ctx,-6*s,-4*s,12*s,9*s,ol);
      // 身体（鼓胀圆润）
      rect(ctx,-5*s,-3*s,10*s,7*s,md); rect(ctx,-4*s,-2*s,8*s,5*s,lt);
      rect(ctx,-3*s,-s,6*s,3*s,bl); // 肚子
      // 疣（毒瘤纹理）
      px(ctx,-2*s,-3*s,s,dk); px(ctx,2*s,-2*s,s,dk); px(ctx,-s,s,s,dk);
      px(ctx,3*s,-s,s,dk); px(ctx,-3*s,0,s,dk);
      // 头顶隆起
      rect(ctx,-3*s,-4*s,6*s,s,md);
      // 大眼（金色凸眼）
      rect(ctx,-4*s,-6*s,3*s,3*s,md); // 左眼座
      rect(ctx,-3*s,-5*s,s,s,'#FFFF00'); px(ctx,-3*s,-6*s,s,'#111100'); // 瞳
      rect(ctx,2*s,-6*s,3*s,3*s,md);
      rect(ctx,3*s,-5*s,s,s,'#FFFF00'); px(ctx,3*s,-6*s,s,'#111100');
      // 嘴巴
      rect(ctx,-3*s,s,6*s,s,ol); px(ctx,-2*s,s,s,'#FF4466'); // 舌
      // 毒气泡
      ctx.globalAlpha=0.3+Math.sin(frame*0.1)*0.2;
      px(ctx,Math.sin(frame*0.08)*2*s,5*s,s,'#44FF44');
      px(ctx,Math.cos(frame*0.06)*3*s,6*s,s,'#88FF88');
      px(ctx,-2*s+Math.sin(frame*0.12)*s,4*s,s,'#66FF66');
      ctx.globalAlpha=1;
      // 后腿（更粗壮蹲坐）
      rect(ctx,-5*s,4*s,3*s,2*s,md); rect(ctx,3*s,4*s,3*s,2*s,md);
      px(ctx,-5*s,6*s,s,dk); px(ctx,-3*s,6*s,s,dk); // 脚趾
      px(ctx,3*s,6*s,s,dk); px(ctx,5*s,6*s,s,dk);
    },
    '赤狐妖': (ctx, x, y, s, frame) => {
      const sway = Math.sin(frame * 0.06) * s;
      const ol='#662200', dk='#993300', md='#CC4400', lt='#DD5522', hl='#FF7744';
      // 描边
      rect(ctx,-5*s,-3*s,12*s,7*s,ol); rect(ctx,-8*s,-6*s,6*s,6*s,ol);
      // 身体（狐形分层）
      rect(ctx,-4*s,-2*s,10*s,5*s,md); rect(ctx,-3*s,-s,8*s,3*s,lt);
      rect(ctx,-2*s,0,6*s,s,hl); // 腹部
      // 白色胸毛
      rect(ctx,-3*s,0,3*s,2*s,'#FFDDCC');
      // 头（更精致狐狸头）
      rect(ctx,-7*s,-5*s,5*s,5*s,lt); rect(ctx,-6*s,-4*s,3*s,3*s,hl);
      // 尖耳（内红）
      rect(ctx,-7*s,-7*s,2*s,2*s,md); px(ctx,-7*s,-7*s,s,'#FF9966');
      rect(ctx,-4*s,-7*s,2*s,2*s,md); px(ctx,-4*s,-7*s,s,'#FF9966');
      // 狐眼（金色灵眼）
      px(ctx,-6*s,-4*s,s,'#FFD700'); px(ctx,-6*s,-5*s,s,'#111100');
      px(ctx,-4*s,-4*s,s,'#FFD700'); px(ctx,-4*s,-5*s,s,'#111100');
      px(ctx,-6*s,-3*s,s,'#FFEE88'); px(ctx,-4*s,-3*s,s,'#FFEE88'); // 高光
      // 尖嘴
      px(ctx,-5*s,-2*s,s,ol); px(ctx,-5*s,-s,s,'#111111');
      // 胡须
      rect(ctx,-10*s,-4*s,3*s,s,'#FFCCAA'); rect(ctx,-10*s,-2*s,3*s,s,'#FFCCAA');
      rect(ctx,-2*s,-4*s,3*s,s,'#FFCCAA'); rect(ctx,-2*s,-2*s,3*s,s,'#FFCCAA');
      // 华丽大尾（白尖，参考图风格）
      rect(ctx,5*s,-4*s+sway,2*s,6*s,lt); rect(ctx,6*s,-5*s+sway,2*s,4*s,md);
      rect(ctx,7*s,-6*s+sway,s,3*s,hl);
      rect(ctx,7*s,-3*s+sway,s,2*s,'#FFFFFF'); rect(ctx,6*s,-s+sway,2*s,s,'#FFDDCC'); // 白尾尖
      // 灵气飘散
      ctx.globalAlpha=0.15;
      px(ctx,Math.sin(frame*0.04)*3*s,-6*s,s,'#44CCFF'); px(ctx,-Math.cos(frame*0.03)*2*s,-5*s,s,'#44CCFF');
      ctx.globalAlpha=1;
      // 脚（深色）
      rect(ctx,-3*s,3*s,2*s,s,dk); rect(ctx,2*s,3*s,2*s,s,dk);
    },
    '铁甲傀儡': (ctx, x, y, s, frame) => {
      const shake = Math.sin(frame * 0.1) * 0.5 * s; ctx.translate(shake, 0);
      const ol='#333344', dk='#555566', md='#777788', lt='#888899', hl='#AAAACC', rv='#CCCCDD';
      // 描边
      rect(ctx,-6*s,-6*s,12*s,12*s,ol);
      // 身体（金属方块，铆钉感）
      rect(ctx,-5*s,-5*s,10*s,10*s,dk); rect(ctx,-4*s,-4*s,8*s,8*s,md);
      rect(ctx,-3*s,-3*s,6*s,6*s,lt);
      // 铆钉（四角+中间）
      px(ctx,-4*s,-4*s,s,hl); px(ctx,3*s,-4*s,s,hl); px(ctx,-4*s,3*s,s,hl); px(ctx,3*s,3*s,s,hl);
      px(ctx,0,0,s,hl); // 中心铆钉
      // 金属纹理
      ctx.globalAlpha=0.2;
      for(let i=0;i<3;i++) rect(ctx,-3*s,-3*s+i*2*s,6*s,s,rv);
      ctx.globalAlpha=1;
      // 红色发光眼
      rect(ctx,-2*s,-3*s,2*s,s,'#FF0000'); rect(ctx,s,-3*s,2*s,s,'#FF0000');
      ctx.globalAlpha=0.4+Math.sin(frame*0.08)*0.3;
      px(ctx,-2*s,-4*s,s,'#FF4444'); px(ctx,s,-4*s,s,'#FF4444'); // 眼光
      ctx.globalAlpha=1;
      // 嘴（金属缝）
      rect(ctx,-2*s,0,4*s,s,ol);
      // 手臂（更粗壮机械臂）
      rect(ctx,-7*s,-3*s,2*s,7*s,dk); rect(ctx,-8*s,-2*s,s,5*s,md);
      px(ctx,-8*s,3*s,s,ol); px(ctx,-8*s,4*s,s,dk); // 机械手
      rect(ctx,5*s,-3*s,2*s,7*s,dk); rect(ctx,7*s,-2*s,s,5*s,md);
      px(ctx,7*s,3*s,s,ol); px(ctx,7*s,4*s,s,dk);
      // 腿（粗壮方块腿）
      rect(ctx,-4*s,5*s,3*s,3*s,dk); rect(ctx,-3*s,6*s,2*s,s,md);
      rect(ctx,2*s,5*s,3*s,3*s,dk); rect(ctx,2*s,6*s,2*s,s,md);
      px(ctx,-4*s,8*s,s,ol); px(ctx,4*s,8*s,s,ol); // 脚底
      // 蒸汽/能量
      ctx.globalAlpha=0.15+Math.sin(frame*0.06)*0.1;
      px(ctx,-7*s,-4*s,s,'#88AACC'); px(ctx,6*s,-4*s,s,'#88AACC');
      ctx.globalAlpha=1;
    },
    '墨蛟蛇': (ctx, x, y, s, frame) => {
      ctx.scale(-1, 1);
      const wave = Math.sin(frame * 0.05);
      const ol='#0A1A00', dk='#1A3300', md='#336600', lt='#448800', bl='#557722';
      // 描边轮廓
      rect(ctx,-7*s,-s,4*s,4*s,ol); rect(ctx,-4*s,-2*s+wave*s,4*s,4*s,ol);
      rect(ctx,-s,-s,4*s,4*s,ol); rect(ctx,2*s,-2*s+wave*s,4*s,4*s,ol);
      // S形蛇身（更粗壮）
      rect(ctx,-6*s,0,3*s,2*s,dk); px(ctx,-5*s,s,s,bl);
      rect(ctx,-3*s,-s+wave*s,3*s,2*s,md); px(ctx,-2*s,0+wave*s,s,bl);
      rect(ctx,0,0,3*s,2*s,dk); px(ctx,s,s,s,bl);
      rect(ctx,3*s,-s+wave*s,3*s,2*s,md); px(ctx,4*s,0+wave*s,s,bl);
      // 鳞纹
      ctx.globalAlpha=0.35;
      px(ctx,-4*s,-s,s,lt); px(ctx,s,-s,s,lt); px(ctx,4*s,-2*s+wave*s,s,lt);
      px(ctx,-5*s,0,s,'#558800'); px(ctx,0,-s,s,'#558800');
      ctx.globalAlpha=1;
      // 背脊鳞
      px(ctx,-4*s,-s,s,dk); px(ctx,-s,-2*s+wave*s,s,dk); px(ctx,2*s,-s,s,dk);
      // 蛇头（蛟龙雏形，更宽）
      rect(ctx,6*s,-4*s,5*s,5*s,ol); // 描边
      rect(ctx,6*s,-3*s,4*s,4*s,md);
      rect(ctx,7*s,-2*s,3*s,2*s,lt); // 面部
      rect(ctx,6*s,-s,4*s,s,bl); // 下颚
      // 金色竖瞳
      px(ctx,8*s,-3*s,s,'#FFFF00'); px(ctx,9*s,-3*s,s,'#CCAA00');
      // 角质突起（化蛟暗示）
      px(ctx,7*s,-4*s,s,'#555500'); px(ctx,9*s,-4*s,s,'#555500');
      px(ctx,8*s,-5*s,s,'#666611'); // 额角
      // 信子（红色分叉）
      const tw=Math.sin(frame*0.1)>0?s:0;
      px(ctx,10*s,-s,s,'#FF0000'); px(ctx,11*s,-2*s+tw,s,'#FF0000'); px(ctx,11*s,0-tw,s,'#FF0000');
      // 蛇尾（渐细）
      rect(ctx,-8*s,s+wave*s,2*s,s,dk); px(ctx,-9*s,s,s,'#113300'); px(ctx,-10*s,s,s,ol);
      // 化蛟灵气
      ctx.globalAlpha=0.08;
      ellipse(ctx,0,0,10*s,5*s,'#44FF88');
      ctx.globalAlpha=1;
    },
    '暴猿妖': (ctx, x, y, s, frame) => {
      const pound = Math.sin(frame * 0.12) * s;
      const ol='#332211', dk='#553311', md='#664422', lt='#885533', hl='#AA7755', bl='#997755';
      // 描边
      rect(ctx,-6*s,-5*s,12*s,11*s,ol); rect(ctx,-4*s,-9*s,8*s,6*s,ol);
      rect(ctx,-8*s,-4*s,3*s,10*s,ol); rect(ctx,5*s,-4*s,3*s,10*s,ol);
      // 身体（魁梧分层）
      rect(ctx,-5*s,-4*s,10*s,9*s,md); rect(ctx,-4*s,-3*s,8*s,7*s,lt);
      rect(ctx,-3*s,-s,6*s,4*s,hl); // 胸腹
      // 肌肉纹理
      ctx.globalAlpha=0.25;
      rect(ctx,-3*s,-3*s,2*s,2*s,dk); rect(ctx,2*s,-3*s,2*s,2*s,dk);
      px(ctx,-s,-s,s,dk); px(ctx,s,-s,s,dk);
      ctx.globalAlpha=1;
      // 头（凶猛猿头）
      rect(ctx,-3*s,-8*s,6*s,5*s,lt); rect(ctx,-2*s,-7*s,4*s,3*s,bl);
      // 眉脊（突出）
      rect(ctx,-3*s,-8*s,6*s,s,dk);
      // 凶猛红眼
      rect(ctx,-2*s,-7*s,2*s,s,dk); px(ctx,-2*s,-6*s,s,'#FF0000'); px(ctx,-s,-6*s,s,'#FF4444');
      rect(ctx,s,-7*s,2*s,s,dk); px(ctx,s,-6*s,s,'#FF0000'); px(ctx,2*s,-6*s,s,'#FF4444');
      // 鼻+嘴（张嘴咆哮）
      px(ctx,0,-5*s,s,dk);
      rect(ctx,-s,-4*s,2*s,s,ol); // 嘴
      px(ctx,-s,-4*s,s,'#FFFFFF'); px(ctx,s,-4*s,s,'#FFFFFF'); // 獠牙
      // 粗壮手臂（捶地动画）
      rect(ctx,-7*s,-3*s,2*s,8*s+pound,md); rect(ctx,-8*s,-2*s,s,6*s+pound,lt);
      rect(ctx,-8*s,5*s+pound,3*s,2*s,dk); // 拳头
      px(ctx,-9*s,6*s+pound,s,ol); px(ctx,-7*s,7*s+pound,s,ol); // 指关节
      rect(ctx,5*s,-3*s,2*s,8*s+pound,md); rect(ctx,7*s,-2*s,s,6*s+pound,lt);
      rect(ctx,5*s,5*s+pound,3*s,2*s,dk);
      px(ctx,5*s,7*s+pound,s,ol); px(ctx,7*s,6*s+pound,s,ol);
      // 腿
      rect(ctx,-4*s,5*s,3*s,2*s,dk); rect(ctx,2*s,5*s,3*s,2*s,dk);
      px(ctx,-4*s,7*s,s,ol); px(ctx,4*s,7*s,s,ol);
    },
    '冰魄蜘蛛': (ctx, x, y, s, frame) => {
      const ol='#223344', dk='#446688', md='#6688AA', lt='#88AACC', hl='#AACCDD';
      // 描边
      rect(ctx,-5*s,-4*s,10*s,8*s,ol);
      // 身体（冰蓝晶体感）
      rect(ctx,-4*s,-3*s,8*s,6*s,md); rect(ctx,-3*s,-2*s,6*s,4*s,lt);
      // 冰晶纹理
      ctx.globalAlpha=0.3;
      px(ctx,-2*s,-2*s,s,hl); px(ctx,s,-s,s,hl); px(ctx,-s,s,s,hl);
      ctx.globalAlpha=1;
      // 头（蜘蛛头）
      rect(ctx,-3*s,-7*s,5*s,4*s,ol); // 描边
      rect(ctx,-2*s,-6*s,4*s,3*s,md);
      // 多眼（5只红眼排列，参考图）
      px(ctx,-s,-5*s,s,'#FF0000'); px(ctx,0,-6*s,s,'#FF0000'); px(ctx,s,-5*s,s,'#FF0000');
      px(ctx,-s,-4*s,s,'#FF0000'); px(ctx,s,-4*s,s,'#FF0000');
      // 冰牙
      px(ctx,-s,-4*s,s,'#CCDDFF'); px(ctx,s,-4*s,s,'#CCDDFF');
      // 8只腿（分两侧各4根，波动）
      for(let i=0;i<4;i++){const lw=Math.sin(frame*0.08+i)*s;
        rect(ctx,-7*s-lw,-2*s+i*2*s,3*s,s,dk); px(ctx,-8*s-lw,-2*s+i*2*s,s,ol);
        rect(ctx,4*s+lw,-2*s+i*2*s,3*s,s,dk); px(ctx,7*s+lw,-2*s+i*2*s,s,ol);
      }
      // 冰丝（蛛丝，发光）
      ctx.globalAlpha=0.2+Math.sin(frame*0.06)*0.1;
      rect(ctx,-2*s,3*s,s,3*s,'#CCDDFF'); rect(ctx,2*s,3*s,s,3*s,'#CCDDFF');
      px(ctx,0,5*s,s,'#EEEEFF');
      ctx.globalAlpha=1;
      // 冰霜光效
      ctx.globalAlpha=0.08+Math.sin(frame*0.06)*0.05;
      rect(ctx,-6*s,-5*s,12*s,10*s,'#88CCFF');
      ctx.globalAlpha=1;
    },
    '三眼火鸦': (ctx, x, y, s, frame) => {
      const flap = Math.sin(frame*0.1)*2*s;
      const ol='#0A0A0A', dk='#1A1A1A', md='#2A2A2A', lt='#333333';
      // 描边
      rect(ctx,-4*s,-3*s,8*s,7*s,ol); rect(ctx,-9*s,-4*s+flap,6*s,3*s,ol); rect(ctx,3*s,-4*s+flap,6*s,3*s,ol);
      // 身体（漆黑）
      rect(ctx,-3*s,-2*s,6*s,5*s,dk); rect(ctx,-2*s,-s,4*s,3*s,md);
      // 翅膀（火焰渐变翼尖）
      rect(ctx,-8*s,-3*s+flap,5*s,2*s,dk); rect(ctx,-7*s,-3*s+flap,3*s,s,md);
      rect(ctx,3*s,-3*s+flap,5*s,2*s,dk); rect(ctx,4*s,-3*s+flap,3*s,s,md);
      // 翼尖火焰
      ctx.globalAlpha=0.6+Math.sin(frame*0.12)*0.3;
      px(ctx,-9*s,-3*s+flap,s,'#FF4400'); px(ctx,-10*s,-2*s+flap,s,'#FF6600');
      px(ctx,8*s,-3*s+flap,s,'#FF4400'); px(ctx,9*s,-2*s+flap,s,'#FF6600');
      ctx.globalAlpha=1;
      // 头
      rect(ctx,-2*s,-6*s,4*s,4*s,ol); rect(ctx,-s,-5*s,3*s,3*s,dk);
      // 三眼（三角排列，参考图风格）
      px(ctx,-s,-4*s,s,'#FF4400'); px(ctx,0,-5*s,s,'#FF6600'); px(ctx,s,-4*s,s,'#FF4400');
      // 第三只眼发光
      ctx.globalAlpha=0.5+Math.sin(frame*0.08)*0.3;
      px(ctx,0,-6*s,s,'#FF8800');
      ctx.globalAlpha=1;
      // 喙
      px(ctx,0,-3*s,s,'#FF8800');
      // 火焰尾（更华丽）
      rect(ctx,0,3*s,s,2*s,'#FF4400'); rect(ctx,-s,4*s,s,3*s,'#FF6600'); rect(ctx,s,4*s,s,2*s,'#FFAA00');
      px(ctx,0,6*s,s,'#FFCC00'); // 尾尖
      // 利爪
      px(ctx,-2*s,3*s,s,ol); px(ctx,-3*s,4*s,s,dk);
      px(ctx,2*s,3*s,s,ol); px(ctx,3*s,4*s,s,dk);
      // 周围火星
      ctx.globalAlpha=0.2;
      for(let i=0;i<3;i++){const a=frame*0.03+i*2,r=6*s;
        px(ctx,Math.cos(a)*r,-s+Math.sin(a)*r*0.5,s,'#FF6600');
      }
      ctx.globalAlpha=1;
    },
    '豹形雷兽': (ctx, x, y, s, frame) => {
      const dash = Math.sin(frame*0.1)*s;
      const ol='#664400', dk='#886600', md='#AA8800', lt='#DAA520', gd='#FFD700';
      // 描边
      rect(ctx,-6*s,-4*s,13*s,8*s,ol); rect(ctx,-9*s,-6*s,6*s,6*s,ol);
      // 身体（金色流线形）
      rect(ctx,-5*s,-3*s,11*s,6*s,lt); rect(ctx,-4*s,-2*s,9*s,4*s,gd);
      // 豹纹
      px(ctx,-3*s,-2*s,s,dk); px(ctx,0,-s,s,dk); px(ctx,3*s,-2*s,s,dk);
      px(ctx,-s,0,s,dk); px(ctx,2*s,0,s,dk); px(ctx,5*s,-s,s,dk);
      // 头（豹头，精致）
      rect(ctx,-8*s,-5*s,5*s,5*s,lt); rect(ctx,-7*s,-4*s,3*s,3*s,gd);
      // 豹眼（闪电黄+高光）
      px(ctx,-7*s,-4*s,s,'#FFFF00'); px(ctx,-5*s,-4*s,s,'#FFFF00');
      px(ctx,-7*s,-5*s,s,'#FFFFFF'); px(ctx,-5*s,-5*s,s,'#FFFFFF');
      // 豹嘴（利齿）
      px(ctx,-7*s,-s,s,'#FFFFFF'); px(ctx,-5*s,-s,s,'#FFFFFF'); // 牙
      px(ctx,-6*s,0,s,ol); // 嘴
      // 闪电纹（遍布身体）
      ctx.globalAlpha=0.4+Math.sin(frame*0.12)*0.3;
      px(ctx,-2*s,-3*s,s,'#FFFF44'); px(ctx,2*s,-3*s,s,'#FFFF44');
      px(ctx,0,-2*s,s,'#FFFF88'); px(ctx,4*s,-3*s,s,'#FFFF44');
      ctx.globalAlpha=1;
      // 闪电尾
      rect(ctx,6*s,-3*s+dash,s,3*s,lt); rect(ctx,7*s,-4*s+dash,s,2*s,gd);
      ctx.globalAlpha=0.5+Math.sin(frame*0.15)*0.4;
      px(ctx,8*s,-5*s+dash,s,'#FFFF00'); px(ctx,7*s,-5*s+dash,s,'#FFFF88');
      ctx.globalAlpha=1;
      // 四肢（速度线）
      rect(ctx,-4*s,3*s,2*s,s,dk); rect(ctx,-s,3*s,2*s,s,dk);
      rect(ctx,2*s,3*s,2*s,s,dk); rect(ctx,5*s,3*s,2*s,s,dk);
      // 电弧粒子
      ctx.globalAlpha=0.2+Math.sin(frame*0.1)*0.15;
      for(let i=0;i<3;i++){const a=frame*0.08+i*2.1,r=5*s;
        px(ctx,Math.cos(a)*r,-s+Math.sin(a)*r*0.5,s,'#FFFF44');
      }
      ctx.globalAlpha=1;
    },
    '鬼影修士': (ctx, x, y, s, frame) => {
      const float = Math.sin(frame*0.04)*2*s; ctx.translate(0, float);
      const ol='#0A0A1A', dk='#111122', md='#1A1A2E', lt='#22223A', hl='#2A2A44';
      // 身体（飘浮袍子，描边）
      rect(ctx,-6*s,-5*s,12*s,14*s,ol);
      rect(ctx,-5*s,-4*s,10*s,12*s,md); rect(ctx,-4*s,-3*s,8*s,10*s,lt);
      // 袍子纹理（暗色花纹）
      ctx.globalAlpha=0.2;
      px(ctx,-3*s,-2*s,s,hl); px(ctx,0,-s,s,hl); px(ctx,2*s,-2*s,s,hl);
      px(ctx,-s,2*s,s,hl); px(ctx,s,3*s,s,hl);
      ctx.globalAlpha=1;
      // 头（兜帽+骷髅脸）
      rect(ctx,-5*s,-9*s,9*s,6*s,ol);
      rect(ctx,-4*s,-8*s,8*s,5*s,md); rect(ctx,-3*s,-7*s,6*s,3*s,dk);
      // 发光绿色鬼眼
      ctx.globalAlpha=0.7+Math.sin(frame*0.08)*0.3;
      px(ctx,-2*s,-6*s,s,'#44FF88'); px(ctx,s,-6*s,s,'#44FF88');
      px(ctx,-2*s,-7*s,s,'#22CC66'); px(ctx,s,-7*s,s,'#22CC66'); // 眼光扩散
      ctx.globalAlpha=1;
      // 骨手
      const hw=Math.sin(frame*0.05)>0?s:0;
      rect(ctx,-6*s,-2*s,s,6*s+hw,md); rect(ctx,5*s,-2*s,s,6*s+hw,md);
      px(ctx,-7*s,4*s+hw,s,dk); px(ctx,-6*s,5*s+hw,s,dk); // 爪指
      px(ctx,5*s,4*s+hw,s,dk); px(ctx,6*s,5*s+hw,s,dk);
      // 袍子底部（飘散碎片）
      rect(ctx,-5*s,8*s,2*s,2*s+hw,md); rect(ctx,4*s,8*s,2*s,2*s+hw,md);
      px(ctx,-3*s,9*s,s,dk); px(ctx,2*s,9*s,s,dk);
      // 绿色鬼火粒子
      ctx.globalAlpha=0.2+Math.sin(frame*0.1)*0.15;
      px(ctx,-6*s,-2*s,s,'#44FF88'); px(ctx,5*s,-3*s,s,'#44FF88');
      px(ctx,-4*s,-s,s,'#22CC66'); px(ctx,3*s,0,s,'#22CC66');
      for(let i=0;i<3;i++){const a=frame*0.02+i*2.1,r=7*s;
        px(ctx,Math.cos(a)*r,-2*s+Math.sin(a)*r*0.5,s,'#44FF88');
      }
      ctx.globalAlpha=1;
    },
  };

  const monsterDrawersExtra = {
    '天魔老祖': (ctx, x, y, s, frame) => {
      const ol='#110011', dk='#220022', md='#330033', lt='#440044', hl='#660066';
      // 暗紫色光环
      ctx.globalAlpha=0.1+Math.sin(frame*0.03)*0.06;
      rect(ctx,-9*s,-7*s,18*s,16*s,'#FF0066');
      ctx.globalAlpha=1;
      // 描边
      rect(ctx,-7*s,-6*s,14*s,15*s,ol);
      // 身体（魁梧暗紫袍）
      rect(ctx,-6*s,-5*s,12*s,13*s,dk); rect(ctx,-5*s,-4*s,10*s,11*s,md); rect(ctx,-5*s,-3*s,10*s,7*s,lt);
      // 袍纹（红色符文）
      ctx.globalAlpha=0.3;
      px(ctx,-3*s,-2*s,s,'#FF0044'); px(ctx,0,-s,s,'#FF0044'); px(ctx,2*s,-3*s,s,'#FF0044');
      px(ctx,-s,s,s,'#FF0044'); px(ctx,s,2*s,s,'#FF0044');
      ctx.globalAlpha=1;
      // 头
      rect(ctx,-4*s,-10*s,7*s,6*s,ol);
      rect(ctx,-3*s,-9*s,6*s,5*s,md);
      // 双角（猩红巨角）
      rect(ctx,-5*s,-13*s,2*s,4*s,'#CC0033'); rect(ctx,-6*s,-14*s,s,2*s,'#FF0044');
      px(ctx,-6*s,-15*s,s,'#FF4466');
      rect(ctx,3*s,-13*s,2*s,4*s,'#CC0033'); rect(ctx,5*s,-14*s,s,2*s,'#FF0044');
      px(ctx,5*s,-15*s,s,'#FF4466');
      // 恶眼
      rect(ctx,-2*s,-8*s,2*s,s,'#FF0000'); rect(ctx,s,-8*s,2*s,s,'#FF0000');
      px(ctx,-2*s,-9*s,s,'#FF4444'); px(ctx,s,-9*s,s,'#FF4444'); // 眼光
      // 嘴（邪笑）
      rect(ctx,-s,-6*s,3*s,s,ol);
      // 肩甲
      rect(ctx,-7*s,-5*s,3*s,3*s,hl); rect(ctx,5*s,-5*s,3*s,3*s,hl);
      px(ctx,-7*s,-5*s,s,'#880088'); px(ctx,6*s,-5*s,s,'#880088');
      // 手（暗能量手）
      rect(ctx,-8*s,-3*s,s,8*s,dk); rect(ctx,7*s,-3*s,s,8*s,dk);
      // 腿
      rect(ctx,-5*s,8*s,4*s,2*s,dk); rect(ctx,2*s,8*s,4*s,2*s,dk);
      // 暗能量粒子
      ctx.globalAlpha=0.2+Math.sin(frame*0.04)*0.15;
      for(let i=0;i<5;i++){const a=frame*0.015+i*1.257,r=(5+i)*s;
        px(ctx,Math.cos(a)*r,-s+Math.sin(a)*r*0.5,s,'#FF0066');
      }
      ctx.globalAlpha=1;
    },
    '九尾天狐': (ctx, x, y, s, frame) => {
      const ol='#886600', dk='#AA8833', md='#CCAA55', lt='#FFCC66', hl='#FFE088', wh='#FFEE99';
      // 金色光环
      ctx.globalAlpha=0.06+Math.sin(frame*0.04)*0.03;
      rect(ctx,-8*s,-6*s,22*s,12*s,'#FFDDAA');
      ctx.globalAlpha=1;
      // 描边
      rect(ctx,-6*s,-4*s,12*s,8*s,ol); rect(ctx,-9*s,-7*s,6*s,6*s,ol);
      // 身体（金色优雅）
      rect(ctx,-5*s,-3*s,10*s,6*s,lt); rect(ctx,-4*s,-2*s,8*s,4*s,hl);
      rect(ctx,-3*s,-s,6*s,2*s,wh); // 腹部
      // 头（精致狐头）
      rect(ctx,-8*s,-6*s,5*s,5*s,lt); rect(ctx,-7*s,-5*s,3*s,3*s,hl);
      // 三角耳（金色内粉）
      rect(ctx,-8*s,-8*s,2*s,2*s,md); px(ctx,-8*s,-8*s,s,'#FF99AA');
      rect(ctx,-5*s,-8*s,2*s,2*s,md); px(ctx,-5*s,-8*s,s,'#FF99AA');
      // 眼（深邃金瞳）
      rect(ctx,-7*s,-5*s,2*s,s,'#FF66AA'); px(ctx,-7*s,-5*s,s,ol);
      px(ctx,-7*s,-6*s,s,wh); // 高光
      // 九尾！（每尾不同颜色，参考图彩虹尾）
      const tailColors=['#FFCC66','#FFFFFF','#FF66AA','#66CCFF','#66FF88','#FFAA00','#FF4466','#AA88FF','#44FFCC'];
      for(let i=0;i<9;i++){
        const ty=-4*s+(i%3)*3*s, tx=5*s+Math.floor(i/3)*2*s;
        const tw=Math.sin(frame*0.05+i*0.5)*s;
        rect(ctx,tx,ty+tw,s,2*s,tailColors[i]);
        px(ctx,tx,ty+tw+2*s,s,tailColors[i]); // 尾尖发光
      }
      // 尾巴发光效果
      ctx.globalAlpha=0.15;
      for(let i=0;i<9;i++){
        const ty=-4*s+(i%3)*3*s, tx=5*s+Math.floor(i/3)*2*s;
        const tw=Math.sin(frame*0.05+i*0.5)*s;
        px(ctx,tx+s,ty+tw+s,s,tailColors[i]);
      }
      ctx.globalAlpha=1;
      // 脚
      rect(ctx,-4*s,3*s,2*s,s,dk); rect(ctx,2*s,3*s,2*s,s,dk);
    },
    '劫雷真龙': (ctx, x, y, s, frame) => {
      ctx.scale(-1, 1);
      const bob=Math.sin(frame*0.03)*2*s; ctx.translate(0,bob);
      const ol='#112266', bd='#2244AA', sc='#3366CC', bl='#88BBFF', gd='#FFD700';
      // 雷电光环
      ctx.globalAlpha=0.08+Math.sin(frame*0.05)*0.04;
      ellipse(ctx,0,-s,16*s,10*s,'#FFFF44');
      ctx.globalAlpha=1;
      // 描边
      rect(ctx,-8*s,-s,4*s,6*s,ol); rect(ctx,-5*s,-3*s,5*s,6*s,ol);
      rect(ctx,-s,-4*s,5*s,6*s,ol); rect(ctx,3*s,-5*s,4*s,5*s,ol);
      // 龙身（蓝色S形蜿蜒，更粗壮）
      rect(ctx,-7*s,0,3*s,4*s,bd); rect(ctx,-7*s,s,3*s,2*s,sc); px(ctx,-6*s,2*s,s,bl);
      rect(ctx,-4*s,-2*s,4*s,4*s,bd); rect(ctx,-3*s,-s,2*s,2*s,bl);
      rect(ctx,0,-3*s,4*s,4*s,bd); rect(ctx,s,-2*s,2*s,2*s,bl);
      rect(ctx,4*s,-4*s,3*s,3*s,bd); rect(ctx,4*s,-3*s,3*s,s,bl);
      // 闪电鳞纹
      ctx.globalAlpha=0.4;
      px(ctx,-6*s,-s,s,gd); px(ctx,-2*s,-3*s,s,gd); px(ctx,2*s,-4*s,s,gd); px(ctx,5*s,-5*s,s,gd);
      ctx.globalAlpha=1;
      // 龙爪（雷电利爪）
      px(ctx,-5*s,4*s,s,bl); px(ctx,-4*s,5*s,s,bd);
      px(ctx,2*s,s,s,bl); px(ctx,3*s,2*s,s,bd);
      // 龙头（威严大头）
      rect(ctx,7*s,-8*s,6*s,6*s,ol); // 描边
      rect(ctx,7*s,-7*s,5*s,5*s,sc); rect(ctx,7*s,-6*s,5*s,3*s,bd);
      rect(ctx,7*s,-4*s,5*s,2*s,bl);
      rect(ctx,7*s,-8*s,5*s,s,bd);
      // 龙眼（金色雷光）
      px(ctx,10*s,-7*s,s,gd); px(ctx,11*s,-6*s,s,'#FFFFAA');
      // 鹿角（雷龙电角，更华丽）
      rect(ctx,8*s,-9*s,s,s,gd); rect(ctx,7*s,-10*s,s,s,gd); rect(ctx,6*s,-11*s,s,s,'#FFFFAA');
      px(ctx,8*s,-10*s,s,'#FFFFCC');
      rect(ctx,11*s,-9*s,s,s,gd); rect(ctx,12*s,-10*s,s,s,gd);
      px(ctx,11*s,-10*s,s,'#FFFFCC');
      // 龙须
      const wh=Math.sin(frame*0.07)*s;
      px(ctx,12*s,-5*s,s,'#88CCFF'); px(ctx,13*s,-4*s+wh,s,'#AADDFF');
      px(ctx,12*s,-3*s,s,'#88CCFF'); px(ctx,13*s,-2*s-wh,s,'#AADDFF');
      // 龙牙+龙口
      px(ctx,12*s,-4*s,s,'#FFFFFF'); px(ctx,12*s,-3*s,s,'#FFFFFF');
      // 尾巴（闪电尾分叉）
      rect(ctx,-9*s,s,2*s,2*s,bd); rect(ctx,-11*s,2*s,2*s,s,bd);
      px(ctx,-12*s,s,s,sc); px(ctx,-12*s,3*s,s,sc);
      // 雷电特效（环绕龙身）
      ctx.globalAlpha=0.3+Math.sin(frame*0.1)*0.2;
      for(let i=0;i<5;i++){const a=frame*0.08+i*1.257,r=(4+i)*s;
        px(ctx,Math.cos(a)*r,-s+Math.sin(a)*r*0.5,s,'#FFFF44');
      }
      // 闪电链
      px(ctx,-3*s,-4*s,s,'#FFFF88'); px(ctx,4*s,-5*s,s,'#FFFF88');
      px(ctx,-s,2*s,s,'#FFFF88'); px(ctx,6*s,-2*s,s,'#FFFF88');
      ctx.globalAlpha=1;
    },
    '血魔宗主': (ctx, x, y, s, frame) => {
      const pulse=Math.sin(frame*0.04);
      const ol='#220000', dk='#440000', md='#660000', lt='#880000', hl='#AA0000', cr='#CC0000';
      // 血色光环
      ctx.globalAlpha=0.12+pulse*0.08;
      rect(ctx,-9*s,-7*s,18*s,16*s,'#FF0000');
      ctx.globalAlpha=1;
      // 描边
      rect(ctx,-7*s,-6*s,14*s,15*s,ol);
      // 身体（血红暗袍）
      rect(ctx,-6*s,-5*s,12*s,13*s,dk); rect(ctx,-5*s,-4*s,10*s,11*s,md); rect(ctx,-4*s,-3*s,8*s,7*s,lt);
      // 袍纹（血脉纹）
      ctx.globalAlpha=0.25;
      for(let i=0;i<4;i++) px(ctx,-2*s+i*2*s,-2*s+i*s,s,cr);
      ctx.globalAlpha=1;
      // 头
      rect(ctx,-4*s,-10*s,7*s,6*s,ol);
      rect(ctx,-3*s,-9*s,6*s,5*s,md); rect(ctx,-2*s,-8*s,4*s,3*s,lt);
      // 金色恶眼
      px(ctx,-s,-7*s,s,'#FFFF00'); px(ctx,s,-7*s,s,'#FFFF00');
      px(ctx,-s,-8*s,s,'#FFAA00'); px(ctx,s,-8*s,s,'#FFAA00');
      // 肩甲（血色）
      rect(ctx,-7*s,-4*s,2*s,3*s,hl); rect(ctx,5*s,-4*s,2*s,3*s,hl);
      px(ctx,-7*s,-4*s,s,cr); px(ctx,6*s,-4*s,s,cr);
      // 手臂（持骷髅杖暗示）
      rect(ctx,-7*s,-4*s,2*s,12*s,dk); rect(ctx,5*s,-4*s,2*s,12*s,dk);
      // 浮空血球（参考图特色）
      ctx.globalAlpha=0.5+pulse*0.3;
      circle(ctx,-6*s,-7*s,1.5*s,'#FF0000'); px(ctx,-6*s,-7*s,s,'#FF4444');
      circle(ctx,6*s,-6*s,1.5*s,'#FF0000'); px(ctx,6*s,-6*s,s,'#FF4444');
      circle(ctx,-4*s,4*s,s,'#CC0000'); circle(ctx,4*s,5*s,s,'#CC0000');
      ctx.globalAlpha=1;
      // 腿
      rect(ctx,-5*s,8*s,4*s,2*s,dk); rect(ctx,2*s,8*s,4*s,2*s,dk);
    },
    '血衣魔修': (ctx, x, y, s, frame) => {
      const float=Math.sin(frame*0.05)*s; ctx.translate(0,float);
      const ol='#330000', dk='#550000', md='#8B0000', lt='#AA2222', hl='#CC3333';
      // 血雾光效
      ctx.globalAlpha=0.08+Math.sin(frame*0.06)*0.05;
      ellipse(ctx,0,0,10*s,8*s,'#FF0000');
      ctx.globalAlpha=1;
      // 描边
      rect(ctx,-6*s,-5*s,12*s,13*s,ol);
      // 身体（血红破袍）
      rect(ctx,-5*s,-4*s,10*s,11*s,md); rect(ctx,-4*s,-3*s,8*s,9*s,lt);
      rect(ctx,-3*s,-2*s,6*s,5*s,hl);
      // 袍子破损纹理
      ctx.globalAlpha=0.3;
      px(ctx,-4*s,4*s,s,ol); px(ctx,-3*s,5*s,s,ol); px(ctx,3*s,4*s,s,ol); px(ctx,2*s,6*s,s,ol);
      ctx.globalAlpha=1;
      // 头（苍白鬼脸+长发）
      rect(ctx,-4*s,-9*s,7*s,6*s,ol);
      rect(ctx,-3*s,-8*s,6*s,5*s,'#776666'); // 苍白皮肤
      // 长发（披散）
      rect(ctx,-4*s,-10*s,2*s,6*s,ol); rect(ctx,3*s,-10*s,2*s,6*s,ol);
      px(ctx,-5*s,-8*s,s,ol); px(ctx,4*s,-8*s,s,ol);
      // 血红眼
      px(ctx,-s,-6*s,s,'#FF0000'); px(ctx,s,-6*s,s,'#FF0000');
      ctx.globalAlpha=0.4+Math.sin(frame*0.08)*0.3;
      px(ctx,-s,-7*s,s,'#FF4444'); px(ctx,s,-7*s,s,'#FF4444'); // 眼光
      ctx.globalAlpha=1;
      // 嘴（邪笑）
      rect(ctx,-s,-5*s,2*s,s,ol);
      // 飘散血滴
      ctx.globalAlpha=0.3;
      for(let i=0;i<4;i++){
        px(ctx,-2*s+i*2*s,7*s+Math.sin(frame*0.06+i)*s,s,'#FF0000');
      }
      ctx.globalAlpha=1;
      // 袍子底部飘散
      rect(ctx,-4*s,7*s,2*s,2*s,md); rect(ctx,3*s,7*s,2*s,2*s,md);
      px(ctx,-3*s,8*s,s,dk); px(ctx,2*s,8*s,s,dk);
    },
    '化龙妖蛟': (ctx, x, y, s, frame) => {
      ctx.scale(-1, 1);
      const wave=Math.sin(frame*0.04)*s;
      const ol='#0A3322', bd='#1A6644', sc='#228866', lt='#33AA77', bl='#88DDAA';
      // 化龙灵气
      ctx.globalAlpha=0.08;
      ellipse(ctx,0,-s,12*s,6*s,'#44FFAA');
      ctx.globalAlpha=1;
      // 描边轮廓
      rect(ctx,-7*s,-s,4*s,5*s,ol); rect(ctx,-4*s,-2*s+wave,4*s,5*s,ol);
      rect(ctx,-s,-3*s,4*s,5*s,ol); rect(ctx,2*s,-4*s+wave,4*s,4*s,ol);
      // 蛇形身段（S形，半龙半蛇）
      rect(ctx,-6*s,0,3*s,3*s,bd); px(ctx,-5*s,s,s,bl);
      rect(ctx,-3*s,-s+wave,3*s,3*s,sc); px(ctx,-2*s,0+wave,s,bl);
      rect(ctx,0,-2*s,3*s,3*s,bd); px(ctx,s,-s,s,bl);
      rect(ctx,3*s,-3*s+wave,3*s,2*s,sc); px(ctx,4*s,-2*s+wave,s,bl);
      // 鳞片纹理
      ctx.globalAlpha=0.35;
      px(ctx,-5*s,-s,s,lt); px(ctx,-s,-2*s+wave,s,lt); px(ctx,2*s,-3*s,s,lt); px(ctx,5*s,-4*s+wave,s,lt);
      ctx.globalAlpha=1;
      // 背脊鳞（渐变化龙）
      px(ctx,-4*s,-s,s,ol); px(ctx,-s,-2*s+wave,s,ol); px(ctx,2*s,-3*s,s,ol);
      // 初生龙爪（一对小爪）
      px(ctx,-4*s,3*s,s,bd); px(ctx,-3*s,4*s,s,ol);
      px(ctx,1*s,s,s,bd); px(ctx,2*s,2*s,s,ol);
      // 龙头（尖锐，蛟头）
      rect(ctx,6*s,-6*s,5*s,5*s,ol); // 描边
      rect(ctx,6*s,-5*s,4*s,4*s,sc);
      rect(ctx,7*s,-4*s,3*s,2*s,lt);
      rect(ctx,6*s,-3*s,4*s,s,bl); // 下颚
      rect(ctx,6*s,-6*s,4*s,s,bd); // 额板
      // 龙眼（金色）
      px(ctx,8*s,-5*s,s,'#FFFF00'); px(ctx,9*s,-5*s,s,'#CCAA00');
      // 初生鹿角（短，化龙中）
      px(ctx,7*s,-7*s,s,'#DAA520'); px(ctx,9*s,-7*s,s,'#DAA520');
      px(ctx,7*s,-8*s,s,'#B8860B'); px(ctx,9*s,-8*s,s,'#B8860B');
      // 龙须
      const wh=Math.sin(frame*0.06)*s;
      px(ctx,10*s,-4*s,s,bl); px(ctx,11*s,-3*s+wh,s,bl);
      px(ctx,10*s,-3*s,s,bl); px(ctx,11*s,-2*s-wh,s,bl);
      // 龙牙
      px(ctx,10*s,-3*s,s,'#EEFFEE');
      // 尾巴（蛇尾渐细）
      rect(ctx,-8*s,s+wave,2*s,s,bd); px(ctx,-9*s,2*s+wave,s,ol); px(ctx,-10*s,2*s+wave,s,ol);
    },
    '混沌古兽': (ctx, x, y, s, frame) => {
      const pulse=Math.sin(frame*0.03);
      const ol='#0A0020', dk='#1A0A2E', md='#2A1A3E', lt='#3A2A4E', hl='#4A3A5E';
      // 虚空光环
      ctx.globalAlpha=0.08+pulse*0.04;
      rect(ctx,-9*s,-7*s,18*s,16*s,'#8800FF');
      ctx.globalAlpha=1;
      // 描边
      rect(ctx,-8*s,-6*s,16*s,14*s,ol);
      // 身体（混沌不定形）
      rect(ctx,-7*s,-5*s,14*s,12*s,dk); rect(ctx,-6*s,-4*s,12*s,10*s,md); rect(ctx,-5*s,-3*s,10*s,8*s,lt);
      // 混沌纹理
      ctx.globalAlpha=0.35;
      for(let i=0;i<5;i++) px(ctx,-4*s+i*3*s,-3*s+(i%2)*2*s,s,'#AA00FF');
      for(let i=0;i<3;i++) px(ctx,-3*s+i*3*s,-s+i*s,s,'#7700CC');
      ctx.globalAlpha=1;
      // 多只紫色邪眼（参考图特色，多眼排列）
      ctx.globalAlpha=0.6+pulse*0.3;
      px(ctx,-3*s,-3*s,s,'#FF00FF'); px(ctx,0,-4*s,s,'#FF00FF'); px(ctx,2*s,-3*s,s,'#FF00FF');
      px(ctx,-s,-2*s,s,'#FF00FF'); px(ctx,s,-s,s,'#FF00FF');
      px(ctx,-2*s,0,s,'#CC00CC'); px(ctx,3*s,-2*s,s,'#CC00CC');
      // 眼光
      for(let i=0;i<5;i++){
        const ex=[-3,-1,0,2,1][i]*s, ey=[-3,-2,-4,-3,-s/s][i]*s;
        px(ctx,ex+s,ey,s,'#FF88FF');
      }
      ctx.globalAlpha=1;
      // 触手/肢体（不定形触须）
      for(let i=0;i<4;i++){const tw=Math.sin(frame*0.06+i)*s;
        rect(ctx,-5*s+i*3*s,7*s,s,3*s+tw,md); px(ctx,-5*s+i*3*s,10*s+tw,s,ol);
      }
      // 上方触手
      for(let i=0;i<3;i++){const tw=Math.sin(frame*0.05+i)*s;
        rect(ctx,-3*s+i*3*s,-6*s,s,2*s-tw,md); px(ctx,-3*s+i*3*s,-7*s-tw,s,ol);
      }
      // 虚空粒子
      ctx.globalAlpha=0.15+pulse*0.1;
      for(let i=0;i<6;i++){const a=frame*0.012+i*1.047,r=(5+i)*s;
        px(ctx,Math.cos(a)*r,-s+Math.sin(a)*r*0.6,s,i%2===0?'#AA00FF':'#FF00FF');
      }
      ctx.globalAlpha=1;
    },
    '天道魔神': (ctx, x, y, s, frame) => {
      const pulse=Math.sin(frame*0.025);
      const ol='#050510', dk='#0A0A1A', md='#1A1A2E', lt='#2A2A3E', hl='#3A3A4E';
      // 宇宙虚空光环
      ctx.globalAlpha=0.08+pulse*0.04;
      rect(ctx,-12*s,-10*s,24*s,24*s,'#FF0088');
      ctx.globalAlpha=1;
      // 描边
      rect(ctx,-9*s,-8*s,18*s,19*s,ol);
      // 巨大身体（最终Boss，更魁梧）
      rect(ctx,-8*s,-7*s,16*s,17*s,dk); rect(ctx,-7*s,-6*s,14*s,15*s,md); rect(ctx,-6*s,-5*s,12*s,11*s,lt);
      // 暗纹
      ctx.globalAlpha=0.2;
      for(let i=0;i<4;i++) for(let j=0;j<3;j++) px(ctx,-4*s+i*3*s,-4*s+j*3*s,s,hl);
      ctx.globalAlpha=1;
      // 头
      rect(ctx,-5*s,-12*s,9*s,6*s,ol);
      rect(ctx,-4*s,-11*s,8*s,5*s,md);
      // 四只猩红角（参考图特色）
      rect(ctx,-6*s,-16*s,2*s,5*s,'#FF0044'); rect(ctx,-2*s,-15*s,2*s,4*s,'#FF0044');
      rect(ctx,s,-15*s,2*s,4*s,'#FF0044'); rect(ctx,4*s,-16*s,2*s,5*s,'#FF0044');
      px(ctx,-6*s,-17*s,s,'#FF4466'); px(ctx,5*s,-17*s,s,'#FF4466'); // 角尖发光
      // 三眼（红-金-红，参考图特色）
      px(ctx,-2*s,-10*s,s,'#FF0000'); px(ctx,0,-11*s,s,'#FFD700'); px(ctx,2*s,-10*s,s,'#FF0000');
      ctx.globalAlpha=0.4+pulse*0.3;
      px(ctx,-2*s,-11*s,s,'#FF4444'); px(ctx,0,-12*s,s,'#FFFF44'); px(ctx,2*s,-11*s,s,'#FF4444');
      ctx.globalAlpha=1;
      // 巨翅（展开暗翼）
      rect(ctx,-12*s,-5*s,4*s,9*s,dk); rect(ctx,-13*s,-3*s,s,6*s,ol);
      rect(ctx,8*s,-5*s,4*s,9*s,dk); rect(ctx,12*s,-3*s,s,6*s,ol);
      // 翼纹
      ctx.globalAlpha=0.15;
      px(ctx,-11*s,-3*s,s,'#FF0088'); px(ctx,-10*s,-s,s,'#FF0088');
      px(ctx,9*s,-3*s,s,'#FF0088'); px(ctx,10*s,-s,s,'#FF0088');
      ctx.globalAlpha=1;
      // 手臂
      rect(ctx,-8*s,-4*s,s,10*s,md); rect(ctx,7*s,-4*s,s,10*s,md);
      // 腿
      rect(ctx,-6*s,10*s,4*s,3*s,dk); rect(ctx,3*s,10*s,4*s,3*s,dk);
      // 环绕宇宙粒子
      ctx.globalAlpha=0.25+pulse*0.15;
      for(let i=0;i<8;i++){const a=frame*0.01+i*0.785,r=(4+i%3)*s;
        px(ctx,Math.cos(a)*r,-2*s+Math.sin(a)*r,s,i%3===0?'#FF0088':i%3===1?'#FF4444':'#FFAA00');
      }
      ctx.globalAlpha=1;
    },
  };
  Object.assign(monsterDrawers, monsterDrawersExtra);

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

  function drawMonsterByName(ctx, name, x, y, s, frame, hitAnim) {
    const drawer = monsterDrawers[name];
    if(!drawer){
      ctx.save(); ctx.translate(x,y);
      const shake = hitAnim>0 ? Math.sin(hitAnim*2)*3*s : 0; ctx.translate(shake,0);
      rect(ctx,-5*s,-5*s,10*s,10*s,'#FF4488');
      rect(ctx,-2*s,-3*s,2*s,2*s,'#FFF'); rect(ctx,2*s,-3*s,2*s,2*s,'#FFF');
      ctx.restore(); return;
    }
    ctx.save(); ctx.translate(x,y);
    const shake = hitAnim>0 ? Math.sin(hitAnim*2)*3*s : 0;
    const alpha = hitAnim>0 ? 0.6+0.4*(1-hitAnim/10) : 1;
    ctx.translate(shake,0); ctx.globalAlpha=alpha;
    drawer(ctx,x,y,s,frame);
    if(hitAnim>5){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=(hitAnim-5)/10; drawer(ctx,x,y,s,frame); ctx.globalCompositeOperation='source-over'; }
    ctx.globalAlpha=1; ctx.restore();
  }

  function drawMonsterHPBar(ctx, x, y, s, hpPercent, name) {
    const barW=60, barH=6;
    rect(ctx, x-barW/2, y, barW, barH, '#333');
    const color = hpPercent>0.5 ? '#44AA44' : hpPercent>0.2 ? '#DDAA44' : '#DD4444';
    const fillW = barW*Math.max(0,hpPercent);
    if(fillW>0) rect(ctx, x-barW/2, y, fillW, barH, color);
    ctx.strokeStyle='#666'; ctx.lineWidth=1; ctx.strokeRect(x-barW/2, y, barW, barH);
    ctx.font='12px "Microsoft YaHei",sans-serif'; ctx.fillStyle='#FFF'; ctx.textAlign='center'; ctx.fillText(name, x, y-4);
  }

  return {
    drawMouseByRealm, drawMonsterByName, drawMonsterHPBar, drawActiveBeast,
    drawMountCrane, drawMountQilin, drawWeaponWithSkin, drawArmorSkinOverlay,
    armorSkinColors, rect, px, circle, ellipse, roundRect,
  };
})();

if (typeof module !== 'undefined') module.exports = Sprites;