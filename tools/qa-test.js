#!/usr/bin/env node
// ============================================================
// qa-test.js — 鼠鼠修仙 无头功能测试
// 逐项调用引擎的每个玩家操作 + 随机操作模糊测试，
// 每一步后检查：异常、NaN/Infinity、负资源、血量越界、背包溢出、存档往返。
//
// 用法: node tools/qa-test.js [随机步数=4000] [种子=1]
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const STEPS = parseInt(process.argv[2] || '4000', 10);
let seed = parseInt(process.argv[3] || '1', 10);
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];

function createSandbox() {
  let now = Date.UTC(2026, 0, 1, 0, 0, 0);
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...args) { if (args.length === 0) super(now); else super(...args); }
    static now() { return now; }
  }
  const store = new Map();
  let intervalFn = null;
  const sandbox = {
    Date: FakeDate, Math, JSON, console,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    },
    setInterval: fn => { intervalFn = fn; return 1; },
    clearInterval: () => {},
    setTimeout: () => 0,
    btoa: str => Buffer.from(str, 'binary').toString('base64'),
    atob: str => Buffer.from(str, 'base64').toString('binary'),
    escape, unescape,
    module: undefined,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'engine.js'), 'utf8');
  vm.runInContext(src + '\n;this.GameEngine = GameEngine;', sandbox);
  return {
    E: sandbox.GameEngine, store,
    advance(ms) { now += ms; },
    tick(n = 1) { for (let i = 0; i < n; i++) { now += 250; if (intervalFn) intervalFn(); } checkMonster(); },
  };
}

const sim = createSandbox();
const E = sim.E;
const problems = [];
const seen = new Set();
function report(kind, detail) {
  const key = kind + '|' + String(detail).slice(0, 120);
  if (seen.has(key)) return;
  seen.add(key);
  problems.push(`[${kind}] ${detail}`);
}

let events = 0, revives = 0;
E.start(t => { events++; if (t === 'revive') revives++; });
// 击杀/渡劫后会有一两个回合的空档，只在推进战斗后检查
function checkMonster() {
  const s = E.getState();
  if (!s.isDead && !s.currentMonster && !s.needTribulation) report('无怪物', `推进战斗后仍无怪物 Lv.${s.level}`);
}

// ---------- 不变量检查 ----------
function scan(obj, pathStr, depth) {
  if (depth > 6 || obj == null) return;
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) report('NaN/Infinity', `${pathStr} = ${obj}`);
    return;
  }
  if (typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.slice(0, 60).forEach((v, i) => scan(v, `${pathStr}[${i}]`, depth + 1)); return; }
  for (const k of Object.keys(obj)) {
    if (k === 'battleLog') continue;
    scan(obj[k], pathStr ? `${pathStr}.${k}` : k, depth + 1);
  }
}
function checkInvariants(ctx) {
  let s;
  try { s = E.getState(); } catch (e) { report('getState 异常', `${ctx}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); return; }
  scan(s, '', 0);
  for (const k of ['gold', 'tianjiTokens', 'exp', 'ascensionPoints']) if (s[k] < 0) report('负数资源', `${ctx}: ${k}=${s[k]}`);
  for (const [k, v] of Object.entries(s.materials || {})) if (v < 0) report('负数材料', `${ctx}: ${k}=${v}`);
  for (const [k, v] of Object.entries(s.pills || {})) if (v < 0) report('负数丹药', `${ctx}: ${k}=${v}`);
  if (s.hp > s.computed.maxHp + 1) report('血量越界', `${ctx}: hp ${s.hp} > max ${s.computed.maxHp}`);
  if (s.hp < 0) report('血量为负', `${ctx}: hp ${s.hp}`);
  if (s.inventory.length > 30) report('背包溢出', `${ctx}: ${s.inventory.length}`);
  if (s.level < 1 || s.level > 99) report('等级越界', `${ctx}: ${s.level}`);
  if (s.activeBeastId && !s.beasts.find(b => b.id === s.activeBeastId)) report('出战灵兽丢失', ctx);
  const ids = s.inventory.map(i => i.id);
  if (new Set(ids).size !== ids.length) report('背包物品ID重复', ctx);
}

function call(name, fn) {
  try {
    const r = fn();
    if (r && typeof r === 'object' && 'msg' in r && (r.msg === undefined || /undefined|NaN/.test(String(r.msg)))) report('提示文案异常', `${name}: ${r.msg}`);
    return r;
  } catch (e) {
    report('异常', `${name}: ${e.message} @ ${(e.stack.split('\n')[1] || '').trim()}`);
  }
  finally { checkInvariants(name); }
}

// ---------- 全功能逐项测试 ----------
function cheat(p) { E._debug.cheat(p); }
function exerciseAll(label) {
  const s = () => E.getState();
  const inv = () => s().inventory;
  // 装备
  call(label + ' autoEquip', () => E.autoEquipBest());
  if (inv().length) {
    call(label + ' equipItem', () => E.equipItem(0));
    call(label + ' equipItem(-1)', () => E.equipItem(-1));
    call(label + ' equipItem(999)', () => E.equipItem(999));
    call(label + ' sellItem', () => E.sellItem(inv().length - 1));
    call(label + ' sellItem(-1)', () => E.sellItem(-1));
  }
  for (const slot of ['weapon', 'armor', 'accessory', 'boots', 'bogus']) {
    call(`${label} enhance ${slot}`, () => E.enhanceEquip(slot));
    call(`${label} unequip ${slot}`, () => E.unequipItem && E.unequipItem(slot));
  }
  call(label + ' autoEquip2', () => E.autoEquipBest());
  call(label + ' sellWeaker', () => E.sellWeakerItems());
  for (const q of [0, 1, 2, 3, 4, 5, -1, 99]) call(`${label} autoSell ${q}`, () => E.setAutoSellQuality(q));
  call(label + ' autoEquipOn', () => E.setAutoEquip(true));
  // 功法
  for (const sk of E.SKILL_TREE) { call(`${label} skillUp ${sk.id}`, () => E.upgradeSkill(sk.id)); call(`${label} skillMax ${sk.id}`, () => E.maxUpgradeSkill(sk.id)); }
  call(label + ' skillUp bogus', () => E.upgradeSkill('bogus'));
  // 神通
  for (const sk of E.ACTIVE_SKILLS) call(`${label} cast ${sk.id}`, () => E.castSkill(sk.id));
  call(label + ' cast bogus', () => E.castSkill('bogus'));
  call(label + ' autoCast', () => E.toggleAutoCast());
  // 丹药
  for (const p of E.PILL_RECIPES) {
    call(`${label} craft ${p.id}`, () => E.craftPill(p.id, 1));
    call(`${label} craft5 ${p.id}`, () => E.craftPill(p.id, 5));
    call(`${label} use ${p.id}`, () => E.usePill(p.id));
    call(`${label} autoPill ${p.id}`, () => E.setAutoPill(p.id, true));
  }
  call(label + ' craft bogus', () => E.craftPill('bogus', 1));
  call(label + ' use bogus', () => E.usePill('bogus'));
  call(label + ' autoHeal', () => E.toggleAutoHeal());
  for (const t of [0, 10, 50, 100, -5, 200]) call(`${label} healThreshold ${t}`, () => E.setAutoHealThreshold(t));
  // 灵兽
  for (const b of s().beasts) { call(`${label} feed ${b.templateId}`, () => E.feedBeast(b.id)); call(`${label} feedMax`, () => E.maxFeedBeast(b.id)); call(`${label} setBeast`, () => E.setActiveBeast(b.id)); }
  call(label + ' setBeast bogus', () => E.setActiveBeast('bogus'));
  call(label + ' feed bogus', () => E.feedBeast('bogus'));
  // 洞府
  for (const b of E.CAVE_BUILDINGS) { call(`${label} caveUp ${b.id}`, () => E.upgradeCaveBuilding(b.id)); call(`${label} caveMax ${b.id}`, () => E.maxUpgradeCave(b.id)); }
  // 秘境 / 塔
  for (let i = -1; i <= E.SECRET_REALMS.length; i++) call(`${label} realm ${i}`, () => E.enterSecretRealm(i));
  call(label + ' towerOne', () => E.challengeTower());
  call(label + ' towerAuto', () => E.autoChallengeTower());
  call(label + ' towerSweep', () => E.sweepTower());
  call(label + ' towerSweep2', () => E.sweepTower());
  // 天机阁
  call(label + ' pull1', () => E.doGachaPull(1));
  call(label + ' pull10', () => E.doGachaPull(10));
  for (const sk of [...E.WEAPON_SKINS, ...E.ARMOR_SKINS].slice(0, 40)) call(`${label} equipSkin ${sk.id}`, () => E.equipSkin(sk.id));
  call(label + ' unequipSkin weapon', () => E.unequipSkin('weapon'));
  call(label + ' unequipSkin armor', () => E.unequipSkin('armor'));
  // 机缘
  for (const f of (E.FORTUNES || []).slice(0, 5)) call(`${label} fortune`, () => E.claimFortune(f.id !== undefined ? f.id : f));
  call(label + ' fortune bogus', () => E.claimFortune('bogus'));
  // 任务
  for (let i = 0; i < 30; i++) { const q = s().quest; if (!q || !q.done) break; call(label + ' claimQuest', () => E.claimQuest()); }
  call(label + ' claimQuest notDone', () => E.claimQuest());
  // 倍速
  for (const v of [1, 2, 4, 3, 0, 99]) call(`${label} speed ${v}`, () => E.setBattleSpeed(v));
  E.setBattleSpeed(1);
  // 飞升
  for (const u of E.ASCENSION_UPGRADES) call(`${label} ascUp ${u.id}`, () => E.buyAscensionUpgrade(u.id));
  // 战斗推进
  sim.tick(400);
  checkInvariants(label + ' after ticks');
}

// ---------- 阶段 ----------
exerciseAll('Lv1');
cheat({ level: 5, gold: 5000, materials: { herb: 50, ore: 50, essence: 20 }, tianjiTokens: 30 });
exerciseAll('Lv5');
cheat({ level: 12, gold: 5e6, materials: { herb: 500, ore: 500, essence: 200 }, tianjiTokens: 200, secretRealmCharges: 3 });
exerciseAll('Lv12');
cheat({ level: 25, gold: 5e9, materials: { herb: 5000, ore: 5000, essence: 2000 }, tianjiTokens: 500, secretRealmCharges: 3,
  beasts: E.BEAST_TEMPLATES.map((t, i) => ({ id: 'b' + i, templateId: t.id, level: 3 })), activeBeastId: 'b0' });
exerciseAll('Lv25');
cheat({ level: 45, gold: 5e13, materials: { herb: 5e5, ore: 5e5, essence: 5e5 }, tianjiTokens: 2000, secretRealmCharges: 3 });
exerciseAll('Lv45');
cheat({ level: 60, gold: 5e16, tianjiTokens: 2000 });
exerciseAll('Lv60');

// ---------- 渡劫 ----------
{
  cheat({ level: 9, exp: 1e12 });
  sim.tick(20);
  const s = E.getState();
  if (!s.needTribulation) report('渡劫', `Lv9 满修为后未进入待渡劫：exp=${s.exp} need=${s.expToNext}`);
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) {
    sim.advance(120000);
    const r = call('attemptTribulation', () => E.attemptTribulation());
    if (r && r.success) ok = true;
  }
  const s2 = E.getState();
  if (ok && s2.level < 10) report('渡劫', `渡劫成功但等级仍为 ${s2.level}`);
  if (!ok) report('渡劫', '40 次尝试均失败');
  call('attemptTribulation no-need', () => E.attemptTribulation());
}

// ---------- 飞升 + 天赋 ----------
{
  cheat({ level: 60 });
  const can = E.canAscend();
  if (!can) report('飞升', 'Lv60 时 canAscend() 为 false');
  const before = E.getState().ascensionCount || 0;
  const r = call('performAscension', () => E.performAscension());
  const s = E.getState();
  if ((s.ascensionCount || 0) !== before + 1) report('飞升', `飞升次数未增加：${before} → ${s.ascensionCount} (${r && r.msg})`);
  if (s.level !== 1) report('飞升', `飞升后等级应为1，实际 ${s.level}`);
  if (s.pendingTalentList && s.pendingTalentList.length) {
    call('chooseTalent', () => E.chooseTalent(s.pendingTalentList[0].id || s.pendingTalentList[0]));
    if (E.getState().pendingTalentList) report('天赋', '选择后 pendingTalentList 未清空');
  }
  call('chooseTalent again', () => E.chooseTalent('bogus'));
  call('performAscension low', () => E.performAscension());
  if (E.getState().ascensionCount !== s.ascensionCount) report('飞升', 'Lv1 时仍然可以飞升');
}

// ---------- 存档往返 ----------
{
  cheat({ level: 30, gold: 123456 });
  const before = E.getState();
  const code = call('exportSave', () => E.exportSave());
  if (typeof code !== 'string' || code.length < 20) report('存档', `exportSave 返回异常：${typeof code}`);
  cheat({ level: 3, gold: 1 });
  const r = call('importSave', () => E.importSave(code));
  const after = E.getState();
  if (after.level !== before.level || Math.abs(after.gold - before.gold) > 1) report('存档', `导入后不一致：Lv ${before.level}→${after.level}，灵石 ${before.gold}→${after.gold} (${r && r.msg})`);
  const bad = call('importSave garbage', () => E.importSave('not-a-save'));
  if (bad && bad.success !== false && bad !== false) report('存档', `导入垃圾字符串未报错：${JSON.stringify(bad).slice(0, 80)}`);
  if (E.getState().level !== after.level) report('存档', '导入失败却改动了存档');
  call('importSave empty', () => E.importSave(''));
  call('importSave json-ish', () => E.importSave(Buffer.from('{"level":"abc"}').toString('base64')));
}

// ---------- 部位强化：旧存档迁移 + 换装不丢强化 ----------
{
  cheat({ level: 30, gold: 1e15 });
  const G = E._debug.generateEquipment;
  const w = G(30, 3, 'weapon'); w.enhanceLevel = 9;
  const bag = G(30, 2, 'weapon'); bag.enhanceLevel = 11;
  const st = JSON.parse(Buffer.from(E.exportSave(), 'base64').toString('utf8'));
  delete st.slotEnhance; st.equipment = { weapon: w, armor: null, accessory: null, boots: null }; st.inventory = [bag];
  E.importSave(Buffer.from(JSON.stringify(st), 'utf8').toString('base64'));
  const s = E.getState();
  if (!s.slotEnhance || s.slotEnhance.weapon !== 11) report('部位强化', `旧存档迁移后武器部位 +${s.slotEnhance && s.slotEnhance.weapon}（应 +11）`);
  if (s.equipment.weapon.enhanceLevel || s.inventory[0].enhanceLevel) report('部位强化', '迁移后物品强化未清零');
  const before = s.slotEnhance.weapon;
  E.equipItem(0);
  if (E.getState().slotEnhance.weapon !== before) report('部位强化', '换装后部位强化改变');
  const r = E.enhanceEquip('weapon');
  if (r.success && E.getState().slotEnhance.weapon !== before + 1) report('部位强化', '强化未提升部位等级');
  E.performAscension && cheat({ level: 60 }); E.performAscension();
  if (E.getState().slotEnhance.weapon !== 0) report('部位强化', `飞升后部位强化未重置（+${E.getState().slotEnhance.weapon}）`);
}

// ---------- 离线收益 ----------
{
  cheat({ level: 20 });
  const g0 = E.getState().gold;
  sim.advance(8 * 3600 * 1000);
  const r = call('offline 8h', () => E.processOfflineGains());
  const g1 = E.getState().gold;
  if (r && g1 < g0) report('离线', `离线后灵石减少 ${g0} → ${g1}`);
  sim.advance(-3600 * 1000);
  call('offline negative', () => E.processOfflineGains());
  sim.advance(3600 * 1000 * 400);
  call('offline 400h', () => E.processOfflineGains());
}

// ---------- 死亡与复活 ----------
{
  cheat({ level: 40, baseAttack: 1, baseDefense: 0, baseMaxHp: 10 });
  let died = false;
  for (let i = 0; i < 400 && !died; i++) { sim.tick(1); if (E.getState().isDead) died = true; }
  if (!died) report('死亡', '极弱属性打 Lv40 怪 100 秒未死亡');
  const r0 = revives;
  sim.advance(30000); sim.tick(2);
  if (revives === r0) report('死亡', '30 秒后仍未复活');
}

// ---------- 数值扣费/收益逻辑 ----------
{
  cheat({ level: 30, gold: 1e12, tianjiTokens: 100, materials: { herb: 1e5, ore: 1e5, essence: 1e5 } });
  const S = () => E.getState();
  // 功法：升级扣灵石、等级+1
  const sk = E.SKILL_TREE.find(k => S().realmIndex >= k.realm && (S().skills[k.id] || 0) < k.maxLevel);
  if (sk) {
    const g0 = S().gold, lv0 = S().skills[sk.id] || 0, cost = E.getSkillCost(sk.id);
    const r = E.upgradeSkill(sk.id);
    if (r.success && (S().skills[sk.id] !== lv0 + 1 || Math.abs(g0 - S().gold - cost) > 1)) report('功法', `升级后 Lv ${lv0}→${S().skills[sk.id]}，灵石 -${g0 - S().gold}（应 -${cost}）`);
  }
  // 天机阁：单抽扣令
  {
    const t0 = S().tianjiTokens; const r = E.doGachaPull(1);
    const rf = rr => ((rr && rr.results) || []).reduce((a, x) => a + (x.refund || 0), 0);
    if (r && r.success !== false && t0 - S().tianjiTokens + rf(r) !== E.GACHA_COST_SINGLE) report('天机阁', `单抽扣除 ${t0 - S().tianjiTokens} 天机令（应 ${E.GACHA_COST_SINGLE}）`);
    const t1 = S().tianjiTokens; const r10 = E.doGachaPull(10);
    if (r10 && r10.success !== false && t1 - S().tianjiTokens + rf(r10) !== E.GACHA_COST_TEN) report('天机阁', `十连扣除 ${t1 - S().tianjiTokens}（应 ${E.GACHA_COST_TEN}）`);
    cheat({ tianjiTokens: 0 });
    const t2 = S(); const bad = E.doGachaPull(1);
    if (bad && bad.success !== false) report('天机阁', '天机令为 0 时仍可抽卡');
    if (S().tianjiTokens < 0) report('天机阁', '天机令变为负数');
  }
  // 丹药：炼制消耗材料、数量+1
  {
    const p = E.PILL_RECIPES.find(x => (x.unlockLevel || x.minLevel || 0) <= S().level) || E.PILL_RECIPES[0];
    const n0 = S().pills[p.id] || 0, m0 = JSON.stringify(S().materials), g0 = S().gold;
    const r = E.craftPill(p.id, 1);
    if (r.success) {
      if ((S().pills[p.id] || 0) !== n0 + 1) report('丹药', `炼制 ${p.id} 后数量 ${n0}→${S().pills[p.id]}`);
      if (JSON.stringify(S().materials) === m0 && S().gold === g0) report('丹药', `炼制 ${p.id} 没有消耗任何材料/灵石`);
    } else report('丹药', `资源充足仍炼制失败：${r.msg}`);
    const u0 = S().pills[p.id]; const ru = E.usePill(p.id);
    if (ru.success && S().pills[p.id] !== u0 - 1) report('丹药', `服用后数量 ${u0}→${S().pills[p.id]}`);
  }
  // 强化：扣灵石、强化等级+1
  {
    E.autoEquipBest();
    const slot = ['weapon', 'armor', 'accessory', 'boots'].find(k => S().equipment[k]);
    if (slot) {
      const e0 = S().slotEnhance[slot] || 0, g0 = S().gold;
      const r = E.enhanceEquip(slot);
      if (r.success && S().slotEnhance[slot] !== e0 + 1) report('强化', `强化后部位等级 ${e0}→${S().slotEnhance[slot]}`);
      if (r.success && S().gold >= g0) report('强化', '强化成功但没扣灵石');
    }
  }
  // 锁妖塔扫荡：每日一次
  {
    for (let i = 0; i < 5; i++) E.challengeTower();
    const a1 = E.sweepTower(), a2 = E.sweepTower();
    if (a1.success && a2.success) report('锁妖塔', '同一天可以重复扫荡');
  }
  // 秘境：次数扣减
  {
    cheat({ secretRealmCharges: 2 });
    const r = E.enterSecretRealm(0);
    if (r.success && S().secretRealmCharges !== 1) report('秘境', `进入后次数 2→${S().secretRealmCharges}`);
    cheat({ secretRealmCharges: 0 });
    const r2 = E.enterSecretRealm(0);
    if (r2.success) report('秘境', '次数为 0 仍可进入');
  }
  // 出售：灵石增加、背包减少
  {
    for (let i = 0; i < 200 && S().inventory.length === 0; i++) sim.tick(4);
    if (S().inventory.length) {
      const n0 = S().inventory.length, g0 = S().gold;
      const g = E.sellItem(0);
      if (S().inventory.length !== n0 - 1 || S().gold - g0 !== g) report('出售', `背包 ${n0}→${S().inventory.length}，灵石 +${S().gold - g0}（返回 ${g}）`);
    }
  }
}

// ---------- 随机操作模糊测试 ----------
const ACTIONS = [
  () => sim.tick(1 + Math.floor(rnd() * 40)),
  () => sim.tick(200),
  () => E.autoEquipBest(),
  () => E.equipItem(Math.floor(rnd() * 32) - 1),
  () => E.sellItem(Math.floor(rnd() * 32) - 1),
  () => E.enhanceEquip(pick(['weapon', 'armor', 'accessory', 'boots'])),
  () => E.sellWeakerItems(),
  () => E.upgradeSkill(pick(E.SKILL_TREE).id),
  () => E.maxUpgradeSkill(pick(E.SKILL_TREE).id),
  () => E.castSkill(pick(E.ACTIVE_SKILLS).id),
  () => E.craftPill(pick(E.PILL_RECIPES).id, pick([1, 5])),
  () => E.usePill(pick(E.PILL_RECIPES).id),
  () => { const b = E.getState().beasts; if (b.length) E.feedBeast(pick(b).id); },
  () => { const b = E.getState().beasts; if (b.length) E.setActiveBeast(pick(b).id); },
  () => E.upgradeCaveBuilding(pick(E.CAVE_BUILDINGS).id),
  () => E.enterSecretRealm(Math.floor(rnd() * E.SECRET_REALMS.length)),
  () => E.challengeTower(),
  () => E.autoChallengeTower(),
  () => E.sweepTower(),
  () => E.doGachaPull(pick([1, 10])),
  () => E.claimQuest(),
  () => E.attemptTribulation(),
  () => E.setBattleSpeed(pick([1, 2, 4])),
  () => E.toggleAutoCast(),
  () => E.toggleAutoHeal(),
  () => { sim.advance(rnd() * 3 * 3600 * 1000); E.processOfflineGains(); },
  () => E.buyAscensionUpgrade(pick(E.ASCENSION_UPGRADES).id),
  () => { const s = E.getState(); if (s.pendingTalentList) E.chooseTalent(pick(s.pendingTalentList).id); },
  () => { if (E.canAscend()) E.performAscension(); },
  () => { const all = [...E.WEAPON_SKINS, ...E.ARMOR_SKINS]; E.equipSkin(pick(all).id); },
  () => { const code = E.exportSave(); E.importSave(code); },
];
E.resetState && E.resetState();
cheat({ level: 1 });
for (let i = 0; i < STEPS; i++) {
  const k = Math.floor(rnd() * ACTIONS.length);
  call(`fuzz#${k}`, ACTIONS[k]);
  if (i % 500 === 0) cheat({ gold: E.getState().gold + 1e6 * (i + 1), tianjiTokens: 50 });
}

const s = E.getState();
console.log(`完成：模糊测试 ${STEPS} 步，最终 Lv.${s.level} ${s.realm}，飞升 ${s.ascensionCount || 0} 次，事件 ${events}`);
if (problems.length) {
  console.log(`\n发现 ${problems.length} 个问题：`);
  problems.forEach(p => console.log(' - ' + p));
  process.exitCode = 1;
} else console.log('未发现问题 ✅');
