#!/usr/bin/env node
// ============================================================
// balance-sim.js — 鼠鼠修仙 无头数值模拟器
// 用虚拟时钟直接驱动 engine.js，模拟一个"会玩"的玩家，
// 输出每个境界的到达时间、死亡次数等，用于调数值。
//
// 用法: node tools/balance-sim.js [模拟小时数=24] [战斗倍速=1] [--quiet]
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HOURS = parseFloat(process.argv[2] || '24');
const SPEED = parseInt(process.argv[3] || '1', 10);
const QUIET = process.argv.includes('--quiet');

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
    Date: FakeDate,
    Math, JSON, console,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    },
    setInterval: (fn) => { intervalFn = fn; return 1; },
    clearInterval: () => {},
    setTimeout: () => 0,
    module: undefined,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'engine.js'), 'utf8');
  vm.runInContext(src + '\n;this.GameEngine = GameEngine;', sandbox);
  return {
    E: sandbox.GameEngine,
    advance(ms) { now += ms; },
    tick() { if (intervalFn) intervalFn(); },
    get now() { return now; },
  };
}

function run() {
  const sim = createSandbox();
  const E = sim.E;
  const events = { death: 0, trib: 0, tribFail: 0, elite: 0, beast: 0 };
  const TRACE = process.argv.includes('--trace');
  let mAgg = { n: 0, hp: 0, atk: 0 };
  let levelStart = 0, deathsAtLevel = 0;
  const traceRows = [];
  let lastBoss = false; const bossTries = {}; const bossLog = []; global.__bossTries = bossTries; global.__bossLog = bossLog;
  E.start((type, data) => {
    if (type === 'spawn' && data && data.monster && !data.monster.isElite) {
      mAgg.n++; mAgg.hp += data.monster.maxHp; mAgg.atk += data.monster.atk;
    }
    if (TRACE && (type === 'levelup' || type === 'breakthrough' || type === 'tribulationReady')) {
      const st = E.getState(); const c = st.computed;
      const mhp = mAgg.n ? mAgg.hp / mAgg.n : 0, matk = mAgg.n ? mAgg.atk / mAgg.n : 0;
      const hit = Math.max(1, matk - c.defense * 0.3);
      traceRows.push(`Lv${String(st.level).padStart(3)} ${type.padEnd(16)} t=${((sim.now - start)/60000).toFixed(1).padStart(6)}m dt=${((sim.now-levelStart)/60000).toFixed(1).padStart(5)}m | atk ${E.formatNumber(c.attack).padStart(7)} def ${E.formatNumber(c.defense).padStart(6)} hp ${E.formatNumber(c.maxHp).padStart(7)} | mHP ${E.formatNumber(mhp).padStart(7)} mATK ${E.formatNumber(matk).padStart(6)} | HTK ${(mhp / c.attack).toFixed(1).padStart(5)} HTD ${(c.maxHp / hit).toFixed(1).padStart(6)} deaths ${events.death - deathsAtLevel}`);
      if (type === 'breakthrough' || type === 'tribulationReady') {
        const sk = Object.values(st.skills).reduce((a, b) => a + b, 0);
        const cave = Object.values(st.cave).join('/');
        const enh = ['weapon','armor','accessory','boots'].map(k => st.equipment[k] ? (st.equipment[k].quality + '+' + ((st.slotEnhance || {})[k] || 0)) : '-').join(' ');
        traceRows.push(`      ↳ 功法总层${sk} 洞府${cave} 装备[${enh}] 灵兽${(st.beasts||[]).map(b=>b.level).join('/')} 塔${st.towerBestFloor} 灵石${E.formatNumber(st.gold)} 丹${JSON.stringify(st.pills)} 材料${JSON.stringify(st.materials)} 战力${E.formatNumber(st.power)}`);
      }
      levelStart = sim.now; deathsAtLevel = events.death; mAgg = { n: 0, hp: 0, atk: 0 };
    }
    if (type === 'death') { events.death++; if (lastBoss) events.bossLoss = (events.bossLoss || 0) + 1; }
    if (type === 'bossSpawn') { events.bossSpawn = (events.bossSpawn || 0) + 1; bossTries[data.monster.tier] = (bossTries[data.monster.tier] || 0) + 1; }
    if (type === 'bossKill') { events.bossKill = (events.bossKill || 0) + 1; bossLog.push(`${data.monster.name}(第${bossTries[data.monster.tier]}次)`); }
    if (type === 'spawn') lastBoss = !!(data && data.monster && data.monster.isBoss);
    if (type === 'breakthrough') events.trib++;
    if (type === 'tribulationFail') events.tribFail++;
    if (type === 'beastCapture') events.beast++;
  });
  E.setBattleSpeed(SPEED);
  E.ensureMonster && E.ensureMonster();
  const start = sim.now;
  const realmReached = { 0: 0 };
  const hourly = [];
  let lastHour = -1;
  let lastTower = 0;

  const totalMs = HOURS * 3600 * 1000;
  // 引擎 tick 间隔按倍速计算；用 getState().tickMs（若有）兜底
  while (sim.now - start < totalMs) {
    const tickMs = 2000 / SPEED;
    sim.advance(tickMs);
    sim.tick();
    const elapsed = sim.now - start;

    // 每 20 秒游戏时间做一次"玩家操作"
    if (Math.floor(elapsed / 20000) !== Math.floor((elapsed - tickMs) / 20000)) {
      playerPolicy(E, sim, elapsed, () => {
        if (elapsed - lastTower > 10 * 60 * 1000) { lastTower = elapsed; return true; }
        return false;
      });
    }
    const s = E.getState();
    if (realmReached[s.realmIndex] === undefined) realmReached[s.realmIndex] = elapsed;
    const hour = Math.floor(elapsed / 3600000);
    if (hour !== lastHour) {
      lastHour = hour;
      hourly.push({ h: hour, lv: s.level, realm: s.realm, atk: s.computed.attack, hp: s.computed.maxHp, gold: s.gold, deaths: events.death, kills: s.killCount, tower: s.towerBestFloor });
    }
  }
  if (TRACE) console.log(traceRows.join('\n'));
  const s = E.getState();
  const fmtH = ms => (ms / 3600000).toFixed(2) + 'h';
  if (!QUIET) {
    console.log('小时 | 等级 | 境界 | 攻击 | 生命 | 灵石 | 击杀 | 死亡 | 塔');
    for (const r of hourly) {
      console.log(`${String(r.h).padStart(3)} | ${String(r.lv).padStart(3)} | ${r.realm} | ${E.formatNumber(r.atk)} | ${E.formatNumber(r.hp)} | ${E.formatNumber(r.gold)} | ${r.kills} | ${r.deaths} | ${r.tower}`);
    }
  }
  console.log('\n境界到达时间:');
  for (const [ri, t] of Object.entries(realmReached)) console.log(`  ${E.REALMS[ri].name}: ${fmtH(t)}`);
  console.log(`
守关妖王: 出现${events.bossSpawn || 0}次 击败${events.bossKill || 0} 败退${events.bossLoss || 0} | ${global.__bossLog.join(' ')}`);
  console.log(`\n最终: Lv.${s.level} ${s.realm} | 死亡${events.death} | 渡劫成功${events.trib} 失败${events.tribFail} | 灵兽${s.beasts.length} | 塔${s.towerBestFloor}层 | 转生${s.ascensionCount}`);
}

// 一个"合理的"玩家：换装、卖垃圾、渡劫、按性价比花灵石、秘境/塔
function playerPolicy(E, sim, elapsed, towerDue) {
  let s = E.getState();
  const LAZY = process.argv.includes('--lazy');
  while (E.claimQuest().success) { /* 领取修行指引 */ }
  E.autoEquipBest();
  E.sellWeakerItems();
  if (s.autoCastUnlocked && !s.autoCast) E.toggleAutoCast();
  if (!LAZY) E.castSkill('sword_qi');
  if (!s.autoHealEnabled) E.toggleAutoHeal();
  const PILLS = process.argv.includes('--pills');
  if (PILLS) {
    if (s.fortune && !process.argv.includes('--nofortune') && Math.random() < 0.5) E.claimFortune();
    if (s.autoPillUnlocked && !(s.autoPills && s.autoPills.exp_pill)) E.setAutoPill('exp_pill', true);
    if (s.autoPillUnlocked && s.realmIndex >= 2 && !(s.autoPills && s.autoPills.super_exp)) E.setAutoPill('super_exp', true);
    if (s.materials.herb > 12 && (s.pills.exp_pill || 0) < 5) E.craftPill('exp_pill', 3);
    if (s.realmIndex >= 2 && s.materials.essence > 6 && (s.pills.super_exp || 0) < 3) E.craftPill('super_exp', 1);
  }
  if ((s.pills.heal_pill || 0) < 3) E.craftPill('heal_pill');
  // 守关妖王：先打（最多等它来 3 次），再渡劫
  const waitBoss = !process.argv.includes('--skipboss') && s.bossPending && (global.__bossTries[s.realmIndex] || 0) < 3;
  if (s.needTribulation && !waitBoss) {
    if ((s.pills.trib_pill || 0) < 1) E.craftPill('trib_pill');
    if (!(s.buffs.tribBoost && s.buffs.tribBoost.until > sim.now)) E.usePill('trib_pill');
    E.attemptTribulation();
  }

  s = E.getState();
  if (!process.argv.includes('--norealm') && s.secretRealmCharges > 0) {
    const idx = E.SECRET_REALMS.reduce((best, r, i) => (s.realmIndex >= r.minRealm ? i : best), 0);
    E.enterSecretRealm(idx);
  }
  if (!process.argv.includes('--notower') && towerDue()) { E.autoChallengeTower(); E.sweepTower(); }

  // 贪心花钱：每次买最便宜的可购项
  for (let guard = 0; guard < 300; guard++) {
    s = E.getState();
    const options = [];
    for (const sk of E.SKILL_TREE) {
      const lv = s.skills[sk.id] || 0;
      if (s.realmIndex < sk.realm || lv >= sk.maxLevel) continue;
      options.push({ cost: E.getSkillCost(sk.id), act: () => E.upgradeSkill(sk.id) });
    }
    for (const slot of ['weapon', 'armor', 'accessory', 'boots']) {
      const eq = s.equipment[slot];
      if (eq && ((E.getState().slotEnhance || {})[slot] || 0) < 15) options.push({ cost: E.getEquipEnhanceCost(eq) * 1.5, real: E.getEquipEnhanceCost(eq), act: () => E.enhanceEquip(slot) });
    }
    for (const b of E.CAVE_BUILDINGS) {
      const lv = s.cave[b.id] || 0;
      if (lv < b.maxLevel && s.level >= b.minLevel) options.push({ cost: E.getCaveBuildingCost(b.id), act: () => E.upgradeCaveBuilding(b.id) });
    }
    const beast = s.activeBeast;
    if (beast && beast.level < s.level + 5) {
      const cost = E.getBeastFeedCost(beast.id);
      options.push({ cost: cost * 1.2, real: cost, act: () => E.feedBeast(beast.id) });
    }
    options.sort((a, b) => a.cost - b.cost);
    const pick = options[0];
    if (!pick || (pick.real || pick.cost) > s.gold * (LAZY ? 0.5 : 1)) break;
    const r = pick.act();
    if (r && r.success === false) break;
  }
}

if (require.main === module) run();
module.exports = { createSandbox, playerPolicy };
