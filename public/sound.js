// ============================================================
// sound.js — 8-bit 合成音效（WebAudio，无音频文件）
// ============================================================
const Sound = (() => {
  'use strict';
  let ac = null, master = null;
  let enabled = true;
  try { enabled = localStorage.getItem('mc_sound') !== 'off'; } catch (e) { /* 忽略 */ }
  const lastPlay = {};

  function ensure() {
    if (!enabled) return null;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.22;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, dur, type, vol, slide, delay) {
    const a = ensure(); if (!a) return;
    const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, delay) {
    const a = ensure(); if (!a) return;
    const t0 = a.currentTime + (delay || 0);
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = a.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  const SFX = {
    hit: () => { tone(220, 0.06, 'square', 0.12, 0.5); },
    crit: () => { tone(520, 0.05, 'square', 0.2, 1.4); noise(0.08, 0.2, 2500); },
    hurt: () => { tone(140, 0.08, 'sawtooth', 0.1, 0.6); },
    kill: () => { tone(880, 0.05, 'square', 0.12); tone(1320, 0.08, 'square', 0.12, 1, 0.05); },
    coin: () => { tone(1568, 0.05, 'square', 0.08); tone(2093, 0.08, 'square', 0.08, 1, 0.04); },
    skill: () => { tone(660, 0.12, 'sawtooth', 0.18, 2.2); noise(0.12, 0.15, 4000, 0.02); },
    big: () => { tone(330, 0.3, 'sawtooth', 0.22, 3); noise(0.3, 0.25, 3000, 0.05); },
    heal: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.18, 1, i * 0.06)); },
    shield: () => { tone(440, 0.25, 'triangle', 0.18, 1.5); tone(880, 0.2, 'sine', 0.1, 1, 0.05); },
    levelup: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.14, 1, i * 0.07)); },
    breakthrough: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'square', 0.14, 1, i * 0.09)); noise(0.6, 0.12, 5000, 0.2); },
    fail: () => { [392, 330, 262].forEach((f, i) => tone(f, 0.2, 'sawtooth', 0.14, 0.9, i * 0.12)); },
    thunder: () => { noise(0.7, 0.5, 900); tone(80, 0.5, 'sawtooth', 0.25, 0.5); },
    storm: () => { noise(1.2, 0.18, 400); },
    death: () => { [330, 262, 196, 131].forEach((f, i) => tone(f, 0.18, 'square', 0.14, 0.9, i * 0.1)); },
    drop: () => { tone(988, 0.06, 'square', 0.1); tone(1319, 0.1, 'square', 0.1, 1, 0.06); },
    rare: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.16, 1, i * 0.05)); },
    click: () => { tone(900, 0.03, 'square', 0.06); },
    error: () => { tone(160, 0.12, 'square', 0.12, 0.8); },
    gacha: () => { for (let i = 0; i < 6; i++) tone(600 + i * 120, 0.05, 'square', 0.08, 1, i * 0.04); },
    quest: () => { [659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.16, 1, i * 0.08)); },
  };

  function play(name) {
    if (!enabled || !SFX[name]) return;
    const now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 60) return; // 防止同帧叠加爆音
    lastPlay[name] = now;
    try { SFX[name](); } catch (e) { /* 忽略 */ }
  }

  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem('mc_sound', enabled ? 'on' : 'off'); } catch (e) { /* 忽略 */ }
    if (enabled) { ensure(); play('click'); }
    return enabled;
  }

  function unlock() { if (enabled) ensure(); }

  return { play, toggle, unlock, isOn: () => enabled };
})();
