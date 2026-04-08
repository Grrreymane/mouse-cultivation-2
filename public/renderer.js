// ============================================================
// renderer.js — 鼠鼠修仙2 Canvas 渲染系统
// 场景绘制 / 动画系统 / 粒子特效 / 伤害数字 / 战斗渲染
// ============================================================

const Renderer = (() => {
  'use strict';

  // ========== 状态变量 ==========
  let canvas, ctx;
  let animFrame = 0;
  let particles = [], damageTexts = [], combatTexts = [];
  let mouseAttackAnim = 0, monsterHitAnim = 0, monsterDeathAnim = 0, monsterWalkIn = 0;
  let beastAttackAnim = 0;
  let skillEffects = [];
  let envParticles = [];
  let beastProjectiles = [];
  let dayNightPhase = 0;

  const PIXEL_SCALE = 3;
  const DAY_CYCLE_SPEED = 0.0003;

  // ========== 初始化 ==========
  function init(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
  }

  function getPixelScale() { return PIXEL_SCALE; }
  function getAnimFrame() { return animFrame; }
  function getCanvas() { return canvas; }
  function getCtx() { return ctx; }

  // ========== 背景绘制 ==========
  function drawBackground() {
    const w = canvas.width, h = canvas.height;
    const gs = GameEngine.getState();
    const ri = gs ? gs.realmIndex : 0;

    // === 日夜循环 ===
    dayNightPhase = (dayNightPhase + DAY_CYCLE_SPEED) % 1;
    const dayBrightness = Math.max(0, Math.sin(dayNightPhase * Math.PI * 2 - Math.PI/2)) * 0.5 + 0.5;
    const isNight = dayNightPhase < 0.2 || dayNightPhase > 0.85;
    const isDusk = dayNightPhase > 0.7 && dayNightPhase < 0.85;
    const isDawn = dayNightPhase > 0.2 && dayNightPhase < 0.35;

    // 境界背景色方案
    const bgThemes = [
      { sky: ['#0a0a2e','#1a1a4e','#1a2a3a','#0d1a0d'], ground: '#1a2a1a', grass: '#223322', hill: '#0d1a2a' },
      { sky: ['#0a1a2e','#1a2a5e','#2a3a4a','#1a2a1a'], ground: '#1a2a20', grass: '#2a3a2a', hill: '#0d1a3a' },
      { sky: ['#0a2a1e','#1a3a3e','#1a3a3a','#0d2a0d'], ground: '#1a3a1a', grass: '#2a4a2a', hill: '#0d2a2a' },
      { sky: ['#0a0a3e','#1a1a6e','#2a2a5a','#0d0d3a'], ground: '#1a1a3a', grass: '#2a2a4a', hill: '#0d0d4a' },
      { sky: ['#1a0a2e','#2a1a4e','#3a1a3a','#1a0d2a'], ground: '#2a1a2a', grass: '#3a2a3a', hill: '#1a0d3a' },
      { sky: ['#1a0a0a','#3a1a1a','#2a1a2a','#1a0d0d'], ground: '#2a1a1a', grass: '#3a2a2a', hill: '#1a0d1a' },
    ];
    const theme = bgThemes[ri] || bgThemes[0];

    // 天空渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.sky[0]); grad.addColorStop(0.5, theme.sky[1]);
    grad.addColorStop(0.8, theme.sky[2]); grad.addColorStop(1, theme.sky[3]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

    // 日夜叠加色
    if (isDusk || isDawn) {
      ctx.globalAlpha = 0.15;
      const duskGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      duskGrad.addColorStop(0, isDawn ? '#FF8844' : '#FF4422');
      duskGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = duskGrad; ctx.fillRect(0, 0, w, h * 0.6);
      ctx.globalAlpha = 1;
    }
    if (isNight) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#000022'; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // 太阳/月亮
    const celestialAngle = dayNightPhase * Math.PI * 2;
    const sunX = w * 0.5 + Math.cos(celestialAngle - Math.PI/2) * w * 0.35;
    const sunY = h * 0.35 - Math.sin(celestialAngle - Math.PI/2) * h * 0.3;
    if (!isNight && sunY < h * 0.65) {
      ctx.globalAlpha = 0.2 * dayBrightness;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(sunX, sunY, 20, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.4 * dayBrightness;
      ctx.beginPath(); ctx.arc(sunX, sunY, 10, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const moonX = w * 0.5 - Math.cos(celestialAngle - Math.PI/2) * w * 0.3;
    const moonY = h * 0.25 + Math.sin(celestialAngle - Math.PI/2) * h * 0.2;
    if (isNight && moonY < h * 0.6) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#CCCCEE';
      ctx.beginPath(); ctx.arc(moonX, moonY, 12, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.1;
      ctx.beginPath(); ctx.arc(moonX, moonY, 20, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 星星
    ctx.fillStyle = '#fff';
    const starAlpha = isNight ? 0.5 : 0.15;
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137.3) % w, sy = (i * 89.7) % (h * 0.45);
      ctx.globalAlpha = starAlpha * (0.3 + Math.sin(animFrame * 0.015 + i * 0.7) * 0.7);
      const sz = (i % 4 === 0) ? 2 : 1;
      ctx.fillRect(sx, sy, sz, sz);
    }
    ctx.globalAlpha = 1;

    // 高境界浮空仙山/云彩
    if (ri >= 3) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = ri >= 5 ? '#FF4444' : '#8888FF';
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.15 + i * 0.35) + Math.sin(animFrame * 0.003 + i) * 20;
        const cy = h * 0.2 + Math.cos(animFrame * 0.004 + i * 2) * 10;
        ctx.beginPath(); ctx.ellipse(cx, cy, 60 + i * 20, 15 + i * 5, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 飘动云彩
    ctx.globalAlpha = isNight ? 0.06 : 0.1;
    ctx.fillStyle = isNight ? '#445566' : '#667788';
    for (let i = 0; i < 4; i++) {
      const cx = ((animFrame * 0.15 + i * 200) % (w + 200)) - 100;
      const cy = h * 0.15 + i * 25;
      ctx.beginPath(); ctx.ellipse(cx, cy, 50 + i * 15, 10 + i * 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 30, cy - 5, 35 + i * 10, 8 + i * 2, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 山丘
    ctx.fillStyle = theme.hill; ctx.beginPath(); ctx.moveTo(0, h * 0.6);
    for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * 0.55 + Math.sin(x * 0.008) * 30 + Math.sin(x * 0.015) * 15);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();

    const groundY = h * 0.73;
    ctx.fillStyle = theme.ground; ctx.fillRect(0, groundY, w, h - groundY);

    // 场景小景
    drawSceneryTree(ctx, w * 0.48, groundY, 0.7, theme);
    drawSceneryTree(ctx, w * 0.12, groundY, 0.5, theme);
    drawSceneryTree(ctx, w * 0.85, groundY, 0.6, theme);
    drawSceneryRock(ctx, w * 0.55, groundY, 0.8, theme);
    drawSceneryRock(ctx, w * 0.05, groundY + 2, 0.5, theme);

    // 草地
    ctx.fillStyle = theme.grass;
    for (let x = 0; x < w; x += 12) {
      const gh = 2 + (x * 7 % 5);
      const sway = Math.sin(animFrame * 0.02 + x * 0.1) * 1;
      ctx.fillRect(x + sway, groundY - gh, 6, gh);
    }
    ctx.fillStyle = theme.grass;
    for (let x = 30; x < w; x += 80) { ctx.fillRect(x, groundY - 2, 8, 4); ctx.fillRect(x + 2, groundY - 4, 4, 2); }

    // 连杀屏幕边缘发光
    if (gs && gs.consecutiveKills >= 10) {
      const intensity = Math.min(1, (gs.consecutiveKills - 10) / 40);
      const pulse = 0.3 + Math.sin(animFrame * 0.06) * 0.2;
      ctx.globalAlpha = intensity * pulse * 0.3;
      const edgeColor = gs.consecutiveKills >= 50 ? '#FF4444' : gs.consecutiveKills >= 30 ? '#FFD700' : '#FF8844';
      const edgeGrad = ctx.createLinearGradient(0, 0, 30, 0);
      edgeGrad.addColorStop(0, edgeColor); edgeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = edgeGrad; ctx.fillRect(0, 0, 30, h);
      const edgeGrad2 = ctx.createLinearGradient(w, 0, w - 30, 0);
      edgeGrad2.addColorStop(0, edgeColor); edgeGrad2.addColorStop(1, 'transparent');
      ctx.fillStyle = edgeGrad2; ctx.fillRect(w - 30, 0, 30, h);
      ctx.globalAlpha = 1;
    }

    return groundY;
  }

  // ========== 场景小景 ==========
  function drawSceneryTree(ctx, x, groundY, scale, theme) {
    ctx.globalAlpha = 0.3;
    const s = scale * 2;
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x - 2*s, groundY - 12*s, 4*s, 12*s);
    ctx.fillStyle = theme.grass;
    for (let i = 0; i < 3; i++) {
      const ty = groundY - (14 + i * 6)*s;
      const tw = (10 - i * 2)*s;
      ctx.beginPath();
      ctx.moveTo(x, ty - 6*s);
      ctx.lineTo(x - tw, ty);
      ctx.lineTo(x + tw, ty);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSceneryRock(ctx, x, groundY, scale, theme) {
    ctx.globalAlpha = 0.25;
    const s = scale * 2;
    ctx.fillStyle = '#2a2a3a';
    ctx.beginPath();
    ctx.moveTo(x - 5*s, groundY); ctx.lineTo(x - 4*s, groundY - 4*s);
    ctx.lineTo(x - 1*s, groundY - 6*s); ctx.lineTo(x + 3*s, groundY - 5*s);
    ctx.lineTo(x + 5*s, groundY - 2*s); ctx.lineTo(x + 5*s, groundY);
    ctx.fill();
    ctx.fillStyle = '#3a3a5a';
    ctx.beginPath();
    ctx.moveTo(x - 3*s, groundY - 3*s); ctx.lineTo(x - 1*s, groundY - 5*s);
    ctx.lineTo(x + 2*s, groundY - 4*s); ctx.lineTo(x, groundY - 2*s);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ========== 伤害数字 & 粒子 ==========
  function addDamageText(x, y, text, color, big) {
    let offsetY = 0;
    for (const d of damageTexts) {
      if (Math.abs(d.x - x) < 40 && Math.abs(d.y - y + offsetY) < 15 && d.life > 30) offsetY -= 16;
    }
    damageTexts.push({
      x: x + (Math.random()-0.5)*20, y: y + offsetY, text, color,
      life: 55, maxLife: 55, vy: -3.5, big,
      scale: big ? 1.4 : 1.0, bounceCount: 0, baseY: y + offsetY,
    });
  }

  function addCombatText(x, y, text, color) {
    combatTexts.push({ x: x + (Math.random()-0.5)*30, y: y - 20, text, color, life: 25, maxLife: 25, scale: 1.5 });
  }

  function addParticles(x, y, color, count, spread) {
    spread = spread || 4;
    for (let i = 0; i < count; i++)
      particles.push({ x, y, vx: (Math.random()-0.5)*spread, vy: (Math.random()-0.5)*spread-2, life: 25+Math.random()*25, color, size: 2+Math.random()*3 });
  }

  function addDeathExplosion(x, y) {
    const colors = ['#FF4444','#FF8844','#FFCC44','#FFFFFF','#FF6666'];
    for (let i = 0; i < 25; i++) {
      const angle = Math.random()*Math.PI*2, speed = 2+Math.random()*5;
      particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-1, life: 30+Math.random()*30, color: colors[Math.floor(Math.random()*colors.length)], size: 2+Math.random()*4 });
    }
  }

  function addBreakthroughEffect(x, y) {
    const colors = ['#FFD700','#FFEE88','#FFFFFF','#FFA500'];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random()*Math.PI*2, speed = 3+Math.random()*8;
      particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 50+Math.random()*50, color: colors[Math.floor(Math.random()*colors.length)], size: 3+Math.random()*5 });
    }
    const flash = document.getElementById('breakthroughFlash');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 200);
  }

  // ========== 环境粒子 ==========
  function updateEnvParticles(w, h, ri) {
    const spawnRate = 0.15;
    if (Math.random() < spawnRate) {
      const types = [
        [{ type: 'firefly', color: '#88FF88', size: 2, speed: 0.3, life: 200 }],
        [{ type: 'firefly', color: '#88FF88', size: 2, speed: 0.3, life: 200 }, { type: 'spirit', color: '#88CCFF', size: 1.5, speed: 0.5, life: 150 }],
        [{ type: 'leaf', color: '#88AA44', size: 3, speed: 0.8, life: 180 }, { type: 'spirit', color: '#44FFAA', size: 2, speed: 0.4, life: 160 }],
        [{ type: 'star', color: '#AAAAFF', size: 1.5, speed: 0.2, life: 250 }, { type: 'spirit', color: '#8888FF', size: 2, speed: 0.6, life: 120 }],
        [{ type: 'ember', color: '#CC88FF', size: 2, speed: 0.7, life: 130 }, { type: 'spirit', color: '#FF88FF', size: 2.5, speed: 0.5, life: 140 }],
        [{ type: 'ember', color: '#FF6644', size: 2.5, speed: 1.0, life: 100 }, { type: 'darkEnergy', color: '#FF4444', size: 3, speed: 0.3, life: 200 }],
      ];
      const pool = types[ri] || types[0];
      const tmpl = pool[Math.floor(Math.random() * pool.length)];
      envParticles.push({
        type: tmpl.type,
        x: Math.random() * w,
        y: tmpl.type === 'leaf' ? -10 : Math.random() * h * 0.7,
        vx: (Math.random() - 0.5) * tmpl.speed,
        vy: tmpl.type === 'leaf' ? tmpl.speed : (Math.random() - 0.5) * tmpl.speed * 0.5,
        life: tmpl.life + Math.random() * 50,
        maxLife: tmpl.life + 50,
        color: tmpl.color,
        size: tmpl.size,
        phase: Math.random() * Math.PI * 2,
      });
    }
    if (envParticles.length > 40) envParticles.splice(0, envParticles.length - 40);
  }

  function drawEnvParticles() {
    for (let i = envParticles.length - 1; i >= 0; i--) {
      const p = envParticles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0 || p.x < -20 || p.x > canvas.width + 20 || p.y > canvas.height + 20) {
        envParticles.splice(i, 1); continue;
      }
      const alpha = Math.min(1, p.life / p.maxLife) * 0.6;
      ctx.globalAlpha = alpha;

      switch (p.type) {
        case 'firefly':
          const flicker = 0.5 + Math.sin(animFrame * 0.1 + p.phase) * 0.5;
          ctx.globalAlpha = alpha * flicker;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = alpha * flicker * 0.3;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI*2); ctx.fill();
          break;
        case 'spirit':
          p.x += Math.sin(animFrame * 0.02 + p.phase) * 0.5;
          p.y -= 0.3;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
          break;
        case 'leaf':
          p.x += Math.sin(animFrame * 0.03 + p.phase) * 0.8;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(animFrame * 0.02 + p.phase);
          ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
          ctx.restore();
          break;
        case 'star':
          const twinkle = 0.3 + Math.sin(animFrame * 0.08 + p.phase) * 0.7;
          ctx.globalAlpha = alpha * twinkle;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
          ctx.fillRect(p.x - 1.5, p.y, 3, 1);
          ctx.fillRect(p.x, p.y - 1.5, 1, 3);
          break;
        case 'ember':
          p.y -= 0.5; p.x += Math.sin(animFrame * 0.05 + p.phase) * 0.3;
          ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
          break;
        case 'darkEnergy':
          p.x += Math.sin(animFrame * 0.01 + p.phase) * 0.8;
          p.y += Math.cos(animFrame * 0.015 + p.phase) * 0.5;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.4;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = alpha * 0.8;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  // ========== 技能特效 ==========
  function addSkillEffect(skillId, fromX, fromY, toX, toY) {
    const effects = {
      'basic_sword': { type: 'slash', color: '#AACCFF', size: 30, life: 15 },
      'body_refine': { type: 'aura', color: '#FFAA44', size: 20, life: 12 },
      'iron_skin': { type: 'shield', color: '#88CCCC', size: 20, life: 10 },
      'wind_slash': { type: 'wind', color: '#88FFCC', size: 35, life: 18 },
      'golden_core': { type: 'orb', color: '#FFD700', size: 25, life: 20 },
      'critical_eye': { type: 'flash', color: '#FF4444', size: 15, life: 8 },
      'star_absorb': { type: 'drain', color: '#CC44FF', size: 30, life: 20 },
      'wind_walk': { type: 'wind', color: '#88EEFF', size: 20, life: 12 },
      'sky_break': { type: 'beam', color: '#FFD700', size: 40, life: 25 },
      'treasure_sense': { type: 'sparkle', color: '#FFD700', size: 15, life: 15 },
    };
    const eff = effects[skillId] || { type: 'slash', color: '#FFFFFF', size: 20, life: 12 };
    skillEffects.push({
      ...eff, x: fromX, y: fromY, toX, toY,
      maxLife: eff.life,
      angle: Math.atan2(toY - fromY, toX - fromX),
      progress: 0,
    });
  }

  function drawSkillEffects() {
    for (let i = skillEffects.length - 1; i >= 0; i--) {
      const e = skillEffects[i];
      e.life--; e.progress = 1 - (e.life / e.maxLife);
      if (e.life <= 0) { skillEffects.splice(i, 1); continue; }

      const alpha = Math.min(1, e.life / e.maxLife);
      ctx.globalAlpha = alpha;
      const cx = e.x + (e.toX - e.x) * e.progress;
      const cy = e.y + (e.toY - e.y) * e.progress;

      switch (e.type) {
        case 'slash':
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(e.angle);
          ctx.fillStyle = e.color;
          ctx.fillRect(-e.size/2, -3, e.size * (1 - e.progress * 0.5), 6);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-e.size/2, -1, e.size * 0.3, 2);
          ctx.restore();
          break;
        case 'wind':
          ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = e.color;
          for (let j = 0; j < 3; j++) {
            const off = (j - 1) * 8;
            ctx.globalAlpha = alpha * (0.5 + j * 0.15);
            ctx.beginPath();
            ctx.moveTo(-e.size/2, off);
            ctx.quadraticCurveTo(0, off - 10, e.size/2, off);
            ctx.quadraticCurveTo(0, off + 10, -e.size/2, off);
            ctx.fill();
          }
          ctx.restore();
          break;
        case 'orb':
          ctx.fillStyle = e.color;
          ctx.globalAlpha = alpha * 0.4;
          ctx.beginPath(); ctx.arc(cx, cy, e.size, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = alpha * 0.8;
          ctx.beginPath(); ctx.arc(cx, cy, e.size * 0.5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.arc(cx, cy, e.size * 0.2, 0, Math.PI*2); ctx.fill();
          break;
        case 'beam':
          ctx.strokeStyle = e.color; ctx.lineWidth = 4 * (1 - e.progress);
          ctx.globalAlpha = alpha * 0.6;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.toX, e.toY); ctx.stroke();
          ctx.lineWidth = 2; ctx.strokeStyle = '#FFFFFF'; ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.toX, e.toY); ctx.stroke();
          ctx.fillStyle = e.color; ctx.globalAlpha = alpha * (1 - e.progress);
          ctx.beginPath(); ctx.arc(e.toX, e.toY, e.size * (1-e.progress), 0, Math.PI*2); ctx.fill();
          break;
        case 'drain':
          ctx.strokeStyle = e.color; ctx.lineWidth = 2;
          for (let j = 0; j < 5; j++) {
            const t = (e.progress + j * 0.15) % 1;
            const sx = e.toX + (e.x - e.toX) * t;
            const sy = e.toY + (e.y - e.toY) * t + Math.sin(t * Math.PI * 4 + j) * 15;
            ctx.globalAlpha = alpha * (1 - t) * 0.7;
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2); ctx.fill();
          }
          break;
        case 'flash':
          ctx.fillStyle = e.color; ctx.globalAlpha = alpha * (1 - e.progress);
          ctx.beginPath(); ctx.arc(cx, cy, e.size * (1 + e.progress), 0, Math.PI*2); ctx.fill();
          break;
        case 'aura': case 'shield': case 'sparkle':
          ctx.fillStyle = e.color;
          const sz = e.size * (0.5 + e.progress * 0.5);
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath(); ctx.arc(e.x, e.y, sz, 0, Math.PI*2); ctx.fill();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  // ========== 灵兽弹道 ==========
  function addBeastProjectile(fromX, fromY, toX, toY, templateId, damage) {
    const colors = {
      fire_cat: '#FF6633', ice_wolf: '#88CCFF', thunder_eagle: '#FFD700',
      shadow_serpent: '#AA44FF', jade_dragon: '#44FFAA', phoenix: '#FF4444',
    };
    beastProjectiles.push({
      x: fromX, y: fromY, toX, toY,
      color: colors[templateId] || '#FFFFFF',
      templateId, damage, progress: 0, life: 20, maxLife: 20,
    });
  }

  function drawBeastProjectiles() {
    for (let i = beastProjectiles.length - 1; i >= 0; i--) {
      const p = beastProjectiles[i];
      p.life--; p.progress = 1 - (p.life / p.maxLife);
      if (p.life <= 0) { beastProjectiles.splice(i, 1); continue; }
      const cx = p.x + (p.toX - p.x) * p.progress;
      const cy = p.y + (p.toY - p.y) * p.progress;
      const alpha = Math.min(1, p.life / p.maxLife);

      ctx.globalAlpha = alpha * 0.3; ctx.fillStyle = p.color;
      for (let j = 1; j <= 4; j++) {
        const tx = cx - (p.toX - p.x) * 0.02 * j;
        const ty = cy - (p.toY - p.y) * 0.02 * j;
        ctx.beginPath(); ctx.arc(tx, ty, 4 - j, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
      if (p.progress > 0.9) {
        ctx.globalAlpha = alpha * (1 - (p.progress - 0.9) * 10);
        ctx.beginPath(); ctx.arc(p.toX, p.toY, 10 * (p.progress - 0.9) * 10, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ========== 主渲染循环 ==========
  function easeOutQuad(t) { return t*(2-t); }

  function render() {
    animFrame++;
    const groundY = drawBackground();
    const gs = GameEngine.getState();
    const ri = gs ? gs.realmIndex : 0;

    updateEnvParticles(canvas.width, canvas.height, ri);
    drawEnvParticles();

    if (gs) {
      const mouseX = canvas.width * 0.25, mouseY = groundY - 10;
      const monsterTargetX = canvas.width * 0.7;
      const monsterX = monsterWalkIn < 1 ? (canvas.width + 50) + (monsterTargetX - canvas.width - 50) * easeOutQuad(monsterWalkIn) : monsterTargetX;
      const monsterY = groundY - 10;

      // 鼠鼠呼吸动画
      const breathOffset = Math.sin(animFrame * 0.04) * 1.5;
      const swayOffset = Math.sin(animFrame * 0.025) * 0.5;
      ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(mouseX, groundY+2, 25, 5, 0, 0, Math.PI*2); ctx.fill();

      // 角色内部运动偏移
      let innerFloat = 0, innerAtkX = 0;
      const atkVal = mouseAttackAnim > 0 ? mouseAttackAnim : 0;
      if (gs.realmIndex === 0) {
        innerAtkX = atkVal ? Math.sin(atkVal * 0.4) * 6 * PIXEL_SCALE : 0;
      } else if (gs.realmIndex === 1) {
        innerAtkX = atkVal ? Math.sin(atkVal * 0.4) * 8 * PIXEL_SCALE : 0;
      } else if (gs.realmIndex === 2) {
        innerFloat = Math.sin(animFrame * 0.04) * 2 * PIXEL_SCALE;
        innerAtkX = atkVal ? Math.sin(atkVal * 0.4) * 10 * PIXEL_SCALE : 0;
      } else if (gs.realmIndex === 3) {
        innerFloat = Math.sin(animFrame * 0.04) * 3 * PIXEL_SCALE - 3 * PIXEL_SCALE;
        innerAtkX = atkVal ? Math.sin(atkVal * 0.4) * 12 * PIXEL_SCALE : 0;
      } else if (gs.realmIndex === 4) {
        innerFloat = Math.sin(animFrame * 0.03) * 4 * PIXEL_SCALE - 6 * PIXEL_SCALE;
        innerAtkX = atkVal ? Math.sin(atkVal * 0.4) * 14 * PIXEL_SCALE : 0;
      } else if (gs.realmIndex === 5) {
        innerFloat = Math.sin(animFrame * 0.03) * 5 * PIXEL_SCALE - 9 * PIXEL_SCALE;
        innerAtkX = atkVal ? Math.sin(atkVal * 0.4) * 16 * PIXEL_SCALE : 0;
      }

      // 坐骑
      if (gs.visualEquip && gs.visualEquip.mount && !gs.isDead) {
        const mountBaseX = mouseX + swayOffset + innerAtkX;
        const mountOffsetY = gs.visualEquip.mount === '仙鹤' ? 18 : 20;
        const mountBaseY = mouseY + breathOffset + innerFloat + mountOffsetY;
        ctx.save(); ctx.translate(mountBaseX, mountBaseY); ctx.scale(-1, 1);
        if (gs.visualEquip.mount === '仙鹤') Sprites.drawMountCrane(ctx, 0, 0, PIXEL_SCALE, animFrame);
        else if (gs.visualEquip.mount === '麒麟') Sprites.drawMountQilin(ctx, 0, 0, PIXEL_SCALE, animFrame);
        ctx.restore();
      }

      // 鼠鼠
      ctx.globalAlpha = gs.isDead ? 0.3 : 1;
      Sprites.drawMouseByRealm(ctx, mouseX + swayOffset, mouseY + breathOffset, PIXEL_SCALE, gs.realmIndex, animFrame, mouseAttackAnim > 0 ? mouseAttackAnim : 0, {
        hasActiveBeast: !!gs.activeBeast,
        equippedWeaponSkin: gs.equippedWeaponSkin || null,
        equippedArmorSkin: gs.equippedArmorSkin || null,
      });
      ctx.globalAlpha = 1;

      // 出战灵兽
      if (gs.activeBeast && !gs.isDead) {
        let petX = mouseX - 30, petY = mouseY + 5;
        if (beastAttackAnim > 0) {
          const atkProgress = 1 - (beastAttackAnim / 15);
          if (atkProgress < 0.5) {
            petX += (monsterX - petX) * atkProgress * 0.6;
            petY += (monsterY - petY) * atkProgress * 0.3;
          } else {
            petX += (monsterX - petX) * (1 - atkProgress) * 0.6;
            petY += (monsterY - petY) * (1 - atkProgress) * 0.3;
          }
        }
        const floatY = Math.sin(animFrame * 0.04) * 2;
        ctx.save(); ctx.translate(petX, petY + floatY); ctx.scale(-1, 1);
        Sprites.drawActiveBeast(ctx, 0, 0, PIXEL_SCALE, gs.activeBeast.templateId, animFrame);
        ctx.restore();
      }

      // 怪物
      if (gs.currentMonster && monsterDeathAnim <= 0 && !gs.isDead) {
        ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(monsterX, groundY+2, 20, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;

        // 精英光环
        if (gs.currentMonster.isElite) {
          ctx.save(); ctx.translate(monsterX, monsterY);
          ctx.globalAlpha = 0.15 + Math.sin(animFrame * 0.05) * 0.1;
          ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(0, 0, 35 + Math.sin(animFrame*0.03)*3, 35 + Math.sin(animFrame*0.03)*3, animFrame*0.01, 0, Math.PI*2); ctx.stroke();
          ctx.globalAlpha = 0.2 + Math.sin(animFrame * 0.05) * 0.1;
          ctx.fillStyle = '#FFD700';
          ctx.beginPath(); ctx.ellipse(0, 0, 28, 28, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore(); ctx.globalAlpha = 1;
        }

        // 受击效果
        const shakeX = monsterHitAnim > 0 ? (Math.random()-0.5) * monsterHitAnim * 1.5 : 0;
        const shakeY = monsterHitAnim > 0 ? (Math.random()-0.5) * monsterHitAnim * 0.8 : 0;
        if (monsterHitAnim > 5) {
          ctx.globalAlpha = 0.2; ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(monsterX, monsterY - 40, 15, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }

        Sprites.drawMonsterByName(ctx, gs.currentMonster.name, monsterX + shakeX, monsterY + shakeY, PIXEL_SCALE, animFrame, monsterHitAnim);

        // 血条 & 怪物信息
        drawMonsterUI(gs, monsterX, monsterY);
      }
      if (monsterWalkIn < 1) monsterWalkIn = Math.min(1, monsterWalkIn + 0.04);

      // 鼠鼠HP条
      if (gs.computed && !gs.isDead) {
        drawMouseHP(gs, mouseX, mouseY, breathOffset, innerFloat);
      }

      // 死亡文字
      if (gs.isDead) {
        ctx.font = 'bold 16px "Press Start 2P", monospace';
        ctx.fillStyle = '#FF4444'; ctx.textAlign = 'center';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        const deathText = gs.reviveCountdown > 0 ? `复活 ${gs.reviveCountdown}s` : '复活中...';
        ctx.strokeText(deathText, canvas.width / 2, canvas.height * 0.4);
        ctx.fillText(deathText, canvas.width / 2, canvas.height * 0.4);
      }

      // 特效
      drawSkillEffects();
      drawBeastProjectiles();

      // Mini-HUD
      if (!gs.isDead) drawMiniHUD(gs);
    }

    // 动画衰减
    if (mouseAttackAnim > 0) mouseAttackAnim = Math.max(0, mouseAttackAnim - 0.4);
    if (monsterHitAnim > 0) monsterHitAnim = Math.max(0, monsterHitAnim - 0.3);
    if (monsterDeathAnim > 0) monsterDeathAnim = Math.max(0, monsterDeathAnim - 0.5);
    if (beastAttackAnim > 0) beastAttackAnim = Math.max(0, beastAttackAnim - 1);

    // 粒子更新
    particles = particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
      ctx.globalAlpha = Math.max(0, p.life/50); ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size); ctx.globalAlpha = 1;
      return p.life > 0;
    });

    // 伤害数字
    damageTexts = damageTexts.filter(d => {
      d.y += d.vy; d.vy += 0.06; d.life--;
      if (d.vy > 0 && d.y > d.baseY && d.bounceCount < 2) { d.vy = -d.vy * 0.5; d.bounceCount++; }
      const lifeRatio = d.life / d.maxLife;
      const popScale = lifeRatio > 0.85 ? 1 + (lifeRatio - 0.85) * 6 : 1;
      const finalScale = (d.scale || 1) * popScale;
      ctx.globalAlpha = Math.max(0, Math.min(1, d.life / 20));
      const baseSize = d.big ? 16 : 11;
      const fontSize = Math.round(baseSize * finalScale);
      ctx.font = `bold ${fontSize}px "Press Start 2P",monospace`;
      ctx.fillStyle = d.color; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(d.text, d.x, d.y); ctx.fillText(d.text, d.x, d.y); ctx.globalAlpha = 1;
      return d.life > 0;
    });

    // 文字音效
    combatTexts = combatTexts.filter(ct => {
      ct.life--; ct.y -= 0.5;
      const ratio = ct.life / ct.maxLife;
      ctx.globalAlpha = Math.max(0, ratio);
      const sz = Math.round(10 * ct.scale * (0.5 + ratio * 0.5));
      ctx.font = `bold ${sz}px sans-serif`;
      ctx.fillStyle = ct.color; ctx.textAlign = 'center';
      ctx.fillText(ct.text, ct.x, ct.y);
      ctx.globalAlpha = 1;
      return ct.life > 0;
    });

    requestAnimationFrame(render);
  }

  // ========== 辅助绘制 ==========
  function drawMonsterUI(gs, monsterX, monsterY) {
    const m = gs.currentMonster;
    const barW = 56, barH = 5;
    const barX = monsterX - barW/2, barY = monsterY - 120;

    ctx.fillStyle = '#222'; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    if (m.hpBars > 1) {
      const barColors = ['#ff4444', '#ff8844', '#ffcc44', '#44cc44', '#4488ff'];
      const colorIdx = Math.min(m.currentBar - 1, barColors.length - 1);
      ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barW, barH);
      const hpPct = Math.max(0, m.hp / m.maxHp);
      ctx.fillStyle = barColors[colorIdx];
      ctx.fillRect(barX, barY, barW * hpPct, barH);
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(`x${m.currentBar}`, monsterX, barY - 2);
    } else {
      ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barW, barH);
      const hpPct = Math.max(0, m.hp / m.maxHp);
      ctx.fillStyle = hpPct > 0.5 ? '#44CC44' : hpPct > 0.2 ? '#DDAA44' : '#DD4444';
      ctx.fillRect(barX, barY, barW * hpPct, barH);
    }
    ctx.strokeStyle = '#555'; ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

    ctx.font = '8px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(GameEngine.formatNumber(Math.max(0, m.hp)), monsterX, barY + barH + 9);

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = m.isElite ? '#FFD700' : '#CCCCCC'; ctx.textAlign = 'center';
    ctx.fillText((m.isElite ? '⭐ ' : '') + m.name, monsterX, barY + barH + 19);

    if (m.isElite && m.hpBars > 1) {
      ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
      ctx.fillText('精英', monsterX, barY - 10);
    }

    if (m.trait) {
      const traitNames = {poison:'🟢毒',dodge:'💨闪避',thorns:'🌿荆棘',berserk:'🔴狂暴',slow:'❄️减速',burn:'🔥灼烧',critBoost:'💥会心',lifesteal:'🩸吸血',charm:'💜魅惑'};
      const traitLabel = traitNames[m.trait] || '';
      if (traitLabel) {
        ctx.font = '9px sans-serif'; ctx.fillStyle = '#FF8888'; ctx.textAlign = 'center';
        const traitY = barY - (m.hpBars > 1 ? 18 : (m.isElite ? 13 : 3));
        ctx.fillText(traitLabel, monsterX, traitY);
      }
    }
  }

  function drawMouseHP(gs, mouseX, mouseY, breathOffset, innerFloat) {
    const hpPct = gs.hp / gs.computed.maxHp;
    const hpBarExtra = [0, 0, 8, 18, 28, 45][gs.realmIndex] || 0;
    const barW = 56, barH = 5, barX = mouseX - barW/2, barY = mouseY + breathOffset + innerFloat - 45 - hpBarExtra;
    ctx.fillStyle = '#222'; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barW, barH);
    if (hpPct > 0) {
      const grad = ctx.createLinearGradient(barX, barY, barX + barW * hpPct, barY);
      if (hpPct > 0.5) { grad.addColorStop(0, '#44AA44'); grad.addColorStop(1, '#66CC66'); }
      else if (hpPct > 0.2) { grad.addColorStop(0, '#CC8800'); grad.addColorStop(1, '#DDAA44'); }
      else { grad.addColorStop(0, '#CC2222'); grad.addColorStop(1, '#DD4444'); }
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, barW * Math.max(0, hpPct), barH);
    }
    ctx.strokeStyle = '#555'; ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.font = '8px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(hpPct * 100)}%`, mouseX, barY - 2);
  }

  function drawMiniHUD(gs) {
    const hudY = 6;
    const hudBarW = Math.min(120, canvas.width * 0.3);
    const hudBarX = canvas.width / 2 - hudBarW / 2;
    ctx.fillStyle = '#000'; ctx.globalAlpha = 0.5;
    ctx.fillRect(hudBarX - 1, hudY - 1, hudBarW + 2, 7);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a1a3e'; ctx.fillRect(hudBarX, hudY, hudBarW, 5);
    const xpPct = gs.expPercent / 100;
    const xpGrad = ctx.createLinearGradient(hudBarX, hudY, hudBarX + hudBarW * xpPct, hudY);
    xpGrad.addColorStop(0, '#4a9eff'); xpGrad.addColorStop(1, '#88eeff');
    ctx.fillStyle = xpGrad;
    ctx.fillRect(hudBarX, hudY, hudBarW * xpPct, 5);
    ctx.strokeStyle = '#3a3a6a'; ctx.strokeRect(hudBarX, hudY, hudBarW, 5);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'right'; ctx.fillStyle = '#88eeff';
    ctx.fillText(`Lv.${gs.level}`, hudBarX - 4, hudY + 5);
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffdd57';
    ctx.fillText(`🪙${GameEngine.formatNumber(gs.gold)}`, hudBarX + hudBarW + 4, hudY + 5);
  }

  // ========== 动画控制接口 ==========
  function setMouseAttackAnim(v) { mouseAttackAnim = v; }
  function setMonsterHitAnim(v) { monsterHitAnim = v; }
  function setMonsterDeathAnim(v) { monsterDeathAnim = v; }
  function setMonsterWalkIn(v) { monsterWalkIn = v; }
  function setBeastAttackAnim(v) { beastAttackAnim = v; }

  // ========== 导出 ==========
  return {
    init, render, resizeCanvas,
    getPixelScale, getAnimFrame, getCanvas, getCtx,
    // 粒子 & 特效
    addDamageText, addCombatText, addParticles,
    addDeathExplosion, addBreakthroughEffect,
    addSkillEffect, addBeastProjectile,
    // 动画控制
    setMouseAttackAnim, setMonsterHitAnim,
    setMonsterDeathAnim, setMonsterWalkIn,
    setBeastAttackAnim,
  };
})();
