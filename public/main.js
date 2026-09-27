// ============================================================
// main.js — 鼠鼠修仙 v3 入口
// 事件委托 / 战斗事件分发 / 离线收益 / 启动
// ============================================================

(function () {
  'use strict';

  const fmt = n => GameEngine.formatNumber(n);
  const refresh = () => UI.update(true);

  function result(r, title, okCls) {
    if (!r) return;
    if (r.success === false) { UI.toast(r.msg, 'red'); Sound.play('error'); }
    else if (r.msg) UI.toast(r.msg, okCls || 'green');
    refresh();
  }

  function itemIndex(id) { return GameEngine.getState().inventory.findIndex(x => x.id === id); }

  // ========== 操作 ==========
  const ACTIONS = {
    tab: el => UI.setTab(el.dataset.tab),
    speed: el => { GameEngine.setBattleSpeed(+el.dataset.v); refresh(); },
    sound: () => { const on = Sound.toggle(); UI.toast(on ? '🔊 音效已开启' : '🔇 音效已关闭'); refresh(); },
    menu: () => document.getElementById('menuMask').classList.add('on'),
    closeMenu: (el, e) => { if (e.target === el) el.classList.remove('on'); },
    toggleLog: () => UI.toggleLog(),
    toggleQuest: () => UI.toggleQuest(),
    modalBtn: el => UI.modalButton(+el.dataset.i),

    cast: el => {
      const r = GameEngine.castSkill(el.dataset.id);
      if (!r.success) { if (r.msg !== '冷却中') UI.toast(r.msg, 'red'); Sound.play('error'); }
      else UI.flashSkill(el.dataset.id);
      refresh();
    },
    autoCast: () => {
      const r = GameEngine.toggleAutoCast();
      if (!r.success) { UI.toast(r.msg, 'red'); Sound.play('error'); }
      else UI.toast(r.on ? '✨ 神通自动施放：开启' : '神通自动施放：关闭', r.on ? 'green' : '');
      refresh();
    },
    claimQuest: () => { const r = GameEngine.claimQuest(); if (r.success) { Sound.play('quest'); UI.toast('📜 ' + r.msg, 'gold'); } refresh(); },
    tribulation: () => {
      const s = GameEngine.getState();
      if (!s.needTribulation || Renderer.isTribulating()) return;
      if (s.tribCooldown > 0) { UI.toast('天劫余威未散，稍后再试', 'red'); return; }
      Renderer.playTribulation(() => {
        const r = GameEngine.attemptTribulation();
        if (r.success) {
          Sound.play('breakthrough');
          UI.modal({ title: '🌟 渡劫成功', html: `<div style="text-align:center;font-size:15px">天雷淬体，道基稳固！<br>鼠鼠晋升 <b style="color:${GameEngine.getState().realmColor}">${GameEngine.getState().realm}</b></div><div class="muted" style="text-align:center;margin-top:8px">攻击×2 · 生命×2 · 防御×1.5 · 暴击+3% · 暴伤+20%</div>` });
        } else {
          Sound.play('fail');
          UI.toast('💥 渡劫失败！道心更坚，下次成功率+10%', 'red');
        }
        refresh();
        return r;
      });
      refresh();
    },

    // 装备
    equip: el => { GameEngine.equipItem(itemIndex(el.dataset.id)); Sound.play('click'); refresh(); },
    sell: el => { const g = GameEngine.sellItem(itemIndex(el.dataset.id)); if (g) { UI.toast(`出售获得 ${fmt(g)} 灵石`); Sound.play('coin'); } refresh(); },
    autoEquip: () => result(GameEngine.autoEquipBest()),
    sellWeaker: () => { const r = GameEngine.sellWeakerItems(); if (r.count) Sound.play('coin'); result(r); },
    enhance: el => { const r = GameEngine.enhanceEquip(el.dataset.slot); if (r.success) Sound.play('levelup'); result(r); },
    refine: el => { const r = GameEngine.refineEquip(el.dataset.slot); if (r.success) Sound.play('levelup'); result(r, null, 'gold'); },

    // 功法 / 丹药 / 灵兽 / 洞府
    skillUp: el => { const r = GameEngine.upgradeSkill(el.dataset.id); if (r.success) Sound.play('click'); result(r); },
    skillMax: el => { const r = GameEngine.maxUpgradeSkill(el.dataset.id); if (r.success) Sound.play('levelup'); result(r); },
    craft: el => { const r = GameEngine.craftPill(el.dataset.id, 1); if (r.success) Sound.play('drop'); result(r); },
    craft5: el => { const r = GameEngine.craftPill(el.dataset.id, 5); if (r.success) Sound.play('drop'); result(r); },
    usePill: el => { const r = GameEngine.usePill(el.dataset.id); if (r.success) Sound.play('heal'); result(r); },
    feed: el => { const r = GameEngine.feedBeast(el.dataset.id); if (r.success) Sound.play('click'); result(r); },
    feedMax: el => { const r = GameEngine.maxFeedBeast(el.dataset.id); if (r.success) Sound.play('levelup'); result(r); },
    setBeast: el => { GameEngine.setActiveBeast(el.dataset.id); Sound.play('click'); refresh(); },
    caveUp: el => { const r = GameEngine.upgradeCaveBuilding(el.dataset.id); if (r.success) Sound.play('levelup'); result(r); },
    caveMax: el => { const r = GameEngine.maxUpgradeCave(el.dataset.id); if (r.success) Sound.play('levelup'); result(r); },
    autoHeal: () => { GameEngine.toggleAutoHeal(); Sound.play('click'); refresh(); },
    toggleAutoEquip: () => { const on = GameEngine.setAutoEquip(!GameEngine.getState().autoEquip); UI.toast(on ? '⚡ 自动换装：开启' : '自动换装：关闭', on ? 'green' : ''); Sound.play('click'); refresh(); },
    toggleAutoPill: el => { const s = GameEngine.getState(); const r = GameEngine.setAutoPill(el.dataset.id, !(s.autoPills && s.autoPills[el.dataset.id])); if (!r.success) { UI.toast(r.msg, 'red'); Sound.play('error'); } else Sound.play('click'); refresh(); },
    chooseTalent: el => {
      const r = GameEngine.chooseTalent(el.dataset.id);
      if (r.success) { UI.closeModal(); Sound.play('breakthrough'); UI.toast(`🎭 ${r.msg}：${r.talent.desc}`, 'gold'); }
      refresh(); UI.renderTab(true);
    },

    // 历练
    enterRealm: el => {
      const r = GameEngine.enterSecretRealm(+el.dataset.i);
      if (!r.success) return result(r);
      Sound.play(r.alive ? 'rare' : 'fail');
      UI.modal({
        title: `🏔️ ${r.msg}`, wide: true,
        html: `<div class="muted small">秘境增益：${r.buff}</div><div class="explore-log">${r.log.map(l => `<p>${l}</p>`).join('')}</div>
          <div style="margin-top:8px"><b class="t-gold">收获：</b>${r.rewards.join('、')}</div>`,
      });
      refresh();
    },
    towerOne: () => { const r = GameEngine.challengeTower(); Sound.play(r.success ? 'kill' : 'fail'); result(r, null, 'gold'); },
    towerAuto: () => {
      const r = GameEngine.autoChallengeTower();
      Sound.play(r.success ? 'rare' : 'fail');
      UI.modal({ title: '🗼 锁妖塔 · 连续闯塔', html: `<div style="text-align:center">${r.msg}</div>` });
      refresh();
    },
    towerSweep: () => { const r = GameEngine.sweepTower(); if (r.success) Sound.play('coin'); result(r, null, 'gold'); },

    // 天机阁
    pull1: () => doPull(1),
    pull10: () => doPull(10),
    skinFilter: el => UI.setSkinFilter(el.dataset.f),
    toggleSkin: el => {
      const s = GameEngine.getState();
      const worn = s.equippedWeaponSkin === el.dataset.id || s.equippedArmorSkin === el.dataset.id;
      if (worn) GameEngine.unequipSkin(el.dataset.type); else GameEngine.equipSkin(el.dataset.id);
      Sound.play('click'); refresh(); UI.renderTab(true);
    },

    // 飞升
    ascend: () => {
      const s = GameEngine.getState();
      UI.confirmBox('🌟 白日飞升', `<p>飞升后将获得 <b class="t-gold">${s.ascensionPointsPreview}</b> 仙缘点，并从三个前世天赋中选择一个觉醒。</p>
        <p class="muted" style="margin-top:6px">重置：等级、装备、材料、功法、洞府<br>保留：灵兽(等级减半)、成就、图鉴、外观、天机令、10%灵石</p>`, '飞升！', () => {
        const r = GameEngine.performAscension();
        if (r.success) { Sound.play('breakthrough'); UI.toast('🌟 ' + r.msg, 'gold'); setTimeout(() => UI.showTalentChoice(), 50); }
        refresh(); UI.renderTab(true);
        return false;
      }, 'purple');
    },
    ascUp: el => { const r = GameEngine.buyAscensionUpgrade(el.dataset.id); if (r.success) Sound.play('levelup'); result(r, null, 'gold'); },

    // 图录
    codexSub: el => UI.setCodexSub(el.dataset.f),
    monsterInfo: el => {
      const m = GameEngine.getMonsterBestiary().find(x => x.name === el.dataset.name);
      if (!m) return;
      if (!m.discovered) { UI.toast('尚未遭遇这只妖兽'); return; }
      UI.modal({
        title: `👹 ${m.name}`,
        html: `<div class="row" style="align-items:flex-start"><canvas id="monInfoCv" class="portrait" width="56" height="56" style="width:112px;height:112px"></canvas>
          <div class="grow"><div class="muted">${m.realm} · ${GameEngine.REALMS[m.tier].scene}</div><p style="margin:6px 0">${m.desc}</p>
          ${m.traitInfo ? `<div><span class="tag t-purple">${m.traitInfo.icon} ${m.traitInfo.name}</span> <span class="muted small">${m.traitInfo.desc}</span></div>` : '<div class="muted small">无特殊能力</div>'}
          <div class="muted small" style="margin-top:6px">境界中期参考：生命 ${fmt(m.hp)} · 攻击 ${fmt(m.atk)}</div>
          <div class="small t-gold" style="margin-top:4px">已击杀 ${fmt(m.kills)} 只</div></div></div>`,
        onOpen: () => PixelArt.drawToCanvas(document.getElementById('monInfoCv'), m.name),
      });
    },

    // 菜单
    changelog: () => { location.href = 'changelog.html'; },
    help: () => { closeMenu(); showHelp(); },
    exportSave: () => {
      closeMenu();
      const code = GameEngine.exportSave();
      UI.modal({ title: '💾 导出存档', html: `<p class="muted small">复制下面的存档码妥善保存，可在其他设备导入。</p><textarea class="save-box" id="saveBox" readonly>${code}</textarea>`,
        buttons: [{ text: '复制', cls: 'gold', action: () => {
          const t = document.getElementById('saveBox'); t.select();
          const fallback = () => { let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} UI.toast(ok ? '已复制到剪贴板' : '复制失败，请长按文本手动复制', ok ? 'green' : 'red'); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(() => UI.toast('已复制到剪贴板', 'green'), fallback);
          else fallback();
          return false;
        } }, { text: '关闭' }],
        onOpen: () => document.getElementById('saveBox').select() });
    },
    importSave: () => {
      closeMenu();
      UI.modal({ title: '📥 导入存档', html: `<p class="muted small">粘贴存档码，将覆盖当前进度。</p><textarea class="save-box" id="saveBox"></textarea>`,
        buttons: [{ text: '取消' }, { text: '导入', cls: 'gold', action: () => {
          const r = GameEngine.importSave(document.getElementById('saveBox').value);
          UI.toast(r.msg, r.success ? 'green' : 'red');
          if (r.success) { GameEngine.ensureMonster(); refresh(); UI.renderTab(true); }
          return r.success ? undefined : false;
        } }] });
    },
    reset: () => {
      closeMenu();
      UI.confirmBox('🗑️ 重置游戏', '<p>确定要从头修仙吗？<b class="t-red">所有进度将被清除且无法恢复。</b></p>', '确定重置', () => {
        GameEngine.stop(); GameEngine.resetState(); GameEngine.start(onBattleEvent); GameEngine.ensureMonster();
        UI.setTab('status'); refresh();
      }, 'red');
    },
  };

  function closeMenu() { document.getElementById('menuMask').classList.remove('on'); }

  function doPull(n) {
    const r = GameEngine.doGachaPull(n);
    if (!r.success) return result(r);
    UI.setLastPulls(r.results);
    const best = Math.max(...r.results.map(x => x.quality));
    Sound.play(best >= 4 ? 'breakthrough' : best >= 3 ? 'rare' : 'gacha');
    if (best >= 4) UI.toast(`🌟 天降鸿运！获得${GameEngine.GACHA_QUALITY_NAMES[best]}！`, 'gold');
    refresh(); UI.renderTab(true);
  }

  function showHelp() {
    UI.modal({ title: '❓ 鼠鼠修仙 · 玩法说明', wide: true, html: `
      <p>🐭 鼠鼠会<b>自动战斗</b>，击败妖兽获得修为、灵石、材料与装备。关掉网页也会<b>离线修炼</b>（最多12小时）。</p>
      <p style="margin-top:6px">⚔️ <b>神通</b>：点击画面下方按钮施放，筑基期后可开启自动施放。</p>
      <p style="margin-top:6px">⛈️ <b>渡劫</b>：每个大境界修为圆满后需要渡劫。刚突破时实力大涨，越接近境界圆满妖兽越强——这就是<b>瓶颈</b>。卡住了就去强化装备、修炼功法、炼丹、培养灵兽。</p>
      <p style="margin-top:6px">📜 <b>修行指引</b>会一步步带你熟悉各个系统，完成后记得领取奖励。</p>
      <p style="margin-top:6px">✨ <b>天降机缘</b>：画面上偶尔会飘过宝物，点一下就能拿到灵石、材料、修为或天机令。</p>
      <p style="margin-top:6px">⚙️ <b>挂机设置</b>：装备页可开启自动换装/自动出售，丹药页（Lv.15）可设置药效结束时自动服用。</p>
      <p style="margin-top:6px">🏔️ <b>历练</b>：秘境每小时恢复一次，锁妖塔检验实力并给予里程碑奖励。</p>
      <p style="margin-top:6px">🌟 <b>飞升</b>：大乘期后可飞升转生，获得仙缘点永久加成与随机前世天赋，下一世更快更强。</p>
      <p class="muted small" style="margin-top:8px">快捷键：1-4 施放神通 · 空格 渡劫/领取指引</p>` });
  }

  // 事件委托
  document.addEventListener('click', e => {
    Sound.unlock();
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.disabled) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', e => {
    if (e.target.dataset.change === 'healThreshold') { GameEngine.setAutoHealThreshold(+e.target.value); refresh(); }
    if (e.target.dataset.change === 'autoSell') { GameEngine.setAutoSellQuality(+e.target.value); UI.toast(+e.target.value >= 0 ? '已开启自动出售弱装备' : '已关闭自动出售'); refresh(); }
  });
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (document.getElementById('modalMask').classList.contains('on')) {
      if (e.key === 'Escape' || e.key === 'Enter') UI.closeModal();
      return;
    }
    const s = GameEngine.getState();
    if (['1', '2', '3', '4'].includes(e.key)) {
      const sk = GameEngine.ACTIVE_SKILLS[+e.key - 1];
      if (sk) ACTIONS.cast({ dataset: { id: sk.id } });
    } else if (e.key === ' ') {
      e.preventDefault();
      if (s.needTribulation) ACTIONS.tribulation();
      else if (s.quest && s.quest.done) ACTIONS.claimQuest();
    }
  });
  const battleView = document.getElementById('battleView');
  battleView.addEventListener('click', e => {
    if (Renderer.hitFortune(e.clientX, e.clientY)) { GameEngine.claimFortune(); refresh(); }
  });
  battleView.addEventListener('mousemove', e => {
    battleView.style.cursor = Renderer.hitFortune(e.clientX, e.clientY) ? 'pointer' : '';
  });
  document.getElementById('modalMask').addEventListener('click', e => { if (e.target.id === 'modalMask' && modalDismissable()) UI.closeModal(); });
  function modalDismissable() { return true; }

  // ========== 战斗事件 ==========
  let lastSoundHit = 0;
  function onBattleEvent(type, data) {
    Renderer.handleEvent(type, data);
    const now = performance.now();
    switch (type) {
      case 'attack':
        if (now - lastSoundHit > 90) { Sound.play(data.isCrit ? 'crit' : 'hit'); lastSoundHit = now; }
        break;
      case 'skillCast':
        Sound.play(data.id === 'myriad_swords' ? 'big' : data.id === 'heal_spring' ? 'heal' : data.id === 'golden_shield' ? 'shield' : 'skill');
        if (data.auto) UI.flashSkill(data.id);
        break;
      case 'monsterAttack': if (data.isCrit) Sound.play('hurt'); break;
      case 'kill': Sound.play('kill'); setTimeout(() => Sound.play('coin'), 120); break;
      case 'levelup': Sound.play('levelup'); break;
      case 'skillUnlock': UI.toast(`🌠 领悟神通【${data.skill.name}】！点击画面下方按钮施放`, 'purple'); Sound.play('rare'); break;
      case 'tribulationReady': UI.toast(`⛈️ 修为圆满，准备渡劫突破【${data.realm}】！`, 'purple'); Sound.play('storm'); break;
      case 'death': Sound.play('death'); break;
      case 'equipDrop':
        if (data.equip.qualityIdx >= 3) { UI.toast(`📦 获得<b style="color:${data.equip.qualityColor}">${GameEngine.EQUIP_QUALITIES[data.equip.qualityIdx].label}</b>装备【${data.equip.name}】`, 'gold'); Sound.play('rare'); }
        else Sound.play('drop');
        break;
      case 'beastCapture': UI.toast(`🐾 捕获灵兽【${data.beast.name}】！`, 'purple'); Sound.play('rare'); break;
      case 'achievement': UI.toast(`🏆 成就【${data.achievement.name}】${data.rewardText}`, 'gold'); Sound.play('quest'); break;
      case 'encounter': UI.toast(`🎲 奇遇·${data.event.name}！${data.rewards.join('、')}`, 'gold'); Sound.play('rare'); break;
      case 'questReady': UI.toast(`📜 修行指引「${data.quest.title}」完成，领取奖励吧`, 'gold'); Sound.play('quest'); break;
      case 'tokenDrop': Sound.play('drop'); break;
      case 'hpBarBreak': Sound.play('crit'); break;
      case 'fortuneSpawn': {
        Sound.play('rare');
        const n = (GameEngine.getState().stats.fortunes || 0);
        if (n < 3) UI.toast('✨ 天降机缘！点击画面中飘过的宝物', 'gold');
        break;
      }
      case 'fortuneClaim': Sound.play('quest'); UI.toast(`${data.icon} ${data.name}：${data.text}`, 'gold'); break;
    }
  }

  // ========== 离线收益 ==========
  function showOffline(g) {
    const h = Math.floor(g.offlineSeconds / 3600), m = Math.floor(g.offlineSeconds % 3600 / 60);
    const time = h ? `${h}小时${m}分钟` : `${m}分钟`;
    const cells = [
      ['击败妖兽', fmt(g.totalKills)], ['获得修为', fmt(g.totalExp)],
      ['获得灵石', fmt(g.totalGold)], ['提升等级', g.levelUps ? `+${g.levelUps}` : '—'],
      ['灵药', '+' + fmt(g.offlineHerbs)], ['矿石', '+' + fmt(g.offlineOre)],
    ];
    if (g.offlineEssence) cells.push(['精华', '+' + fmt(g.offlineEssence)]);
    if (g.equipsGained) cells.push(['装备', g.equipsGained + ' 件']);
    UI.modal({
      title: '⏰ 离线修炼',
      html: `<p style="margin-bottom:8px">鼠鼠闭关修炼了 <b class="t-gold">${time}</b>${g.capped ? '<span class="muted small">（离线收益上限12小时）</span>' : ''}</p>
        <div class="gains">${cells.map(([k, v]) => `<div class="gain">${k}<b>${v}</b></div>`).join('')}</div>
        ${g.needTribulation ? '<p class="t-purple" style="margin-top:8px">⛈️ 修为已圆满，快去渡劫吧！</p>' : ''}`,
      buttons: [{ text: '收下！', cls: 'gold' }],
    });
  }

  // 顶栏小鼠鼠图标
  function drawBrand() {
    const cv = document.getElementById('brandIcon');
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    Sprites.drawMouseByRealm(c, 10, 18, 1, 0, 0, 0, {});
  }

  // ========== 启动 ==========
  function boot() {
    UI.initTabs();
    Renderer.init(document.getElementById('battleCanvas'));
    GameEngine.start(onBattleEvent);
    const offline = GameEngine.processOfflineGains();
    GameEngine.ensureMonster();
    drawBrand();
    UI.update(true);
    Renderer.render();
    setInterval(() => UI.update(false), 250);
    if (offline && offline.offlineSeconds >= 60) showOffline(offline);
    else if (GameEngine.getState().pendingTalentList) setTimeout(() => UI.showTalentChoice(), 300);
    else if (GameEngine.getState().killCount === 0) setTimeout(showHelp, 400);
    window.addEventListener('resize', () => setTimeout(() => Renderer.resize(), 30));
  }
  boot();
})();
