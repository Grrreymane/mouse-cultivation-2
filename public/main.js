// ============================================================
// main.js — 鼠鼠修仙2 初始化入口
// 启动引擎 / 事件绑定 / 战斗事件 / 操作函数 / 离线处理
// ============================================================

// ========== 全局操作函数（供 HTML onclick 调用） ==========
const Actions = (() => {
  'use strict';

  function doEquip(idx) { GameEngine.equipItem(idx); UI.updateUI(); }
  function doSell(idx) { if (GameEngine.sellItem(idx) > 0) UI.updateUI(); }
  function doAutoEquipBest() { const r = GameEngine.autoEquipBest(); UI.showResult('⚡ 一键换装', r.msg); UI.updateUI(); }
  function doSellWeaker() { const r = GameEngine.sellWeakerItems(); UI.showResult('🗑️ 卖弱装', r.msg); UI.updateUI(); }
  function doEnhance(slot) { const r = GameEngine.enhanceEquip(slot); if (!r.success) UI.showResult('强化', r.msg); UI.updateUI(); }
  function doCraftPill(id) { const r = GameEngine.craftPill(id); if (!r.success) UI.showResult('炼丹', r.msg); UI.updateUI(); }
  function doUsePill(id) { GameEngine.usePill(id); UI.updateUI(); }
  function doSkillUp(id) { const r = GameEngine.upgradeSkill(id); if (!r.success) UI.showResult('功法', r.msg); UI.updateUI(); }
  function doMaxSkillUp(id) { const r = GameEngine.maxUpgradeSkill(id); UI.showResult('📜 功法', r.msg); UI.updateUI(); }
  function doFeedBeast(id) { const r = GameEngine.feedBeast(id); if (!r.success) UI.showResult('灵兽', r.msg); UI.updateUI(); }
  function doMaxFeedBeast(id) { const r = GameEngine.maxFeedBeast(id); UI.showResult('灵兽', r.msg); UI.updateUI(); }
  function doSetBeast(id) { GameEngine.setActiveBeast(id); UI.updateUI(); }

  function doEnterRealm(idx) {
    const r = GameEngine.enterSecretRealm(idx);
    if (!r.success && !r.log) { UI.showResult('秘境', r.msg); UI.updateUI(); return; }
    const logEl = document.getElementById('realmExploreLog');
    if (r.log && r.log.length > 0) {
      let logHtml = `<div style="background:#111;border:1px solid ${r.alive?'#4a8a4a':'#aa4444'};padding:6px;font-size:9px;max-height:200px;overflow-y:auto;">`;
      logHtml += `<div style="color:#FFD700;font-weight:bold;margin-bottom:3px;">🏔️ 秘境探索 (${r.layers}/${r.total}层) | BUFF: ${r.buff}</div>`;
      for (const line of r.log) logHtml += `<div style="color:#ccc;padding:1px 0;border-bottom:1px solid #222;">${line}</div>`;
      logHtml += `<div style="color:${r.alive?'#44FF44':'#FF4444'};font-weight:bold;margin-top:3px;">${r.alive?'✅ 全部通关！':'💀 探索终止'} 获得：${r.rewards.join('、')}</div>`;
      logHtml += '</div>';
      logEl.innerHTML = logHtml;
      logEl.style.display = 'block';
    }
    UI.updateUI();
  }

  function doTowerChallenge() { UI.showResult('锁妖塔', GameEngine.challengeTower().msg); UI.updateUI(); }
  function doAutoTower() { const r = GameEngine.autoChallengeTower(); UI.showResult('🗼 锁妖塔连续挑战', r.msg); UI.updateUI(); }
  function doSweepTower() { const r = GameEngine.sweepTower(); UI.showResult('🗼 锁妖塔扫荡', r.msg); UI.updateUI(); }
  function doTribulation() { const r = GameEngine.attemptTribulation(); UI.showResult('⛈️ 渡劫', r.msg); UI.updateUI(); }
  function doCaveUpgrade(id) { const r = GameEngine.upgradeCaveBuilding(id); if (!r.success) UI.showResult('洞府', r.msg); UI.updateUI(); }
  function doMaxCaveUpgrade(id) { const r = GameEngine.maxUpgradeCave(id); UI.showResult('🏠 洞府', r.msg); UI.updateUI(); }

  function doAscension() {
    if (!confirm('确定飞升？将重置等级/装备/材料/功法/洞府，保留灵兽/成就/图鉴/10%灵石！')) return;
    const r = GameEngine.performAscension();
    UI.showResult('🌟 飞升', r.msg);
    UI.updateUI();
  }

  function doAscUpgrade(id) { const r = GameEngine.buyAscensionUpgrade(id); if (!r.success) UI.showResult('仙缘', r.msg); UI.updateUI(); }

  function doGachaSingle() {
    const result = GameEngine.doGachaPull(1);
    if (!result.success) { UI.showResult('天机阁', result.msg); return; }
    UI.setLastGachaResults(result.results);
    UI.updateUI();
  }

  function doGachaTen() {
    const result = GameEngine.doGachaPull(10);
    if (!result.success) { UI.showResult('天机阁', result.msg); return; }
    UI.setLastGachaResults(result.results);
    UI.updateUI();
  }

  function doEquipSkin(skinId) {
    const r = GameEngine.equipSkin(skinId);
    if (!r.success) UI.showResult('外观', r.msg);
    UI.updateUI();
  }

  function doUnequipSkin(type) { GameEngine.unequipSkin(type); UI.updateUI(); }

  function setSpeed(speed) {
    GameEngine.setBattleSpeed(speed);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.speed) === speed));
  }

  function toggleAutoHeal() { GameEngine.toggleAutoHeal(); UI.updateUI(); }

  function setAutoHealThreshold() {
    const val = parseInt(document.getElementById('autoHealThreshold').value);
    GameEngine.setAutoHealThreshold(val);
  }

  function resetGame() {
    if (confirm('确定重置？鼠鼠将从头修仙...')) {
      GameEngine.stop(); GameEngine.resetState(); GameEngine.start(onBattleEvent); UI.updateUI();
    }
  }

  return {
    doEquip, doSell, doAutoEquipBest, doSellWeaker, doEnhance,
    doCraftPill, doUsePill, doSkillUp, doMaxSkillUp,
    doFeedBeast, doMaxFeedBeast, doSetBeast,
    doEnterRealm, doTowerChallenge, doAutoTower, doSweepTower,
    doTribulation, doCaveUpgrade, doMaxCaveUpgrade,
    doAscension, doAscUpgrade,
    doGachaSingle, doGachaTen, doEquipSkin, doUnequipSkin,
    setSpeed, toggleAutoHeal, setAutoHealThreshold, resetGame,
  };
})();

// ========== 战斗事件处理 ==========
function onBattleEvent(eventType, data) {
  const gs = GameEngine.getState();
  const canvas = Renderer.getCanvas();
  const monsterX = canvas.width * 0.7, monsterY = canvas.height * 0.73 - 10;
  const mouseX = canvas.width * 0.25, mouseY = canvas.height * 0.73 - 10;

  switch (eventType) {
    case 'attack':
      Renderer.setMouseAttackAnim(10);
      Renderer.setMonsterHitAnim(8);
      const dmgColor = data.isCrit ? '#FFD700' : '#ff6b6b';
      Renderer.addDamageText(monsterX, monsterY-50, (data.isCrit?'暴击!':'-')+GameEngine.formatNumber(data.damage), dmgColor, data.isCrit);
      Renderer.addParticles(monsterX, monsterY, dmgColor, data.isCrit ? 10 : 4);
      if (data.isCrit) {
        Renderer.addCombatText(monsterX + 25, monsterY - 60, '💥嘭!', '#FFD700');
      } else if (Math.random() < 0.3) {
        const sfx = ['叮!','嚓!','哈!','喝!'][Math.floor(Math.random()*4)];
        Renderer.addCombatText(monsterX - 20, monsterY - 40, sfx, '#888888');
      }
      break;
    case 'beastAttack':
      Renderer.setBeastAttackAnim(15);
      Renderer.setMonsterHitAnim(5);
      Renderer.addBeastProjectile(mouseX - 40, mouseY - 5, monsterX, monsterY, data.templateId, data.damage);
      Renderer.addDamageText(monsterX + 20, monsterY - 35, '-' + GameEngine.formatNumber(data.damage), '#FF88FF', false);
      Renderer.addParticles(monsterX, monsterY, '#FF88FF', 3, 3);
      break;
    case 'skillEffect':
      Renderer.addSkillEffect(data.skillId, mouseX + 20, mouseY - 20, monsterX, monsterY - 20);
      break;
    case 'monsterAttack':
      Renderer.addDamageText(mouseX, mouseY-50, '-'+GameEngine.formatNumber(data.damage), '#FF4444', false);
      Renderer.addParticles(mouseX, mouseY, '#FF4444', 3);
      break;
    case 'dotDamage':
      const dotColor = data.type === 'poison' ? '#44FF44' : '#FF8844';
      Renderer.addDamageText(mouseX + 30, mouseY-40, data.type === 'poison' ? '毒!' : '烧!', dotColor, false);
      Renderer.addParticles(mouseX, mouseY, dotColor, 3, 2);
      break;
    case 'traitTrigger':
      Renderer.addDamageText(monsterX, monsterY - 80, data.msg, '#FF88FF', false);
      break;
    case 'dodge':
      Renderer.addDamageText(mouseX, mouseY-50, 'DODGE!', '#88EEFF', false);
      break;
    case 'monsterDodge':
      Renderer.addDamageText(monsterX, monsterY-50, 'MISS', '#888888', false);
      break;
    case 'kill':
      Renderer.setMonsterDeathAnim(10);
      Renderer.addDeathExplosion(monsterX, monsterY);
      Renderer.addDamageText(monsterX, monsterY-70, '+'+GameEngine.formatNumber(data.expGain)+'EXP', '#88EEFF', false);
      Renderer.addDamageText(monsterX, monsterY-90, '+'+GameEngine.formatNumber(data.goldGain)+'🪙', '#FFD700', false);
      Renderer.addCombatText(monsterX, monsterY - 30, '💀', '#FF4444');
      if (data.monster.isElite) {
        Renderer.addDamageText(monsterX, monsterY-110, '精英击杀!', '#FFD700', true);
        Renderer.addCombatText(monsterX + 30, monsterY - 50, '🔥爆!', '#FF8844');
        for (let i = 0; i < 15; i++) {
          const angle = Math.random()*Math.PI*2, spd = 2+Math.random()*6;
          Renderer.addParticles(monsterX, monsterY, '#FFD700', 1, 8);
        }
        const lootIcons = ['🪙','⚔️','🌿','⛏️'];
        for (let i = 0; i < 4; i++) {
          Renderer.addDamageText(monsterX + (Math.random()-0.5)*60, monsterY - 30, lootIcons[i], '#FFAA44', false);
        }
      }
      const ks = gs ? gs.consecutiveKills : 0;
      if (ks === 10) Renderer.addDamageText(canvas.width/2, canvas.height*0.3, '🔥 10连杀!', '#FF8844', true);
      else if (ks === 25) Renderer.addDamageText(canvas.width/2, canvas.height*0.3, '⚡ 25连杀!', '#FFD700', true);
      else if (ks === 50) Renderer.addDamageText(canvas.width/2, canvas.height*0.3, '💀 50连杀!!', '#FF4444', true);
      else if (ks === 100) Renderer.addDamageText(canvas.width/2, canvas.height*0.3, '👑 100连杀!!!', '#FF00FF', true);
      break;
    case 'spawn':
      Renderer.setMonsterWalkIn(0);
      break;
    case 'levelup':
      Renderer.addParticles(mouseX, mouseY, '#88EEFF', 15, 6);
      Renderer.addDamageText(mouseX, mouseY-70, 'LEVEL UP!', '#88EEFF', true);
      break;
    case 'breakthrough':
      Renderer.addBreakthroughEffect(mouseX, mouseY);
      Renderer.addDamageText(mouseX, mouseY-80, '境界突破!', '#FFD700', true);
      Renderer.addDamageText(mouseX, mouseY-100, data.realm, '#FFD700', true);
      break;
    case 'tribulationFail':
      Renderer.addParticles(mouseX, mouseY, '#FF0000', 20, 8);
      Renderer.addDamageText(mouseX, mouseY-80, '渡劫失败!', '#FF4444', true);
      break;
    case 'death':
      Renderer.addParticles(mouseX, mouseY, '#FF0000', 30, 10);
      Renderer.addDamageText(mouseX, mouseY-80, '阵亡!', '#FF0000', true);
      Renderer.addDamageText(mouseX, mouseY-100, '-'+GameEngine.formatNumber(data.goldLoss)+'🪙', '#FF4444', false);
      break;
    case 'revive':
      Renderer.addParticles(mouseX, mouseY, '#88FF88', 20, 6);
      Renderer.addDamageText(mouseX, mouseY-80, '重生!', '#88FF88', true);
      break;
    case 'hpBarBreak':
      Renderer.addParticles(monsterX, monsterY, '#FFD700', 15, 8);
      Renderer.addDamageText(monsterX, monsterY-90, `破防! 还有${data.barsLeft}管`, '#FFD700', true);
      break;
    case 'autoHeal':
      Renderer.addParticles(mouseX, mouseY, '#44FF44', 10, 4);
      Renderer.addDamageText(mouseX, mouseY-90, '自动吃药!', '#44FF44', false);
      break;
    case 'equipDrop':
      Renderer.addDamageText(monsterX+30, monsterY-50, '装备!', data.equip.qualityColor, true);
      break;
    case 'encounter':
      Renderer.addParticles(mouseX, mouseY-20, '#FFD700', 15, 6);
      Renderer.addDamageText(mouseX, mouseY-90, '奇遇!', '#FFD700', true);
      break;
    case 'beastCapture':
      Renderer.addParticles(mouseX, mouseY, '#FF88FF', 20, 8);
      Renderer.addDamageText(mouseX, mouseY-80, '灵兽!', '#FF88FF', true);
      break;
    case 'achievement':
      Renderer.addParticles(mouseX, mouseY, '#FFD700', 25, 8);
      Renderer.addDamageText(mouseX, mouseY-110, '🏆成就!', '#FFD700', true);
      break;
    case 'tribulationReady':
      Renderer.addParticles(mouseX, mouseY, '#FF44FF', 15, 6);
      break;
    case 'ascension':
      Renderer.addBreakthroughEffect(mouseX, mouseY);
      Renderer.addParticles(mouseX, mouseY, '#FFD700', 50, 12);
      Renderer.addDamageText(mouseX, mouseY-80, '飞升转生!', '#FFD700', true);
      Renderer.addDamageText(mouseX, mouseY-100, `+${data.pointsGained}仙缘`, '#FFD700', true);
      break;
    case 'tokenDrop':
      Renderer.addDamageText(monsterX + 30, monsterY-70, `+${data.amount}🎫`, '#FF8800', false);
      Renderer.addParticles(monsterX, monsterY - 40, '#FF8800', 5, 3);
      break;
    case 'gacha':
      const cx = canvas.width / 2, cy = canvas.height * 0.4;
      const hasLegendary = data.results.some(r => r.quality >= 4 && r.isNew);
      const hasRare = data.results.some(r => r.quality >= 3 && r.isNew);
      const gachaColors = hasLegendary ? ['#FFD700','#FF4400','#FF00FF','#FFFFFF'] :
                          hasRare ? ['#AA55FF','#FF88FF','#4488FF','#FFFFFF'] :
                          ['#88CCFF','#88FF88','#FFDD57','#AAAAAA'];
      for (let i = 0; i < (hasLegendary ? 60 : hasRare ? 40 : 20); i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * (hasLegendary ? 8 : 5);
        Renderer.addParticles(cx, cy, gachaColors[Math.floor(Math.random() * gachaColors.length)], 1, speed);
      }
      if (hasLegendary) {
        Renderer.addDamageText(cx, cy - 30, '🌟 传说级!', '#FFD700', true);
        Renderer.addBreakthroughEffect(cx, cy);
      } else if (hasRare) {
        Renderer.addDamageText(cx, cy - 30, '✨ 珍品!', '#AA55FF', true);
      }
      if (data.count === 10) {
        Renderer.addDamageText(cx, cy, '🎰 十连抽!', '#FF8800', true);
      }
      break;
  }
  UI.updateUI();
}

// ========== 启动 ==========
(function boot() {
  // 初始化 Sprite Sheet 桥接层
  const _OriginalSprites = window.Sprites;
  const SpritesBridge = SpriteLoader.init(_OriginalSprites);
  window.Sprites = {
    drawMouseByRealm: (...args) => SpritesBridge.drawMouseByRealm(...args),
    drawMonsterByName: (...args) => SpritesBridge.drawMonsterByName(...args),
    drawMonsterHPBar: (...args) => SpritesBridge.drawMonsterHPBar(...args),
    drawActiveBeast: (...args) => SpritesBridge.drawActiveBeast(...args),
    drawMountCrane: (...args) => SpritesBridge.drawMountCrane(...args),
    drawMountQilin: (...args) => SpritesBridge.drawMountQilin(...args),
    drawWeaponWithSkin: (...args) => SpritesBridge.drawWeaponWithSkin(...args),
    drawArmorSkinOverlay: (...args) => SpritesBridge.drawArmorSkinOverlay(...args),
    armorSkinColors: _OriginalSprites.armorSkinColors,
    rect: _OriginalSprites.rect,
    px: _OriginalSprites.px,
    circle: _OriginalSprites.circle,
    ellipse: _OriginalSprites.ellipse,
    roundRect: _OriginalSprites.roundRect,
  };

  // 初始化 UI
  UI.initTabs();

  // 初始化渲染器
  Renderer.init(document.getElementById('battleCanvas'));

  // 启动引擎
  GameEngine.start(onBattleEvent);

  // 恢复战斗速度
  const initState = GameEngine.getState();
  if (initState && initState.battleSpeed > 1) {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.speed) === initState.battleSpeed));
  }
  if (initState && initState.autoHealThreshold) {
    document.getElementById('autoHealThreshold').value = initState.autoHealThreshold;
  }

  // 离线收益
  const offlineGains = GameEngine.processOfflineGains();
  if (offlineGains && offlineGains.offlineSeconds > 60) {
    const fmt = GameEngine.formatNumber;
    const hours = Math.floor(offlineGains.offlineSeconds / 3600);
    const mins = Math.floor((offlineGains.offlineSeconds % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
    let extraInfo = '';
    if (offlineGains.offlineHerbs > 0) extraInfo += `灵药 +<span>${offlineGains.offlineHerbs}</span><br>`;
    if (offlineGains.offlineOre > 0) extraInfo += `矿石 +<span>${offlineGains.offlineOre}</span><br>`;
    if (offlineGains.caveHerbs > 0) extraInfo += `(洞府药园 +<span>${offlineGains.caveHerbs}</span>)<br>`;
    if (offlineGains.caveOre > 0) extraInfo += `(洞府矿井 +<span>${offlineGains.caveOre}</span>)<br>`;
    if (offlineGains.equipsGained > 0) extraInfo += `装备 <span>${offlineGains.equipsGained}</span> 件<br>`;
    if (offlineGains.note) extraInfo += `⚠️ ${offlineGains.note}<br>`;
    document.getElementById('offlineGains').innerHTML = `
      鼠鼠离线修炼了 <span>${timeStr}</span><br>
      击杀 <span>${fmt(offlineGains.totalKills)}</span> 只<br>
      经验 +<span>${fmt(offlineGains.totalExp)}</span><br>
      灵石 +<span>${fmt(offlineGains.totalGold)}</span><br>
      ${extraInfo}
      ${offlineGains.levelUps > 0 ? `升了 <span>${offlineGains.levelUps}</span> 级！` : ''}
    `;
    document.getElementById('offlinePopup').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
  }

  // 启动渲染循环 & UI定时刷新
  UI.updateUI();
  Renderer.render();
  setInterval(UI.updateUI, 1000);
})();
