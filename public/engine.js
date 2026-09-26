// ============================================================
// engine.js — 鼠鼠修仙 v3.0 游戏引擎
// 数值模型：怪物/经验/灵石/装备全部按「等级参考曲线」缩放，
// 每个大境界内「突破→渐强→瓶颈」，渡劫破瓶颈。
// ============================================================

const GameEngine = (() => {

  const SAVE_KEY = 'mouse_cultivation_save_v4';
  const OLD_SAVE_KEY = 'mouse_cultivation_save_v3';
  const SAVE_VERSION = 3;
  const BASE_TICK = 2000;
  let TICK_INTERVAL = BASE_TICK;
  const MAX_LOG = 60;
  const MAX_LEVEL = 99;
  const OFFLINE_CAP_HOURS = 12;

  // ========== 修仙境界体系 ==========
  const REALMS = [
    { name: '炼气期', minLevel: 1,  maxLevel: 9,  color: '#C8A26B', scene: '黄枫谷' },
    { name: '筑基期', minLevel: 10, maxLevel: 19, color: '#E0B84A', scene: '乱星海' },
    { name: '金丹期', minLevel: 20, maxLevel: 29, color: '#4CC38A', scene: '天南竹海' },
    { name: '元婴期', minLevel: 30, maxLevel: 39, color: '#5B8CFF', scene: '星宫' },
    { name: '化神期', minLevel: 40, maxLevel: 49, color: '#B07CFF', scene: '灵界' },
    { name: '大乘期', minLevel: 50, maxLevel: 99, color: '#FF6A7A', scene: '真仙界' },
  ];

  // ========== 怪物模板（hp/atk/exp/gold 为同级基准的倍率）==========
  const MONSTER_TEMPLATES = [
    [ { name: '灰毛妖鼠', hp: 0.85, atk: 0.9,  exp: 0.85, gold: 0.9,  trait: null,        desc: '偷吃灵米的妖鼠，鼠鼠的反面教材' },
      { name: '毒蟾蜍',   hp: 1.0,  atk: 1.0,  exp: 1.0,  gold: 1.0,  trait: 'poison',    desc: '背上毒疣会喷出毒雾' },
      { name: '赤狐妖',   hp: 1.2,  atk: 1.15, exp: 1.25, gold: 1.2,  trait: 'dodge',     desc: '狡黠灵动，极难命中' } ],
    [ { name: '铁甲傀儡', hp: 0.9,  atk: 0.9,  exp: 0.85, gold: 0.9,  trait: 'thorns',    desc: '上古修士遗留的守卫傀儡' },
      { name: '墨蛟蛇',   hp: 1.0,  atk: 1.0,  exp: 1.0,  gold: 1.0,  trait: 'poison',    desc: '乱星海中的墨色海蛇' },
      { name: '暴猿妖',   hp: 1.2,  atk: 1.15, exp: 1.25, gold: 1.2,  trait: 'berserk',   desc: '重伤时会陷入狂暴' } ],
    [ { name: '冰魄蜘蛛', hp: 0.9,  atk: 0.9,  exp: 0.85, gold: 0.9,  trait: 'slow',      desc: '吐出冰丝，迟缓猎物' },
      { name: '三眼火鸦', hp: 1.0,  atk: 1.0,  exp: 1.0,  gold: 1.0,  trait: 'burn',      desc: '第三只眼能喷出灵火' },
      { name: '豹形雷兽', hp: 1.2,  atk: 1.15, exp: 1.25, gold: 1.2,  trait: 'critBoost', desc: '雷光一闪，一击致命' } ],
    [ { name: '鬼影修士', hp: 0.9,  atk: 0.9,  exp: 0.85, gold: 0.9,  trait: 'lifesteal', desc: '吞噬生魂的邪修' },
      { name: '化龙妖蛟', hp: 1.0,  atk: 1.0,  exp: 1.0,  gold: 1.0,  trait: 'burn',      desc: '差一步便可化龙的妖蛟' },
      { name: '血衣魔修', hp: 1.2,  atk: 1.15, exp: 1.25, gold: 1.2,  trait: 'dodge',     desc: '血遁之术出神入化' } ],
    [ { name: '天魔老祖', hp: 0.9,  atk: 0.9,  exp: 0.85, gold: 0.9,  trait: 'thorns',    desc: '魔气护体，伤人先伤己' },
      { name: '九尾天狐', hp: 1.0,  atk: 1.0,  exp: 1.0,  gold: 1.0,  trait: 'charm',     desc: '九尾摇曳，摄人心魄' },
      { name: '血魔宗主', hp: 1.2,  atk: 1.15, exp: 1.25, gold: 1.2,  trait: 'berserk',   desc: '血魔宗之主，越战越狂' } ],
    [ { name: '劫雷真龙', hp: 0.9,  atk: 0.9,  exp: 0.85, gold: 0.9,  trait: 'critBoost', desc: '执掌天劫的真龙' },
      { name: '混沌古兽', hp: 1.0,  atk: 1.0,  exp: 1.0,  gold: 1.0,  trait: 'lifesteal', desc: '无面无目，吞噬万物' },
      { name: '天道魔神', hp: 1.2,  atk: 1.15, exp: 1.25, gold: 1.2,  trait: 'berserk',   desc: '天道之下，最后的试炼' } ],
  ];

  const TRAIT_INFO = {
    poison:    { name: '毒',   icon: '🟢', desc: '攻击30%概率使你中毒3回合' },
    dodge:     { name: '闪避', icon: '💨', desc: '15%概率闪避你的攻击' },
    thorns:    { name: '荆棘', icon: '🌵', desc: '反弹你造成伤害的8%' },
    berserk:   { name: '狂暴', icon: '💢', desc: '血量低于50%时攻击×1.6' },
    slow:      { name: '减速', icon: '❄️', desc: '你的攻速-30%' },
    burn:      { name: '灼烧', icon: '🔥', desc: '攻击更痛，25%概率灼烧你' },
    critBoost: { name: '会心', icon: '💥', desc: '20%概率造成双倍伤害' },
    lifesteal: { name: '吸血', icon: '🩸', desc: '造成伤害的30%回复自身' },
    charm:     { name: '魅惑', icon: '💜', desc: '10%概率让你失神一回合' },
  };

  // ========== 参考曲线 ==========
  // 「不加任何养成」时各等级的基础属性（与升级/渡劫的成长公式完全一致）
  const REF = (() => {
    const atk = [0], def = [0], hp = [0];
    let a = 5, d = 1, h = 100;
    for (let L = 1; L <= MAX_LEVEL + 1; L++) {
      if (L > 1) {
        a = Math.floor(a * 1.12 + 2); d = Math.floor(d * 1.08 + 1); h = Math.floor(h * 1.1 + 10);
        if (isRealmBoundary(L)) { a *= 2; d = Math.floor(d * 1.5); h *= 2; }
      }
      atk.push(a); def.push(d); hp.push(h);
    }
    return { atk, def, hp };
  })();

  function isRealmBoundary(L) { return L === 10 || L === 20 || L === 30 || L === 40 || L === 50; }
  function clampLevel(L) { return Math.max(1, Math.min(MAX_LEVEL + 1, Math.floor(L))); }
  function refBase(L) { L = clampLevel(L); return { atk: REF.atk[L], def: REF.def[L], hp: REF.hp[L] }; }

  // 中等投入玩家的养成倍率预期（用于生成怪物）
  function gearAtkMult(L) { return 1.3 * Math.pow(1.04, Math.min(L, 70) - 1); }
  function gearHpMult(L) { return 1.15 * Math.pow(1.04, Math.min(L, 70) - 1); }
  function gearDefMult(L) { return 1.2 * Math.pow(1.045, Math.min(L, 70) - 1); }

  // 境界内进度 0~1（0=刚突破, 1=瓶颈）
  function realmProgress(L) {
    const ri = getRealmIndex(L);
    if (ri === 5) return Math.min(1, (L - 50) / 15);
    const r = REALMS[ri];
    return (L - r.minLevel) / (r.maxLevel - r.minLevel);
  }

  // 同级普通怪的基准属性
  function monsterBase(L, opts) {
    opts = opts || {};
    const ref = refBase(L);
    const pos = opts.pos !== undefined ? opts.pos : realmProgress(L);
    const late = getRealmIndex(L) === 5;
    const htk = opts.htk || (1.8 + (late ? 4.2 : 2.7) * pos);   // 需要几刀
    const htd = opts.htd || (38 - (late ? 28 : 26) * pos);      // 能扛几下
    const hp = ref.atk * gearAtkMult(L) * htk;
    const playerHp = ref.hp * gearHpMult(L);
    const D = playerHp / htd;
    const d = ref.def * gearDefMult(L);
    let atk = (D + Math.sqrt(D * D + 4 * D * d)) / 2;
    let hpOut = hp;
    if (L < 6 && !opts.noNewbie) { atk *= 0.5 + 0.08 * L; hpOut *= 0.7 + 0.06 * L; } // 新手保护
    return { hp: Math.max(8, Math.floor(hpOut)), atk: Math.max(2, Math.floor(atk)) };
  }

  function getExpToNextLevel(level) { return Math.floor(50 * Math.pow(1.35, level - 1)); }
  function killsPerLevel(level) { return (5 + 1.2 * level + 0.13 * level * level) * 1.2; }
  function baseExpPerKill(level) { return getExpToNextLevel(level) / killsPerLevel(level); }
  function goldPerKill(level) { return 3 * Math.pow(1.2, clampLevel(level) - 1); }

  // 怪物对鼠鼠的伤害：atk²/(atk+def)，防御永远有用但不会免疫
  function mitigate(atk, def) { return atk * atk / (atk + Math.max(0, def)); }

  // ========== 装备系统 ==========
  const EQUIP_SLOTS = ['weapon', 'armor', 'accessory', 'boots'];
  const EQUIP_SLOT_NAMES = { weapon: '武器', armor: '衣服', accessory: '饰品', boots: '鞋子' };
  const EQUIP_QUALITIES = [
    { name: '白', label: '凡品', color: '#C8C8C8', affixCount: 0, statMult: 1.0 },
    { name: '绿', label: '良品', color: '#5BD66B', affixCount: 1, statMult: 1.3 },
    { name: '蓝', label: '稀有', color: '#4F9BFF', affixCount: 2, statMult: 1.7 },
    { name: '紫', label: '珍品', color: '#B26BFF', affixCount: 3, statMult: 2.2 },
    { name: '橙', label: '极品', color: '#FF9A2E', affixCount: 4, statMult: 3.0 },
    { name: '红', label: '传说', color: '#FF4A4A', affixCount: 5, statMult: 4.5 },
  ];
  // 词条：scale='atk'/'def'/'hp' 表示按参考属性百分比，其余为固定数值
  const EQUIP_AFFIXES = [
    { id: 'atk_flat',  name: '攻击',     stat: 'attack',     type: 'flat',    scale: 'atk', range: [0.05, 0.15] },
    { id: 'atk_pct',   name: '攻击',     stat: 'attack',     type: 'percent', range: [3, 10] },
    { id: 'def_flat',  name: '防御',     stat: 'defense',    type: 'flat',    scale: 'def', range: [0.10, 0.30] },
    { id: 'hp_flat',   name: '生命',     stat: 'maxHp',      type: 'flat',    scale: 'hp',  range: [0.05, 0.12] },
    { id: 'hp_pct',    name: '生命',     stat: 'maxHp',      type: 'percent', range: [3, 10] },
    { id: 'crit',      name: '暴击率',   stat: 'critRate',   type: 'flat',    range: [1, 4] },
    { id: 'critdmg',   name: '暴击伤害', stat: 'critDamage', type: 'flat',    range: [6, 20] },
    { id: 'lifesteal', name: '吸血',     stat: 'lifesteal',  type: 'flat',    range: [1, 3] },
    { id: 'dodge',     name: '闪避',     stat: 'dodge',      type: 'flat',    range: [1, 3] },
    { id: 'speed',     name: '攻速',     stat: 'atkSpeed',   type: 'flat',    range: [2, 6] },
    { id: 'exp',       name: '修炼',     stat: 'expBonus',   type: 'flat',    range: [3, 8] },
    { id: 'gold',      name: '灵石',     stat: 'goldBonus',  type: 'flat',    range: [5, 12] },
  ];
  const STAT_NAMES = {
    attack: '攻击', defense: '防御', maxHp: '生命', critRate: '暴击率', critDamage: '暴击伤害',
    lifesteal: '吸血', dodge: '闪避', atkSpeed: '攻速', expBonus: '修炼速度', goldBonus: '灵石获取',
    skillDmg: '神通伤害',
  };
  const PERCENT_STATS = new Set(['critRate', 'critDamage', 'lifesteal', 'dodge', 'atkSpeed', 'expBonus', 'goldBonus', 'skillDmg']);

  const EQUIP_NAMES = {
    weapon: ['竹杖', '青钢剑', '青竹蜂云剑', '八灵飞剑', '玄天斩灵剑', '乾坤化灵剑'],
    armor: ['粗布衣', '灰袍', '灵蚕丝袍', '金蚕甲', '天蚕宝衣', '九转玄功袍'],
    accessory: ['灵石坠', '碧玉环', '储物袋', '天机玲珑珠', '定风珠', '混沌灵珠'],
    boots: ['草编鞋', '踏云靴', '御风靴', '千里追风靴', '凌霄靴', '虚空步'],
  };

  const VISUAL_EQUIP = {
    mount: [null, null, '仙鹤', '仙鹤', '麒麟', '麒麟'],
  };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
  function randRange(arr) { return randInt(arr[0], arr[1]); }

  function rollQuality(minQ) {
    const roll = Math.random();
    let q;
    if (roll < 0.40) q = 0; else if (roll < 0.70) q = 1; else if (roll < 0.88) q = 2;
    else if (roll < 0.96) q = 3; else if (roll < 0.993) q = 4; else q = 5;
    return Math.max(q, minQ || 0);
  }

  function generateEquipment(level, forcedQuality, forcedSlot) {
    level = clampLevel(level);
    const realmIdx = getRealmIndex(level);
    const slot = forcedSlot || EQUIP_SLOTS[Math.floor(Math.random() * EQUIP_SLOTS.length)];
    const qualityIdx = forcedQuality !== undefined ? Math.min(5, forcedQuality) : rollQuality(0);
    const quality = EQUIP_QUALITIES[qualityIdx];
    const name = EQUIP_NAMES[slot][Math.min(realmIdx, EQUIP_NAMES[slot].length - 1)];
    const ref = refBase(level);
    const qm = quality.statMult;
    const baseAttr = {};
    if (slot === 'weapon') baseAttr.attack = Math.ceil(ref.atk * 0.3 * qm);
    else if (slot === 'armor') { baseAttr.defense = Math.ceil(ref.def * 0.6 * qm); baseAttr.maxHp = Math.ceil(ref.hp * 0.05 * qm); }
    else if (slot === 'accessory') baseAttr.maxHp = Math.ceil(ref.hp * 0.25 * qm);
    else if (slot === 'boots') { baseAttr.dodge = 1 + qualityIdx; baseAttr.atkSpeed = 3 + 3 * qualityIdx; }
    const affixes = [];
    const used = new Set();
    for (let i = 0; i < quality.affixCount; i++) {
      let affix, tries = 0;
      do { affix = EQUIP_AFFIXES[Math.floor(Math.random() * EQUIP_AFFIXES.length)]; tries++; }
      while (used.has(affix.id) && tries < 30);
      used.add(affix.id);
      let value;
      if (affix.scale) value = Math.max(1, Math.ceil(ref[affix.scale] * rand(affix.range[0], affix.range[1])));
      else value = Math.round(rand(affix.range[0], affix.range[1]) * (1 + qualityIdx * 0.08));
      affixes.push({ id: affix.id, name: affix.name, stat: affix.stat, type: affix.type, value });
    }
    return {
      id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
      name, slot, qualityIdx, quality: quality.name, qualityColor: quality.color,
      level, baseAttr, affixes, enhanceLevel: 0,
    };
  }

  function getEquipEnhanceCost(equip) {
    if (!equip) return Infinity;
    return Math.floor(12 * goldPerKill(equip.level || 1) * Math.pow(1.32, equip.enhanceLevel) * (1 + equip.qualityIdx * 0.3));
  }

  function getEquipSellPrice(equip) {
    return Math.max(1, Math.floor(goldPerKill(equip.level || 1) * (1 + equip.qualityIdx) * 1.5 * (1 + equip.enhanceLevel * 0.2)));
  }

  // ========== 丹药系统 ==========
  const PILL_RECIPES = [
    { id: 'exp_pill', name: '黄龙丹', desc: '修炼速度×1.5，持续30回合', icon: '💊',
      materials: { herb: 5 }, goldK: 6, effect: { type: 'expBoost', mult: 1.5, duration: 60 }, minRealm: 0 },
    { id: 'heal_pill', name: '回元丹', desc: '立即回满生命（可自动服用）', icon: '💚',
      materials: { herb: 4 }, goldK: 2, effect: { type: 'heal', value: 1.0 }, minRealm: 0 },
    { id: 'atk_pill', name: '筑元丹', desc: '攻击×1.5，持续30回合', icon: '🔴',
      materials: { herb: 2, ore: 2 }, goldK: 6, effect: { type: 'atkBoost', mult: 1.5, duration: 60 }, minRealm: 0 },
    { id: 'trib_pill', name: '金元丹', desc: '渡劫成功率+25%，持续120秒', icon: '⚡',
      materials: { herb: 5, ore: 4, essence: 1 }, goldK: 15, effect: { type: 'tribBoost', value: 0.25, duration: 120 }, minRealm: 0 },
    { id: 'crit_pill', name: '清心丹', desc: '暴击率+25%，持续30回合', icon: '💥',
      materials: { herb: 3, essence: 1 }, goldK: 8, effect: { type: 'critBoost', value: 0.25, duration: 60 }, minRealm: 1 },
    { id: 'super_exp', name: '天灵地宝丹', desc: '修炼速度×2.5，持续30回合', icon: '🌟',
      materials: { herb: 8, essence: 2 }, goldK: 30, effect: { type: 'expBoost', mult: 2.5, duration: 60 }, minRealm: 2 },
  ];

  // ========== 功法系统 ==========
  const SKILL_TREE = [
    { id: 'basic_sword', name: '长春功',     desc: '攻击 +6%/层',     icon: '🗡️', realm: 0, costK: 20, maxLevel: 20, effect: { stat: 'attack', type: 'percent', perLevel: 6 } },
    { id: 'basic_body',  name: '炼体十二式', desc: '生命 +8%/层',     icon: '💪', realm: 0, costK: 20, maxLevel: 20, effect: { stat: 'maxHp', type: 'percent', perLevel: 8 } },
    { id: 'iron_skin',   name: '金钟罩',     desc: '防御 +8%/层',     icon: '🛡️', realm: 0, costK: 20, maxLevel: 20, effect: { stat: 'defense', type: 'percent', perLevel: 8 } },
    { id: 'swift_strike',name: '惊鸿剑诀',   desc: '攻速 +3%/层',     icon: '💨', realm: 1, costK: 30, maxLevel: 10, effect: { stat: 'atkSpeed', type: 'flat', perLevel: 3 } },
    { id: 'crit_mastery',name: '暗器心法',   desc: '暴击率 +1.5%/层', icon: '🎯', realm: 1, costK: 30, maxLevel: 10, effect: { stat: 'critRate', type: 'flat', perLevel: 1.5 } },
    { id: 'dodge_wind',  name: '罗云步',     desc: '闪避 +1.5%/层',   icon: '🌀', realm: 1, costK: 30, maxLevel: 10, effect: { stat: 'dodge', type: 'flat', perLevel: 1.5 } },
    { id: 'gold_find',   name: '寻宝鼠术',   desc: '灵石获取 +10%/层', icon: '💰', realm: 1, costK: 25, maxLevel: 10, effect: { stat: 'goldBonus', type: 'flat', perLevel: 10 } },
    { id: 'golden_core', name: '三转重元功', desc: '攻防血 +4%/层',   icon: '✨', realm: 2, costK: 40, maxLevel: 15, effect: { stat: 'all', type: 'percent', perLevel: 4 } },
    { id: 'life_drain',  name: '化血神功',   desc: '吸血 +1.5%/层',   icon: '🩸', realm: 2, costK: 40, maxLevel: 10, effect: { stat: 'lifesteal', type: 'flat', perLevel: 1.5 } },
    { id: 'crit_damage', name: '大衍决',     desc: '暴击伤害 +10%/层', icon: '⚔️', realm: 3, costK: 50, maxLevel: 15, effect: { stat: 'critDamage', type: 'flat', perLevel: 10 } },
    { id: 'sword_art',   name: '青元剑诀',   desc: '神通伤害 +12%/层', icon: '🌠', realm: 3, costK: 50, maxLevel: 15, effect: { stat: 'skillDmg', type: 'flat', perLevel: 12 } },
    { id: 'demon_body',  name: '梵圣真魔功', desc: '攻击/生命 +5%/层', icon: '🔱', realm: 4, costK: 60, maxLevel: 15, effect: { stat: 'atkhp', type: 'percent', perLevel: 5 } },
  ];

  function getSkillCost(skillId, lvOverride) {
    const sk = SKILL_TREE.find(s => s.id === skillId);
    if (!sk) return Infinity;
    const lv = lvOverride !== undefined ? lvOverride : (state.skills[skillId] || 0);
    return Math.floor(sk.costK * goldPerKill(REALMS[sk.realm].minLevel) * Math.pow(1.42, lv));
  }

  // ========== 神通（主动技能）==========
  const ACTIVE_SKILLS = [
    { id: 'sword_qi', name: '剑气斩', icon: '⚔️', desc: '斩出剑气，造成400%攻击伤害', unlockLevel: 3, cd: 8, color: '#9FE8FF' },
    { id: 'heal_spring', name: '回春术', icon: '🌿', desc: '回复35%最大生命', unlockLevel: 6, cd: 12, color: '#7CF29A' },
    { id: 'golden_shield', name: '金光罩', icon: '🛡️', desc: '获得30%最大生命的护盾，持续6回合', unlockLevel: 12, cd: 15, color: '#FFD86B' },
    { id: 'myriad_swords', name: '万剑归宗', icon: '🌠', desc: '万剑齐发，造成1200%攻击伤害', unlockLevel: 22, cd: 25, color: '#C9A2FF' },
  ];
  const AUTO_CAST_LEVEL = 10;

  // ========== 灵兽系统 ==========
  const BEAST_TEMPLATES = [
    { id: 'fire_cat', name: '赤炎灵猫', icon: '🐱', atkPct: 5, defPct: 2, dmgMult: 0.30,
      skill: '三昧真火：鼠鼠攻击+10%火焰伤害', captureChance: 0.012, minRealm: 0 },
    { id: 'ice_wolf', name: '玄冰狼', icon: '🐺', atkPct: 6, defPct: 8, dmgMult: 0.35,
      skill: '寒冰甲：防御额外+15%', captureChance: 0.010, minRealm: 1 },
    { id: 'thunder_eagle', name: '雷鸣鹰', icon: '🦅', atkPct: 10, defPct: 3, dmgMult: 0.45,
      skill: '天雷击：鼠鼠攻击15%概率双倍', captureChance: 0.008, minRealm: 2 },
    { id: 'shadow_serpent', name: '暗鳞蛇', icon: '🐍', atkPct: 8, defPct: 10, dmgMult: 0.40,
      skill: '隐遁：闪避额外+10%', captureChance: 0.008, minRealm: 2 },
    { id: 'jade_dragon', name: '青鳞蛟龙', icon: '🐲', atkPct: 15, defPct: 12, dmgMult: 0.60,
      skill: '龙吟：攻击额外+20%', captureChance: 0.005, minRealm: 3 },
    { id: 'phoenix', name: '天凤', icon: '🐦', atkPct: 18, defPct: 15, dmgMult: 0.70,
      skill: '涅槃之火：每次攻击回复1.5%生命', captureChance: 0.004, minRealm: 4 },
  ];

  function getBeastFeedCost(beastId) {
    const b = state.beasts.find(x => x.id === beastId);
    if (!b) return Infinity;
    const tmpl = BEAST_TEMPLATES.find(t => t.id === b.templateId) || BEAST_TEMPLATES[0];
    return Math.floor(40 * goldPerKill(REALMS[tmpl.minRealm].minLevel + 3) * Math.pow(1.38, b.level - 1));
  }

  function beastBonus(beast) {
    const tmpl = BEAST_TEMPLATES.find(t => t.id === beast.templateId) || BEAST_TEMPLATES[0];
    const lvMult = 1 + 0.12 * (beast.level - 1);
    return { atkPct: tmpl.atkPct * lvMult, defPct: tmpl.defPct * lvMult, dmgMult: tmpl.dmgMult * (1 + 0.06 * (beast.level - 1)), tmpl };
  }

  // ========== 秘境系统 ==========
  const SECRET_REALMS = [
    { name: '黄枫谷药园', desc: '谷中灵药遍地', minRealm: 0, bossTier: 0, rewards: { herb: [4, 9], ore: [0, 2] } },
    { name: '乱星海矿岛', desc: '海底矿脉丰饶', minRealm: 1, bossTier: 1, rewards: { ore: [4, 9], herb: [1, 4] } },
    { name: '万妖山脉',   desc: '妖兽聚集之地', minRealm: 2, bossTier: 2, rewards: { herb: [3, 8], essence: [1, 2], beastChance: 0.3 } },
    { name: '虚天殿遗迹', desc: '上古修士洞府', minRealm: 3, bossTier: 3, rewards: { essence: [2, 4], ore: [3, 6], equipQualityMin: 2 } },
    { name: '小灵界裂缝', desc: '灵界入口碎片', minRealm: 4, bossTier: 4, rewards: { essence: [3, 6], herb: [5, 10], equipQualityMin: 3 } },
  ];

  // ========== 洞府系统 ==========
  const CAVE_BUILDINGS = [
    { id: 'herb_garden', name: '灵药圃', icon: '🌿', desc: '每分钟产出灵药（离线也有效）', minLevel: 5,
      maxLevel: 10, costK: 30, costMult: 1.9, effect: (lv) => ({ herb_per_min: lv * 0.5 }) },
    { id: 'mine_shaft', name: '灵矿脉', icon: '⛏️', desc: '每分钟产出矿石（离线也有效）', minLevel: 8,
      maxLevel: 10, costK: 35, costMult: 1.9, effect: (lv) => ({ ore_per_min: lv * 0.3 }) },
    { id: 'spirit_array', name: '聚灵阵', icon: '✨', desc: '修炼速度提升', minLevel: 12,
      maxLevel: 10, costK: 60, costMult: 2.1, effect: (lv) => ({ exp_bonus_pct: lv * 5 }) },
    { id: 'forge_room', name: '炼丹室', icon: '🔥', desc: '炼丹材料消耗减少', minLevel: 15,
      maxLevel: 5, costK: 60, costMult: 2.3, effect: (lv) => ({ pill_mat_reduce_pct: lv * 10 }) },
    { id: 'training_ground', name: '演武场', icon: '🏋️', desc: '攻击/防御/生命百分比提升', minLevel: 25,
      maxLevel: 10, costK: 80, costMult: 2.3, effect: (lv) => ({ all_stat_bonus_pct: lv * 3 }) },
  ];
  const CAVE_EFFECT_NAMES = { herb_per_min: '灵药/分', ore_per_min: '矿石/分', exp_bonus_pct: '修炼+%', pill_mat_reduce_pct: '材料-%', all_stat_bonus_pct: '属性+%' };

  function getCaveBuildingCost(buildingId, lvOverride) {
    const b = CAVE_BUILDINGS.find(x => x.id === buildingId);
    if (!b) return Infinity;
    const lv = lvOverride !== undefined ? lvOverride : (state.cave[buildingId] || 0);
    return Math.floor(b.costK * goldPerKill(b.minLevel) * Math.pow(b.costMult, lv));
  }

  // ========== 成就系统（奖励为永久百分比加成）==========
  const ACHIEVEMENTS = [
    { id: 'kill_10', name: '初涉修途', desc: '击杀10只妖兽', icon: '🏅', check: (s) => s.killCount >= 10, reward: { attack: 2 } },
    { id: 'kill_100', name: '斩妖新秀', desc: '击杀100只妖兽', icon: '🏅', check: (s) => s.killCount >= 100, reward: { attack: 3, defense: 3 } },
    { id: 'kill_1000', name: '除魔卫道', desc: '击杀1000只妖兽', icon: '🎖️', check: (s) => s.killCount >= 1000, reward: { attack: 5, maxHp: 5 } },
    { id: 'kill_10000', name: '万妖克星', desc: '击杀1万只妖兽', icon: '🏆', check: (s) => s.killCount >= 10000, reward: { attack: 10, critRate: 2 } },
    { id: 'gold_1000', name: '积攒灵石', desc: '累计获得1000灵石', icon: '💰', check: (s) => s.totalGold >= 1000, reward: { goldBonus: 5 } },
    { id: 'gold_100000', name: '富甲一方', desc: '累计获得10万灵石', icon: '💰', check: (s) => s.totalGold >= 100000, reward: { goldBonus: 10 } },
    { id: 'level_10', name: '筑基有成', desc: '突破筑基期', icon: '⬆️', check: (s) => s.level >= 10, reward: { attack: 3, defense: 3, maxHp: 3 } },
    { id: 'level_20', name: '凝丹成功', desc: '突破金丹期', icon: '⬆️', check: (s) => s.level >= 20, reward: { attack: 5, defense: 5, maxHp: 5 } },
    { id: 'level_30', name: '元婴显化', desc: '突破元婴期', icon: '⬆️', check: (s) => s.level >= 30, reward: { attack: 8, defense: 8, maxHp: 8 } },
    { id: 'level_40', name: '化神通玄', desc: '突破化神期', icon: '⬆️', check: (s) => s.level >= 40, reward: { attack: 10, defense: 10, maxHp: 10 } },
    { id: 'level_50', name: '大乘圆满', desc: '突破大乘期', icon: '👑', check: (s) => s.level >= 50, reward: { attack: 12, defense: 12, maxHp: 12, critRate: 3 } },
    { id: 'tower_10', name: '镇妖新手', desc: '锁妖塔通过10层', icon: '🗼', check: (s) => s.towerBestFloor >= 10, reward: { attack: 3 } },
    { id: 'tower_50', name: '镇妖豪杰', desc: '锁妖塔通过50层', icon: '🗼', check: (s) => s.towerBestFloor >= 50, reward: { attack: 6, critDamage: 15 } },
    { id: 'tower_100', name: '锁妖塔主', desc: '锁妖塔通过100层', icon: '🗼', check: (s) => s.towerBestFloor >= 100, reward: { attack: 10, maxHp: 10 } },
    { id: 'first_beast', name: '灵兽有缘', desc: '捕获第一只灵兽', icon: '🐾', check: (s) => s.beasts && s.beasts.length >= 1, reward: { attack: 2, defense: 2 } },
    { id: 'beast_3', name: '驭兽之鼠', desc: '捕获3只灵兽', icon: '🐾', check: (s) => s.beasts && s.beasts.length >= 3, reward: { attack: 4, maxHp: 4 } },
    { id: 'beast_6', name: '万兽之主', desc: '集齐6只灵兽', icon: '🐉', check: (s) => s.beasts && s.beasts.length >= 6, reward: { attack: 8, defense: 8 } },
    { id: 'first_death', name: '九死一生', desc: '第一次陨落', icon: '💀', check: (s) => s.deathCount >= 1, reward: { maxHp: 3 } },
    { id: 'death_10', name: '百折不挠', desc: '陨落10次', icon: '💀', check: (s) => s.deathCount >= 10, reward: { defense: 5, maxHp: 5 } },
    { id: 'elite_kill', name: '斩杀强敌', desc: '击杀10只精英妖兽', icon: '⭐', check: (s) => s.eliteKillCount >= 10, reward: { attack: 3, critRate: 1 } },
    { id: 'elite_50', name: '妖王克星', desc: '击杀50只精英妖兽', icon: '⭐', check: (s) => s.eliteKillCount >= 50, reward: { attack: 6, critDamage: 10 } },
    { id: 'skill_100', name: '神通小成', desc: '施展神通100次', icon: '🌠', check: (s) => (s.stats?.skillCasts || 0) >= 100, reward: { skillDmg: 20 } },
    { id: 'ascend_1', name: '一世飞升', desc: '完成第一次飞升', icon: '🌟', check: (s) => s.ascensionCount >= 1, reward: { attack: 10, expBonus: 10 } },
  ];

  function getAchievementBonuses(s) {
    const b = {};
    for (const ach of ACHIEVEMENTS) {
      if (!s.achievements || !s.achievements[ach.id]) continue;
      for (const [k, v] of Object.entries(ach.reward)) b[k] = (b[k] || 0) + v;
    }
    return b;
  }

  function describeReward(reward) {
    return Object.entries(reward).map(([k, v]) => {
      const n = STAT_NAMES[k] || k;
      return ['attack', 'defense', 'maxHp'].includes(k) ? `${n}+${v}%` : `${n}+${v}${PERCENT_STATS.has(k) ? '%' : ''}`;
    }).join(' ');
  }

  // ========== 修行指引（新手任务链）==========
  const QUESTS = [
    { id: 'q_kill3', title: '初入黄枫谷', desc: '击败3只妖兽', check: s => s.killCount >= 3, progress: s => [s.killCount, 3],
      reward: { goldK: 6, equip: { slot: 'weapon', quality: 1 } }, rewardText: '良品武器 + 灵石' },
    { id: 'q_equip', title: '神兵在手', desc: '在【装备】页穿上武器', check: s => !!s.equipment.weapon, reward: { goldK: 8 }, rewardText: '灵石' },
    { id: 'q_lv3', title: '引气入体', desc: '达到3级，领悟神通【剑气斩】', check: s => s.level >= 3, progress: s => [s.level, 3], reward: { goldK: 8 }, rewardText: '灵石' },
    { id: 'q_cast', title: '剑气纵横', desc: '点击战斗画面下方的【剑气斩】施展神通', check: s => (s.stats.skillCasts || 0) >= 1, reward: { goldK: 10 }, rewardText: '灵石' },
    { id: 'q_skill', title: '修习功法', desc: '在【功法】页将长春功修炼至3层', check: s => (s.skills.basic_sword || 0) >= 3, progress: s => [s.skills.basic_sword || 0, 3], reward: { goldK: 12 }, rewardText: '灵石' },
    { id: 'q_lv6', title: '炼气中期', desc: '达到6级，领悟【回春术】', check: s => s.level >= 6, progress: s => [s.level, 6], reward: { pills: { heal_pill: 2 }, materials: { herb: 5 } }, rewardText: '回元丹×2 + 灵药×5' },
    { id: 'q_pill', title: '初识丹道', desc: '在【丹药】页炼制1颗丹药', check: s => (s.stats.pillsCrafted || 0) >= 1, reward: { materials: { herb: 6, ore: 3 } }, rewardText: '灵药×6 矿石×3' },
    { id: 'q_elite', title: '斩杀精英', desc: '击败1只⭐精英妖兽', check: s => s.eliteKillCount >= 1, reward: { tokens: 5 }, rewardText: '天机令×5' },
    { id: 'q_cave', title: '开辟洞府', desc: '在【洞府】页建造灵药圃', check: s => (s.cave.herb_garden || 0) >= 1, reward: { goldK: 15 }, rewardText: '灵石' },
    { id: 'q_lv9', title: '炼气圆满', desc: '达到9级，准备渡劫', check: s => s.level >= 9, progress: s => [s.level, 9], reward: { pills: { trib_pill: 1 } }, rewardText: '金元丹×1' },
    { id: 'q_trib1', title: '筑基！', desc: '渡过天劫，突破筑基期', check: s => s.level >= 10, reward: { tokens: 10, goldK: 10 }, rewardText: '天机令×10 + 灵石' },
    { id: 'q_auto', title: '心随意动', desc: '开启神通【自动施放】', check: s => !!s.autoCast, reward: { goldK: 15 }, rewardText: '灵石' },
    { id: 'q_realm', title: '秘境寻宝', desc: '在【秘境】页探索1次秘境', check: s => (s.stats.realmRuns || 0) >= 1, reward: { goldK: 20 }, rewardText: '灵石' },
    { id: 'q_tower5', title: '初探锁妖塔', desc: '锁妖塔通过第5层', check: s => s.towerBestFloor >= 5, progress: s => [s.towerBestFloor, 5], reward: { tokens: 5 }, rewardText: '天机令×5' },
    { id: 'q_gacha', title: '天机难测', desc: '在【天机阁】抽取1次', check: s => (s.totalGachaPulls || 0) >= 1, reward: { tokens: 10 }, rewardText: '天机令×10' },
    { id: 'q_enh', title: '千锤百炼', desc: '将任意装备强化至+5', check: s => EQUIP_SLOTS.some(k => s.equipment[k] && s.equipment[k].enhanceLevel >= 5), reward: { goldK: 30 }, rewardText: '灵石' },
    { id: 'q_trib2', title: '金丹大道', desc: '突破金丹期', check: s => s.level >= 20, reward: { tokens: 20, materials: { essence: 3 } }, rewardText: '天机令×20 + 精华×3' },
    { id: 'q_beast', title: '灵兽相伴', desc: '捕获一只灵兽（击杀妖兽时概率捕获）', check: s => s.beasts.length >= 1, reward: { goldK: 30 }, rewardText: '灵石' },
    { id: 'q_tower20', title: '镇妖之路', desc: '锁妖塔通过第20层', check: s => s.towerBestFloor >= 20, progress: s => [s.towerBestFloor, 20], reward: { tokens: 15 }, rewardText: '天机令×15' },
    { id: 'q_trib3', title: '元婴出窍', desc: '突破元婴期', check: s => s.level >= 30, reward: { tokens: 30, materials: { essence: 5 } }, rewardText: '天机令×30 + 精华×5' },
    { id: 'q_trib4', title: '化神通玄', desc: '突破化神期', check: s => s.level >= 40, reward: { tokens: 40 }, rewardText: '天机令×40' },
    { id: 'q_trib5', title: '大乘之境', desc: '突破大乘期', check: s => s.level >= 50, reward: { tokens: 50 }, rewardText: '天机令×50' },
    { id: 'q_ascend', title: '白日飞升', desc: '在【飞升】页完成一次飞升转生', check: s => s.ascensionCount >= 1, reward: { tokens: 60 }, rewardText: '天机令×60' },
  ];

  // ========== 天机阁·抽卡系统 ==========
  const GACHA_COST_SINGLE = 10;
  const GACHA_COST_TEN = 90;
  const GACHA_QUALITY_RATES = [0.30, 0.35, 0.20, 0.10, 0.04, 0.01];
  const GACHA_QUALITY_NAMES = ['凡品', '良品', '稀有', '珍品', '极品', '传说'];
  const GACHA_QUALITY_COLORS = EQUIP_QUALITIES.map(q => q.color);

  const WEAPON_SKINS = [
    { id: 'ws_bamboo', name: '翠竹剑', quality: 0, desc: '竹节剑身，清雅脱俗' },
    { id: 'ws_rusty', name: '锈铁剑', quality: 0, desc: '虽锈迹斑斑，却暗含杀机' },
    { id: 'ws_bone', name: '白骨剑', quality: 0, desc: '妖兽骨骼打磨而成' },
    { id: 'ws_jade', name: '碧玉剑', quality: 1, desc: '通体碧绿，灵气流转' },
    { id: 'ws_flame', name: '烈焰刀', quality: 1, desc: '刀身缠绕火焰纹' },
    { id: 'ws_frost', name: '寒霜剑', quality: 1, desc: '剑气凝霜，寒意逼人' },
    { id: 'ws_wind', name: '疾风匕', quality: 1, desc: '小巧轻灵，快如闪电' },
    { id: 'ws_thunder', name: '雷霆锤', quality: 2, desc: '雷光闪烁的战锤' },
    { id: 'ws_blood', name: '嗜血刃', quality: 2, desc: '暗红色刀刃，渗出血光' },
    { id: 'ws_shadow', name: '暗影匕首', quality: 2, desc: '漆黑如墨，隐于虚空' },
    { id: 'ws_starfall', name: '星陨剑', quality: 2, desc: '剑身嵌满星辰碎片' },
    { id: 'ws_dragon', name: '龙牙剑', quality: 3, desc: '龙族之牙铸成的神兵' },
    { id: 'ws_phoenix', name: '凤翎刃', quality: 3, desc: '凤凰羽翎化作的利刃' },
    { id: 'ws_void', name: '虚空裂隙', quality: 3, desc: '撕裂空间的黑色大剑' },
    { id: 'ws_moonlight', name: '月华剑', quality: 3, desc: '银色月光凝成剑身' },
    { id: 'ws_golden_lotus', name: '金莲法杖', quality: 4, desc: '顶端盛开金色莲花' },
    { id: 'ws_chaos', name: '混沌之刃', quality: 4, desc: '混沌之力凝结的异形武器' },
    { id: 'ws_heavenly', name: '天罚雷剑', quality: 4, desc: '引天雷而降的审判之剑' },
    { id: 'ws_primordial', name: '太初神剑', quality: 5, desc: '开天辟地时留存的神器' },
    { id: 'ws_cosmic', name: '寰宇星辰剑', quality: 5, desc: '蕴含整个星河的终极之剑' },
  ];
  const ARMOR_SKINS = [
    { id: 'as_patched', name: '补丁布衣', quality: 0, desc: '缝缝补补的粗布衣裳' },
    { id: 'as_farmer', name: '农夫麻衣', quality: 0, desc: '朴实无华的麻布衣' },
    { id: 'as_scholar', name: '书生白袍', quality: 0, desc: '洁白的读书人长袍' },
    { id: 'as_bamboo', name: '竹纹道袍', quality: 1, desc: '绣着竹叶纹的道袍' },
    { id: 'as_cloud', name: '云纹法袍', quality: 1, desc: '飘渺云纹若隐若现' },
    { id: 'as_fire_robe', name: '赤焰袍', quality: 1, desc: '火红色法袍，袖口有火焰' },
    { id: 'as_ice_silk', name: '冰蚕丝甲', quality: 1, desc: '冰蚕丝编织的轻甲' },
    { id: 'as_night', name: '夜行衣', quality: 2, desc: '漆黑夜行者的紧身衣' },
    { id: 'as_dragon_scale', name: '龙鳞战甲', quality: 2, desc: '泛着青色光芒的龙鳞甲' },
    { id: 'as_flower', name: '百花锦袍', quality: 2, desc: '绣满百花的华丽锦袍' },
    { id: 'as_star_robe', name: '星辰法袍', quality: 2, desc: '深蓝底色点缀星光' },
    { id: 'as_blood_armor', name: '血战铠甲', quality: 3, desc: '暗红色重甲，浸满战意' },
    { id: 'as_jade_emperor', name: '玉帝仙袍', quality: 3, desc: '金丝玉线交织的帝王之袍' },
    { id: 'as_ghost', name: '幽冥鬼衣', quality: 3, desc: '半透明的幽绿鬼衣' },
    { id: 'as_thunder_armor', name: '雷霆战甲', quality: 3, desc: '电弧缠绕的金色战甲' },
    { id: 'as_phoenix_robe', name: '凤凰涅槃袍', quality: 4, desc: '浴火凤凰纹的赤金法袍' },
    { id: 'as_void_cloak', name: '虚空披风', quality: 4, desc: '吞噬光线的漆黑披风' },
    { id: 'as_celestial', name: '天神金甲', quality: 4, desc: '天界铸造的纯金神甲' },
    { id: 'as_primordial_robe', name: '鸿蒙道袍', quality: 5, desc: '混沌初开时的至高道袍' },
    { id: 'as_universe', name: '万象天衣', quality: 5, desc: '包罗万象的宇宙级法衣' },
  ];
  const GACHA_POOL = [...WEAPON_SKINS.map(s => ({ ...s, type: 'weapon' })), ...ARMOR_SKINS.map(s => ({ ...s, type: 'armor' }))];

  // ========== 转生（飞升）==========
  const ASCENSION_UPGRADES = [
    { id: 'atkMult', name: '仙力灌体', desc: '攻击+10%/级', icon: '⚔️', cost: 1, maxLevel: 20, perLevel: 10 },
    { id: 'defMult', name: '金刚不灭', desc: '防御+10%/级', icon: '🛡️', cost: 1, maxLevel: 20, perLevel: 10 },
    { id: 'hpMult', name: '万寿无疆', desc: '生命+10%/级', icon: '❤️', cost: 1, maxLevel: 20, perLevel: 10 },
    { id: 'expMult', name: '悟道天赋', desc: '修炼速度+15%/级', icon: '📖', cost: 2, maxLevel: 10, perLevel: 15 },
    { id: 'goldMult', name: '点石成金', desc: '灵石+15%/级', icon: '💰', cost: 2, maxLevel: 10, perLevel: 15 },
    { id: 'startLevel', name: '根骨深厚', desc: '转生起始等级+2/级', icon: '⬆️', cost: 3, maxLevel: 5, perLevel: 2 },
  ];

  const PAST_LIFE_TALENTS = [
    { id: 'berserker', name: '修罗血脉', icon: '🔥', desc: '攻击+40%，但防御-20%', effect: { atkMult: 1.4, defMult: 0.8 }, flavor: '前世是落月宗的嗜血修罗' },
    { id: 'ironwall', name: '金刚不坏', icon: '🛡️', desc: '防御+50%，生命+20%，攻击-15%', effect: { defMult: 1.5, hpMult: 1.2, atkMult: 0.85 }, flavor: '前世苦修金刚宗护体神功' },
    { id: 'assassin', name: '暗夜行者', icon: '🗡️', desc: '暴击率+15%，暴伤+50%，生命-20%', effect: { critRateBonus: 15, critDmgBonus: 50, hpMult: 0.8 }, flavor: '前世是乱星海的暗杀者' },
    { id: 'scholar', name: '万卷鼠儒', icon: '📚', desc: '修炼速度+60%，灵石+30%', effect: { expMult: 1.6, goldMult: 1.3 }, flavor: '前世在黄枫谷藏经阁博览群书' },
    { id: 'merchant', name: '坊市大亨', icon: '💰', desc: '灵石获取+80%，装备掉率+5%', effect: { goldMult: 1.8, dropBonus: 5 }, flavor: '前世经营天南最大的坊市' },
    { id: 'beastmaster', name: '驭兽宗传人', icon: '🐲', desc: '灵兽伤害×2，灵兽捕获率×2', effect: { beastAtkMult: 2, beastCaptureRate: 2 }, flavor: '前世是万妖谷的御兽长老' },
    { id: 'alchemist', name: '丹鼎宗师', icon: '⚗️', desc: '丹药持续×2，炼丹省50%材料', effect: { pillDurationMult: 2, pillMatReduce: 50 }, flavor: '前世是药王谷掌门' },
    { id: 'lucky', name: '气运之鼠', icon: '🍀', desc: '奇遇触发率×2，秘境次数+1', effect: { encounterRateMult: 2, realmChargeBonus: 1 }, flavor: '前世集天地气运于一身，如韩立般机缘不断' },
    { id: 'phoenix', name: '天凤血脉', icon: '🐦', desc: '陨落后1秒复活，灵石不掉落', effect: { quickRevive: true, noDeathPenalty: true }, flavor: '前世是涅槃天凤转世' },
    { id: 'vampiric', name: '血道修士', icon: '🩸', desc: '天生15%吸血，但不能自然回血', effect: { lifestealBonus: 15, noNaturalRegen: true }, flavor: '前世修习血道禁术的魔修' },
    { id: 'speedster', name: '雷遁真身', icon: '⚡', desc: '攻速+30%，闪避+10%，攻击-10%', effect: { atkSpeedBonus: 30, dodgeBonus: 10, atkMult: 0.9 }, flavor: '前世修习雷遁之术，身法无影' },
    { id: 'titan', name: '灵界巨鼠', icon: '🏔️', desc: '生命×2，攻击+20%，闪避=0', effect: { hpMult: 2, atkMult: 1.2, zeroDodge: true }, flavor: '前世是灵界中体型巨大的上古灵鼠' },
  ];

  // ========== 锁妖塔 ==========
  const TOWER_MILESTONES = {
    10:  { name: '铜塔之证', rewards: { goldK: 60,  tianjiTokens: 3,  herb: 5 } },
    20:  { name: '银塔之证', rewards: { goldK: 80,  tianjiTokens: 5,  herb: 10 } },
    30:  { name: '金塔之证', rewards: { goldK: 100, tianjiTokens: 8,  ore: 10 } },
    40:  { name: '玉塔之证', rewards: { goldK: 120, tianjiTokens: 12, essence: 3 } },
    50:  { name: '仙塔之证', rewards: { goldK: 140, tianjiTokens: 18, essence: 5 } },
    60:  { name: '神塔之证', rewards: { goldK: 160, tianjiTokens: 25, essence: 8 } },
    70:  { name: '圣塔之证', rewards: { goldK: 180, tianjiTokens: 35, essence: 12 } },
    80:  { name: '天塔之证', rewards: { goldK: 200, tianjiTokens: 50, essence: 18 } },
    90:  { name: '道塔之证', rewards: { goldK: 220, tianjiTokens: 70, essence: 25 } },
    100: { name: '无上塔主', rewards: { goldK: 250, tianjiTokens: 100, essence: 40 } },
  };
  function towerLevel(floor) { return clampLevel(1 + Math.floor((floor - 1) * 0.55)); }
  function describeMilestone(floor) {
    const r = TOWER_MILESTONES[floor].rewards;
    const parts = [`灵石${formatNumber(Math.floor(goldPerKill(towerLevel(floor)) * r.goldK))}`];
    if (r.tianjiTokens) parts.push(`天机令${r.tianjiTokens}`);
    if (r.herb) parts.push(`灵药${r.herb}`);
    if (r.ore) parts.push(`矿石${r.ore}`);
    if (r.essence) parts.push(`精华${r.essence}`);
    return parts.join(' ');
  }

  // ========== 奇遇事件 ==========
  const ENCOUNTER_EVENTS = [
    { id: 'herb_find', name: '发现灵药', desc: '路边发现一株千年灵药！', weight: 30, rewards: { herb: [2, 5] } },
    { id: 'ore_find', name: '陨铁降世', desc: '一块散发灵气的天外陨铁！', weight: 20, rewards: { ore: [2, 4] } },
    { id: 'gold_rain', name: '灵石矿脉', desc: '踩到了一处隐秘灵石矿脉！', weight: 25, rewards: { goldK: [10, 40] } },
    { id: 'essence_drop', name: '天材地宝', desc: '发现一颗凝结的灵气精华！', weight: 8, rewards: { essence: [1, 2] } },
    { id: 'random_equip', name: '前辈洞府', desc: '发现一位陨落前辈的储物袋...', weight: 8, rewards: { equip: true } },
    { id: 'exp_bonus', name: '参悟天道', desc: '鼠鼠打坐时突然参悟了一丝天道！', weight: 12, rewards: { expPercent: [8, 25] } },
  ];

  // ========== 秘境内的临时增益 ==========
  const REALM_EVENTS = [
    { type: 'battle', name: '妖兽拦路', icon: '⚔️', weight: 35 },
    { type: 'treasure', name: '宝箱发现', icon: '🎁', weight: 22 },
    { type: 'trap', name: '陷阱机关', icon: '🪤', weight: 13 },
    { type: 'heal', name: '灵泉恢复', icon: '💧', weight: 10 },
    { type: 'adventure', name: '奇遇机缘', icon: '🌟', weight: 20 },
  ];
  const REALM_BUFFS = [
    { id: 'atk_up', name: '攻势凌厉', desc: '攻击+30%', effect: { atkMult: 1.3 } },
    { id: 'def_up', name: '金身护体', desc: '防御+60%', effect: { defMult: 1.6 } },
    { id: 'crit_up', name: '慧眼如炬', desc: '暴击+15%', effect: { critBonus: 15 } },
    { id: 'gold_up', name: '财运亨通', desc: '灵石+50%', effect: { goldMult: 1.5 } },
    { id: 'loot_up', name: '探宝嗅觉', desc: '掉落+30%', effect: { lootMult: 1.3 } },
    { id: 'hp_up', name: '气血充盈', desc: '生命+30%', effect: { hpMult: 1.3 } },
  ];

  // ========== 天降机缘（画面上可点击的漂浮宝物）==========
  const FORTUNES = [
    { id: 'gold', name: '灵石袋', icon: '💰', weight: 34 },
    { id: 'herb', name: '灵芝仙草', icon: '🌿', weight: 24 },
    { id: 'insight', name: '悟道灵光', icon: '✨', weight: 22 },
    { id: 'token', name: '天机签', icon: '🎫', weight: 14 },
    { id: 'star', name: '福星高照', icon: '🌟', weight: 6 },
  ];
  const FORTUNE_LIFE = 14000;

  function rollFortune() {
    const tw = FORTUNES.reduce((a, f) => a + f.weight, 0);
    let r = Math.random() * tw;
    for (const f of FORTUNES) { r -= f.weight; if (r <= 0) return f; }
    return FORTUNES[0];
  }

  function updateFortune(now) {
    if (state.fortune && now > state.fortune.until) {
      state.fortune = null;
      state.nextFortuneAt = now + randInt(90, 200) * 1000;
    }
    if (!state.fortune && !state.isDead && now >= (state.nextFortuneAt || 0)) {
      const f = rollFortune();
      state.fortune = { kind: f.id, spawnedAt: now, until: now + FORTUNE_LIFE, seed: Math.random() };
      emit('fortuneSpawn', { fortune: state.fortune });
    }
  }

  function claimFortune() {
    const f = state.fortune;
    if (!f || Date.now() > f.until) return { success: false };
    const def = FORTUNES.find(x => x.id === f.kind) || FORTUNES[0];
    const L = state.level;
    let text = '';
    if (f.kind === 'gold') { const g = Math.floor(goldPerKill(L) * randInt(8, 14)); state.gold += g; state.totalGold += g; text = `灵石 +${formatNumber(g)}`; }
    else if (f.kind === 'herb') {
      const h = randInt(3, 6), o = randInt(2, 4), e = Math.random() < 0.4 ? 1 : 0;
      state.materials.herb += h; state.materials.ore += o; state.materials.essence += e;
      text = `灵药×${h} 矿石×${o}${e ? ' 精华×1' : ''}`;
    } else if (f.kind === 'insight') {
      const e = Math.floor(getExpToNextLevel(L) * rand(0.05, 0.09)); gainExp(e); checkLevelUp(); text = `修为 +${formatNumber(e)}`;
    } else if (f.kind === 'token') { const t = randInt(2, 4); state.tianjiTokens += t; text = `天机令 +${t}`; }
    else if (f.kind === 'star') {
      const now = Date.now();
      state.buffs.fortuneStar = { until: Math.max(now, (state.buffs.fortuneStar && state.buffs.fortuneStar.until) || 0) + 60000 };
      text = '60秒内 修为与灵石×2';
    }
    state.fortune = null;
    state.nextFortuneAt = Date.now() + randInt(90, 200) * 1000;
    state.stats.fortunes = (state.stats.fortunes || 0) + 1;
    addLog(`${def.icon} 天降机缘·${def.name}！${text}`);
    emit('fortuneClaim', { kind: f.kind, name: def.name, icon: def.icon, text });
    saveState();
    return { success: true, name: def.name, text };
  }

  // ========== 状态 ==========
  function getDefaultState() {
    return {
      saveVersion: SAVE_VERSION,
      level: 1, exp: 0, gold: 0,
      baseAttack: 5, baseDefense: 1, baseMaxHp: 100, hp: 100,
      baseCritRate: 5, baseCritDamage: 150,
      killCount: 0, totalGold: 0, totalExp: 0,
      createdAt: Date.now(), lastTickTime: Date.now(),
      currentMonster: null, battleLog: [],
      equipment: { weapon: null, armor: null, accessory: null, boots: null },
      inventory: [], inventoryMax: 30,
      materials: { herb: 0, ore: 0, essence: 0 },
      pills: {}, skills: {},
      beasts: [], activeBeastId: null,
      buffs: {},
      secretRealmCharges: 3, secretRealmMaxCharges: 3, lastRealmRefresh: Date.now(),
      towerFloor: 1, towerBestFloor: 0, towerMilestones: {},
      towerDailyRewardClaimed: false,
      needTribulation: false, tribulationCooldown: 0, tribFailStreak: 0,
      lastEncounterTime: 0,
      isDead: false, deathCount: 0, reviveTime: 0,
      consecutiveKills: 0, eliteKillCount: 0,
      battleSpeed: 1,
      autoHealEnabled: false, autoHealThreshold: 30,
      dpsHistory: [], totalDamageDealt: 0, combatStartTime: 0,
      cave: { herb_garden: 0, spirit_array: 0, forge_room: 0, mine_shaft: 0, training_ground: 0 },
      lastCaveProduction: Date.now(),
      achievements: {},
      monsterKills: {},
      playerDoTs: [],
      ascensionCount: 0, ascensionPoints: 0,
      ascensionBonuses: { atkMult: 0, defMult: 0, hpMult: 0, expMult: 0, goldMult: 0, startLevel: 0 },
      totalAscensionPointsEarned: 0,
      pastLifeTalents: [], currentTalent: null,
      tianjiTokens: 0, ownedSkins: [], equippedWeaponSkin: null, equippedArmorSkin: null, totalGachaPulls: 0,
      dailyKey: '',
      // v3
      attackMeter: 0,
      skillCooldowns: {},
      autoCast: false,
      shield: null,
      questIndex: 0,
      stats: { skillCasts: 0, pillsCrafted: 0, pillsUsed: 0, realmRuns: 0, maxHit: 0, playTime: 0, fortunes: 0 },
      // v3.1
      fortune: null, nextFortuneAt: Date.now() + 45000,
      autoEquip: false, autoSellQuality: -1, autoPills: {},
      pendingTalents: null,
    };
  }

  let state = null;
  let tickTimer = null;
  let onBattleEvent = null;

  function loadState() {
    try {
      const saved = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY);
      if (saved) {
        state = JSON.parse(saved);
        migrateState();
        return;
      }
    } catch (e) {
      console.error('存档加载失败:', e);
    }
    state = getDefaultState();
  }

  function migrateState() {
    const def = getDefaultState();
    const oldVersion = state.saveVersion || 0;
    for (const key of Object.keys(def)) {
      if (state[key] === undefined) state[key] = def[key];
    }
    if (!state.materials) state.materials = def.materials;
    for (const k of ['herb', 'ore', 'essence']) if (!state.materials[k]) state.materials[k] = 0;
    if (!state.equipment || Array.isArray(state.equipment)) state.equipment = def.equipment;
    if (!state.cave) state.cave = def.cave;
    for (const k of Object.keys(def.cave)) if (state.cave[k] === undefined) state.cave[k] = 0;
    if (!state.stats) state.stats = def.stats;
    for (const k of Object.keys(def.stats)) if (state.stats[k] === undefined) state.stats[k] = 0;
    if (!state.ascensionBonuses) state.ascensionBonuses = def.ascensionBonuses;
    if (!state.skillCooldowns) state.skillCooldowns = {};

    if (oldVersion < 3) {
      // v2 → v3：数值模型整体换算
      delete state.achievementBonuses; // 改为由已达成成就实时计算
      delete state._tribWarnShown;
      state.level = Math.min(MAX_LEVEL, state.level || 1);
      // 基础属性按新公式重算（与旧公式基本一致，只是去掉随机漂移，避免异常存档）
      const ref = refBase(state.level);
      state.baseAttack = Math.max(state.baseAttack || 0, ref.atk);
      state.baseDefense = Math.max(state.baseDefense || 0, ref.def);
      state.baseMaxHp = Math.max(state.baseMaxHp || 0, ref.hp);
      // 旧装备：补齐等级字段；旧的固定数值会自然被新掉落替换
      const fixEquip = (eq) => { if (eq && !eq.level) eq.level = state.level; if (eq && !eq.id) eq.id = Math.random().toString(36).slice(2); };
      EQUIP_SLOTS.forEach(k => fixEquip(state.equipment[k]));
      state.inventory.forEach(fixEquip);
      // 旧灵兽 → 新灵兽（按模板重建，保留等级）
      state.beasts = (state.beasts || []).map(b => ({
        id: b.id || Math.random().toString(36).slice(2), templateId: b.templateId, level: Math.max(1, Math.min(60, b.level || 1)),
      }));
      // 已通关的新手任务直接跳过
      state.questIndex = 0;
      while (state.questIndex < QUESTS.length && QUESTS[state.questIndex].check(state)) state.questIndex++;
      state.currentMonster = null;
      state.needTribulation = state.needTribulation || false;
      state.saveVersion = SAVE_VERSION;
    }
    // 功法等级上限校正
    for (const sk of SKILL_TREE) if ((state.skills[sk.id] || 0) > sk.maxLevel) state.skills[sk.id] = sk.maxLevel;
  }

  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { console.error('保存失败:', e); }
  }

  function resetState() {
    state = getDefaultState();
    localStorage.removeItem('mouse_cultivation_save');
    localStorage.removeItem(OLD_SAVE_KEY);
    saveState();
  }

  function exportSave() {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); } catch (e) { return ''; }
  }

  function importSave(str) {
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
      if (!obj || typeof obj.level !== 'number') return { success: false, msg: '存档格式不正确' };
      state = obj;
      migrateState();
      state.lastTickTime = Date.now();
      saveState();
      return { success: true, msg: '存档导入成功！' };
    } catch (e) {
      return { success: false, msg: '存档解析失败' };
    }
  }

  // ========== 计算属性 ==========
  function getCurrentTalent() {
    if (!state.currentTalent) return null;
    return PAST_LIFE_TALENTS.find(t => t.id === state.currentTalent) || null;
  }

  function getActiveBeast() {
    if (!state.activeBeastId || !state.beasts) return null;
    const b = state.beasts.find(x => x.id === state.activeBeastId);
    if (!b) return null;
    const tmpl = BEAST_TEMPLATES.find(t => t.id === b.templateId);
    if (!tmpl) return null;
    return { ...b, name: tmpl.name, icon: tmpl.icon, skill: tmpl.skill };
  }

  // equipOverride: { slot: item|null } 用于装备对比
  function getComputedStats(equipOverride) {
    const pct = { attack: 0, defense: 0, maxHp: 0 };
    let attack = state.baseAttack, defense = state.baseDefense, maxHp = state.baseMaxHp;
    let critRate = state.baseCritRate, critDamage = state.baseCritDamage;
    let lifesteal = 0, dodge = 0, atkSpeed = 0, goldBonus = 0, expBonus = 0, skillDmg = 0;

    const add = (stat, val, type) => {
      if (type === 'percent') { if (pct[stat] !== undefined) pct[stat] += val; return; }
      switch (stat) {
        case 'attack': attack += val; break;
        case 'defense': defense += val; break;
        case 'maxHp': maxHp += val; break;
        case 'critRate': critRate += val; break;
        case 'critDamage': critDamage += val; break;
        case 'lifesteal': lifesteal += val; break;
        case 'dodge': dodge += val; break;
        case 'atkSpeed': atkSpeed += val; break;
        case 'goldBonus': goldBonus += val; break;
        case 'expBonus': expBonus += val; break;
        case 'skillDmg': skillDmg += val; break;
      }
    };

    // 装备
    for (const slot of EQUIP_SLOTS) {
      const eq = equipOverride && slot in equipOverride ? equipOverride[slot] : state.equipment[slot];
      if (!eq) continue;
      const mult = 1 + (eq.enhanceLevel || 0) * 0.08;
      for (const [k, v] of Object.entries(eq.baseAttr || {})) {
        const scaled = ['attack', 'defense', 'maxHp'].includes(k) ? Math.floor(v * mult) : v;
        add(k, scaled, 'flat');
      }
      for (const a of eq.affixes || []) {
        const scaled = a.type === 'flat' && ['attack', 'defense', 'maxHp'].includes(a.stat) ? Math.floor(a.value * mult) : a.value;
        add(a.stat, scaled, a.type);
      }
    }

    // 功法
    for (const sk of SKILL_TREE) {
      const lv = state.skills[sk.id] || 0;
      if (lv <= 0) continue;
      const v = sk.effect.perLevel * lv;
      if (sk.effect.stat === 'all') { pct.attack += v; pct.defense += v; pct.maxHp += v; }
      else if (sk.effect.stat === 'atkhp') { pct.attack += v; pct.maxHp += v; }
      else add(sk.effect.stat, v, sk.effect.type);
    }

    // 灵兽
    const beast = getActiveBeast();
    let beastSkill = null;
    if (beast) {
      const bb = beastBonus(beast);
      pct.attack += bb.atkPct; pct.defense += bb.defPct;
      beastSkill = beast.templateId;
      if (beastSkill === 'ice_wolf') pct.defense += 15;
      if (beastSkill === 'shadow_serpent') dodge += 10;
      if (beastSkill === 'jade_dragon') pct.attack += 20;
    }

    // 成就
    const ab = getAchievementBonuses(state);
    for (const [k, v] of Object.entries(ab)) {
      if (['attack', 'defense', 'maxHp'].includes(k)) pct[k] += v; else add(k, v, 'flat');
    }

    // 转生
    const asc = state.ascensionBonuses || {};
    pct.attack += (asc.atkMult || 0) * 10;
    pct.defense += (asc.defMult || 0) * 10;
    pct.maxHp += (asc.hpMult || 0) * 10;
    expBonus += (asc.expMult || 0) * 15;
    goldBonus += (asc.goldMult || 0) * 15;

    // 洞府
    expBonus += (state.cave.spirit_array || 0) * 5;
    const tg = (state.cave.training_ground || 0) * 3;
    pct.attack += tg; pct.defense += tg; pct.maxHp += tg;

    attack = attack * (1 + pct.attack / 100);
    defense = defense * (1 + pct.defense / 100);
    maxHp = maxHp * (1 + pct.maxHp / 100);

    // 坐骑
    const realmIdx = getRealmIndex(state.level);
    const mount = VISUAL_EQUIP.mount[realmIdx];
    if (mount === '仙鹤') { dodge += 5; atkSpeed += 8; }
    else if (mount === '麒麟') { attack *= 1.15; critDamage += 20; dodge += 3; }

    // Buff
    const now = Date.now();
    if (state.buffs.atkBoost && now < state.buffs.atkBoost.until) attack *= state.buffs.atkBoost.mult;
    if (state.buffs.critBoost && now < state.buffs.critBoost.until) critRate += state.buffs.critBoost.value * 100;
    if (state.buffs.expBoost && now < state.buffs.expBoost.until) expBonus += (state.buffs.expBoost.mult - 1) * 100;
    if (state.buffs.fortuneStar && now < state.buffs.fortuneStar.until) { expBonus += 100; goldBonus += 100; }

    // 前世天赋
    const talent = getCurrentTalent();
    if (talent) {
      const e = talent.effect;
      if (e.atkMult) attack *= e.atkMult;
      if (e.defMult) defense *= e.defMult;
      if (e.hpMult) maxHp *= e.hpMult;
      if (e.critRateBonus) critRate += e.critRateBonus;
      if (e.critDmgBonus) critDamage += e.critDmgBonus;
      if (e.lifestealBonus) lifesteal += e.lifestealBonus;
      if (e.atkSpeedBonus) atkSpeed += e.atkSpeedBonus;
      if (e.dodgeBonus) dodge += e.dodgeBonus;
      if (e.expMult) expBonus += (e.expMult - 1) * 100;
      if (e.goldMult) goldBonus += (e.goldMult - 1) * 100;
      if (e.zeroDodge) dodge = 0;
    }

    return {
      attack: Math.floor(attack), defense: Math.floor(defense), maxHp: Math.floor(maxHp),
      critRate: Math.min(75, Math.round(critRate * 10) / 10),
      critDamage: Math.round(critDamage),
      lifesteal: Math.min(25, Math.round(lifesteal * 10) / 10),
      dodge: Math.min(40, Math.round(dodge * 10) / 10),
      atkSpeed: Math.min(60, Math.round(atkSpeed)),
      goldBonus: Math.round(goldBonus), expBonus: Math.round(expBonus),
      skillDmg: Math.round(skillDmg),
      beastSkill,
    };
  }

  // 战力：进攻×生存的综合评分（用于装备对比与展示）
  function getPower(stats) {
    stats = stats || getComputedStats();
    const L = state.level;
    const offense = stats.attack * (1 + stats.critRate / 100 * (stats.critDamage / 100 - 1)) * (1 + stats.atkSpeed / 100);
    const mAtk = monsterBase(L).atk;
    const ehp = stats.maxHp * (mAtk + stats.defense) / mAtk / (1 - stats.dodge / 100) * (1 + stats.lifesteal / 30);
    return Math.floor(Math.pow(offense, 0.6) * Math.pow(ehp, 0.4) * 2);
  }

  function getEquipPowerDelta(item) {
    if (!item) return 0;
    const cur = getPower(getComputedStats());
    const next = getPower(getComputedStats({ [item.slot]: item }));
    return next - cur;
  }

  // ========== 游戏逻辑 ==========
  function getRealmIndex(level) {
    for (let i = REALMS.length - 1; i >= 0; i--) if (level >= REALMS[i].minLevel) return i;
    return 0;
  }
  function getRealm(level) { return REALMS[getRealmIndex(level)]; }

  function spawnMonster(level) {
    const realmIdx = getRealmIndex(level);
    const monsters = MONSTER_TEMPLATES[realmIdx];
    const templateIdx = Math.floor(Math.random() * monsters.length);
    const t = monsters[templateIdx];
    const base = monsterBase(level);

    let isElite = false;
    if (state.consecutiveKills > 0 && state.consecutiveKills % 15 === 0) isElite = true;
    else if (Math.random() < 0.04) isElite = true;

    const hpBars = isElite ? 2 + Math.floor(realmIdx / 2) : 1;
    const barHp = Math.floor(base.hp * t.hp * (isElite ? 1.6 : 1));
    const expBase = baseExpPerKill(level) * t.exp;
    const goldBase = goldPerKill(level) * t.gold;
    const monster = {
      name: t.name, tier: realmIdx, level,
      hp: barHp, maxHp: barHp,
      atk: Math.floor(base.atk * t.atk * (isElite ? 1.4 : 1)),
      exp: Math.max(1, Math.floor(expBase * (isElite ? 1.2 * hpBars : 1))),
      gold: Math.max(1, Math.floor(goldBase * (isElite ? 1.5 * hpBars : 1))),
      trait: t.trait, isElite, hpBars, currentBar: hpBars,
      totalHp: barHp * hpBars, totalMaxHp: barHp * hpBars,
    };
    return monster;
  }

  function spawnNext() {
    state.currentMonster = spawnMonster(state.level);
    const m = state.currentMonster;
    if (m.isElite) addLog(`⭐ 精英妖兽【${m.name}】出现了！`);
    emit('spawn', { monster: m });
  }

  // 鼠鼠的一次普攻
  function playerAttack(stats) {
    const m = state.currentMonster;
    if (!m || m.hp <= 0) return;
    if (m.trait === 'dodge' && Math.random() < 0.15) { emit('monsterDodge', {}); return; }
    const isCrit = Math.random() * 100 < stats.critRate;
    let damage = stats.attack * (isCrit ? stats.critDamage / 100 : 1) * rand(0.9, 1.1);
    if (stats.beastSkill === 'fire_cat') damage *= 1.1;
    let thunder = false;
    if (stats.beastSkill === 'thunder_eagle' && Math.random() < 0.15) { damage *= 2; thunder = true; }
    damage = Math.max(1, Math.floor(damage));
    dealDamageToMonster(damage, stats);
    if (stats.lifesteal > 0) healPlayer(damage * stats.lifesteal / 100, stats);
    if (stats.beastSkill === 'phoenix') healPlayer(stats.maxHp * 0.015, stats);
    if (m.trait === 'thorns') {
      const thorn = Math.floor(Math.min(damage * 0.08, stats.maxHp * 0.06));
      if (thorn > 0) { damageShieldThenHp(thorn); emit('traitTrigger', { trait: 'thorns', msg: `荆棘 -${formatNumber(thorn)}` }); }
    }
    emit('attack', { damage, isCrit, thunder, monsterName: m.name });
  }

  function dealDamageToMonster(damage, stats) {
    const m = state.currentMonster;
    m.hp = Math.max(0, m.hp - damage);
    m.totalHp = Math.max(0, m.totalHp - damage);
    state.totalDamageDealt += damage;
    state.dpsHistory.push({ damage, time: Date.now() });
    if (damage > (state.stats.maxHit || 0)) state.stats.maxHit = damage;
  }

  function healPlayer(amount, stats) {
    stats = stats || getComputedStats();
    state.hp = Math.min(stats.maxHp, state.hp + Math.floor(amount));
  }

  function damageShieldThenHp(dmg) {
    if (state.shield && state.shield.amount > 0) {
      const absorbed = Math.min(state.shield.amount, dmg);
      state.shield.amount -= absorbed;
      dmg -= absorbed;
      if (absorbed > 0) emit('shieldAbsorb', { amount: absorbed });
      if (state.shield.amount <= 0) state.shield = null;
    }
    state.hp = Math.max(0, state.hp - dmg);
    return dmg;
  }

  // 处理怪物血条切换/死亡；返回 true 表示已击杀
  function resolveMonsterHp() {
    const m = state.currentMonster;
    if (!m) return false;
    if (m.hp <= 0 && m.currentBar > 1) {
      m.currentBar--;
      m.hp = m.maxHp;
      emit('hpBarBreak', { barsLeft: m.currentBar });
      return false;
    }
    if (m.hp <= 0) { onMonsterKilled(); return true; }
    return false;
  }

  function onMonsterKilled() {
    const m = state.currentMonster;
    const stats = getComputedStats();
    const expGain = Math.floor(m.exp * (1 + stats.expBonus / 100));
    const goldGain = Math.floor(m.gold * (1 + stats.goldBonus / 100));
    gainExp(expGain);
    state.gold += goldGain;
    state.totalGold += goldGain;
    state.killCount++;
    state.consecutiveKills++;
    state.monsterKills[m.name] = (state.monsterKills[m.name] || 0) + 1;
    if (m.isElite) {
      state.eliteKillCount++;
      if (Math.random() < 0.5) {
        const tokens = 1 + Math.floor(Math.random() * 3);
        state.tianjiTokens += tokens;
        addLog(`🎫 精英掉落 ${tokens} 枚天机令`);
        emit('tokenDrop', { amount: tokens });
      }
      addLog(`💀 ⭐${m.name} 被击败！+${formatNumber(expGain)}修为 +${formatNumber(goldGain)}灵石`);
    }
    emit('kill', { monster: m, expGain, goldGain });
    processDrops(m);
    tryEncounter();
    tryCaptureBeast(1);
    checkLevelUp();
    checkAchievements();
    spawnNext();
  }

  function gainExp(amount) {
    if (state.needTribulation || state.level >= MAX_LEVEL) {
      // 瓶颈期/满级：修为存满后不再增长
      state.exp = Math.min(getExpToNextLevel(state.level), state.exp + amount);
    } else {
      state.exp += amount;
    }
    state.totalExp += amount;
  }

  function monsterAttack(stats) {
    const m = state.currentMonster;
    if (!m || m.hp <= 0 || !m.atk) return;
    if (Math.random() * 100 < stats.dodge) { emit('dodge', {}); return; }
    let atk = m.atk;
    if (m.trait === 'berserk' && m.hp < m.maxHp * 0.5 && m.currentBar <= 1) {
      atk *= 1.6;
      if (!m._raged) { m._raged = true; emit('traitTrigger', { trait: 'berserk', msg: '狂暴！' }); }
    }
    if (m.trait === 'burn') atk *= 1.15;
    let dmg = mitigate(atk, stats.defense) * rand(0.85, 1.15);
    let isCrit = false;
    if (m.trait === 'critBoost' && Math.random() < 0.2) { dmg *= 2; isCrit = true; }
    dmg = Math.max(1, Math.floor(dmg));
    const taken = damageShieldThenHp(dmg);
    emit('monsterAttack', { damage: taken, raw: dmg, isCrit });
    if (m.trait === 'lifesteal' && taken > 0) {
      const heal = Math.floor(taken * 0.3);
      m.hp = Math.min(m.maxHp, m.hp + heal);
      m.totalHp = Math.min(m.totalMaxHp, m.totalHp + heal);
    }
    if (m.trait === 'poison' && Math.random() < 0.3) {
      state.playerDoTs.push({ type: 'poison', damage: dmg * 0.2, ticksLeft: 3 });
      emit('traitTrigger', { trait: 'poison', msg: '中毒！' });
    }
    if (m.trait === 'burn' && Math.random() < 0.25) {
      state.playerDoTs.push({ type: 'burn', damage: dmg * 0.15, ticksLeft: 3 });
      emit('traitTrigger', { trait: 'burn', msg: '灼烧！' });
    }
  }

  // ---------- 神通 ----------
  function getActiveSkillState() {
    return ACTIVE_SKILLS.map(sk => ({
      ...sk,
      unlocked: state.level >= sk.unlockLevel,
      cooldown: state.skillCooldowns[sk.id] || 0,
    }));
  }

  function castSkill(skillId, isAuto) {
    const sk = ACTIVE_SKILLS.find(s => s.id === skillId);
    if (!sk) return { success: false, msg: '神通不存在' };
    if (state.level < sk.unlockLevel) return { success: false, msg: `Lv.${sk.unlockLevel} 领悟` };
    if ((state.skillCooldowns[sk.id] || 0) > 0) return { success: false, msg: '冷却中' };
    if (state.isDead) return { success: false, msg: '鼠鼠阵亡中' };
    const stats = getComputedStats();
    const m = state.currentMonster;
    const powerMult = 1 + stats.skillDmg / 100;
    let result = { success: true, id: sk.id };
    if (sk.id === 'sword_qi' || sk.id === 'myriad_swords') {
      if (!m || m.hp <= 0) return { success: false, msg: '没有目标' };
      const ratio = sk.id === 'sword_qi' ? 4 : 12;
      const isCrit = Math.random() * 100 < stats.critRate;
      const damage = Math.max(1, Math.floor(stats.attack * ratio * powerMult * (isCrit ? stats.critDamage / 100 : 1) * rand(0.95, 1.05)));
      dealDamageToMonster(damage, stats);
      result.damage = damage; result.isCrit = isCrit;
      emit('skillCast', { id: sk.id, damage, isCrit, auto: !!isAuto });
      resolveMonsterHp();
    } else if (sk.id === 'heal_spring') {
      const amount = Math.floor(stats.maxHp * 0.35 * (1 + stats.skillDmg / 200));
      healPlayer(amount, stats);
      result.heal = amount;
      emit('skillCast', { id: sk.id, heal: amount, auto: !!isAuto });
    } else if (sk.id === 'golden_shield') {
      const amount = Math.floor(stats.maxHp * 0.3 * (1 + stats.skillDmg / 200));
      state.shield = { amount, max: amount, ticks: 6 };
      result.shield = amount;
      emit('skillCast', { id: sk.id, shield: amount, auto: !!isAuto });
    }
    state.skillCooldowns[sk.id] = sk.cd;
    state.stats.skillCasts = (state.stats.skillCasts || 0) + 1;
    checkQuest();
    return result;
  }

  function toggleAutoCast() {
    if (state.level < AUTO_CAST_LEVEL) return { success: false, msg: `筑基期（Lv.${AUTO_CAST_LEVEL}）解锁自动施放` };
    state.autoCast = !state.autoCast;
    saveState();
    checkQuest();
    return { success: true, on: state.autoCast };
  }

  function autoCastSkills(stats) {
    if (!state.autoCast || state.level < AUTO_CAST_LEVEL) return;
    const hpPct = state.hp / stats.maxHp;
    const m = state.currentMonster;
    const ready = id => state.level >= ACTIVE_SKILLS.find(s => s.id === id).unlockLevel && !(state.skillCooldowns[id] > 0);
    if (hpPct < 0.5 && ready('heal_spring')) castSkill('heal_spring', true);
    if (!state.shield && (hpPct < 0.8 || (m && m.isElite)) && ready('golden_shield')) castSkill('golden_shield', true);
    if (m && m.hp > 0 && ready('myriad_swords') && (m.isElite || m.totalHp > stats.attack * 6)) castSkill('myriad_swords', true);
    if (state.currentMonster && state.currentMonster.hp > 0 && ready('sword_qi')) castSkill('sword_qi', true);
  }

  function tickCooldowns() {
    for (const k of Object.keys(state.skillCooldowns)) {
      if (state.skillCooldowns[k] > 0) state.skillCooldowns[k]--;
    }
    if (state.shield) {
      state.shield.ticks--;
      if (state.shield.ticks <= 0) state.shield = null;
    }
  }

  // ---------- 主循环 ----------
  function processCombatTick() {
    if (!state) return;
    const now = Date.now();
    state.stats.playTime = (state.stats.playTime || 0) + TICK_INTERVAL;

    if (state.isDead) {
      if (now >= state.reviveTime) {
        state.isDead = false;
        const stats = getComputedStats();
        state.hp = Math.floor(stats.maxHp * 0.6);
        state.consecutiveKills = 0;
        state.playerDoTs = [];
        state.shield = null;
        addLog('🔄 鼠鼠重生！');
        emit('revive', {});
        spawnNext();
      }
      state.lastTickTime = now;
      saveState();
      return;
    }

    cleanExpiredBuffs();
    refreshRealmCharges();
    processCaveProduction();
    checkAndRefreshDaily();
    updateFortune(now);
    autoUsePills();

    if (!state.currentMonster || (state.currentMonster.hp <= 0 && state.currentMonster.currentBar <= 1)) spawnNext();

    let stats = getComputedStats();

    // 自动吃药
    if (state.autoHealEnabled && state.hp / stats.maxHp * 100 <= state.autoHealThreshold && (state.pills.heal_pill || 0) > 0) {
      state.pills.heal_pill--;
      state.hp = stats.maxHp;
      addLog('💚 自动服用回元丹');
      emit('autoHeal', {});
    }

    // DoT
    let dot = 0;
    state.playerDoTs = state.playerDoTs.filter(d => {
      if (d.ticksLeft > 0) { dot += Math.floor(d.damage); d.ticksLeft--; }
      return d.ticksLeft > 0;
    });
    if (dot > 0) {
      state.hp = Math.max(0, state.hp - dot);
      emit('dotDamage', { damage: dot, type: state.playerDoTs[0]?.type || 'poison' });
      if (state.hp <= 0) { handlePlayerDeath(); return; }
    }

    // 神通（自动）
    autoCastSkills(stats);

    // 鼠鼠出手（攻速决定每回合出手次数）
    const m = state.currentMonster;
    let charmed = false;
    if (m && m.trait === 'charm' && Math.random() < 0.1) {
      charmed = true;
      emit('traitTrigger', { trait: 'charm', msg: '魅惑！失神一回合' });
    }
    if (!charmed) {
      const speed = stats.atkSpeed - (m && m.trait === 'slow' ? 30 : 0);
      state.attackMeter = (state.attackMeter || 0) + Math.max(0.4, 1 + speed / 100);
      let swings = 0;
      while (state.attackMeter >= 1 && swings < 2 && state.currentMonster && state.currentMonster.hp > 0) {
        state.attackMeter -= 1; swings++;
        playerAttack(stats);
        if (resolveMonsterHp()) break;
      }
      if (state.attackMeter > 1.5) state.attackMeter = 1.5;
    }
    if (state.hp <= 0) { handlePlayerDeath(); return; }

    // 灵兽出手
    const beast = getActiveBeast();
    if (beast && state.currentMonster && state.currentMonster.hp > 0 && Math.random() < 0.45) {
      const talent = getCurrentTalent();
      const mult = (talent && talent.effect.beastAtkMult) || 1;
      const bb = beastBonus(beast);
      const beastDmg = Math.max(1, Math.floor(stats.attack * bb.dmgMult * mult * rand(0.85, 1.15)));
      dealDamageToMonster(beastDmg, stats);
      emit('beastAttack', { damage: beastDmg, beastName: beast.name, templateId: beast.templateId });
      resolveMonsterHp();
    }

    // 怪物出手
    stats = getComputedStats();
    monsterAttack(stats);
    if (state.hp <= 0) { handlePlayerDeath(); return; }

    // 回复
    const talent = getCurrentTalent();
    if (!(talent && talent.effect.noNaturalRegen) && state.hp < stats.maxHp) {
      healPlayer(stats.maxHp * 0.02, stats);
    }

    tickCooldowns();
    const cutoff = now - 10000;
    if (state.dpsHistory.length > 60 || (state.dpsHistory[0] && state.dpsHistory[0].time < cutoff)) {
      state.dpsHistory = state.dpsHistory.filter(d => d.time > cutoff);
    }
    checkQuest();
    state.lastTickTime = now;
    saveState();
  }

  // ========== 死亡/复活 ==========
  function handlePlayerDeath() {
    state.isDead = true;
    state.deathCount++;
    state.consecutiveKills = 0;
    state.playerDoTs = [];
    state.shield = null;
    const talent = getCurrentTalent();
    const isPhoenix = talent && talent.effect.quickRevive;
    // 损失5%灵石，但最多相当于20只同级妖兽的灵石，挂机卡关时不至于越挂越穷
    const goldLoss = (talent && talent.effect.noDeathPenalty) ? 0 : Math.floor(Math.min(state.gold * 0.05, goldPerKill(state.level) * 20));
    state.gold = Math.max(0, state.gold - goldLoss);
    const reviveDelay = isPhoenix ? 1000 : Math.min(12000, 4000 + (state.deathCount - 1) * 300);
    state.reviveTime = Date.now() + reviveDelay;
    addLog(`💀 鼠鼠被击败！损失 ${formatNumber(goldLoss)} 灵石，${Math.ceil(reviveDelay / 1000)}秒后复活`);
    emit('death', { goldLoss, reviveDelay: Math.ceil(reviveDelay / 1000) });
    state.lastTickTime = Date.now();
    checkAchievements();
    saveState();
  }

  // ========== 掉落 ==========
  function addToInventory(equip) {
    if (state.inventory.length < state.inventoryMax) { state.inventory.push(equip); return true; }
    const gold = getEquipSellPrice(equip);
    state.gold += gold;
    addLog(`📦 背包已满，[${equip.name}] 自动卖出 ${formatNumber(gold)} 灵石`);
    return false;
  }

  // 新装备：自动换装 / 自动出售 / 放入背包
  function handleNewEquip(equip, announce) {
    const delta = getEquipPowerDelta(equip);
    if (state.autoEquip && delta > 0) {
      const old = state.equipment[equip.slot];
      state.equipment[equip.slot] = equip;
      if (old) handleNewEquip(old, false);
      state.hp = Math.min(state.hp, getComputedStats().maxHp);
      addLog(`⚡ 自动换上 <span style="color:${equip.qualityColor}">[${equip.name}·${EQUIP_QUALITIES[equip.qualityIdx].label}]</span>`);
      emit('equipDrop', { equip, auto: 'equip' });
      emit('equipChange', {});
      return 'equipped';
    }
    if (state.autoSellQuality >= 0 && equip.qualityIdx <= state.autoSellQuality && delta <= 0) {
      state.gold += getEquipSellPrice(equip);
      return 'sold';
    }
    if (addToInventory(equip)) {
      if (announce) {
        addLog(`📦 获得装备 <span style="color:${equip.qualityColor}">[${equip.name}·${EQUIP_QUALITIES[equip.qualityIdx].label}]</span>`);
        emit('equipDrop', { equip });
      }
      return 'kept';
    }
    return 'sold';
  }

  function setAutoEquip(on) { state.autoEquip = !!on; saveState(); if (on) autoEquipBest(); return state.autoEquip; }
  function setAutoSellQuality(q) {
    state.autoSellQuality = Math.max(-1, Math.min(3, q));
    if (state.autoSellQuality >= 0) {
      for (let i = state.inventory.length - 1; i >= 0; i--) {
        const it = state.inventory[i];
        if (it.qualityIdx <= state.autoSellQuality && getEquipPowerDelta(it) <= 0) { state.gold += getEquipSellPrice(it); state.inventory.splice(i, 1); }
      }
    }
    saveState();
  }

  function processDrops(monster) {
    if (Math.random() < 0.28) {
      const r = Math.random();
      const matType = r < 0.5 ? 'herb' : (r < 0.84 ? 'ore' : 'essence');
      const amount = matType === 'essence' ? 1 : (Math.random() < 0.3 ? 2 : 1);
      state.materials[matType] += amount;
      emit('drop', { type: matType, amount });
    }
    const talent = getCurrentTalent();
    let dropRate = 0.045 + getRealmIndex(state.level) * 0.005 + ((talent && talent.effect.dropBonus) || 0) / 100;
    if (monster.isElite) dropRate += 0.4;
    if (Math.random() < dropRate) {
      const q = monster.isElite ? rollQuality(1) : rollQuality(0);
      const equip = generateEquipment(state.level, q);
      handleNewEquip(equip, true);
    }
  }

  function tryEncounter() {
    const now = Date.now();
    if (now - state.lastEncounterTime < 30000) return;
    const talent = getCurrentTalent();
    const mult = (talent && talent.effect.encounterRateMult) || 1;
    if (Math.random() > 0.06 * mult) return;
    state.lastEncounterTime = now;
    const totalWeight = ENCOUNTER_EVENTS.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * totalWeight;
    let event = ENCOUNTER_EVENTS[0];
    for (const e of ENCOUNTER_EVENTS) { roll -= e.weight; if (roll <= 0) { event = e; break; } }
    const r = event.rewards;
    const got = [];
    if (r.herb) { const n = randRange(r.herb); state.materials.herb += n; got.push(`灵药×${n}`); }
    if (r.ore) { const n = randRange(r.ore); state.materials.ore += n; got.push(`矿石×${n}`); }
    if (r.essence) { const n = randRange(r.essence); state.materials.essence += n; got.push(`精华×${n}`); }
    if (r.goldK) { const g = Math.floor(goldPerKill(state.level) * randRange(r.goldK)); state.gold += g; state.totalGold += g; got.push(`灵石×${formatNumber(g)}`); }
    if (r.expPercent) { const e = Math.floor(getExpToNextLevel(state.level) * randRange(r.expPercent) / 100); gainExp(e); got.push(`修为×${formatNumber(e)}`); }
    if (r.equip) {
      const equip = generateEquipment(state.level, rollQuality(1));
      if (addToInventory(equip)) got.push(`[${equip.name}·${EQUIP_QUALITIES[equip.qualityIdx].label}]`);
    }
    if (Math.random() < 0.3) { const t = randInt(1, 2); state.tianjiTokens += t; got.push(`天机令×${t}`); }
    addLog(`🎲 奇遇·${event.name}！${event.desc} 获得${got.join('、')}`);
    emit('encounter', { event, rewards: got });
  }

  function tryCaptureBeast(mult) {
    const realmIdx = getRealmIndex(state.level);
    const talent = getCurrentTalent();
    const captureMult = ((talent && talent.effect.beastCaptureRate) || 1) * (mult || 1);
    for (const tmpl of BEAST_TEMPLATES) {
      if (realmIdx < tmpl.minRealm) continue;
      if (state.beasts.find(b => b.templateId === tmpl.id)) continue;
      if (Math.random() < tmpl.captureChance * captureMult) {
        const beast = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), templateId: tmpl.id, level: 1 };
        state.beasts.push(beast);
        if (!state.activeBeastId) state.activeBeastId = beast.id;
        addLog(`🐾 捕获了灵兽 ${tmpl.icon}${tmpl.name}！`);
        emit('beastCapture', { beast: { ...beast, name: tmpl.name, icon: tmpl.icon } });
        return true;
      }
    }
    return false;
  }

  function applyLevelUpStats() {
    state.baseAttack = Math.floor(state.baseAttack * 1.12 + 2);
    state.baseDefense = Math.floor(state.baseDefense * 1.08 + 1);
    state.baseMaxHp = Math.floor(state.baseMaxHp * 1.1 + 10);
  }

  function checkLevelUp() {
    while (!state.needTribulation && state.level < MAX_LEVEL && state.exp >= getExpToNextLevel(state.level)) {
      const nextRealm = getRealm(state.level + 1);
      const curRealm = getRealm(state.level);
      if (nextRealm.name !== curRealm.name) {
        state.exp = getExpToNextLevel(state.level);
        state.needTribulation = true;
        addLog(`⛈️ 修为圆满！需渡劫方能突破【${nextRealm.name}】`);
        emit('tribulationReady', { realm: nextRealm.name });
        break;
      }
      state.exp -= getExpToNextLevel(state.level);
      state.level++;
      applyLevelUpStats();
      state.hp = getComputedStats().maxHp;
      addLog(`⬆️ 升级！Lv.${state.level}`);
      emit('levelup', { level: state.level, realm: curRealm.name });
      const unlocked = ACTIVE_SKILLS.find(s => s.unlockLevel === state.level);
      if (unlocked) {
        addLog(`🌠 领悟神通【${unlocked.name}】！`);
        emit('skillUnlock', { skill: unlocked });
      }
    }
    if (state.level >= MAX_LEVEL) state.exp = Math.min(state.exp, getExpToNextLevel(state.level));
  }

  // ========== 成就 ==========
  function checkAchievements() {
    let any = false;
    for (const ach of ACHIEVEMENTS) {
      if (state.achievements[ach.id]) continue;
      if (ach.check(state)) {
        state.achievements[ach.id] = true;
        addLog(`🏆 成就达成【${ach.name}】永久 ${describeReward(ach.reward)}`);
        emit('achievement', { achievement: ach, rewardText: describeReward(ach.reward) });
        any = true;
      }
    }
    return any;
  }

  // ========== 修行指引 ==========
  function getCurrentQuest() {
    if (state.questIndex >= QUESTS.length) return null;
    const q = QUESTS[state.questIndex];
    const done = q.check(state);
    return { ...q, index: state.questIndex, total: QUESTS.length, done, progressValue: q.progress ? q.progress(state) : null };
  }

  function checkQuest() {
    const q = QUESTS[state.questIndex];
    if (!q) return;
    const done = q.check(state);
    if (done && !state._questNotified) {
      state._questNotified = true;
      emit('questReady', { quest: q });
    }
  }

  function claimQuest() {
    const q = QUESTS[state.questIndex];
    if (!q) return { success: false, msg: '修行指引已全部完成' };
    if (!q.check(state)) return { success: false, msg: '尚未完成' };
    const r = q.reward;
    if (r.goldK) { const g = Math.floor(goldPerKill(state.level) * r.goldK); state.gold += g; state.totalGold += g; }
    if (r.tokens) state.tianjiTokens += r.tokens;
    if (r.materials) for (const [k, v] of Object.entries(r.materials)) state.materials[k] += v;
    if (r.pills) for (const [k, v] of Object.entries(r.pills)) state.pills[k] = (state.pills[k] || 0) + v;
    if (r.equip) addToInventory(generateEquipment(state.level, r.equip.quality, r.equip.slot));
    state.questIndex++;
    state._questNotified = false;
    addLog(`📜 完成修行指引【${q.title}】获得：${q.rewardText}`);
    emit('questComplete', { quest: q });
    saveState();
    checkQuest();
    return { success: true, msg: `获得：${q.rewardText}` };
  }

  // ========== 洞府 ==========
  function processCaveProduction() {
    const now = Date.now();
    const msPassed = now - state.lastCaveProduction;
    if (msPassed < 60000) return;
    const mins = Math.floor(msPassed / 60000);
    const herbs = Math.floor((state.cave.herb_garden || 0) * 0.5 * mins);
    const ores = Math.floor((state.cave.mine_shaft || 0) * 0.3 * mins);
    if (herbs > 0) state.materials.herb += herbs;
    if (ores > 0) state.materials.ore += ores;
    state.lastCaveProduction += mins * 60000;
  }

  function upgradeCaveBuilding(buildingId) {
    const b = CAVE_BUILDINGS.find(x => x.id === buildingId);
    if (!b) return { success: false, msg: '建筑不存在' };
    if (state.level < b.minLevel) return { success: false, msg: `Lv.${b.minLevel} 解锁` };
    const lv = state.cave[buildingId] || 0;
    if (lv >= b.maxLevel) return { success: false, msg: '已满级' };
    const cost = getCaveBuildingCost(buildingId);
    if (state.gold < cost) return { success: false, msg: `灵石不足（需要${formatNumber(cost)}）` };
    state.gold -= cost;
    state.cave[buildingId] = lv + 1;
    addLog(`🏠 ${b.icon}${b.name} 升至 ${lv + 1} 级`);
    saveState();
    checkQuest();
    return { success: true, msg: `${b.name} 升至 ${lv + 1} 级` };
  }

  function maxUpgradeCave(buildingId) {
    let n = 0, spent = 0;
    for (;;) {
      const cost = getCaveBuildingCost(buildingId);
      const r = upgradeCaveBuilding(buildingId);
      if (!r.success) break;
      n++; spent += cost;
    }
    const b = CAVE_BUILDINGS.find(x => x.id === buildingId);
    if (n > 0) return { success: true, msg: `${b.name} 连升 ${n} 级，花费 ${formatNumber(spent)} 灵石` };
    return { success: false, msg: `灵石不足（需要${formatNumber(getCaveBuildingCost(buildingId))}）` };
  }

  // ========== 渡劫 ==========
  function getTribulationChance() {
    let chance = 0.55;
    const qualitySum = EQUIP_SLOTS.reduce((s, k) => s + (state.equipment[k] ? state.equipment[k].qualityIdx : 0), 0);
    chance += Math.min(0.15, qualitySum * 0.01);
    if (state.buffs.tribBoost && Date.now() < state.buffs.tribBoost.until) chance += state.buffs.tribBoost.value;
    if (state.activeBeastId) chance += 0.05;
    chance += (state.tribFailStreak || 0) * 0.1;
    return Math.min(0.95, chance);
  }

  function attemptTribulation() {
    if (!state.needTribulation) return { success: false, msg: '当前无需渡劫' };
    if (state.isDead) return { success: false, msg: '鼠鼠阵亡中，无法渡劫' };
    if (state.tribulationCooldown > Date.now()) {
      return { success: false, cooldown: true, msg: `天劫余威未散（${Math.ceil((state.tribulationCooldown - Date.now()) / 1000)}秒）` };
    }
    const chance = getTribulationChance();
    if (Math.random() < chance) {
      state.needTribulation = false;
      state.tribFailStreak = 0;
      state.exp = 0;
      state.level++;
      applyLevelUpStats();
      state.baseAttack = Math.floor(state.baseAttack * 2);
      state.baseDefense = Math.floor(state.baseDefense * 1.5);
      state.baseMaxHp = Math.floor(state.baseMaxHp * 2);
      state.baseCritRate = Math.min(60, state.baseCritRate + 3);
      state.baseCritDamage += 20;
      state.hp = getComputedStats().maxHp;
      state.currentMonster = null;
      const realm = getRealm(state.level);
      addLog(`🌟 渡劫成功！鼠鼠晋升【${realm.name}】！`);
      emit('breakthrough', { realm: realm.name, level: state.level });
      const unlocked = ACTIVE_SKILLS.find(s => s.unlockLevel === state.level);
      if (unlocked) emit('skillUnlock', { skill: unlocked });
      checkAchievements();
      checkQuest();
      saveState();
      return { success: true, msg: `渡劫成功！晋升${realm.name}！`, chance };
    }
    state.tribFailStreak = (state.tribFailStreak || 0) + 1;
    state.tribulationCooldown = Date.now() + 15000;
    state.hp = Math.max(1, Math.floor(state.hp * 0.3));
    addLog(`💥 渡劫失败！天劫反噬，道心更坚（下次成功率+10%）`);
    emit('tribulationFail', {});
    saveState();
    return { success: false, msg: '渡劫失败！道心更坚，下次成功率+10%', chance };
  }

  // ========== 秘境 ==========
  function getRealmMaxCharges() {
    const talent = getCurrentTalent();
    return state.secretRealmMaxCharges + ((talent && talent.effect.realmChargeBonus) || 0);
  }

  function refreshRealmCharges() {
    const now = Date.now();
    const max = getRealmMaxCharges();
    if (state.secretRealmCharges >= max) { state.lastRealmRefresh = now; return; }
    const hours = Math.floor((now - state.lastRealmRefresh) / 3600000);
    if (hours >= 1) {
      state.secretRealmCharges = Math.min(max, state.secretRealmCharges + hours);
      state.lastRealmRefresh += hours * 3600000;
    }
  }

  function getRealmChargeCountdown() {
    if (state.secretRealmCharges >= getRealmMaxCharges()) return 0;
    return Math.max(0, 3600000 - (Date.now() - state.lastRealmRefresh));
  }

  // 模拟一场回合制战斗（秘境/锁妖塔用）
  function simulateDuel(p, mon, maxRounds) {
    let hp = p.hp, mHp = mon.hp;
    let meter = 0;
    for (let r = 0; r < maxRounds; r++) {
      meter += Math.max(0.4, 1 + p.atkSpeed / 100);
      while (meter >= 1) {
        meter -= 1;
        const crit = Math.random() * 100 < p.critRate;
        const dmg = p.attack * (crit ? p.critDamage / 100 : 1) * rand(0.9, 1.1) * (mon.shield || 1);
        mHp -= dmg;
        if (p.lifesteal) hp = Math.min(p.maxHp, hp + dmg * p.lifesteal / 100);
      }
      if (r % 6 === 5 && p.skillBurst) mHp -= p.attack * p.skillBurst;
      if (mHp <= 0) return { win: true, hp: Math.max(1, hp), rounds: r + 1 };
      if (Math.random() * 100 >= p.dodge) {
        const rage = mon.rage && mHp < mon.hp * 0.3 ? 1.5 : 1;
        hp -= mitigate(mon.atk * rage, p.defense) * rand(0.85, 1.15);
      }
      if (hp <= 0) return { win: false, hp: 0, rounds: r + 1 };
      hp = Math.min(p.maxHp, hp + p.maxHp * 0.02);
    }
    return { win: false, hp: Math.max(0, hp), rounds: maxRounds, timeout: true };
  }

  function duelStats(stats) {
    const unlockedBursts = (state.level >= 3 ? 4 : 0) + (state.level >= 22 ? 2 : 0);
    return { ...stats, hp: stats.maxHp, skillBurst: unlockedBursts * (1 + stats.skillDmg / 100) };
  }

  function enterSecretRealm(realmIndex) {
    refreshRealmCharges();
    if (state.secretRealmCharges <= 0) return { success: false, msg: '秘境次数不足（每小时恢复1次）' };
    const realm = SECRET_REALMS[realmIndex];
    if (!realm) return { success: false, msg: '秘境不存在' };
    if (getRealmIndex(state.level) < realm.minRealm) return { success: false, msg: '境界不足' };
    state.secretRealmCharges--;
    state.stats.realmRuns = (state.stats.realmRuns || 0) + 1;

    const stats = getComputedStats();
    const L = state.level;
    const totalLayers = 5;
    const rewards = [];
    const log = [];
    const buff = REALM_BUFFS[Math.floor(Math.random() * REALM_BUFFS.length)];
    log.push(`✨ 获得秘境增益【${buff.name}】${buff.desc}`);
    const p = duelStats(stats);
    if (buff.effect.atkMult) p.attack = Math.floor(p.attack * buff.effect.atkMult);
    if (buff.effect.defMult) p.defense = Math.floor(p.defense * buff.effect.defMult);
    if (buff.effect.critBonus) p.critRate = Math.min(100, p.critRate + buff.effect.critBonus);
    if (buff.effect.hpMult) p.maxHp = Math.floor(p.maxHp * buff.effect.hpMult);
    let hp = p.maxHp;
    const goldMult = (buff.effect.goldMult || 1) * (1 + stats.goldBonus / 100);
    const lootMult = buff.effect.lootMult || 1;
    let alive = true, cleared = 0;
    const gold = (k) => { const g = Math.floor(goldPerKill(L) * k * goldMult); state.gold += g; state.totalGold += g; return g; };

    for (let layer = 1; layer <= totalLayers && alive; layer++) {
      const isBoss = layer === totalLayers;
      let event;
      if (isBoss) event = REALM_EVENTS[0];
      else {
        const tw = REALM_EVENTS.reduce((s, e) => s + e.weight, 0);
        let roll = Math.random() * tw;
        event = REALM_EVENTS[0];
        for (const e of REALM_EVENTS) { roll -= e.weight; if (roll <= 0) { event = e; break; } }
      }
      if (event.type === 'battle') {
        const tier = Math.min(5, realm.bossTier);
        const tmpl = MONSTER_TEMPLATES[tier][Math.floor(Math.random() * 3)];
        const base = monsterBase(L, { pos: 0.5 });
        const mon = { hp: base.hp * (1 + layer * 0.12) * (isBoss ? 3 : 1), atk: base.atk * (1 + layer * 0.05) * (isBoss ? 1.3 : 1), rage: isBoss };
        const res = simulateDuel({ ...p, hp }, mon, 30);
        if (!res.win) {
          alive = false;
          log.push(`💀 第${layer}层：${isBoss ? '守关BOSS ' : ''}${tmpl.name}将你击退，探索终止`);
        } else {
          hp = res.hp;
          const g = gold(isBoss ? 30 : 8 + layer * 2);
          rewards.push(`灵石${formatNumber(g)}`);
          let extra = '';
          if (isBoss) {
            const minQ = realm.rewards.equipQualityMin || 1;
            const eq = generateEquipment(L, rollQuality(minQ));
            if (addToInventory(eq)) { rewards.push(`[${eq.name}·${EQUIP_QUALITIES[eq.qualityIdx].label}]`); extra = ` 掉落[${eq.name}·${EQUIP_QUALITIES[eq.qualityIdx].label}]`; }
          }
          log.push(`${event.icon} 第${layer}层：击败${isBoss ? '守关BOSS ' : ''}${tmpl.name}！+${formatNumber(g)}灵石${extra}`);
        }
      } else if (event.type === 'treasure') {
        const r = realm.rewards; const got = [];
        for (const mat of ['herb', 'ore', 'essence']) {
          if (!r[mat]) continue;
          const n = Math.floor(randRange(r[mat]) * lootMult);
          if (n > 0) { state.materials[mat] += n; got.push(`${({ herb: '灵药', ore: '矿石', essence: '精华' })[mat]}×${n}`); }
        }
        if (Math.random() < 0.35 * lootMult) {
          const eq = generateEquipment(L, rollQuality(realm.rewards.equipQualityMin || 0));
          if (addToInventory(eq)) got.push(`[${eq.name}·${EQUIP_QUALITIES[eq.qualityIdx].label}]`);
        }
        rewards.push(...got);
        log.push(`${event.icon} 第${layer}层：发现宝箱！${got.join('、') || '空空如也'}`);
      } else if (event.type === 'trap') {
        const dmg = Math.floor(p.maxHp * rand(0.12, 0.28));
        hp -= dmg;
        if (hp <= 0) { alive = false; log.push(`${event.icon} 第${layer}层：踩中致命陷阱，探索终止`); }
        else log.push(`${event.icon} 第${layer}层：踩中陷阱！-${formatNumber(dmg)}生命（剩余${Math.floor(hp / p.maxHp * 100)}%）`);
      } else if (event.type === 'heal') {
        const amt = Math.floor(p.maxHp * rand(0.25, 0.45));
        hp = Math.min(p.maxHp, hp + amt);
        log.push(`${event.icon} 第${layer}层：灵泉恢复${formatNumber(amt)}生命（${Math.floor(hp / p.maxHp * 100)}%）`);
      } else {
        const roll = Math.random();
        if (roll < 0.3) {
          const g = gold(25); rewards.push(`灵石${formatNumber(g)}`);
          log.push(`${event.icon} 第${layer}层：前辈遗宝！+${formatNumber(g)}灵石`);
        } else if (roll < 0.5) {
          const t = realmIndex + 2 + randInt(0, 2); state.tianjiTokens += t; rewards.push(`天机令×${t}`);
          log.push(`${event.icon} 第${layer}层：参悟天机！+${t}天机令`);
        } else if (roll < 0.75) {
          const e = Math.floor(getExpToNextLevel(L) * 0.12); gainExp(e); rewards.push(`修为${formatNumber(e)}`);
          if (realm.rewards.beastChance && Math.random() < realm.rewards.beastChance) {
            if (tryCaptureBeast(20)) rewards.push('灵兽！');
          }
          log.push(`${event.icon} 第${layer}层：顿悟修行！+${formatNumber(e)}修为`);
        } else {
          const h = Math.floor((3 + realmIndex * 2) * lootMult), o = Math.floor((2 + realmIndex) * lootMult);
          state.materials.herb += h; state.materials.ore += o; rewards.push(`灵药×${h}`, `矿石×${o}`);
          log.push(`${event.icon} 第${layer}层：材料洞穴！灵药×${h} 矿石×${o}`);
        }
      }
      if (alive) cleared = layer;
    }
    const tokens = Math.floor((realmIndex + 1) * (cleared / totalLayers) * 2) + 1;
    state.tianjiTokens += tokens;
    rewards.push(`天机令×${tokens}`);
    checkLevelUp();
    checkAchievements();
    const summary = alive ? `秘境【${realm.name}】五层全通！` : `秘境【${realm.name}】探索至第${cleared}/${totalLayers}层`;
    addLog(`🏔️ ${summary}`);
    emit('secretRealmClear', { realm: realm.name, rewards, layers: cleared, total: totalLayers, alive });
    checkQuest();
    saveState();
    return { success: true, msg: summary, rewards, log, buff: buff.name, layers: cleared, total: totalLayers, alive };
  }

  // ========== 锁妖塔 ==========
  function getTowerMonster(floor) {
    const L = towerLevel(floor);
    const over = Math.max(0, 1 + (floor - 1) * 0.55 - (MAX_LEVEL + 1)); // 超出等级上限后继续指数变强
    const isBoss = floor % 10 === 0;
    const tier = Math.min(5, getRealmIndex(L));
    const tmpl = MONSTER_TEMPLATES[tier][floor % 3];
    const base = monsterBase(L, { htk: 3.2, htd: 20 });
    return {
      name: tmpl.name, level: L, isBoss,
      hp: Math.floor(base.hp * (isBoss ? 2.4 : 1) * Math.pow(1.3, over)), atk: Math.floor(base.atk * (isBoss ? 1.25 : 1) * Math.pow(1.25, over)),
      shield: isBoss ? 0.85 : 1, rage: isBoss,
    };
  }

  function challengeTower() {
    const floor = state.towerFloor;
    const mon = getTowerMonster(floor);
    const stats = getComputedStats();
    const res = simulateDuel(duelStats(stats), mon, 30);
    if (!res.win) {
      addLog(`🗼 锁妖塔第${floor}层${mon.isBoss ? '(BOSS)' : ''}挑战失败`);
      saveState();
      return { success: false, floor, msg: `第${floor}层${mon.isBoss ? '（BOSS）' : ''}${mon.name} 太强了，需要更强！`, monsterName: mon.name, isBoss: mon.isBoss };
    }
    const L = mon.level;
    const goldReward = Math.floor(goldPerKill(L) * (mon.isBoss ? 30 : 8));
    const expReward = Math.floor(getExpToNextLevel(Math.min(state.level, L)) * (mon.isBoss ? 0.15 : 0.03));
    state.gold += goldReward; state.totalGold += goldReward;
    gainExp(expReward);
    state.towerFloor++;
    if (floor > state.towerBestFloor) state.towerBestFloor = floor;
    let towerTokens = 0;
    if (floor % 5 === 0) { towerTokens = 1 + Math.floor(floor / 20); state.tianjiTokens += towerTokens; }
    let milestoneMsg = '';
    const ms = TOWER_MILESTONES[floor];
    if (ms && !state.towerMilestones[floor]) {
      state.towerMilestones[floor] = true;
      const r = ms.rewards;
      const g = Math.floor(goldPerKill(L) * r.goldK);
      state.gold += g; state.totalGold += g;
      if (r.tianjiTokens) state.tianjiTokens += r.tianjiTokens;
      for (const mat of ['herb', 'ore', 'essence']) if (r[mat]) state.materials[mat] += r[mat];
      milestoneMsg = `🏆【${ms.name}】${describeMilestone(floor)}`;
    }
    checkLevelUp();
    checkAchievements();
    addLog(`🗼 锁妖塔第${floor}层${mon.isBoss ? '(BOSS)' : ''}通关 +${formatNumber(expReward)}修为 +${formatNumber(goldReward)}灵石${towerTokens ? ` +${towerTokens}天机令` : ''}${milestoneMsg ? ' ' + milestoneMsg : ''}`);
    emit('towerClear', { floor, goldReward, expReward, towerTokens, isBoss: mon.isBoss, milestone: ms ? ms.name : null });
    checkQuest();
    saveState();
    return { success: true, floor, msg: `第${floor}层${mon.isBoss ? '（BOSS）' : ''}通关！${milestoneMsg}`, goldReward, expReward, monsterName: mon.name, isBoss: mon.isBoss };
  }

  function autoChallengeTower() {
    let floorsCleared = 0, totalGold = 0, totalExp = 0, tokens = 0;
    const milestones = [];
    const startFloor = state.towerFloor;
    let last = null;
    for (let i = 0; i < 200; i++) {
      const r = challengeTower();
      last = r;
      if (!r.success) break;
      floorsCleared++; totalGold += r.goldReward; totalExp += r.expReward;
      if (TOWER_MILESTONES[r.floor]) milestones.push(r.floor);
    }
    const msg = floorsCleared > 0
      ? `连闯 ${floorsCleared} 层（${startFloor}→${state.towerFloor - 1}）<br>+${formatNumber(totalGold)} 灵石 +${formatNumber(totalExp)} 修为${milestones.length ? `<br>🏆 里程碑：${milestones.join('、')}层` : ''}<br><span style="opacity:.7">止步第${state.towerFloor}层：${last.monsterName}</span>`
      : `第${state.towerFloor}层 ${last ? last.monsterName : ''} 太强了，需要更强！`;
    return { success: floorsCleared > 0, floorsCleared, totalGold, totalExp, milestones, msg };
  }

  function sweepTower() {
    if (state.towerBestFloor <= 0) return { success: false, msg: '尚未通关任何层' };
    if (state.towerDailyRewardClaimed) return { success: false, msg: '今日已扫荡，明日再来' };
    const floors = state.towerBestFloor;
    const L = towerLevel(floors);
    const goldReward = Math.floor(goldPerKill(L) * (20 + floors * 0.8));
    const expReward = Math.floor(getExpToNextLevel(state.level) * 0.3);
    const herbs = Math.floor(floors / 5) + 2, ores = Math.floor(floors / 8) + 1, tokens = Math.floor(floors / 10) + 1;
    state.gold += goldReward; state.totalGold += goldReward;
    gainExp(expReward);
    state.materials.herb += herbs; state.materials.ore += ores;
    state.tianjiTokens += tokens;
    state.towerDailyRewardClaimed = true;
    checkLevelUp();
    const msg = `扫荡${floors}层：+${formatNumber(goldReward)}灵石 +${formatNumber(expReward)}修为 +${herbs}灵药 +${ores}矿石 +${tokens}天机令`;
    addLog(`🗼 ${msg}`);
    saveState();
    return { success: true, msg };
  }

  // ========== 转生（飞升）==========
  function getAscensionPointsEarned() {
    let points = Math.floor(state.level / 10);
    points += Math.max(0, state.level - 50);
    points += Math.floor(state.towerBestFloor / 10);
    points += (state.beasts?.length || 0);
    return Math.max(1, points);
  }

  function canAscend() { return state.level >= 50 && !state.needTribulation && !state.isDead; }

  function performAscension() {
    if (!canAscend()) return { success: false, msg: '需要达到大乘期（Lv.50+）' };
    const pointsGained = getAscensionPointsEarned();
    const preserved = {
      ascensionCount: state.ascensionCount + 1,
      ascensionPoints: state.ascensionPoints + pointsGained,
      ascensionBonuses: { ...state.ascensionBonuses },
      totalAscensionPointsEarned: state.totalAscensionPointsEarned + pointsGained,
      achievements: { ...state.achievements },
      beasts: state.beasts.map(b => ({ ...b, level: Math.max(1, Math.floor(b.level / 2)) })),
      activeBeastId: state.activeBeastId,
      monsterKills: { ...state.monsterKills },
      deathCount: state.deathCount,
      towerBestFloor: state.towerBestFloor,
      totalGold: state.totalGold, totalExp: state.totalExp,
      killCount: state.killCount, eliteKillCount: state.eliteKillCount,
      pastLifeTalents: [...(state.pastLifeTalents || [])],
      tianjiTokens: state.tianjiTokens || 0,
      ownedSkins: [...(state.ownedSkins || [])],
      equippedWeaponSkin: state.equippedWeaponSkin || null,
      equippedArmorSkin: state.equippedArmorSkin || null,
      totalGachaPulls: state.totalGachaPulls || 0,
      questIndex: state.questIndex, stats: { ...state.stats },
      battleSpeed: state.battleSpeed, autoHealEnabled: state.autoHealEnabled, autoHealThreshold: state.autoHealThreshold,
      autoCast: state.autoCast,
      autoEquip: state.autoEquip, autoSellQuality: state.autoSellQuality, autoPills: { ...(state.autoPills || {}) },
    };
    const fresh = getDefaultState();
    const startLevel = 1 + (state.ascensionBonuses.startLevel || 0) * 2;
    fresh.level = startLevel;
    const ref = refBase(startLevel);
    fresh.baseAttack = ref.atk; fresh.baseDefense = ref.def; fresh.baseMaxHp = ref.hp;
    if (startLevel >= 10) { fresh.baseCritRate += 3; fresh.baseCritDamage += 20; }
    fresh.gold = Math.floor(state.gold * 0.1);
    state = fresh;
    Object.assign(state, preserved);
    state.hp = getComputedStats().maxHp;
    state.combatStartTime = Date.now();
    state.lastTickTime = Date.now();
    state.lastCaveProduction = Date.now();

    // 前世天赋：三选一（优先给未觉醒过的）
    const fresh3 = PAST_LIFE_TALENTS.filter(t => !state.pastLifeTalents.includes(t.id)).sort(() => Math.random() - 0.5);
    const rest = PAST_LIFE_TALENTS.filter(t => !fresh3.includes(t)).sort(() => Math.random() - 0.5);
    state.pendingTalents = [...fresh3, ...rest].slice(0, 3).map(t => t.id);
    state.currentTalent = null;
    const ascTokens = 10 + state.ascensionCount * 5;
    state.tianjiTokens += ascTokens;
    addLog(`🌟 飞升转生！第${state.ascensionCount}世 · 获得${pointsGained}仙缘点 · ${ascTokens}天机令`);
    spawnNext();
    checkAchievements();
    emit('ascension', { pointsGained, ascensionCount: state.ascensionCount });
    saveState();
    return { success: true, msg: `飞升成功！获得 ${pointsGained} 仙缘点 · ${ascTokens} 天机令`, pointsGained, pendingTalents: state.pendingTalents };
  }

  function chooseTalent(id) {
    if (!state.pendingTalents || !state.pendingTalents.includes(id)) return { success: false, msg: '无法选择该天赋' };
    const talent = PAST_LIFE_TALENTS.find(t => t.id === id);
    state.currentTalent = id;
    if (!state.pastLifeTalents.includes(id)) state.pastLifeTalents.push(id);
    state.pendingTalents = null;
    state.hp = getComputedStats().maxHp;
    addLog(`🎭 觉醒前世天赋【${talent.icon}${talent.name}】${talent.desc}`);
    emit('talentChosen', { talent });
    saveState();
    return { success: true, msg: `觉醒【${talent.icon}${talent.name}】`, talent };
  }

  function getAscensionUpgradeCost(u, lv) { return u.cost * (1 + Math.floor(lv / 3)); }

  function buyAscensionUpgrade(upgradeId) {
    const u = ASCENSION_UPGRADES.find(x => x.id === upgradeId);
    if (!u) return { success: false, msg: '升级不存在' };
    const lv = state.ascensionBonuses[upgradeId] || 0;
    if (lv >= u.maxLevel) return { success: false, msg: '已满级' };
    const cost = getAscensionUpgradeCost(u, lv);
    if (state.ascensionPoints < cost) return { success: false, msg: `仙缘点不足（需要${cost}）` };
    state.ascensionPoints -= cost;
    state.ascensionBonuses[upgradeId] = lv + 1;
    addLog(`🌟 ${u.icon}${u.name} 升至 ${lv + 1} 级`);
    saveState();
    return { success: true, msg: `${u.name} 升至 ${lv + 1} 级` };
  }

  // ========== 图鉴 ==========
  function getMonsterBestiary() {
    const out = [];
    for (let tier = 0; tier < MONSTER_TEMPLATES.length; tier++) {
      const r = REALMS[tier];
      const midL = tier === 5 ? 55 : Math.floor((r.minLevel + r.maxLevel) / 2);
      const base = monsterBase(midL);
      MONSTER_TEMPLATES[tier].forEach((t, idx) => {
        const kills = state.monsterKills[t.name] || 0;
        out.push({
          name: t.name, tier, realm: r.name, desc: t.desc,
          hp: Math.floor(base.hp * t.hp), atk: Math.floor(base.atk * t.atk),
          trait: t.trait, traitInfo: t.trait ? TRAIT_INFO[t.trait] : null,
          kills, discovered: kills > 0,
        });
      });
    }
    return out;
  }

  // ========== 装备操作 ==========
  function equipItem(inventoryIndex) {
    const item = state.inventory[inventoryIndex];
    if (!item) return false;
    const old = state.equipment[item.slot];
    state.inventory.splice(inventoryIndex, 1);
    if (old) state.inventory.push(old);
    state.equipment[item.slot] = item;
    state.hp = Math.min(state.hp, getComputedStats().maxHp);
    saveState();
    emit('equipChange', {});
    checkQuest();
    return true;
  }

  function unequipItem(slot) {
    const item = state.equipment[slot];
    if (!item || state.inventory.length >= state.inventoryMax) return false;
    state.inventory.push(item);
    state.equipment[slot] = null;
    saveState();
    return true;
  }

  function sellItem(inventoryIndex) {
    const item = state.inventory[inventoryIndex];
    if (!item) return 0;
    const gold = getEquipSellPrice(item);
    state.gold += gold;
    state.inventory.splice(inventoryIndex, 1);
    saveState();
    return gold;
  }

  function autoEquipBest() {
    let equipped = 0;
    for (let guard = 0; guard < 40; guard++) {
      let best = null, bestDelta = 0;
      state.inventory.forEach((item, i) => {
        const d = getEquipPowerDelta(item);
        if (d > bestDelta) { bestDelta = d; best = i; }
      });
      if (best === null) break;
      equipItem(best);
      equipped++;
    }
    if (equipped > 0) { addLog(`⚡ 一键换装：替换了 ${equipped} 件装备`); saveState(); }
    return { success: true, count: equipped, msg: equipped > 0 ? `替换了 ${equipped} 件更强的装备` : '当前已是最强搭配' };
  }

  function sellWeakerItems() {
    let sold = 0, gold = 0;
    for (let i = state.inventory.length - 1; i >= 0; i--) {
      const item = state.inventory[i];
      if (!state.equipment[item.slot]) continue;
      if (getEquipPowerDelta(item) <= 0) { gold += getEquipSellPrice(item); state.inventory.splice(i, 1); sold++; }
    }
    state.gold += gold;
    if (sold > 0) { addLog(`💰 出售 ${sold} 件弱装备，获得 ${formatNumber(gold)} 灵石`); saveState(); }
    return { success: true, count: sold, gold, msg: sold > 0 ? `出售 ${sold} 件，获得 ${formatNumber(gold)} 灵石` : '没有比身上弱的装备' };
  }

  function enhanceEquip(slot) {
    const item = state.equipment[slot];
    if (!item) return { success: false, msg: '无装备' };
    if (item.enhanceLevel >= 15) return { success: false, msg: '已强化至+15' };
    const cost = getEquipEnhanceCost(item);
    if (state.gold < cost) return { success: false, msg: `灵石不足（需要${formatNumber(cost)}）` };
    state.gold -= cost;
    item.enhanceLevel++;
    addLog(`✨ ${item.name} 强化至 +${item.enhanceLevel}`);
    saveState();
    checkQuest();
    emit('enhance', { item });
    return { success: true, msg: `强化成功 +${item.enhanceLevel}` };
  }

  // ========== 丹药 ==========
  function getPillCost(recipe) {
    const forge = state.cave.forge_room || 0;
    const talent = getCurrentTalent();
    const reduce = forge * 0.1 + ((talent && talent.effect.pillMatReduce) ? talent.effect.pillMatReduce / 100 : 0);
    const materials = {};
    for (const [k, v] of Object.entries(recipe.materials)) materials[k] = Math.max(1, Math.floor(v * (1 - reduce)));
    return { materials, gold: Math.floor(recipe.goldK * goldPerKill(state.level)) };
  }

  function craftPill(recipeId, count) {
    const recipe = PILL_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return { success: false, msg: '配方不存在' };
    if (getRealmIndex(state.level) < recipe.minRealm) return { success: false, msg: '境界不足' };
    count = count || 1;
    let made = 0;
    for (let i = 0; i < count; i++) {
      const cost = getPillCost(recipe);
      if (state.gold < cost.gold) { if (!made) return { success: false, msg: '灵石不足' }; break; }
      const lack = Object.entries(cost.materials).find(([k, v]) => (state.materials[k] || 0) < v);
      if (lack) { if (!made) return { success: false, msg: `${({ herb: '灵药', ore: '矿石', essence: '精华' })[lack[0]]}不足` }; break; }
      state.gold -= cost.gold;
      for (const [k, v] of Object.entries(cost.materials)) state.materials[k] -= v;
      state.pills[recipeId] = (state.pills[recipeId] || 0) + 1;
      made++;
    }
    state.stats.pillsCrafted = (state.stats.pillsCrafted || 0) + made;
    addLog(`🧪 炼成 ${recipe.icon}${recipe.name}×${made}`);
    saveState();
    checkQuest();
    return { success: true, msg: `炼成 ${recipe.name}×${made}`, made };
  }

  const AUTO_PILL_BUFF = { exp_pill: 'expBoost', super_exp: 'expBoost', atk_pill: 'atkBoost', crit_pill: 'critBoost' };
  const AUTO_PILL_LEVEL = 15;
  function setAutoPill(id, on) {
    if (!AUTO_PILL_BUFF[id]) return { success: false, msg: '该丹药不能自动服用' };
    if (state.level < AUTO_PILL_LEVEL) return { success: false, msg: `Lv.${AUTO_PILL_LEVEL} 解锁自动服用` };
    state.autoPills = state.autoPills || {};
    state.autoPills[id] = !!on;
    saveState();
    return { success: true, on: !!on };
  }
  function autoUsePills() {
    if (!state.autoPills || state.level < AUTO_PILL_LEVEL) return;
    const now = Date.now();
    for (const id of ['super_exp', 'exp_pill', 'atk_pill', 'crit_pill']) {
      if (!state.autoPills[id] || !(state.pills[id] > 0)) continue;
      const buff = state.buffs[AUTO_PILL_BUFF[id]];
      if (buff && buff.until > now + 1000) continue;
      usePill(id, true);
    }
  }

  function usePill(recipeId, isAuto) {
    if ((state.pills[recipeId] || 0) <= 0) return { success: false, msg: '数量不足' };
    const recipe = PILL_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return { success: false, msg: '配方不存在' };
    state.pills[recipeId]--;
    state.stats.pillsUsed = (state.stats.pillsUsed || 0) + 1;
    const eff = recipe.effect;
    const now = Date.now();
    const talent = getCurrentTalent();
    const durMult = (talent && talent.effect.pillDurationMult) || 1;
    // 战斗类增益按回合计：倍速越高持续的真实时间越短（渡劫丹除外）
    const extend = (key, data, seconds, realTime) => {
      const existing = state.buffs[key] && state.buffs[key].until > now ? state.buffs[key].until : now;
      const speed = realTime ? 1 : (state.battleSpeed || 1);
      state.buffs[key] = { ...data, until: existing + seconds * 1000 * durMult / speed };
    };
    if (eff.type === 'heal') { state.hp = getComputedStats().maxHp; addLog(`💚 服用${recipe.name}，生命回满`); }
    else if (eff.type === 'tribBoost') { extend('tribBoost', { value: eff.value }, eff.duration, true); addLog(`⚡ 服用${recipe.name}，渡劫成功率+${eff.value * 100}%`); }
    else if (eff.type === 'expBoost') {
      // 不同倍率的修炼丹不叠加倍率，取高者
      const cur = state.buffs.expBoost && state.buffs.expBoost.until > now ? state.buffs.expBoost : null;
      if (cur && cur.mult > eff.mult) extend('expBoost', { mult: cur.mult }, eff.duration / 2);
      else extend('expBoost', { mult: eff.mult }, eff.duration);
      addLog(`💊 服用${recipe.name}，修炼速度×${eff.mult}`);
    }
    else if (eff.type === 'atkBoost') { extend('atkBoost', { mult: eff.mult }, eff.duration); addLog(`🔴 服用${recipe.name}，攻击×${eff.mult}`); }
    else if (eff.type === 'critBoost') { extend('critBoost', { value: eff.value }, eff.duration); addLog(`💥 服用${recipe.name}，暴击+${eff.value * 100}%`); }
    emit('pillUse', { recipe, auto: !!isAuto });
    saveState();
    return { success: true, msg: '服用成功' };
  }

  // ========== 功法 ==========
  function upgradeSkill(skillId) {
    const sk = SKILL_TREE.find(s => s.id === skillId);
    if (!sk) return { success: false, msg: '功法不存在' };
    if (getRealmIndex(state.level) < sk.realm) return { success: false, msg: `需${REALMS[sk.realm].name}` };
    const lv = state.skills[skillId] || 0;
    if (lv >= sk.maxLevel) return { success: false, msg: '已圆满' };
    const cost = getSkillCost(skillId);
    if (state.gold < cost) return { success: false, msg: `灵石不足（需要${formatNumber(cost)}）` };
    state.gold -= cost;
    state.skills[skillId] = lv + 1;
    addLog(`📜 【${sk.name}】修炼至第 ${lv + 1} 层`);
    saveState();
    checkQuest();
    return { success: true, msg: `${sk.name} 第${lv + 1}层`, goldCost: cost };
  }

  function maxUpgradeSkill(skillId) {
    let n = 0, spent = 0;
    for (;;) {
      const cost = getSkillCost(skillId);
      const r = upgradeSkill(skillId);
      if (!r.success) break;
      n++; spent += cost;
    }
    const sk = SKILL_TREE.find(s => s.id === skillId);
    if (n > 0) return { success: true, msg: `${sk.name} 连升 ${n} 层，花费 ${formatNumber(spent)} 灵石` };
    return { success: false, msg: `灵石不足（需要${formatNumber(getSkillCost(skillId))}）` };
  }

  // ========== 灵兽 ==========
  function feedBeast(beastId) {
    const beast = state.beasts.find(b => b.id === beastId);
    if (!beast) return { success: false, msg: '灵兽不存在' };
    if (beast.level >= state.level + 5) return { success: false, msg: `灵兽等级不能超过鼠鼠等级+5` };
    const cost = getBeastFeedCost(beastId);
    if (state.gold < cost) return { success: false, msg: `灵石不足（需要${formatNumber(cost)}）` };
    state.gold -= cost;
    beast.level++;
    const tmpl = BEAST_TEMPLATES.find(t => t.id === beast.templateId);
    addLog(`🐾 ${tmpl ? tmpl.name : '灵兽'} 升至 Lv.${beast.level}`);
    saveState();
    return { success: true, msg: `升至 Lv.${beast.level}` };
  }

  function maxFeedBeast(beastId) {
    let n = 0, spent = 0;
    for (;;) {
      const cost = getBeastFeedCost(beastId);
      const r = feedBeast(beastId);
      if (!r.success) break;
      n++; spent += cost;
    }
    if (n > 0) return { success: true, msg: `灵兽连升 ${n} 级，花费 ${formatNumber(spent)} 灵石` };
    const b = state.beasts.find(x => x.id === beastId);
    if (b && b.level >= state.level + 5) return { success: false, msg: '灵兽等级不能超过鼠鼠等级+5' };
    return { success: false, msg: `灵石不足（需要${formatNumber(getBeastFeedCost(beastId))}）` };
  }

  function setActiveBeast(beastId) {
    if (!state.beasts.find(b => b.id === beastId)) return false;
    state.activeBeastId = beastId;
    saveState();
    return true;
  }

  // ========== 天机阁 ==========
  function checkAndRefreshDaily() {
    const d = new Date(Date.now());
    const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (state.dailyKey === today) return;
    state.dailyKey = today;
    state.towerDailyRewardClaimed = false;
  }

  function rollGachaQuality(guaranteed) {
    const roll = Math.random();
    let cum = 0;
    for (let i = 0; i < GACHA_QUALITY_RATES.length; i++) {
      cum += GACHA_QUALITY_RATES[i];
      if (roll < cum) return Math.max(i, guaranteed || 0);
    }
    return 5;
  }

  function doGachaPull(count) {
    const cost = count === 10 ? GACHA_COST_TEN : GACHA_COST_SINGLE * count;
    if (state.tianjiTokens < cost) return { success: false, msg: `天机令不足！需要${cost}枚，当前${state.tianjiTokens}枚` };
    state.tianjiTokens -= cost;
    const results = [];
    let hasPurple = false;
    for (let i = 0; i < count; i++) {
      const guaranteed = count === 10 && i === 9 && !hasPurple;
      const quality = rollGachaQuality(guaranteed ? 3 : 0);
      if (quality >= 3) hasPurple = true;
      if (Math.random() < 0.4) {
        const equip = generateEquipment(Math.max(state.level, 3), quality);
        const kept = addToInventory(equip);
        results.push({ type: 'equip', isEquip: true, name: equip.name, quality, qualityColor: equip.qualityColor,
          desc: kept ? `${EQUIP_SLOT_NAMES[equip.slot]}·${EQUIP_QUALITIES[quality].label}` : '背包满·已自动卖出', duplicate: !kept, isNew: kept });
      } else {
        const pool = GACHA_POOL.filter(x => x.quality === quality);
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        if (state.ownedSkins.includes(chosen.id)) {
          const refund = [1, 2, 5, 10, 25, 50][quality];
          state.tianjiTokens += refund;
          results.push({ ...chosen, duplicate: true, refund });
        } else {
          state.ownedSkins.push(chosen.id);
          results.push({ ...chosen, isNew: true });
        }
      }
    }
    state.totalGachaPulls += count;
    addLog(`🎰 天机阁${count === 10 ? '十连' : '单抽'}！`);
    for (const r of results) {
      if (r.isNew && !r.isEquip) addLog(`✨ <span style="color:${GACHA_QUALITY_COLORS[r.quality]}">[${GACHA_QUALITY_NAMES[r.quality]}]${r.name}</span> 新外观！`);
    }
    emit('gacha', { results, count });
    checkQuest();
    saveState();
    return { success: true, results, cost };
  }

  function equipSkin(skinId) {
    if (!state.ownedSkins.includes(skinId)) return { success: false, msg: '未拥有此外观' };
    const skin = GACHA_POOL.find(s => s.id === skinId);
    if (!skin) return { success: false, msg: '外观不存在' };
    if (skin.type === 'weapon') state.equippedWeaponSkin = skinId; else state.equippedArmorSkin = skinId;
    saveState();
    return { success: true, msg: `已换上${skin.name}` };
  }

  function unequipSkin(type) {
    if (type === 'weapon') state.equippedWeaponSkin = null; else state.equippedArmorSkin = null;
    saveState();
    return { success: true };
  }

  // ========== 速度 / 设置 ==========
  function setBattleSpeed(speed) {
    if (![1, 2, 4].includes(speed)) return;
    state.battleSpeed = speed;
    TICK_INTERVAL = BASE_TICK / speed;
    if (tickTimer) { clearInterval(tickTimer); tickTimer = setInterval(processCombatTick, TICK_INTERVAL); }
    saveState();
  }

  function toggleAutoHeal() { state.autoHealEnabled = !state.autoHealEnabled; saveState(); return state.autoHealEnabled; }
  function setAutoHealThreshold(pct) { state.autoHealThreshold = Math.max(10, Math.min(80, pct)); saveState(); }

  function getCurrentDPS() {
    const now = Date.now();
    const recent = state.dpsHistory.filter(d => d.time > now - 10000);
    if (recent.length < 2) return recent.length ? recent[0].damage / (TICK_INTERVAL / 1000) : 0;
    const total = recent.reduce((s, d) => s + d.damage, 0);
    const span = Math.max(TICK_INTERVAL / 1000, (now - recent[0].time) / 1000);
    return Math.floor(total / span);
  }

  // ========== 离线收益 ==========
  // 逐级估算：按当前属性对同级普通怪的击杀速度/生存能力推算，以1倍速计算，上限12小时
  function processOfflineGains() {
    if (!state) return null;
    const cb = onBattleEvent;
    onBattleEvent = null; // 离线结算期间不播放战斗特效
    try { return processOfflineGainsInner(); } finally { onBattleEvent = cb; }
  }
  function processOfflineGainsInner() {
    const now = Date.now();
    const offlineMs = now - state.lastTickTime;
    if (offlineMs < 60000) return null;
    const cappedMs = Math.min(offlineMs, OFFLINE_CAP_HOURS * 3600000);
    let remaining = cappedMs / BASE_TICK * 0.85; // 离线效率85%，单位：回合
    const startLevel = state.level;
    let kills = 0, exp = 0, gold = 0, herbs = 0, ores = 0, essence = 0;

    while (remaining > 0) {
      const stats = getComputedStats();
      const base = monsterBase(state.level);
      const perHit = stats.attack * (1 + stats.critRate / 100 * (stats.critDamage / 100 - 1)) * (1 + stats.atkSpeed / 100);
      const beast = getActiveBeast();
      const beastDps = beast ? stats.attack * beastBonus(beast).dmgMult * 0.45 : 0;
      const ticksPerKill = Math.max(1, base.hp / (perHit + beastDps));
      const incoming = mitigate(base.atk, stats.defense) * (1 - stats.dodge / 100);
      const sustain = stats.maxHp * 0.02 + perHit * stats.lifesteal / 100;
      const net = incoming - sustain;
      let efficiency = 1;
      if (net > 0) {
        const ticksToDie = stats.maxHp / net;
        if (ticksToDie < ticksPerKill) efficiency = 0.1;           // 打不过：几乎无收益
        else if (ticksToDie < ticksPerKill * 4) efficiency = 0.6;  // 偶尔阵亡
      }
      const expPerKill = baseExpPerKill(state.level) * (1 + stats.expBonus / 100);
      const goldPerK = goldPerKill(state.level) * (1 + stats.goldBonus / 100);
      const need = state.needTribulation || state.level >= MAX_LEVEL ? Infinity : Math.max(0, getExpToNextLevel(state.level) - state.exp);
      const killsForLevel = need === Infinity ? Infinity : Math.ceil(need / expPerKill);
      const killsPossible = Math.floor(remaining / ticksPerKill * efficiency);
      const k = Math.min(killsForLevel, killsPossible);
      if (k <= 0) break;
      kills += k;
      const e = Math.floor(k * expPerKill), g = Math.floor(k * goldPerK);
      exp += e; gold += g;
      gainExp(e);
      state.gold += g; state.totalGold += g;
      herbs += Math.floor(k * 0.18); ores += Math.floor(k * 0.12); essence += Math.floor(k * 0.045);
      remaining -= k * ticksPerKill / efficiency;
      if (k === killsForLevel) checkLevelUp(); else break;
      if (state.needTribulation) {
        // 瓶颈期：继续按当前等级打怪赚灵石，修为已满
        const rest = Math.floor(remaining / ticksPerKill * efficiency);
        if (rest > 0) {
          const g2 = Math.floor(rest * goldPerK);
          kills += rest; gold += g2; state.gold += g2; state.totalGold += g2;
          herbs += Math.floor(rest * 0.18); ores += Math.floor(rest * 0.12); essence += Math.floor(rest * 0.045);
        }
        break;
      }
    }
    const mins = Math.floor(cappedMs / 60000);
    const caveHerbs = Math.floor((state.cave.herb_garden || 0) * 0.5 * mins);
    const caveOre = Math.floor((state.cave.mine_shaft || 0) * 0.3 * mins);
    state.materials.herb += herbs + caveHerbs;
    state.materials.ore += ores + caveOre;
    state.materials.essence += essence;
    state.killCount += kills;
    let equipsGained = 0;
    for (let i = 0; i < Math.min(8, Math.floor(kills * 0.03)); i++) {
      if (state.inventory.length < state.inventoryMax) { state.inventory.push(generateEquipment(state.level)); equipsGained++; }
    }
    if (state.isDead) { state.isDead = false; state.hp = getComputedStats().maxHp; }
    state.lastTickTime = now;
    state.lastCaveProduction = now;
    refreshRealmCharges();
    state.currentMonster = null;
    checkAchievements();
    saveState();
    return {
      offlineSeconds: Math.floor(offlineMs / 1000), cappedSeconds: Math.floor(cappedMs / 1000), capped: offlineMs > cappedMs,
      totalKills: kills, totalExp: exp, totalGold: gold, levelUps: state.level - startLevel,
      offlineHerbs: herbs + caveHerbs, offlineOre: ores + caveOre, offlineEssence: essence,
      equipsGained, caveHerbs, caveOre, needTribulation: state.needTribulation,
    };
  }

  // ========== 辅助 ==========
  function cleanExpiredBuffs() {
    const now = Date.now();
    for (const k of Object.keys(state.buffs)) if (state.buffs[k].until && now >= state.buffs[k].until) delete state.buffs[k];
  }

  function addLog(msg) {
    if (!state) return;
    state.battleLog.push(msg);
    if (state.battleLog.length > MAX_LOG) state.battleLog = state.battleLog.slice(-MAX_LOG);
  }

  function emit(type, data) { if (onBattleEvent) onBattleEvent(type, data || {}); }

  function formatNumber(num) {
    num = Number(num) || 0;
    const neg = num < 0; num = Math.abs(num);
    let s;
    if (num >= 1e16) s = (num / 1e16).toFixed(2) + '京';
    else if (num >= 1e12) s = (num / 1e12).toFixed(2) + '兆';
    else if (num >= 1e8) s = (num / 1e8).toFixed(2) + '亿';
    else if (num >= 1e4) s = (num / 1e4).toFixed(num >= 1e6 ? 0 : 1) + '万';
    else s = Math.floor(num).toString();
    return (neg ? '-' : '') + s;
  }

  // ========== 启动/停止 ==========
  function start(eventCallback) {
    onBattleEvent = eventCallback;
    loadState();
    checkAndRefreshDaily();
    TICK_INTERVAL = BASE_TICK / (state.battleSpeed || 1);
    if (!state.combatStartTime) state.combatStartTime = Date.now();
    saveState();
    tickTimer = setInterval(processCombatTick, TICK_INTERVAL);
  }

  function ensureMonster() { if (!state.currentMonster) spawnNext(); }

  function stop() { if (tickTimer) clearInterval(tickTimer); tickTimer = null; }

  // ========== 公开接口 ==========
  function getState() {
    if (!state) return null;
    const realmIdx = getRealmIndex(state.level);
    const realm = REALMS[realmIdx];
    const expToNext = getExpToNextLevel(state.level);
    const stats = getComputedStats();
    const mount = VISUAL_EQUIP.mount[realmIdx];
    return {
      ...state,
      realmIndex: realmIdx, realm: realm.name, realmColor: realm.color, realmScene: realm.scene,
      realmProgress: realmProgress(state.level),
      expToNext,
      expPercent: Math.min(100, Math.floor((state.exp / expToNext) * 100)),
      computed: stats,
      power: getPower(stats),
      visualEquip: {
        mount,
        mountStats: mount === '仙鹤' ? '闪避+5% 攻速+8%' : mount === '麒麟' ? '攻击×1.15 暴伤+20% 闪避+3%' : null,
      },
      activeBeast: getActiveBeast(),
      tribChance: state.needTribulation ? getTribulationChance() : null,
      tribCooldown: Math.max(0, Math.ceil((state.tribulationCooldown - Date.now()) / 1000)),
      dps: getCurrentDPS(),
      reviveCountdown: state.isDead ? Math.max(0, Math.ceil((state.reviveTime - Date.now()) / 1000)) : 0,
      canAscend: canAscend(),
      ascensionPointsPreview: state.level >= 50 ? getAscensionPointsEarned() : 0,
      currentTalent: getCurrentTalent(),
      currentTalentId: state.currentTalent,
      activeSkills: getActiveSkillState(),
      autoCastUnlocked: state.level >= AUTO_CAST_LEVEL,
      quest: getCurrentQuest(),
      tickMs: TICK_INTERVAL,
      realmMaxCharges: getRealmMaxCharges(),
      realmChargeCountdown: getRealmChargeCountdown(),
      maxLevel: MAX_LEVEL,
      autoPillUnlocked: state.level >= AUTO_PILL_LEVEL,
      pendingTalentList: state.pendingTalents ? state.pendingTalents.map(id => PAST_LIFE_TALENTS.find(t => t.id === id)) : null,
    };
  }

  return {
    start, stop, getState, resetState, processOfflineGains, formatNumber, ensureMonster,
    exportSave, importSave,
    // 装备
    equipItem, unequipItem, sellItem, enhanceEquip, getEquipEnhanceCost, getEquipSellPrice, getEquipPowerDelta,
    autoEquipBest, sellWeakerItems,
    // 丹药/功法/灵兽
    craftPill, usePill, getPillCost, PILL_RECIPES,
    upgradeSkill, maxUpgradeSkill, getSkillCost, SKILL_TREE,
    feedBeast, maxFeedBeast, setActiveBeast, getBeastFeedCost, beastBonus, BEAST_TEMPLATES,
    // 神通
    castSkill, toggleAutoCast, ACTIVE_SKILLS, AUTO_CAST_LEVEL,
    // 秘境/塔
    enterSecretRealm, SECRET_REALMS,
    challengeTower, autoChallengeTower, sweepTower, getTowerMonster, TOWER_MILESTONES, describeMilestone,
    // 渡劫/设置
    attemptTribulation, setBattleSpeed, toggleAutoHeal, setAutoHealThreshold,
    claimFortune, FORTUNES, FORTUNE_LIFE, setAutoEquip, setAutoSellQuality, setAutoPill, AUTO_PILL_LEVEL, chooseTalent,
    // 洞府/成就/任务
    upgradeCaveBuilding, maxUpgradeCave, getCaveBuildingCost, CAVE_BUILDINGS, CAVE_EFFECT_NAMES,
    ACHIEVEMENTS, describeReward, claimQuest, QUESTS,
    // 常量
    REALMS, EQUIP_QUALITIES, EQUIP_SLOT_NAMES, MONSTER_TEMPLATES, TRAIT_INFO, STAT_NAMES, PERCENT_STATS,
    // 飞升
    performAscension, buyAscensionUpgrade, canAscend, getAscensionPointsEarned, getAscensionUpgradeCost,
    ASCENSION_UPGRADES, getMonsterBestiary, PAST_LIFE_TALENTS,
    // 天机阁
    doGachaPull, equipSkin, unequipSkin,
    GACHA_POOL, GACHA_QUALITY_NAMES, GACHA_QUALITY_COLORS, GACHA_COST_SINGLE, GACHA_COST_TEN,
    WEAPON_SKINS, ARMOR_SKINS,
    // 调试/模拟
    _debug: {
      monsterBase, refBase, goldPerKill, baseExpPerKill, getPower, getComputedStats,
      // 测试用：直接修改存档字段，例如 GameEngine._debug.cheat({ level: 25 })
      cheat(patch) {
        if (patch.level) { const ref = refBase(patch.level); state.baseAttack = ref.atk; state.baseDefense = ref.def; state.baseMaxHp = ref.hp; }
        Object.assign(state, { isDead: false }, patch); state.hp = getComputedStats().maxHp; state.currentMonster = null; spawnNext(); saveState();
      },
    },
  };
})();

if (typeof module !== 'undefined') module.exports = GameEngine;
