// ============================================================
// ui.js — 鼠鼠修仙 v3 界面
// HUD / 神通栏 / 修行指引 / 标签页 / 弹窗 / 提示
// 只有内容变化时才重写 DOM，避免闪烁与滚动跳动
// ============================================================

const UI = (() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const fmt = n => GameEngine.formatNumber(n);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  let currentTab = 'status';
  let codexSub = 'ach';
  let skinFilter = 'all';
  let lastPulls = null;
  let logCollapsed = false;
  let questCollapsed = false;
  try {
    const v = localStorage.getItem('mc2_questCollapsed');
    questCollapsed = v === null ? window.matchMedia('(max-width: 860px)').matches : v === '1'; // 手机默认收起
  } catch (e) {}
  const cache = {};
  let lastTabRender = 0;

  const SLOT_ICONS = { weapon: '⚔️', armor: '👘', accessory: '📿', boots: '👢' };
  const MAT_NAMES = { herb: '灵药', ore: '矿石', essence: '精华' };
  const MAT_ICONS = { herb: '🌿', ore: '⛏️', essence: '💎' };

  const TABS = [
    { id: 'status', icon: '🐭', name: '角色' },
    { id: 'equip', icon: '⚔️', name: '装备', unlock: s => s.level >= 2 || s.inventory.length > 0 || EQUIP_ANY(s), lock: 'Lv.2' },
    { id: 'skills', icon: '📜', name: '功法', unlock: s => s.level >= 2, lock: 'Lv.2' },
    { id: 'pills', icon: '💊', name: '丹药', unlock: s => s.level >= 5, lock: 'Lv.5' },
    { id: 'beasts', icon: '🐾', name: '灵兽', unlock: s => s.level >= 8 || s.beasts.length > 0, lock: 'Lv.8' },
    { id: 'realm', icon: '🏔️', name: '历练', unlock: s => s.level >= 7, lock: 'Lv.7' },
    { id: 'cave', icon: '🏠', name: '洞府', unlock: s => s.level >= 5, lock: 'Lv.5' },
    { id: 'gacha', icon: '🎰', name: '天机阁', unlock: s => s.level >= 8 || s.tianjiTokens > 0 || s.totalGachaPulls > 0, lock: 'Lv.8' },
    { id: 'ascend', icon: '🌟', name: '飞升', unlock: s => s.level >= 30 || s.ascensionCount > 0, lock: '元婴期' },
    { id: 'codex', icon: '📖', name: '图录' },
  ];
  function EQUIP_ANY(s) { return ['weapon', 'armor', 'accessory', 'boots'].some(k => s.equipment[k]); }

  function setHTML(el, html, key) {
    if (!el) return false;
    if (cache[key] === html) return false;
    el.innerHTML = html;
    cache[key] = html;
    return true;
  }

  // ========== 提示 & 弹窗 ==========
  function toast(text, cls) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.innerHTML = text;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2800);
  }

  let modalButtons = [];
  function modal(opts) {
    $('modalTitle').innerHTML = opts.title || '';
    $('modalBody').innerHTML = opts.html || '';
    $('modal').classList.toggle('wide', !!opts.wide);
    modalButtons = opts.buttons || [{ text: '好的', cls: 'gold' }];
    $('modalActions').innerHTML = modalButtons.map((b, i) => `<button class="btn ${b.cls || ''}" data-action="modalBtn" data-i="${i}">${b.text}</button>`).join('');
    $('modalMask').classList.add('on');
    if (opts.onOpen) opts.onOpen();
  }
  function closeModal() { $('modalMask').classList.remove('on'); }
  function modalButton(i) {
    const b = modalButtons[i];
    const keep = b && b.action ? b.action() === false : false;
    if (!keep) closeModal();
  }
  function confirmBox(title, html, okText, onOk, okCls) {
    modal({ title, html, buttons: [{ text: '取消' }, { text: okText || '确定', cls: okCls || 'gold', action: onOk }] });
  }

  // ========== 标签栏 ==========
  function initTabs() {
    $('tabs').innerHTML = TABS.map(t => `<button class="tab" data-action="tab" data-tab="${t.id}" id="tab-${t.id}"><span class="ti">${t.icon}</span><span>${t.name}</span></button>`).join('');
  }

  function tabDots(s) {
    const dots = {};
    // 'hot' = 需要玩家处理（红点）；'soft' = 有可升级项（小金点，不催促）
    const lv = (hot, soft) => hot ? 'hot' : soft ? 'soft' : null;
    dots.equip = lv(s.inventory.some(it => GameEngine.getEquipPowerDelta(it) > 0), false);
    dots.skills = lv(false, GameEngine.SKILL_TREE.some(sk => s.realmIndex >= sk.realm && (s.skills[sk.id] || 0) < sk.maxLevel && s.gold >= GameEngine.getSkillCost(sk.id)));
    dots.realm = lv(s.secretRealmCharges > 0 || (!s.towerDailyRewardClaimed && s.towerBestFloor > 0), false);
    dots.cave = lv(false, GameEngine.CAVE_BUILDINGS.some(b => s.level >= b.minLevel && (s.cave[b.id] || 0) < b.maxLevel && s.gold >= GameEngine.getCaveBuildingCost(b.id)));
    dots.gacha = lv(false, s.tianjiTokens >= GameEngine.GACHA_COST_SINGLE);
    dots.ascend = lv(!!s.pendingTalentList || s.canAscend, GameEngine.ASCENSION_UPGRADES.some(u => (s.ascensionBonuses[u.id] || 0) < u.maxLevel && s.ascensionPoints >= GameEngine.getAscensionUpgradeCost(u, s.ascensionBonuses[u.id] || 0)));
    dots.pills = lv(s.needTribulation && !(s.pills.trib_pill > 0), false);
    return dots;
  }

  function updateTabs(s) {
    const dots = tabDots(s);
    for (const t of TABS) {
      const el = $('tab-' + t.id);
      if (!el) continue;
      const unlocked = !t.unlock || t.unlock(s);
      el.classList.toggle('locked', !unlocked);
      el.classList.toggle('active', currentTab === t.id);
      el.title = unlocked ? t.name : `${t.lock} 解锁`;
      let dot = el.querySelector('.dot');
      const want = unlocked && dots[t.id] && currentTab !== t.id;
      if (want && !dot) { dot = document.createElement('i'); el.appendChild(dot); }
      if (want) dot.className = 'dot ' + dots[t.id];
      if (!want && dot) dot.remove();
    }
  }

  function switchTab(id) {
    const s = GameEngine.getState();
    const t = TABS.find(x => x.id === id);
    if (!t) return;
    if (t.unlock && !t.unlock(s)) { toast(`【${t.name}】${t.lock} 解锁`, 'red'); Sound.play('error'); return; }
    currentTab = id;
    $('tabBody').scrollTop = 0;
    // 手机端整页滚动：若已滚过标签栏，切换后回到新标签页顶部
    if (window.matchMedia('(max-width: 860px)').matches) {
      const top = $('tabs').parentElement.getBoundingClientRect().top + window.scrollY; // 标签栏是 sticky，用外层容器定位
      if (window.scrollY > top) window.scrollTo(0, top);
    }
    renderTab(true);
    updateTabs(s);
  }

  // ========== 主刷新 ==========
  function update(forceTab) {
    const s = GameEngine.getState();
    if (!s) return;
    updateHeader(s);
    updateHUD(s);
    updateSkillBar(s);
    updateQuest(s);
    updateLog(s);
    const now = performance.now();
    if (forceTab || now - lastTabRender > 900) { lastTabRender = now; updateTabs(s); renderTab(false, s); }
  }

  let lastGold = 0;
  function updateHeader(s) {
    $('resGold').textContent = fmt(s.gold);
    if (s.gold > lastGold) { const el = $('resGold').parentElement; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    lastGold = s.gold;
    $('resToken').textContent = fmt(s.tianjiTokens);
    $('resHerb').textContent = fmt(s.materials.herb);
    $('resOre').textContent = fmt(s.materials.ore);
    $('resEssence').textContent = fmt(s.materials.essence);
    document.querySelectorAll('#speedGroup button').forEach(b => b.classList.toggle('active', +b.dataset.v === s.battleSpeed));
    $('soundBtn').textContent = Sound.isOn() ? '🔊' : '🔇';
  }

  function updateHUD(s) {
    const c = s.computed;
    const chip = $('hudRealm');
    chip.textContent = s.realm; chip.style.color = s.realmColor;
    $('hudLevel').textContent = 'Lv.' + s.level;
    $('hudPower').textContent = fmt(s.power);
    const expFull = s.needTribulation || s.level >= s.maxLevel;
    $('hudExpFill').style.width = s.expPercent + '%';
    $('hudExpFill').parentElement.classList.toggle('full', expFull);
    $('hudExpText').textContent = expFull ? (s.needTribulation ? '修为圆满 · 待渡劫' : '大乘巅峰') : `修为 ${s.expPercent}%`;
    const hpPct = Math.max(0, Math.min(100, s.hp / c.maxHp * 100));
    $('hudHpFill').style.width = hpPct + '%';
    $('hudHpFill').parentElement.classList.toggle('low', hpPct < 30);
    $('hudHpText').textContent = `${fmt(s.hp)} / ${fmt(c.maxHp)}`;
    $('hudScene').textContent = `· ${s.realmScene} ·`;

    // Buff
    const now = Date.now(), b = [];
    const sec = t => Math.max(0, Math.ceil((t - now) / 1000));
    if (s.buffs.expBoost && s.buffs.expBoost.until > now) b.push(`<span class="buff good">修炼×${s.buffs.expBoost.mult} ${sec(s.buffs.expBoost.until)}s</span>`);
    if (s.buffs.atkBoost && s.buffs.atkBoost.until > now) b.push(`<span class="buff good">攻击×${s.buffs.atkBoost.mult} ${sec(s.buffs.atkBoost.until)}s</span>`);
    if (s.buffs.critBoost && s.buffs.critBoost.until > now) b.push(`<span class="buff good">暴击+${Math.round(s.buffs.critBoost.value * 100)}% ${sec(s.buffs.critBoost.until)}s</span>`);
    if (s.buffs.fortuneStar && s.buffs.fortuneStar.until > now) b.push(`<span class="buff gold">🌟福星 修为灵石×2 ${sec(s.buffs.fortuneStar.until)}s</span>`);
    if (s.buffs.tribBoost && s.buffs.tribBoost.until > now) b.push(`<span class="buff gold">渡劫+${Math.round(s.buffs.tribBoost.value * 100)}% ${sec(s.buffs.tribBoost.until)}s</span>`);
    if (s.shield && s.shield.amount > 0) b.push(`<span class="buff gold">护盾 ${fmt(s.shield.amount)}</span>`);
    for (const d of s.playerDoTs || []) b.push(`<span class="buff bad">${d.type === 'poison' ? '中毒' : '灼烧'} ${d.ticksLeft}</span>`);
    if (s.autoHealEnabled) b.push(`<span class="buff">💚自动服药 ×${s.pills.heal_pill || 0}</span>`);
    setHTML($('hudBuffs'), b.join(''), 'buffs');

    // 连斩
    const st = $('hudStreak');
    const k = s.consecutiveKills;
    st.classList.toggle('on', k >= 5);
    st.classList.toggle('hot', k >= 25 && k < 50);
    st.classList.toggle('fire', k >= 50);
    if (k >= 5) st.textContent = `${k >= 50 ? '💀' : k >= 25 ? '⚡' : '🔥'} ${k} 连斩`;

    // 渡劫
    const trib = $('tribCta');
    const showTrib = s.needTribulation && !s.isDead && !Renderer.isTribulating();
    trib.classList.toggle('on', showTrib);
    $('battleArea').classList.toggle('trib-on', showTrib);
    if (showTrib) {
      const next = GameEngine.REALMS[Math.min(5, s.realmIndex + 1)];
      $('tribNext').textContent = next.name;
      $('tribNext').style.color = next.color;
      $('tribChance').textContent = Math.round(s.tribChance * 100) + '%';
      $('tribBtn').disabled = s.tribCooldown > 0;
      $('tribBtn').firstChild.textContent = s.tribCooldown > 0 ? `余威 ${s.tribCooldown}s ` : '⚡ 渡劫 ';
      const tips = [];
      if (!(s.buffs.tribBoost && s.buffs.tribBoost.until > now)) tips.push((s.pills.trib_pill || 0) > 0 ? '💊 先服金元丹 +25%' : '💊 金元丹 +25%');
      if (!s.activeBeastId) tips.push('🐾 灵兽出战+5%');
      if (s.tribFailStreak > 0) tips.push(`道心+${s.tribFailStreak * 10}%`);
      $('tribTip').textContent = tips.join(' · ') || '准备就绪，放手一搏！';
    }

    // 阵亡
    $('deathOverlay').classList.toggle('on', !!s.isDead);
    if (s.isDead) {
      $('reviveCountdown').textContent = s.reviveCountdown;
      $('deathTip').textContent = s.deathCount >= 3 ? '打不过？去【功法】修炼、【装备】换装强化、开启自动服药，或服用丹药再战。' : '';
    }
  }

  function updateSkillBar(s) {
    const html = s.activeSkills.map(sk => {
      const ready = sk.unlocked && sk.cooldown <= 0 && !s.isDead;
      const cdPct = sk.unlocked && sk.cooldown > 0 ? Math.round(sk.cooldown / sk.cd * 100) : 0;
      return `<button class="skill ${sk.unlocked ? (ready ? 'ready' : '') : 'locked'}" data-action="cast" data-id="${sk.id}" id="sk-${sk.id}" style="--sk:${sk.color}" title="${esc(sk.name)}：${esc(sk.desc)}（冷却${sk.cd}回合）">
        <span class="ico">${sk.icon}</span><span class="nm">${sk.name}</span>
        ${sk.unlocked && sk.cooldown > 0 ? `<i class="cd" style="height:${cdPct}%"></i><span class="cdn">${sk.cooldown}</span>` : ''}
        ${!sk.unlocked ? `<span class="lock">Lv.${sk.unlockLevel}<br>领悟</span>` : ''}
      </button>`;
    }).join('') + `<button class="auto-toggle ${s.autoCast ? 'on' : ''} ${s.autoCastUnlocked ? '' : 'locked'}" data-action="autoCast" title="${s.autoCastUnlocked ? '自动施放神通' : '筑基期（Lv.10）解锁自动施放'}">${s.autoCastUnlocked ? (s.autoCast ? '自动<br>ON' : '自动<br>OFF') : '🔒<br>自动'}</button>`;
    setHTML($('skillBar'), html, 'skillbar');
  }

  function flashSkill(id) {
    const el = $('sk-' + id);
    if (el) { el.classList.remove('cast'); void el.offsetWidth; el.classList.add('cast'); }
  }

  function updateQuest(s) {
    const q = s.quest;
    const el = $('questCard');
    if (!q) { setHTML(el, '', 'quest'); return; }
    el.classList.toggle('ready', q.done);
    const mini = questCollapsed && !q.done; // 可领取时总是展开
    el.classList.toggle('mini', mini);
    const pct = q.progressValue ? Math.min(100, q.progressValue[0] / q.progressValue[1] * 100) : 0;
    const prog = q.progressValue ? `<div class="q-prog"><i style="width:${pct}%"></i></div>` : '';
    if (mini) {
      setHTML(el, `<button class="q-chip" data-action="toggleQuest" title="展开修行指引">📜 <b>${esc(q.title)}</b>${q.progressValue ? `<span class="q-chip-n">${Math.min(q.progressValue[0], q.progressValue[1])}/${q.progressValue[1]}</span>` : ''}<span class="q-caret">▾</span></button>`, 'quest');
      return;
    }
    const html = `<div class="q-head">📜 修行指引<span class="q-idx">${q.index + 1}/${q.total}</span>${q.done ? '' : '<button class="q-min" data-action="toggleQuest" title="收起">▴</button>'}</div>
      <div class="q-title">${q.title}</div>
      <div class="q-desc">${q.desc}${q.progressValue ? `（${Math.min(q.progressValue[0], q.progressValue[1])}/${q.progressValue[1]}）` : ''}</div>
      ${prog}
      <div class="q-foot">🎁 ${q.rewardText}${q.done ? '<button class="btn gold sm" data-action="claimQuest">领取</button>' : ''}</div>`;
    setHTML(el, html, 'quest');
  }

  function updateLog(s) {
    const log = s.battleLog || [];
    const key = log.length + '|' + (log[log.length - 1] || '');
    if (cache.logKey === key) return;
    cache.logKey = key;
    const el = $('battleLog');
    el.innerHTML = log.slice(-40).map(l => `<p>${l}</p>`).join('');
    el.scrollTop = el.scrollHeight;
    $('dpsValue').textContent = fmt(s.dps);
  }

  function toggleQuest() {
    questCollapsed = !questCollapsed;
    try { localStorage.setItem('mc2_questCollapsed', questCollapsed ? '1' : '0'); } catch (e) {}
    updateQuest(GameEngine.getState());
  }

  function toggleLog() {
    logCollapsed = !logCollapsed;
    $('logbox').classList.toggle('collapsed', logCollapsed);
    $('logToggle').textContent = logCollapsed ? '展开' : '收起';
    setTimeout(() => Renderer.resize(), 50);
  }

  // ========== 标签页渲染 ==========
  function renderTab(force, s) {
    s = s || GameEngine.getState();
    if (force) delete cache['tab'];
    const R = RENDER[currentTab];
    if (!R) return;
    const html = R(s);
    const changed = setHTML($('tabBody'), html, 'tab');
    if (changed && POST[currentTab]) POST[currentTab](s);
    else if (POST_ALWAYS[currentTab]) POST_ALWAYS[currentTab](s);
  }

  const statRows = (c) => [
    ['攻击', fmt(c.attack), 't-red'], ['防御', fmt(c.defense), 't-blue'],
    ['生命', fmt(c.maxHp), 't-jade'], ['攻速', `+${c.atkSpeed}%`, ''],
    ['暴击率', `${c.critRate}%`, 't-gold'], ['暴击伤害', `${c.critDamage}%`, 't-gold'],
    ['闪避', `${c.dodge}%`, ''], ['吸血', `${c.lifesteal}%`, ''],
    ['修炼加成', `+${c.expBonus}%`, 't-purple'], ['灵石加成', `+${c.goldBonus}%`, 't-orange'],
    ['神通伤害', `+${c.skillDmg}%`, 't-blue'], ['', '', ''],
  ];

  // enhLevel：该装备所在部位的强化等级（强化属于部位，背包装备按"穿上后"的数值显示）
  function itemStatText(item, enhLevel) {
    const enh = 1 + (enhLevel || 0) * 0.08;
    const parts = [];
    for (const [k, v] of Object.entries(item.baseAttr || {})) {
      const val = ['attack', 'defense', 'maxHp'].includes(k) ? Math.floor(v * enh) : v;
      parts.push(`${GameEngine.STAT_NAMES[k]} +${fmt(val)}${GameEngine.PERCENT_STATS.has(k) ? '%' : ''}`);
    }
    return parts.join('　');
  }
  function affixText(a, enhLevel) {
    const name = GameEngine.STAT_NAMES[a.stat] || a.name;
    if (a.type === 'percent') return `${name} +${a.value}%`;
    const enh = ['attack', 'defense', 'maxHp'].includes(a.stat) ? 1 + (enhLevel || 0) * 0.08 : 1;
    return `${name} +${fmt(Math.floor(a.value * enh))}${GameEngine.PERCENT_STATS.has(a.stat) ? '%' : ''}`;
  }
  function qualityLabel(q) { return GameEngine.EQUIP_QUALITIES[q].label; }
  // 温养按钮：装备等级落后时出现
  function refineBtn(s, slot, eq) {
    const c = GameEngine.getRefineCost(eq);
    if (!c) return '';
    const ok = s.gold >= c.gold && (s.materials.ore || 0) >= c.ore && (s.materials.essence || 0) >= c.essence;
    const mats = `⛏️${c.ore}${c.essence ? ' 💎' + c.essence : ''}`;
    return `<button class="btn sm ${ok ? 'jade' : ''}" data-action="refine" data-slot="${slot}" ${ok ? '' : 'disabled'} title="温养：提升到 Lv.${s.level}，品质和词条保留（${fmt(c.gold)} 灵石 · 矿石${c.ore}${c.essence ? ' · 精华' + c.essence : ''}）">温养→Lv.${s.level}<span class="cost">${fmt(c.gold)} ${mats}</span></button>`;
  }

  const RENDER = {
    status(s) {
      const c = s.computed;
      const t = s.currentTalent;
      const buffs = [];
      const mountTxt = s.visualEquip.mount ? `${s.visualEquip.mount}（${s.visualEquip.mountStats}）` : '金丹期获得坐骑';
      return `
      <div class="hero">
        <canvas id="heroCanvas" width="34" height="38"></canvas>
        <div class="grow">
          <div class="hero-name">鼠鼠 <span class="realm-chip" style="color:${s.realmColor};font-size:11px">${s.realm}</span></div>
          <div class="muted">Lv.${s.level} · ${s.realmScene}${s.ascensionCount ? ` · 第${s.ascensionCount + 1}世` : ''}</div>
          <div class="hero-power">战力 <b>${fmt(s.power)}</b></div>
          ${t ? `<div class="small t-gold" style="margin-top:4px">${t.icon} 前世天赋·${t.name}：<span class="muted">${t.desc}</span></div>` : ''}
        </div>
      </div>
      <div class="sec"><div class="sec-title">属性</div>
        <div class="stat-grid">${statRows(c).filter(r => r[0]).map(([k, v, cls]) => `<div class="stat"><span>${k}</span><b class="${cls}">${v}</b></div>`).join('')}</div>
        <div class="muted small" style="margin-top:6px">🐎 坐骑：${mountTxt}</div>
      </div>
      <div class="sec"><div class="sec-title">自动服药</div>
        <div class="card row">
          <button class="switch ${s.autoHealEnabled ? 'on' : ''}" data-action="autoHeal"></button>
          <div class="grow">生命低于
            <select data-change="healThreshold">${[20, 30, 40, 50, 60].map(v => `<option value="${v}" ${s.autoHealThreshold === v ? 'selected' : ''}>${v}%</option>`).join('')}</select>
            时自动服用回元丹</div>
          <span class="tag">持有 ${s.pills.heal_pill || 0}</span>
        </div>
      </div>
      <div class="sec"><div class="sec-title">修行记录</div>
        <div class="card kv">
          <div>击杀 <b>${fmt(s.killCount)}</b></div><div>精英 <b>${fmt(s.eliteKillCount)}</b></div>
          <div>陨落 <b>${s.deathCount}</b></div><div>最高连斩 <b>${s.consecutiveKills}</b></div>
          <div>最高一击 <b>${fmt(s.stats.maxHit || 0)}</b></div><div>神通施放 <b>${fmt(s.stats.skillCasts || 0)}</b></div>
          <div>累计灵石 <b>${fmt(s.totalGold)}</b></div><div>锁妖塔 <b>${s.towerBestFloor}层</b></div>
          <div>天降机缘 <b>${s.stats.fortunes || 0}次</b></div>
          <div>飞升 <b>${s.ascensionCount}次</b></div><div>修行时长 <b>${Math.floor((s.stats.playTime || 0) / 60000)}分</b></div>
        </div>
      </div>`;
    },

    equip(s) {
      const slots = ['weapon', 'armor', 'accessory', 'boots'].map(slot => {
        const eq = s.equipment[slot];
        if (!eq) return `<div class="card slot"><div class="slot-ico">${SLOT_ICONS[slot]}</div><div class="grow"><div class="item-name muted">${GameEngine.EQUIP_SLOT_NAMES[slot]} · 空</div><div class="muted small">击杀妖兽有概率掉落</div></div></div>`;
        const cost = GameEngine.getEquipEnhanceCost(eq);
        const enhLv = (s.slotEnhance || {})[slot] || 0;
        const maxed = enhLv >= 15;
        return `<div class="card slot">
          <div class="slot-ico" style="--qc:${eq.qualityColor}">${SLOT_ICONS[slot]}</div>
          <div class="grow">
            <div class="item-name" style="color:${eq.qualityColor}">${eq.name}<span class="enh">${enhLv ? '+' + enhLv : ''}</span></div>
            <div class="muted small">${qualityLabel(eq.qualityIdx)} · Lv.${eq.level} · ${itemStatText(eq, enhLv)}</div>
            <div class="affix-list">${eq.affixes.map(a => `<span class="affix">◆ ${affixText(a, enhLv)}</span>`).join('')}</div>
          </div>
          <div class="slot-btns">
            <button class="btn sm ${!maxed && s.gold >= cost ? 'gold' : ''}" data-action="enhance" data-slot="${slot}" ${maxed || s.gold < cost ? 'disabled' : ''}>${maxed ? '已满' : `强化<span class="cost">${fmt(cost)}</span>`}</button>
            ${refineBtn(s, slot, eq)}
          </div>
        </div>`;
      }).join('');
      // 品质更高却更弱时，多半是等级差距：直接标出来
      const lowLv = (it, d) => { const cur = s.equipment[it.slot]; return d <= 0 && cur && it.qualityIdx > cur.qualityIdx && it.level < cur.level ? `<div class="muted" style="font-size:10px">低${cur.level - it.level}级</div>` : ''; };
      const items = s.inventory.map(it => ({ it, d: GameEngine.getEquipPowerDelta(it) }));
      items.sort((a, b) => (b.d > 0) - (a.d > 0) || b.it.qualityIdx - a.it.qualityIdx || b.d - a.d);
      const inv = items.map(({ it, d }) => `
        <div class="inv-item ${d > 0 ? 'better' : ''}" style="--qc:${it.qualityColor}">
          <div class="grow">
            <div><b style="color:${it.qualityColor}">${it.name}</b> <span class="tag">${GameEngine.EQUIP_SLOT_NAMES[it.slot]}</span> <span class="tag">${qualityLabel(it.qualityIdx)}</span> <span class="muted small">Lv.${it.level}</span></div>
            <div class="muted small">${itemStatText(it, (s.slotEnhance || {})[it.slot])}${it.affixes.length ? '　' + it.affixes.map(a => affixText(a, (s.slotEnhance || {})[it.slot])).join('　') : ''}</div>
          </div>
          <div class="small ${d > 0 ? 'delta-up' : 'delta-down'}" title="装备后战力变化">${d > 0 ? '▲' + fmt(d) : d < 0 ? '▼' + fmt(-d) : '='}${lowLv(it, d)}</div>
          <button class="btn sm ${d > 0 ? 'jade' : ''}" data-action="equip" data-id="${it.id}">装备</button>
          <button class="btn sm ghost" data-action="sell" data-id="${it.id}" title="出售 ${fmt(GameEngine.getEquipSellPrice(it))} 灵石">卖</button>
        </div>`).join('');
      const qOpts = [[-1, '关闭'], [0, '凡品'], [1, '良品及以下'], [2, '稀有及以下'], [3, '珍品及以下']];
      const autoCard = `<div class="card row">
          <button class="switch ${s.autoEquip ? 'on' : ''}" data-action="toggleAutoEquip"></button>
          <div class="grow small">掉落更强的装备时<b>自动换上</b></div>
        </div>
        <div class="card row">
          <span class="small grow">自动出售不如身上的
            <select data-change="autoSell">${qOpts.map(([v, n]) => `<option value="${v}" ${s.autoSellQuality === v ? 'selected' : ''}>${n}</option>`).join('')}</select> 装备</span>
        </div>`;
      return `
      <div class="sec"><div class="sec-title">挂机设置</div>${autoCard}</div>
      <div class="sec"><div class="sec-title">已装备<span class="btns"><button class="btn sm gold" data-action="autoEquip">⚡一键换装</button></span></div>${slots}
        <div class="hint">强化属于<b>部位</b>，换上新装备不会丢失。每级 +8% 基础属性与固定词条，最高 +15；背包里的数值已按对应部位的强化计算。<br>装备等级落后时可<b>温养</b>到当前等级，品质和词条保留——喜欢的红装可以一直用下去</div></div>
      <div class="sec"><div class="sec-title">背包<span class="extra">${s.inventory.length}/${s.inventoryMax}</span><span class="btns"><button class="btn sm red" data-action="sellWeaker">出售弱装</button></span></div>
        ${inv || '<div class="hint">空空如也，打怪掉落装备吧</div>'}
      </div>`;
    },

    skills(s) {
      const actives = s.activeSkills.map(sk => `
        <div class="card row ${sk.unlocked ? '' : 'dim'}">
          <div class="skill-ico">${sk.icon}</div>
          <div class="grow"><b>${sk.name}</b> <span class="tag">冷却 ${sk.cd} 回合</span>
            <div class="muted small">${sk.desc}</div></div>
          <span class="tag">${sk.unlocked ? '已领悟' : 'Lv.' + sk.unlockLevel}</span>
        </div>`).join('');
      const skills = GameEngine.SKILL_TREE.map(sk => {
        const lv = s.skills[sk.id] || 0;
        const locked = s.realmIndex < sk.realm;
        const maxed = lv >= sk.maxLevel;
        const cost = GameEngine.getSkillCost(sk.id);
        const can = !locked && !maxed && s.gold >= cost;
        const total = sk.effect.perLevel * lv;
        const unit = sk.effect.type === 'percent' || GameEngine.PERCENT_STATS.has(sk.effect.stat) ? '%' : '';
        return `<div class="card skill-card ${locked ? 'dim' : ''}">
          <div class="row">
            <div class="skill-ico">${sk.icon}</div>
            <div class="grow">
              <div><b>${sk.name}</b> <span class="lv-pips">${lv}/${sk.maxLevel}</span>${locked ? ` <span class="tag">需${GameEngine.REALMS[sk.realm].name}</span>` : ''}</div>
              <div class="muted small">${sk.desc}${lv ? ` · 当前 <span class="t-jade">+${Math.round(total * 10) / 10}${unit}</span>` : ''}</div>
              <div class="prog jade" style="margin-top:5px"><i style="width:${lv / sk.maxLevel * 100}%"></i></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <button class="btn sm ${can ? 'gold' : ''}" data-action="skillUp" data-id="${sk.id}" ${can ? '' : 'disabled'}>${maxed ? '圆满' : `修炼<span class="cost">${fmt(cost)}</span>`}</button>
              ${!maxed && !locked ? `<button class="btn sm" data-action="skillMax" data-id="${sk.id}" ${can ? '' : 'disabled'}>连升</button>` : ''}
            </div>
          </div></div>`;
      }).join('');
      return `<div class="sec"><div class="sec-title">神通<span class="extra">${s.autoCastUnlocked ? '可在战斗画面开启自动施放' : '筑基期解锁自动施放'}</span></div>${actives}</div>
        <div class="sec"><div class="sec-title">功法<span class="extra">消耗灵石修炼，永久提升</span></div>${skills}</div>`;
    },

    pills(s) {
      const cards = GameEngine.PILL_RECIPES.map(r => {
        const locked = s.realmIndex < r.minRealm;
        const cost = GameEngine.getPillCost(r);
        const mats = Object.entries(cost.materials).map(([k, v]) => {
          const have = s.materials[k] || 0;
          return `<span class="tag" style="color:${have >= v ? '#bfe8ff' : '#ff8a9a'}">${MAT_ICONS[k]} ${fmt(have)}/${v}</span>`;
        }).join(' ');
        const canCraft = !locked && s.gold >= cost.gold && Object.entries(cost.materials).every(([k, v]) => (s.materials[k] || 0) >= v);
        const own = s.pills[r.id] || 0;
        const autoable = ['exp_pill', 'super_exp', 'atk_pill', 'crit_pill'].includes(r.id);
        const autoOn = !!(s.autoPills && s.autoPills[r.id]);
        const autoRow = autoable && !locked ? `<div class="row small" style="margin-top:6px;gap:6px">
            <button class="switch ${autoOn ? 'on' : ''}" data-action="toggleAutoPill" data-id="${r.id}" ${s.autoPillUnlocked ? '' : 'disabled'}></button>
            <span class="${s.autoPillUnlocked ? '' : 'muted'}">${s.autoPillUnlocked ? '药效结束时自动服用' : `Lv.${GameEngine.AUTO_PILL_LEVEL} 解锁自动服用`}</span></div>` : '';
        return `<div class="card ${locked ? 'dim' : ''}">
          <div class="row">
            <div class="skill-ico">${r.icon}</div>
            <div class="grow"><b>${r.name}</b> ${own ? `<span class="tag t-gold">持有 ${own}</span>` : ''}${locked ? ` <span class="tag">需${GameEngine.REALMS[r.minRealm].name}</span>` : ''}
              <div class="muted small">${r.desc}</div>
              <div style="margin-top:4px">${mats} <span class="tag" style="color:${s.gold >= cost.gold ? '#ffdf8a' : '#ff8a9a'}">🪙 ${fmt(cost.gold)}</span></div>
              ${autoRow}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <button class="btn sm ${canCraft ? 'gold' : ''}" data-action="craft" data-id="${r.id}" ${canCraft ? '' : 'disabled'}>炼制</button>
              <button class="btn sm" data-action="craft5" data-id="${r.id}" ${canCraft ? '' : 'disabled'}>×5</button>
              ${own ? `<button class="btn sm jade" data-action="usePill" data-id="${r.id}">服用</button>` : ''}
            </div>
          </div></div>`;
      }).join('');
      const forge = s.cave.forge_room || 0;
      return `<div class="sec"><div class="sec-title">炼丹房<span class="extra">${forge ? `炼丹室减免材料 ${forge * 10}%` : '材料来自打怪/秘境/洞府'}</span></div>${cards}</div>`;
    },

    beasts(s) {
      const mount = s.visualEquip.mount;
      const mountCard = `<div class="card row ${mount ? 'hl' : 'dim'}">
        <canvas class="portrait" id="mountCanvas" width="44" height="36" style="width:66px;height:54px"></canvas>
        <div class="grow"><b>🐎 坐骑：${mount || '未获得'}</b><div class="muted small">${mount ? s.visualEquip.mountStats : '金丹期自动获得仙鹤，化神期获得麒麟'}</div></div></div>`;
      const cards = GameEngine.BEAST_TEMPLATES.map(t => {
        const b = s.beasts.find(x => x.templateId === t.id);
        if (!b) {
          return `<div class="card row dim"><canvas class="portrait beast-cv" data-name="${t.id}" data-sil="1" width="32" height="28" style="width:64px;height:56px"></canvas>
            <div class="grow"><b>???</b><div class="muted small">${GameEngine.REALMS[t.minRealm].name}起，击杀妖兽时有概率遇到</div></div></div>`;
        }
        const bb = GameEngine.beastBonus(b);
        const active = s.activeBeastId === b.id;
        const cost = GameEngine.getBeastFeedCost(b.id);
        const capped = b.level >= s.level + 5;
        const can = !capped && s.gold >= cost;
        return `<div class="card ${active ? 'hl' : ''}"><div class="row">
          <canvas class="portrait beast-cv" data-name="${t.id}" width="32" height="28" style="width:64px;height:56px"></canvas>
          <div class="grow">
            <div><b>${t.name}</b> <span class="lv-pips">Lv.${b.level}</span> ${active ? '<span class="tag t-gold">出战中</span>' : ''}</div>
            <div class="small t-purple">${t.skill}</div>
            <div class="muted small">${active ? `攻击+${Math.round(bb.atkPct)}% 防御+${Math.round(bb.defPct)}% · 协战 ${Math.round(bb.dmgMult * 100)}%攻击` : `<span class="t-jade">护法中</span>：攻击+${(bb.atkPct * GameEngine.BEAST_GUARD_RATE).toFixed(1)}% 防御+${(bb.defPct * GameEngine.BEAST_GUARD_RATE).toFixed(1)}%<span class="faint">（出战时 +${Math.round(bb.atkPct)}% / +${Math.round(bb.defPct)}%）</span>`}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button class="btn sm ${can ? 'gold' : ''}" data-action="feed" data-id="${b.id}" ${can ? '' : 'disabled'}>${capped ? '需鼠鼠升级' : `喂养<span class="cost">${fmt(cost)}</span>`}</button>
            <button class="btn sm" data-action="feedMax" data-id="${b.id}" ${can ? '' : 'disabled'}>连喂</button>
            ${active ? '' : `<button class="btn sm jade" data-action="setBeast" data-id="${b.id}">出战</button>`}
          </div></div></div>`;
      }).join('');
      return `<div class="sec"><div class="sec-title">坐骑</div>${mountCard}</div>
        <div class="sec"><div class="sec-title">灵兽<span class="extra">${s.beasts.length}/6</span></div>
          <div class="hint" style="margin:0 0 8px">出战灵兽提供全额加成并协助攻击；其余灵兽担任<b>护法</b>，提供 ${Math.round(GameEngine.BEAST_GUARD_RATE * 100)}% 的攻防加成——每只都值得喂养</div>${cards}</div>`;
    },

    realm(s) {
      const cd = s.realmChargeCountdown;
      const mm = Math.floor(cd / 60000), ss = Math.floor(cd % 60000 / 1000);
      const realms = GameEngine.SECRET_REALMS.map((r, i) => {
        const locked = s.realmIndex < r.minRealm;
        const rw = Object.keys(r.rewards).filter(k => MAT_NAMES[k]).map(k => MAT_NAMES[k]).join('、');
        return `<div class="card row ${locked ? 'dim' : ''}">
          <div class="grow"><b class="t-gold">${r.name}</b> ${locked ? `<span class="tag">需${GameEngine.REALMS[r.minRealm].name}</span>` : ''}
            <div class="muted small">${r.desc} · 产出${rw}${r.rewards.beastChance ? '、灵兽机缘' : ''}${r.rewards.equipQualityMin ? '、高品质装备' : ''}</div></div>
          <button class="btn sm ${!locked && s.secretRealmCharges > 0 ? 'gold' : ''}" data-action="enterRealm" data-i="${i}" ${locked || s.secretRealmCharges <= 0 ? 'disabled' : ''}>探索</button>
        </div>`;
      }).join('');
      const mon = GameEngine.getTowerMonster(s.towerFloor);
      const msList = Object.entries(GameEngine.TOWER_MILESTONES).map(([f, ms]) => {
        const done = s.towerMilestones[f];
        return `<div class="small" style="color:${done ? '#6a8a6a' : s.towerFloor <= f ? '#c8bfd6' : '#6f6680'};padding:2px 0">${done ? '✅' : '🏆'} ${f}层 ${ms.name}：<span class="muted">${GameEngine.describeMilestone(+f)}</span></div>`;
      }).join('');
      return `<div class="sec"><div class="sec-title">秘境探索<span class="extra">次数 ${s.secretRealmCharges}/${s.realmMaxCharges}${cd > 0 ? ` · ${mm}:${String(ss).padStart(2, '0')}后+1` : ''}</span></div>
          <div class="hint" style="margin-bottom:6px">五层随机事件：战斗、宝箱、陷阱、灵泉、奇遇，最终层守关BOSS必掉装备</div>${realms}</div>
        <div class="sec"><div class="sec-title">锁妖塔<span class="extra">最高 ${s.towerBestFloor} 层</span></div>
          <div class="card hl row">
            <canvas class="portrait" id="towerCanvas" width="40" height="40" style="width:60px;height:60px"></canvas>
            <div class="grow"><div><b>第 ${s.towerFloor} 层</b> ${mon.isBoss ? '<span class="tag t-red">BOSS</span>' : ''}</div>
              <div class="muted small">守关：${mon.name}（Lv.${mon.level}）</div>
              <div class="muted small">每层奖励修为与灵石，每5层天机令，每10层里程碑</div></div>
          </div>
          <div class="row" style="gap:6px;margin-bottom:8px">
            <button class="btn gold grow" data-action="towerOne">⚔️ 挑战一层</button>
            <button class="btn purple grow" data-action="towerAuto">🔥 连续闯塔</button>
            <button class="btn grow" data-action="towerSweep" ${s.towerDailyRewardClaimed || !s.towerBestFloor ? 'disabled' : ''}>🧹 ${s.towerDailyRewardClaimed ? '今日已扫荡' : '每日扫荡'}</button>
          </div>
          <div class="card">${msList}</div>
        </div>`;
    },

    cave(s) {
      const cards = GameEngine.CAVE_BUILDINGS.map(b => {
        const lv = s.cave[b.id] || 0;
        const locked = s.level < b.minLevel;
        const maxed = lv >= b.maxLevel;
        const cost = GameEngine.getCaveBuildingCost(b.id);
        const can = !locked && !maxed && s.gold >= cost;
        const eff = (l) => Object.entries(b.effect(l)).map(([k, v]) => `${GameEngine.CAVE_EFFECT_NAMES[k]} ${Math.round(v * 10) / 10}`).join(' ');
        return `<div class="card ${locked ? 'dim' : ''}"><div class="row">
          <div class="skill-ico">${b.icon}</div>
          <div class="grow"><b>${b.name}</b> <span class="lv-pips">${lv}/${b.maxLevel}</span> ${locked ? `<span class="tag">Lv.${b.minLevel}解锁</span>` : ''}
            <div class="muted small">${b.desc}</div>
            <div class="small">${lv ? `<span class="t-jade">${eff(lv)}</span>` : '<span class="muted">未建造</span>'}${!maxed ? ` <span class="muted">→ ${eff(lv + 1)}</span>` : ''}</div>
            <div class="prog gold" style="margin-top:5px"><i style="width:${lv / b.maxLevel * 100}%"></i></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button class="btn sm ${can ? 'gold' : ''}" data-action="caveUp" data-id="${b.id}" ${can ? '' : 'disabled'}>${maxed ? '满级' : `${lv ? '升级' : '建造'}<span class="cost">${fmt(cost)}</span>`}</button>
            ${!maxed && !locked ? `<button class="btn sm" data-action="caveMax" data-id="${b.id}" ${can ? '' : 'disabled'}>连升</button>` : ''}
          </div></div></div>`;
      }).join('');
      return `<div class="sec"><div class="sec-title">洞府建设<span class="extra">洞府产出离线也会累积</span></div>${cards}</div>`;
    },

    gacha(s) {
      const rates = GameEngine.GACHA_QUALITY_NAMES.map((n, i) => `<span style="color:${GameEngine.GACHA_QUALITY_COLORS[i]}">${n} ${[30, 35, 20, 10, 4, 1][i]}%</span>`).join('');
      const pulls = lastPulls ? `<div class="sec"><div class="sec-title">本次所得</div><div class="pull-results">${lastPulls.map((r, i) => {
        const qc = GameEngine.GACHA_QUALITY_COLORS[r.quality];
        return `<div class="pull" style="--qc:${qc};animation-delay:${i * 0.07}s">
          ${r.isEquip ? `<div style="font-size:28px;line-height:48px">🎁</div>` : `<canvas class="skin-cv" data-skin="${r.id}" data-type="${r.type}" width="24" height="24"></canvas>`}
          <div class="pn">${r.name}</div><div class="muted">${r.isEquip ? r.desc : r.isNew ? '✨新外观' : `重复+${r.refund}令`}</div></div>`;
      }).join('')}</div></div>` : '';
      const pool = GameEngine.GACHA_POOL.filter(x => skinFilter === 'all' || x.type === skinFilter);
      const owned = new Set(s.ownedSkins);
      pool.sort((a, b) => (owned.has(b.id) - owned.has(a.id)) || b.quality - a.quality);
      const grid = pool.map(x => {
        const has = owned.has(x.id);
        const eq = s.equippedWeaponSkin === x.id || s.equippedArmorSkin === x.id;
        const qc = GameEngine.GACHA_QUALITY_COLORS[x.quality];
        return `<div class="skin-cell ${has ? '' : 'locked'} ${eq ? 'equipped' : ''}" ${has ? `data-action="toggleSkin" data-id="${x.id}" data-type="${x.type}"` : ''} title="${esc(x.name)}：${esc(x.desc)}">
          ${has ? `<canvas class="skin-cv" data-skin="${x.id}" data-type="${x.type}" width="24" height="24"></canvas>` : `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:18px;color:#555">?</div>`}
          <div class="sn" style="color:${has ? qc : '#555'}">${has ? x.name : '???'}</div>${eq ? '<div class="t-gold">已穿戴</div>' : ''}</div>`;
      }).join('');
      return `<div class="gacha-hero">
          <div class="muted">天机令</div><div class="gacha-tokens">🎫 ${fmt(s.tianjiTokens)}</div>
          <div class="rates">${rates}</div>
          <div class="row" style="justify-content:center;gap:8px">
            <button class="btn gold lg" data-action="pull1" ${s.tianjiTokens >= 10 ? '' : 'disabled'}>单抽 · 10令</button>
            <button class="btn purple lg" data-action="pull10" ${s.tianjiTokens >= 90 ? '' : 'disabled'}>十连 · 90令</button>
          </div>
          <div class="muted small" style="margin-top:8px">十连必出珍品以上 · 40%装备 60%外观 · 重复外观返还天机令</div>
          <div class="muted small">天机令来源：精英妖兽、秘境、锁妖塔、奇遇、修行指引</div>
        </div>
        ${pulls}
        <div class="sec"><div class="sec-title">外观收藏<span class="extra">${s.ownedSkins.length}/${GameEngine.GACHA_POOL.length} · 点击穿戴/卸下</span></div>
          <div class="subtabs">${[['all', '全部'], ['weapon', '武器'], ['armor', '衣服']].map(([k, n]) => `<button class="${skinFilter === k ? 'active' : ''}" data-action="skinFilter" data-f="${k}">${n}</button>`).join('')}</div>
          <div class="skin-grid">${grid}</div></div>`;
    },

    ascend(s) {
      const ups = GameEngine.ASCENSION_UPGRADES.map(u => {
        const lv = s.ascensionBonuses[u.id] || 0;
        const maxed = lv >= u.maxLevel;
        const cost = GameEngine.getAscensionUpgradeCost(u, lv);
        const can = !maxed && s.ascensionPoints >= cost;
        return `<div class="card row"><div class="skill-ico">${u.icon}</div>
          <div class="grow"><b>${u.name}</b> <span class="lv-pips">${lv}/${u.maxLevel}</span><div class="muted small">${u.desc} · 当前 +${lv * u.perLevel}${u.id === 'startLevel' ? '级' : '%'}</div></div>
          <button class="btn sm ${can ? 'gold' : ''}" data-action="ascUp" data-id="${u.id}" ${can ? '' : 'disabled'}>${maxed ? '满级' : `提升<span class="cost">${cost}仙缘</span>`}</button></div>`;
      }).join('');
      const owned = s.pastLifeTalents || [];
      const talents = GameEngine.PAST_LIFE_TALENTS.map(t => {
        const has = owned.includes(t.id), cur = t.id === s.currentTalentId;
        return `<div class="card row ${has ? (cur ? 'hl' : '') : 'dim'}"><div class="skill-ico">${has ? t.icon : '?'}</div>
          <div class="grow"><b>${has ? t.name : '???'}</b> ${cur ? '<span class="tag t-gold">当前</span>' : ''}<div class="muted small">${has ? t.desc : '飞升时三选一觉醒'}</div>${has ? `<div class="small" style="color:#7a7090;font-style:italic">「${t.flavor}」</div>` : ''}</div></div>`;
      }).join('');
      const pending = s.pendingTalentList ? `<div class="card hl" style="border-color:var(--purple)"><div class="sec-title">🎭 选择本世的前世天赋</div>
          ${talentChoiceHtml(s.pendingTalentList)}</div>` : '';
      return pending + `<div class="card hl" style="text-align:center;padding:14px">
          <div class="muted">飞升 ${s.ascensionCount} 次 · 仙缘点</div>
          <div class="gacha-tokens" style="color:var(--gold-2)">✨ ${s.ascensionPoints}</div>
          <div class="muted small" style="margin:6px 0 10px">${s.canAscend ? `此时飞升可获得 <b class="t-gold">${s.ascensionPointsPreview}</b> 仙缘点（等级、塔层、灵兽数量越高越多）` : '突破大乘期（Lv.50）后可飞升转生'}</div>
          <button class="btn purple lg" data-action="ascend" ${s.canAscend ? '' : 'disabled'}>🌟 白日飞升</button>
          <div class="muted small" style="margin-top:8px">重置：等级、装备、材料、功法、洞府<br>保留：灵兽(等级减半)、成就、图鉴、外观、天机令、10%灵石<br><span class="t-purple">飞升后三选一觉醒前世天赋</span></div>
        </div>
        <div class="sec" style="margin-top:12px"><div class="sec-title">仙缘加持<span class="extra">永久生效</span></div>${ups}</div>
        <div class="sec"><div class="sec-title">前世天赋<span class="extra">${owned.length}/${GameEngine.PAST_LIFE_TALENTS.length}</span></div>${talents}</div>`;
    },

    codex(s) {
      const sub = `<div class="subtabs"><button class="${codexSub === 'ach' ? 'active' : ''}" data-action="codexSub" data-f="ach">🏆 成就</button><button class="${codexSub === 'mon' ? 'active' : ''}" data-action="codexSub" data-f="mon">👹 妖兽图鉴</button></div>`;
      if (codexSub === 'ach') {
        const done = GameEngine.ACHIEVEMENTS.filter(a => s.achievements[a.id]).length;
        return sub + `<div class="sec-title">成就<span class="extra">${done}/${GameEngine.ACHIEVEMENTS.length} · 奖励永久生效</span></div>` +
          GameEngine.ACHIEVEMENTS.map(a => {
            const d = !!s.achievements[a.id];
            return `<div class="ach ${d ? 'done' : ''}"><div class="ai">${a.icon}</div><div class="grow"><b>${a.name}</b> ${d ? '✅' : ''}<div class="muted small">${a.desc}</div></div><div class="small ${d ? 't-jade' : 'muted'}">${GameEngine.describeReward(a.reward)}</div></div>`;
          }).join('');
      }
      const list = GameEngine.getMonsterBestiary();
      const found = list.filter(m => m.discovered).length;
      let html = sub + `<div class="sec-title">妖兽图鉴<span class="extra">${found}/${list.length} · 点击查看</span></div>`;
      for (let tier = 0; tier < 6; tier++) {
        const group = list.filter(m => m.tier === tier);
        html += `<div class="muted small" style="margin:8px 0 4px">— ${GameEngine.REALMS[tier].name} · ${GameEngine.REALMS[tier].scene} —</div><div class="codex-grid">` + group.map(m => `
          <div class="codex-item ${m.discovered ? '' : 'unknown'}" data-action="monsterInfo" data-name="${m.name}">
            <canvas class="mon-cv" data-name="${m.name}" ${m.discovered ? '' : 'data-sil="1"'} width="48" height="48"></canvas>
            <div class="cn">${m.discovered ? m.name : '???'}</div>
            <div class="muted">${m.discovered ? `击杀 ${fmt(m.kills)}` : '未遭遇'}</div></div>`).join('') + '</div>';
      }
      return html;
    },
  };

  function talentChoiceHtml(list) {
    return `<div style="display:grid;gap:6px">${list.map(t => `
      <button class="card row" data-action="chooseTalent" data-id="${t.id}" style="text-align:left;margin:0;cursor:pointer;border-color:#4a3470">
        <div class="skill-ico" style="font-size:20px">${t.icon}</div>
        <div class="grow"><b class="t-gold">${t.name}</b><div class="small">${t.desc}</div><div class="small" style="color:#7a7090;font-style:italic">「${t.flavor}」</div></div>
      </button>`).join('')}</div>`;
  }

  function showTalentChoice() {
    const s = GameEngine.getState();
    if (!s.pendingTalentList) return;
    modal({ title: '🎭 觉醒前世天赋 · 三选一', html: `<p class="muted small" style="margin-bottom:8px">飞升转世，前尘往事浮现心头……选择一段前世记忆，它将伴随你这一世的修行。</p>${talentChoiceHtml(s.pendingTalentList)}`, buttons: [{ text: '稍后再选' }] });
  }

  // 渲染后绘制画布
  function drawMouseTo(canvas, s, extra) {
    if (!canvas) return;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.imageSmoothingEnabled = false;
    const ri = s.realmIndex;
    const comp = [0, 0, 0, 3, 6, 9][ri];
    Sprites.drawMouseByRealm(c, Math.floor(canvas.width / 2) - 1, canvas.height - 8 + comp, 1, ri, 0, 0, {
      equippedWeaponSkin: extra && 'weapon' in extra ? extra.weapon : s.equippedWeaponSkin,
      equippedArmorSkin: extra && 'armor' in extra ? extra.armor : s.equippedArmorSkin,
    });
  }

  function drawSkinCanvases(s) {
    document.querySelectorAll('.skin-cv').forEach(cv => {
      const id = cv.dataset.skin, type = cv.dataset.type;
      const c = cv.getContext('2d');
      c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
      if (type === 'weapon') {
        Sprites.drawWeaponWithSkin(c, 12, 19, 1, Math.min(5, s.realmIndex), 0, 0, id);
      } else {
        cv.width = 32; cv.height = 34;
        drawMouseTo(cv, { ...s, realmIndex: Math.min(1, s.realmIndex) }, { armor: id, weapon: null });
      }
    });
  }

  const POST = {
    status(s) { drawMouseTo($('heroCanvas'), s); },
    beasts(s) {
      document.querySelectorAll('.beast-cv').forEach(cv => PixelArt.drawToCanvas(cv, cv.dataset.name, { silhouette: cv.dataset.sil ? '#2a2440' : null }));
      const m = s.visualEquip.mount;
      const mc = $('mountCanvas');
      if (mc) {
        if (m) {
          PixelArt.drawToCanvas(mc, m === '仙鹤' ? 'mount_crane' : 'mount_qilin');
        } else PixelArt.drawToCanvas(mc, 'mount_crane', { silhouette: '#2a2440' });
      }
    },
    realm(s) { const mon = GameEngine.getTowerMonster(s.towerFloor); const cv = $('towerCanvas'); if (cv) PixelArt.drawToCanvas(cv, mon.name); },
    gacha(s) { drawSkinCanvases(s); },
    codex() { document.querySelectorAll('.mon-cv').forEach(cv => PixelArt.drawToCanvas(cv, cv.dataset.name, { silhouette: cv.dataset.sil ? '#1a1628' : null })); },
  };
  const POST_ALWAYS = {};

  // ========== 公开 ==========
  function setTab(id) { switchTab(id); }
  function setCodexSub(f) { codexSub = f; renderTab(true); }
  function setSkinFilter(f) { skinFilter = f; renderTab(true); }
  function setLastPulls(r) { lastPulls = r; }
  function getCurrentTab() { return currentTab; }

  return {
    initTabs, update, renderTab, toast, modal, closeModal, modalButton, confirmBox,
    setTab, setCodexSub, setSkinFilter, setLastPulls, getCurrentTab, flashSkill, toggleLog, toggleQuest, drawMouseTo, showTalentChoice,
  };
})();
