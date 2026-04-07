// ============================================================
// ui.js — 鼠鼠修仙2 DOM UI 更新系统
// 标签页渲染 / 状态面板 / 操作函数
// ============================================================

const UI = (() => {
  'use strict';

  let currentSkinFilter = 'all';
  let lastGachaResults = null;

  // ========== 标签页 ==========
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        refreshCurrentTab();
      });
    });
  }

  function refreshCurrentTab() {
    const t = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (t === 'equip') renderEquipTab();
    else if (t === 'pills') renderPillsTab();
    else if (t === 'skills') renderSkillsTab();
    else if (t === 'beasts') renderBeastsTab();
    else if (t === 'realm') renderRealmTab();
    else if (t === 'cave') renderCaveTab();
    else if (t === 'achieve') renderAchieveTab();
    else if (t === 'bestiary') renderBestiaryTab();
    else if (t === 'ascension') renderAscensionTab();
    else if (t === 'gacha') renderGachaTab();
  }

  // ========== 主UI更新 ==========
  function updateUI() {
    const s = GameEngine.getState();
    if (!s) return;
    const fmt = GameEngine.formatNumber;
    const c = s.computed;

    document.getElementById('level').textContent = `Lv.${s.level}`;
    document.getElementById('realm').textContent = s.realm;
    document.getElementById('realm').style.color = s.realmColor;
    document.getElementById('expBar').style.width = s.expPercent + '%';
    document.getElementById('expText').textContent = s.expPercent + '%';
    document.getElementById('attack').textContent = fmt(c.attack);
    document.getElementById('defense').textContent = fmt(c.defense);
    document.getElementById('hp').textContent = `${fmt(s.hp)}/${fmt(c.maxHp)}`;
    document.getElementById('critRate').textContent = c.critRate + '%';
    document.getElementById('critDamage').textContent = c.critDamage + '%';
    document.getElementById('lifesteal').textContent = c.lifesteal + '%';
    document.getElementById('dodge').textContent = c.dodge + '%';
    document.getElementById('dpsValue').textContent = fmt(s.dps);
    document.getElementById('gold').textContent = fmt(s.gold);

    // 前世天赋
    const talentGroup = document.getElementById('talentGroup');
    if (s.currentTalent) {
      talentGroup.style.display = 'block';
      const t = s.currentTalent;
      document.getElementById('talentDisplay').innerHTML = `
        <div style="font-size:11px;color:#FFD700;font-weight:bold;">${t.icon} ${t.name}</div>
        <div style="font-size:9px;color:#aaa;margin:1px 0;">${t.desc}</div>
        <div style="font-size:8px;color:#666;font-style:italic;">"${t.flavor}"</div>
      `;
    } else {
      talentGroup.style.display = 'none';
    }

    document.getElementById('killCount').textContent = fmt(s.killCount);
    document.getElementById('deathCount').textContent = s.deathCount;
    document.getElementById('eliteKillCount').textContent = s.eliteKillCount;
    document.getElementById('consecutiveKills').textContent = s.consecutiveKills;
    document.getElementById('totalExp').textContent = fmt(s.totalExp);
    document.getElementById('totalGold').textContent = fmt(s.totalGold);
    document.getElementById('ascensionCountDisplay').textContent = s.ascensionCount;
    document.getElementById('ascPointsDisplay').textContent = s.ascensionPoints;
    document.getElementById('matHerb').textContent = s.materials.herb || 0;
    document.getElementById('matOre').textContent = s.materials.ore || 0;
    document.getElementById('matEssence').textContent = s.materials.essence || 0;
    document.getElementById('tianjiDisplay').textContent = (s.tianjiTokens || 0) + ' 🎫';

    const badge = document.getElementById('realmBadge');
    badge.textContent = s.realm; badge.style.borderColor = s.realmColor; badge.style.color = s.realmColor;

    // 死亡横幅
    const deathBanner = document.getElementById('deathBanner');
    if (s.isDead) { deathBanner.classList.add('active'); document.getElementById('reviveCountdown').textContent = s.reviveCountdown; }
    else { deathBanner.classList.remove('active'); }

    // 渡劫横幅
    const tribBanner = document.getElementById('tribBanner');
    if (s.needTribulation && !s.isDead) { tribBanner.classList.add('active'); document.getElementById('tribChance').textContent = Math.floor(s.tribChance * 100) + '%'; }
    else { tribBanner.classList.remove('active'); }

    // 连杀
    const streak = document.getElementById('streakIndicator');
    if (s.consecutiveKills >= 5) {
      streak.classList.add('active');
      streak.classList.toggle('hot', s.consecutiveKills >= 25 && s.consecutiveKills < 50);
      streak.classList.toggle('fire', s.consecutiveKills >= 50);
      const icons = s.consecutiveKills >= 50 ? '💀' : s.consecutiveKills >= 25 ? '⚡' : '🔥';
      streak.textContent = `${icons} 连杀 x${s.consecutiveKills}`;
    } else {
      streak.classList.remove('active', 'hot', 'fire');
    }

    document.getElementById('dpsIndicator').textContent = `DPS: ${fmt(s.dps)}`;

    // 自动吃药
    document.getElementById('autoHealBtn').textContent = s.autoHealEnabled ? '✅ ON' : 'OFF';
    document.getElementById('autoHealBtn').style.color = s.autoHealEnabled ? '#88ff88' : '#aaa';

    // Buff
    const buffBar = document.getElementById('buffBar');
    let buffHtml = '';
    const now = Date.now();
    if (s.buffs.expBoost && now < s.buffs.expBoost.until) {
      const sec = Math.ceil((s.buffs.expBoost.until - now)/1000);
      buffHtml += `<span class="buff-tag">EXP x${s.buffs.expBoost.mult} (${sec}s)</span>`;
    }
    if (s.buffs.atkBoost && now < s.buffs.atkBoost.until) {
      const sec = Math.ceil((s.buffs.atkBoost.until - now)/1000);
      buffHtml += `<span class="buff-tag atk">ATK x${s.buffs.atkBoost.mult} (${sec}s)</span>`;
    }
    if (s.buffs.critBoost && now < s.buffs.critBoost.until) {
      const sec = Math.ceil((s.buffs.critBoost.until - now)/1000);
      buffHtml += `<span class="buff-tag crit">CRIT +${s.buffs.critBoost.value*100}% (${sec}s)</span>`;
    }
    if (s.autoHealEnabled) buffHtml += `<span class="buff-tag auto-heal">🩹自动(${s.pills?.heal_pill||0})</span>`;
    if (s.playerDoTs && s.playerDoTs.length > 0) {
      for (const dot of s.playerDoTs) buffHtml += `<span class="buff-tag dot">${dot.type==='poison'?'🟢毒':'🔥烧'} ${dot.ticksLeft}回合</span>`;
    }
    buffBar.innerHTML = buffHtml;

    // 日志
    const logEl = document.getElementById('battleLog');
    if (s.battleLog && s.battleLog.length > 0) {
      logEl.innerHTML = s.battleLog.map(l => `<p>${l}</p>`).join('');
      logEl.scrollTop = logEl.scrollHeight;
    }

    refreshCurrentTab();
  }

  // ========== 装备页 ==========
  function renderEquipTab() {
    const s = GameEngine.getState(); if (!s) return;
    const fmt = GameEngine.formatNumber;
    const slotNames = GameEngine.EQUIP_SLOT_NAMES;
    let html = '';
    for (const slot of ['weapon','armor','accessory','boots']) {
      const eq = s.equipment[slot];
      if (eq) {
        const cost = GameEngine.getEquipEnhanceCost(eq);
        html += `<div class="equip-slot-panel" onclick="Actions.doEnhance('${slot}')">
          <span class="slot-label">${slotNames[slot]}</span>
          <span class="equip-name" style="color:${eq.qualityColor}">${eq.name}</span>
          <span class="enhance">${eq.enhanceLevel>0?'+'+eq.enhanceLevel:''}</span>
          <span style="color:#666;font-size:8px">[${fmt(cost)}🪙]</span>
        </div>`;
      } else {
        html += `<div class="equip-slot-panel"><span class="slot-label">${slotNames[slot]}</span><span style="color:#555">空</span></div>`;
      }
    }
    document.getElementById('equippedSlots').innerHTML = html;
    document.getElementById('invCount').textContent = s.inventory.length;
    let invHtml = '';
    s.inventory.forEach((eq, i) => {
      const score = GameEngine.getEquipScore(eq);
      const cmp = GameEngine.compareEquip(i);
      let diffHtml = '';
      if (cmp) {
        if (cmp.diff > 0) diffHtml = `<span class="inv-diff up">▲${cmp.diff}</span>`;
        else if (cmp.diff < 0) diffHtml = `<span class="inv-diff down">▼${Math.abs(cmp.diff)}</span>`;
        else diffHtml = `<span class="inv-diff" style="color:#888">=</span>`;
      }
      invHtml += `<div class="inv-item">
        <span class="inv-name" style="color:${eq.qualityColor}">${eq.name}[${slotNames[eq.slot]}]</span>
        ${diffHtml}<span class="inv-score">${score}</span>
        <button onclick="Actions.doEquip(${i})">装</button><button onclick="Actions.doSell(${i})">卖</button>
      </div>`;
    });
    if (!s.inventory.length) invHtml = '<div style="color:#555;font-size:10px;padding:3px;">空空如也...</div>';
    document.getElementById('inventoryList').innerHTML = invHtml;
  }

  // ========== 丹药页 ==========
  function renderPillsTab() {
    const s = GameEngine.getState(); if (!s) return;
    const fmt = GameEngine.formatNumber;
    let html = '';
    for (const r of GameEngine.PILL_RECIPES) {
      const locked = s.realmIndex < r.minRealm;
      const matStr = Object.entries(r.materials).map(([k,v]) => {
        const names = {herb:'🌿',ore:'⛏️',essence:'💎'}; const have = s.materials[k]||0;
        return `<span style="color:${have>=v?'#88eeff':'#ff6b6b'}">${names[k]}${have}/${v}</span>`;
      }).join(' ');
      html += `<div class="card" ${locked?'style="opacity:0.4"':''}>
        <div class="card-title">${r.icon} ${r.name}</div><div class="card-desc">${r.desc}</div>
        <div class="card-info">${matStr} +${fmt(r.gold)}🪙</div>
        <div class="card-actions"><button class="action-btn" onclick="Actions.doCraftPill('${r.id}')" ${locked?'disabled':''}>炼制</button></div>
      </div>`;
    }
    document.getElementById('pillRecipes').innerHTML = html;
    let pillsHtml = ''; let hasPills = false;
    for (const r of GameEngine.PILL_RECIPES) {
      const count = s.pills[r.id]||0;
      if (count > 0) { hasPills = true;
        pillsHtml += `<div class="card"><div class="card-title">${r.icon} ${r.name} x${count}</div>
        <div class="card-actions"><button class="action-btn gold" onclick="Actions.doUsePill('${r.id}')">使用</button></div></div>`;
      }
    }
    if (!hasPills) pillsHtml = '<div style="color:#555;font-size:10px;">暂无</div>';
    document.getElementById('pillInventory').innerHTML = pillsHtml;
  }

  // ========== 功法页 ==========
  function renderSkillsTab() {
    const s = GameEngine.getState(); if (!s) return;
    const fmt = GameEngine.formatNumber;
    let html = '';
    for (const sk of GameEngine.SKILL_TREE) {
      const lv = s.skills[sk.id]||0; const locked = s.realmIndex < sk.realm;
      const maxed = lv >= sk.maxLevel;
      const goldCost = Math.floor(sk.cost * 200 * Math.pow(1 + lv, 1.5));
      const canUp = !locked && !maxed && s.gold >= goldCost;
      const canMax = !locked && !maxed;
      html += `<div class="card" ${locked?'style="opacity:0.4"':''}>
        <div class="card-title">${sk.icon} ${sk.name} ${locked?'(需'+GameEngine.REALMS[sk.realm].name+')':''}</div>
        <div class="card-desc">${sk.desc}</div>
        <div class="card-info">Lv.${lv}/${sk.maxLevel} | 费用:${fmt(goldCost)}🪙</div>
        <div class="card-actions">
          <button class="action-btn ${canUp?'gold':''}" onclick="Actions.doSkillUp('${sk.id}')" ${canUp?'':'disabled'}>${maxed?'满级':'升级'}</button>
          ${!maxed && !locked ? `<button class="action-btn" style="border-color:#FF8800;color:#FF8800;" onclick="Actions.doMaxSkillUp('${sk.id}')" ${canMax && s.gold >= goldCost?'':'disabled'}>⚡加满</button>` : ''}
        </div>
      </div>`;
    }
    document.getElementById('skillTree').innerHTML = html;
  }

  // ========== 灵兽页 ==========
  function renderBeastsTab() {
    const s = GameEngine.getState(); if (!s) return;
    const fmt = GameEngine.formatNumber;
    if (!s.beasts || !s.beasts.length) { document.getElementById('beastList').innerHTML = ''; document.getElementById('noBeast').style.display = 'block'; return; }
    document.getElementById('noBeast').style.display = 'none';
    let html = '';
    const mountName = s.visualEquip.mount;
    if (mountName) {
      const mountStats = mountName === '仙鹤' ? '闪避+5% 攻速+5%' : '攻击+15% 暴伤+20% 闪避+3%';
      html += `<div class="card" style="border-color:#88CCFF;background:#1a1a3e;">
        <div class="card-title">🐎 坐骑：${mountName}</div>
        <div class="card-desc">属性加成：${mountStats}</div>
        <div class="card-info" style="color:#88CCFF;">境界提升后自动升级坐骑</div>
      </div>`;
    } else {
      html += `<div class="card" style="opacity:0.4;"><div class="card-title">🐎 坐骑：无</div><div class="card-desc" style="color:#666;">金丹期及以上自动获得坐骑</div></div>`;
    }
    for (const b of s.beasts) {
      const isActive = b.id === s.activeBeastId;
      const feedCost = Math.floor(50 * Math.pow(1.5, b.level));
      html += `<div class="card" style="${isActive?'border-color:#ffdd57':''}">
        <div class="card-title">${b.icon} ${b.name} Lv.${b.level} ${isActive?'⭐':''}</div>
        <div class="card-desc">${b.skill}</div>
        <div class="card-info">攻+${b.baseAtk} 防+${b.baseDef} | (${b.feedCount}/${b.level*3})</div>
        <div class="card-actions">
          <button class="action-btn gold" onclick="Actions.doFeedBeast('${b.id}')">喂(${fmt(feedCost)}🪙)</button>
          <button class="action-btn" style="border-color:#FF8800;color:#FF8800;" onclick="Actions.doMaxFeedBeast('${b.id}')">⚡喂满</button>
          ${isActive?'':`<button class="action-btn" onclick="Actions.doSetBeast('${b.id}')">出战</button>`}
        </div>
      </div>`;
    }
    document.getElementById('beastList').innerHTML = html;
  }

  // ========== 秘境/塔页 ==========
  function renderRealmTab() {
    const s = GameEngine.getState(); if (!s) return;
    const fmt = GameEngine.formatNumber;
    document.getElementById('realmCharges').textContent = s.secretRealmCharges;
    document.getElementById('towerFloor').textContent = s.towerFloor;
    document.getElementById('towerBest').textContent = s.towerBestFloor;
    const milestones = GameEngine.TOWER_MILESTONES;
    const nextMs = [10,20,30,40,50,60,70,80,90,100].find(f => f >= s.towerFloor);
    document.getElementById('nextMilestone').textContent = nextMs ? `${nextMs}层 (${milestones[nextMs].name})` : '已全部达成';
    let html = '';
    GameEngine.SECRET_REALMS.forEach((r, i) => {
      const locked = s.realmIndex < r.minRealm;
      html += `<div class="realm-card ${locked?'locked':''}" onclick="${locked?'':'Actions.doEnterRealm('+i+')'}">
        <div class="rc-name">${r.name} ${locked?'🔒':''}</div>
        <div class="rc-desc">${r.desc}</div>
        <div style="color:#FF8800;font-size:8px;margin-top:2px;">${locked?'':'🎲 5层探索·随机事件·BUFF加持'}</div>
      </div>`;
    });
    document.getElementById('secretRealmList').innerHTML = html;
    let msHtml = '<div style="font-size:9px;color:#888;margin-bottom:2px;">🏆 里程碑奖励：</div>';
    for (const [floor, ms] of Object.entries(milestones)) {
      const claimed = s.towerMilestones && s.towerMilestones[floor];
      const reached = s.towerBestFloor >= parseInt(floor);
      msHtml += `<div style="font-size:9px;color:${claimed?'#4a8a4a':reached?'#FFD700':'#444'};padding:1px 0;">
        ${claimed?'✅':reached?'🏆':'🔒'} ${floor}层 - ${ms.name}${claimed?' (已领取)':''}: <span style="color:#aaa;">${ms.desc}</span>
      </div>`;
    }
    document.getElementById('towerMilestoneList').innerHTML = msHtml;
  }

  // ========== 洞府页 ==========
  function renderCaveTab() {
    const s = GameEngine.getState(); if (!s) return;
    const fmt = GameEngine.formatNumber;
    let html = '';
    for (const b of GameEngine.CAVE_BUILDINGS) {
      const lv = s.cave[b.id] || 0;
      const maxed = lv >= b.maxLevel;
      const cost = GameEngine.getCaveBuildingCost(b.id);
      const canUp = !maxed && s.gold >= cost;
      const eff = b.effect(lv);
      const effStr = Object.entries(eff).map(([k,v]) => {
        const names = {herb_per_min:'灵药/分',ore_per_min:'矿石/分',exp_bonus_pct:'修炼+%',pill_mat_reduce_pct:'材料-%',all_stat_bonus_pct:'全属性+%'};
        return `${names[k]||k}: ${v}`;
      }).join(' | ');
      html += `<div class="cave-card">
        <div class="cave-icon">${b.icon}</div>
        <div class="cave-info">
          <div class="cave-name">${b.name} Lv.${lv}/${b.maxLevel}</div>
          <div class="cave-desc">${b.desc}</div>
          <div class="cave-effect">${lv > 0 ? effStr : '未建造'}</div>
        </div>
        <div style="display:flex;gap:3px;flex-direction:column;">
          <button class="action-btn ${canUp?'gold':''}" onclick="Actions.doCaveUpgrade('${b.id}')" ${maxed||!canUp?'disabled':''}>${maxed ? '满级' : fmt(cost)+'🪙'}</button>
          ${!maxed ? `<button class="action-btn" style="border-color:#FF8800;color:#FF8800;font-size:9px;padding:2px 4px;" onclick="Actions.doMaxCaveUpgrade('${b.id}')" ${!canUp?'disabled':''}>⚡加满</button>` : ''}
        </div>
      </div>`;
    }
    document.getElementById('caveList').innerHTML = html;
  }

  // ========== 成就页 ==========
  function renderAchieveTab() {
    const s = GameEngine.getState(); if (!s) return;
    const unlocked = Object.keys(s.achievements).length;
    document.getElementById('achCount').textContent = ` (${unlocked}/${GameEngine.ACHIEVEMENTS.length})`;
    let html = '';
    for (const ach of GameEngine.ACHIEVEMENTS) {
      const done = s.achievements[ach.id];
      const rewardStr = Object.entries(ach.reward).map(([k,v]) => `${k}+${v}`).join(' ');
      html += `<div class="ach-card ${done?'unlocked':'locked'}">
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-info">
          <div class="ach-name">${ach.name} ${done?'✅':''}</div>
          <div class="ach-desc">${ach.desc}</div>
          <div class="ach-reward">${done?'已获得: ':''} ${rewardStr}</div>
        </div>
      </div>`;
    }
    document.getElementById('achieveList').innerHTML = html;
  }

  // ========== 图鉴页 ==========
  function renderBestiaryTab() {
    const bestiary = GameEngine.getMonsterBestiary();
    const discovered = bestiary.filter(b => b.discovered).length;
    document.getElementById('bestiaryCount').textContent = ` (${discovered}/${bestiary.length})`;
    const traitNames = {poison:'🟢毒',dodge:'💨闪避',thorns:'🌿荆棘',berserk:'🔴狂暴',slow:'❄️减速',burn:'🔥灼烧',critBoost:'💥会心',lifesteal:'🩸吸血',charm:'💜魅惑'};
    const fmt = GameEngine.formatNumber;
    let html = '';
    let lastRealm = '';
    const canvasItems = [];
    for (const m of bestiary) {
      if (m.realm !== lastRealm) {
        lastRealm = m.realm;
        html += `<div style="color:#888;font-size:9px;margin-top:6px;padding:2px 0;border-bottom:1px solid #2a2a5a;">— ${m.realm} —</div>`;
      }
      const cls = m.discovered ? 'discovered' : 'undiscovered';
      const canvasId = `bc-canvas-${m.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g,'_')}`;
      html += `<div class="bestiary-card ${cls}">
        <div class="bc-sprite">${m.discovered
          ? `<canvas id="${canvasId}" width="48" height="48" style="width:48px;height:48px;image-rendering:pixelated;"></canvas>`
          : `<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#555;font-size:20px;background:#111;border-radius:4px;">?</div>`
        }</div>
        <div style="flex:1;min-width:0;">
          <span style="font-weight:bold;${m.discovered?'':'color:#555;'}">${m.discovered ? m.name : '???'}</span>
          ${m.discovered ? `<span class="bc-trait">${traitNames[m.trait]||''}</span>` : ''}
          ${m.discovered ? `<div style="color:#666;font-size:9px;">HP:${fmt(m.hp)} ATK:${fmt(m.atk)} EXP:${fmt(m.exp)} 🪙:${fmt(m.gold)}</div>` : ''}
        </div>
        <div class="bc-kills">${m.discovered ? `×${fmt(m.kills)}` : ''}</div>
      </div>`;
      if (m.discovered) canvasItems.push({ id: canvasId, name: m.name, tier: m.tier });
    }
    document.getElementById('bestiaryList').innerHTML = html;
    requestAnimationFrame(() => {
      for (const item of canvasItems) {
        const cvs = document.getElementById(item.id);
        if (!cvs) continue;
        const cctx = cvs.getContext('2d');
        cctx.clearRect(0, 0, 48, 48);
        const scale = item.tier <= 1 ? 1.6 : item.tier <= 3 ? 1.3 : 1.1;
        Sprites.drawMonsterByName(cctx, item.name, 24, 28, scale, 0, 0);
      }
    });
  }

  // ========== 转生页 ==========
  function renderAscensionTab() {
    const s = GameEngine.getState(); if (!s) return;
    const fmt = GameEngine.formatNumber;
    document.getElementById('ascCount').textContent = s.ascensionCount;
    document.getElementById('ascPoints').textContent = s.ascensionPoints;
    const canAsc = s.canAscend;
    const btn = document.getElementById('ascendBtn');
    btn.disabled = !canAsc;
    if (canAsc) {
      btn.textContent = `🌟 飞升（获得${s.ascensionPointsPreview}仙缘点）`;
      btn.style.borderColor = '#FFD700'; btn.style.color = '#FFD700';
      document.getElementById('ascPreview').innerHTML = `<span style="color:#FFD700;">✅ 已达Lv.${s.level}，可以飞升！</span><br><span style="color:#888;">飞升将重置等级/装备/材料，保留灵兽/成就/图鉴/10%灵石</span>`;
    } else {
      btn.textContent = '🌟 飞升（需Lv.50+）';
      btn.style.borderColor = '#555'; btn.style.color = '#666';
      document.getElementById('ascPreview').innerHTML = `<span style="color:#888;">达到大乘期（Lv.50）即可飞升转生</span>`;
    }
    let html = '';
    for (const u of GameEngine.ASCENSION_UPGRADES) {
      const lv = s.ascensionBonuses[u.id] || 0;
      const maxed = lv >= u.maxLevel;
      const cost = u.cost * (1 + Math.floor(lv / 3));
      const canBuy = !maxed && s.ascensionPoints >= cost;
      html += `<div class="asc-card">
        <div class="asc-icon">${u.icon}</div>
        <div class="asc-info">
          <div class="asc-name">${u.name} Lv.${lv}/${u.maxLevel}</div>
          <div class="asc-desc">${u.desc}</div>
          <div class="asc-level">${maxed ? '已满级' : `当前：+${lv * u.perLevel}${u.id==='startLevel'?'级':'%'} | 费用：${cost}仙缘`}</div>
        </div>
        <button class="action-btn ${canBuy?'gold':''}" onclick="Actions.doAscUpgrade('${u.id}')" ${canBuy?'':'disabled'}>${maxed ? '满' : '升'}</button>
      </div>`;
    }
    document.getElementById('ascUpgradeList').innerHTML = html;

    // 天赋图鉴
    let talentHtml = '';
    const allTalents = GameEngine.PAST_LIFE_TALENTS;
    const currentId = s.currentTalentId;
    const owned = s.pastLifeTalents || [];
    document.getElementById('talentOwnedCount').textContent = owned.length;
    if (owned.length > 0 || s.currentTalent) {
      for (const t of allTalents) {
        const isOwned = owned.includes(t.id);
        const isCurrent = t.id === currentId;
        const cls = isCurrent ? 'border-color:#FFD700;background:#2a2a3e;' : isOwned ? 'border-color:#4a8a4a;opacity:0.7;' : 'opacity:0.2;';
        talentHtml += `<div class="asc-card" style="${cls}">
          <div class="asc-icon" style="font-size:16px;">${t.icon}</div>
          <div class="asc-info">
            <div class="asc-name" style="color:${isCurrent?'#FFD700':'#aaa'};">${t.name}${isCurrent?' ⭐当前':''}</div>
            <div class="asc-desc">${t.desc}</div>
            <div style="font-size:8px;color:#666;font-style:italic;">${isOwned ? `"${t.flavor}"` : '???'}</div>
          </div>
        </div>`;
      }
    } else {
      talentHtml = '<div style="color:#555;font-size:10px;padding:4px;">飞升后将随机觉醒前世天赋</div>';
    }
    document.getElementById('talentHistory').innerHTML = talentHtml;
  }

  // ========== 天机阁页 ==========
  function renderGachaTab() {
    const s = GameEngine.getState(); if (!s) return;
    document.getElementById('gachaTokens').textContent = s.tianjiTokens;
    document.getElementById('totalPulls').textContent = s.totalGachaPulls;
    document.getElementById('skinCount').textContent = s.ownedSkins.length;
    document.getElementById('skinTotal').textContent = GameEngine.GACHA_POOL.length;

    // 当前装备外观
    let equippedHtml = '';
    const equippedCanvasItems = [];
    const wSkin = s.equippedWeaponSkin ? GameEngine.GACHA_POOL.find(p => p.id === s.equippedWeaponSkin) : null;
    const aSkin = s.equippedArmorSkin ? GameEngine.GACHA_POOL.find(p => p.id === s.equippedArmorSkin) : null;
    const realmIdx = Math.min(Math.floor((s.level - 1) / 10), 5);

    equippedHtml += `<div class="skin-card equipped">
      <div class="skin-preview">${wSkin
        ? `<canvas id="eq-weapon-cvs" width="40" height="40" style="width:40px;height:40px;image-rendering:pixelated;"></canvas>`
        : `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#555;font-size:14px;">⚔️</div>`
      }</div>
      <span style="color:#888;min-width:32px;">⚔️武器</span>
      <span style="flex:1;${wSkin ? 'color:'+GameEngine.GACHA_QUALITY_COLORS[wSkin.quality] : 'color:#555'}">${wSkin ? wSkin.name : '默认外观'}</span>
      ${wSkin ? `<button class="action-btn" onclick="Actions.doUnequipSkin('weapon')" style="padding:1px 5px;font-size:8px;">卸下</button>` : ''}
    </div>`;
    if (wSkin) equippedCanvasItems.push({ id: 'eq-weapon-cvs', skinId: wSkin.id, type: 'weapon' });

    equippedHtml += `<div class="skin-card equipped">
      <div class="skin-preview">${aSkin
        ? `<canvas id="eq-armor-cvs" width="40" height="40" style="width:40px;height:40px;image-rendering:pixelated;"></canvas>`
        : `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#555;font-size:14px;">👘</div>`
      }</div>
      <span style="color:#888;min-width:32px;">👘衣服</span>
      <span style="flex:1;${aSkin ? 'color:'+GameEngine.GACHA_QUALITY_COLORS[aSkin.quality] : 'color:#555'}">${aSkin ? aSkin.name : '默认外观'}</span>
      ${aSkin ? `<button class="action-btn" onclick="Actions.doUnequipSkin('armor')" style="padding:1px 5px;font-size:8px;">卸下</button>` : ''}
    </div>`;
    if (aSkin) equippedCanvasItems.push({ id: 'eq-armor-cvs', skinId: aSkin.id, type: 'armor' });
    document.getElementById('equippedSkins').innerHTML = equippedHtml;

    if (equippedCanvasItems.length > 0) {
      requestAnimationFrame(() => {
        for (const item of equippedCanvasItems) {
          const cvs = document.getElementById(item.id);
          if (!cvs) continue;
          const cctx = cvs.getContext('2d');
          cctx.clearRect(0, 0, 40, 40);
          if (item.type === 'weapon') Sprites.drawWeaponWithSkin(cctx, 20, 34, 1.8, realmIdx, 0, 0, item.skinId);
          else Sprites.drawMouseByRealm(cctx, 20, 30, 1.2, realmIdx, 0, 0, { equippedArmorSkin: item.skinId });
        }
      });
    }

    // 抽卡结果
    if (lastGachaResults) {
      document.getElementById('gachaResultArea').style.display = 'block';
      let rHtml = '';
      const gachaCanvasItems = [];
      for (let ri = 0; ri < lastGachaResults.length; ri++) {
        const r = lastGachaResults[ri];
        const qColor = r.isEquip ? (r.qualityColor || '#CCCCCC') : GameEngine.GACHA_QUALITY_COLORS[r.quality];
        const qName = r.isEquip ? '装备' : GameEngine.GACHA_QUALITY_NAMES[r.quality];
        const cls = r.duplicate ? 'gacha-result-card duplicate' : 'gacha-result-card new';
        const tag = r.isEquip ? '⚔️' : (r.type === 'weapon' ? '🗡️' : '👘');
        const grCanvasId = `gr-cvs-${ri}`;
        const showPreview = !r.isEquip && r.id;
        rHtml += `<div class="${cls}" style="border-color:${qColor}20;">
          ${showPreview ? `<div class="gr-preview"><canvas id="${grCanvasId}" width="36" height="36" style="width:36px;height:36px;image-rendering:pixelated;"></canvas></div>` : ''}
          <span class="gacha-quality" style="background:${qColor};">${qName}</span>
          <span class="gacha-tag">${tag}</span>
          <div style="flex:1;">
            <span class="gacha-name" style="color:${qColor};">${r.name}</span>
            ${r.isNew && !r.isEquip ? '<span style="color:#FFD700;font-size:8px;"> ✨NEW!</span>' : ''}
            ${r.isEquip ? `<span style="color:#aaa;font-size:8px;"> ${r.desc}</span>` : ''}
            ${r.duplicate && !r.isEquip ? `<span style="color:#888;font-size:8px;"> 🔄+${r.refund}令</span>` : ''}
          </div>
        </div>`;
        if (showPreview) gachaCanvasItems.push({ id: grCanvasId, skinId: r.id, type: r.type });
      }
      document.getElementById('gachaResults').innerHTML = rHtml;
      if (gachaCanvasItems.length > 0) {
        requestAnimationFrame(() => {
          const realmIndex = s ? Math.min(Math.floor((s.level - 1) / 10), 5) : 0;
          for (const item of gachaCanvasItems) {
            const cvs = document.getElementById(item.id);
            if (!cvs) continue;
            const cctx = cvs.getContext('2d');
            cctx.clearRect(0, 0, 36, 36);
            if (item.type === 'weapon') Sprites.drawWeaponWithSkin(cctx, 18, 30, 1.5, realmIndex, 0, 0, item.skinId);
            else Sprites.drawMouseByRealm(cctx, 18, 27, 1.0, realmIndex, 0, 0, { equippedArmorSkin: item.skinId });
          }
        });
      }
    } else {
      document.getElementById('gachaResultArea').style.display = 'none';
    }

    renderSkinCollection(s);
  }

  function filterSkins(type) {
    currentSkinFilter = type;
    document.getElementById('skinFilterAll').style.borderColor = type === 'all' ? '#ffdd57' : '#4a4a8a';
    document.getElementById('skinFilterWeapon').style.borderColor = type === 'weapon' ? '#ffdd57' : '#4a4a8a';
    document.getElementById('skinFilterArmor').style.borderColor = type === 'armor' ? '#ffdd57' : '#4a4a8a';
    const s = GameEngine.getState();
    if (s) renderSkinCollection(s);
  }

  function renderSkinCollection(s) {
    const pool = GameEngine.GACHA_POOL.filter(item =>
      currentSkinFilter === 'all' || item.type === currentSkinFilter
    );
    pool.sort((a, b) => {
      const aOwned = s.ownedSkins.includes(a.id) ? 1 : 0;
      const bOwned = s.ownedSkins.includes(b.id) ? 1 : 0;
      if (aOwned !== bOwned) return bOwned - aOwned;
      return b.quality - a.quality;
    });
    const canvasItems = [];
    let html = '';
    for (const item of pool) {
      const owned = s.ownedSkins.includes(item.id);
      const equipped = (item.type === 'weapon' && s.equippedWeaponSkin === item.id) || (item.type === 'armor' && s.equippedArmorSkin === item.id);
      const qColor = GameEngine.GACHA_QUALITY_COLORS[item.quality];
      const qName = GameEngine.GACHA_QUALITY_NAMES[item.quality];
      const cls = equipped ? 'skin-card equipped' : (owned ? 'skin-card' : 'skin-card locked');
      const canvasId = `skin-cvs-${item.id}`;
      html += `<div class="${cls}">
        <div class="skin-preview">${owned
          ? `<canvas id="${canvasId}" width="40" height="40" style="width:40px;height:40px;image-rendering:pixelated;"></canvas>`
          : `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#555;font-size:16px;">?</div>`
        }</div>
        <span class="skin-quality" style="background:${qColor};">${qName}</span>
        <div class="skin-info">
          <span class="skin-name" style="color:${owned ? qColor : '#555'};">${owned ? item.name : '???'}</span>
          <div class="skin-desc">${owned ? item.desc : '未获得'}</div>
        </div>
        ${owned && !equipped ? `<button class="action-btn" onclick="Actions.doEquipSkin('${item.id}')" style="padding:1px 5px;font-size:8px;border-color:${qColor};color:${qColor};">装备</button>` : ''}
        ${equipped ? '<span style="color:#FFD700;font-size:9px;">✅</span>' : ''}
      </div>`;
      if (owned) canvasItems.push({ id: canvasId, skinId: item.id, type: item.type });
    }
    if (!html) html = '<div style="color:#555;font-size:10px;">暂无外观</div>';
    document.getElementById('skinCollection').innerHTML = html;
    requestAnimationFrame(() => drawSkinPreviews(canvasItems, s));
  }

  function drawSkinPreviews(items, state) {
    const realmIndex = state ? Math.min(Math.floor((state.level - 1) / 10), 5) : 0;
    for (const item of items) {
      const cvs = document.getElementById(item.id);
      if (!cvs) continue;
      const cctx = cvs.getContext('2d');
      cctx.clearRect(0, 0, 40, 40);
      if (item.type === 'weapon') Sprites.drawWeaponWithSkin(cctx, 20, 34, 1.8, realmIndex, 0, 0, item.skinId);
      else Sprites.drawMouseByRealm(cctx, 20, 30, 1.2, realmIndex, 0, 0, { equippedArmorSkin: item.skinId });
    }
  }

  function setLastGachaResults(results) { lastGachaResults = results; }

  // ========== 弹窗 ==========
  function showResult(title, msg) {
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultMsg').innerHTML = msg;
    document.getElementById('resultPopup').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
  }

  function closePopup() {
    document.getElementById('offlinePopup').style.display = 'none';
    document.getElementById('resultPopup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
  }

  // ========== 导出 ==========
  return {
    initTabs, updateUI, refreshCurrentTab,
    showResult, closePopup,
    filterSkins, setLastGachaResults,
  };
})();
