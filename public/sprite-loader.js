/**
 * sprite-loader.js — 鼠鼠修仙2 Sprite Sheet 加载与渲染系统
 * 
 * 架构设计：
 * 1. SpriteSheet  — 单张图集的加载、裁切、缓存
 * 2. SpriteAtlas  — 多图集统一管理（monsters/beasts/mounts/mouse/weapons/effects）
 * 3. SpriteRenderer — 封装 drawImage 调用，对齐原 Sprites API（drawMouseByRealm / drawMonsterByName 等）
 * 
 * 向后兼容：
 * - 图集未加载完成时，自动 fallback 到原 sprites.js 的 Canvas 绘制
 * - 加载完成后，透明切换为 drawImage，index.html / engine.js 零改动
 * 
 * 精灵图集规格（约定）：
 * - 每个精灵帧为 FRAME_W × FRAME_H 像素（默认 48×48）
 * - 图集横向排列帧（动画），纵向排列不同角色/状态
 * - 通过 JSON manifest 描述每个精灵的 { name, row, col, frames, anchor }
 */

const SpriteLoader = (function() {
  'use strict';

  // ============================================================
  // 配置常量
  // ============================================================

  const DEFAULT_FRAME_W = 48;   // 单帧宽度（像素）
  const DEFAULT_FRAME_H = 48;   // 单帧高度（像素）
  const ANIM_SPEED = 8;         // 每N游戏帧切换一个精灵帧

  // ============================================================
  // SpriteSheet — 单张图集
  // ============================================================

  class SpriteSheet {
    /**
     * @param {string} src        — PNG 路径（相对于 public/）
     * @param {number} frameW     — 单帧宽
     * @param {number} frameH     — 单帧高
     */
    constructor(src, frameW = DEFAULT_FRAME_W, frameH = DEFAULT_FRAME_H) {
      this.src = src;
      this.frameW = frameW;
      this.frameH = frameH;
      this.image = null;
      this.loaded = false;
      this.error = false;
      this._promise = null;

      // 精灵定义表 { name → { row, col, frames, anchorX, anchorY, flipX } }
      this.sprites = {};

      // 帧缓存 — OffscreenCanvas per frame（避免重复裁切）
      this._frameCache = {};
    }

    /**
     * 注册一个精灵（在图集中的位置）
     * @param {string} name   — 精灵名（如 'gray_rat', 'fire_cat'）
     * @param {object} def    — { row, col, frames, anchorX, anchorY, flipX }
     *   row/col: 精灵在图集中的起始格（0-based）
     *   frames: 动画帧数（默认1，静态）
     *   anchorX/Y: 锚点偏移（0~1，默认0.5居中）
     *   flipX: 是否水平翻转（怪物面向玩家时需要）
     */
    define(name, def) {
      this.sprites[name] = {
        row: def.row || 0,
        col: def.col || 0,
        frames: def.frames || 1,
        anchorX: def.anchorX !== undefined ? def.anchorX : 0.5,
        anchorY: def.anchorY !== undefined ? def.anchorY : 1.0, // 默认底部对齐
        flipX: !!def.flipX,
        scale: def.scale || 1.0,
      };
      return this;
    }

    /**
     * 批量注册精灵
     * @param {Object} defs — { name: { row, col, frames, ... }, ... }
     */
    defineAll(defs) {
      for (const [name, def] of Object.entries(defs)) {
        this.define(name, def);
      }
      return this;
    }

    /**
     * 加载图片（返回 Promise）
     */
    load() {
      if (this._promise) return this._promise;
      this._promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.image = img;
          this.loaded = true;
          console.log(`[SpriteLoader] ✅ Loaded: ${this.src} (${img.width}×${img.height})`);
          resolve(this);
        };
        img.onerror = (err) => {
          this.error = true;
          console.warn(`[SpriteLoader] ❌ Failed: ${this.src}`, err);
          reject(err);
        };
        img.src = this.src;
      });
      return this._promise;
    }

    /**
     * 获取某帧的缓存 Canvas（惰性创建）
     * @param {string} name     — 精灵名
     * @param {number} frameIdx — 帧索引
     * @returns {HTMLCanvasElement|null}
     */
    getFrame(name, frameIdx = 0) {
      const def = this.sprites[name];
      if (!def || !this.loaded) return null;

      const cacheKey = `${name}_${frameIdx}`;
      if (this._frameCache[cacheKey]) return this._frameCache[cacheKey];

      const sx = (def.col + frameIdx) * this.frameW;
      const sy = def.row * this.frameH;

      // 使用 OffscreenCanvas 或普通 Canvas 裁切并缓存
      const can = document.createElement('canvas');
      can.width = this.frameW;
      can.height = this.frameH;
      const cctx = can.getContext('2d');

      if (def.flipX) {
        cctx.translate(this.frameW, 0);
        cctx.scale(-1, 1);
      }

      cctx.drawImage(
        this.image,
        sx, sy, this.frameW, this.frameH,  // source rect
        0, 0, this.frameW, this.frameH     // dest rect
      );

      this._frameCache[cacheKey] = can;
      return can;
    }

    /**
     * 绘制精灵到目标 Canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} name       — 精灵名
     * @param {number} x          — 目标X（屏幕坐标）
     * @param {number} y          — 目标Y（屏幕坐标）
     * @param {number} scale      — 缩放倍数（对应 PIXEL_SCALE）
     * @param {number} animFrame  — 游戏动画帧计数器
     * @param {object} [opts]     — { flipX, alpha, tint }
     */
    draw(ctx, name, x, y, scale, animFrame = 0, opts = {}) {
      const def = this.sprites[name];
      if (!def || !this.loaded) return false;

      // 计算当前动画帧
      const frameIdx = def.frames > 1 
        ? Math.floor(animFrame / ANIM_SPEED) % def.frames 
        : 0;

      const frameCan = this.getFrame(name, frameIdx);
      if (!frameCan) return false;

      // 计算绘制尺寸（基于 scale 和精灵自身的 scale 修正）
      const drawW = this.frameW * scale * def.scale;
      const drawH = this.frameH * scale * def.scale;

      // 锚点偏移（anchorX=0.5, anchorY=1.0 表示底部居中）
      const drawX = x - drawW * def.anchorX;
      const drawY = y - drawH * def.anchorY;

      ctx.save();

      // 可选：整体翻转（运行时翻转，不同于图集定义的 flipX）
      if (opts.flipX) {
        ctx.translate(x, 0);
        ctx.scale(-1, 1);
        ctx.translate(-x, 0);
      }

      // 可选：透明度
      if (opts.alpha !== undefined) {
        ctx.globalAlpha = opts.alpha;
      }

      // 可选：受击闪白 tint
      if (opts.tint) {
        // 使用临时canvas进行tint处理，避免在主canvas上产生白色方块
        const tintCan = document.createElement('canvas');
        tintCan.width = Math.ceil(drawW);
        tintCan.height = Math.ceil(drawH);
        const tctx = tintCan.getContext('2d');
        tctx.imageSmoothingEnabled = false;
        // 先绘制原图到临时canvas
        tctx.drawImage(frameCan, 0, 0, tintCan.width, tintCan.height);
        // 在临时canvas上用 source-atop 叠加tint色（只影响非透明像素）
        tctx.globalCompositeOperation = 'source-atop';
        tctx.globalAlpha = opts.tintAlpha || 0.5;
        tctx.fillStyle = opts.tint;
        tctx.fillRect(0, 0, tintCan.width, tintCan.height);
        // 将处理后的结果绘制到主canvas
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tintCan, drawX, drawY, drawW, drawH);
      } else {
        // 关闭图片平滑 → 保持像素锐利
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frameCan, drawX, drawY, drawW, drawH);
      }

      ctx.restore();
      return true; // 表示成功用 Sprite Sheet 渲染
    }
  }

  // ============================================================
  // SpriteAtlas — 多图集管理器
  // ============================================================

  class SpriteAtlas {
    constructor() {
      /** @type {Object.<string, SpriteSheet>} */
      this.sheets = {};
      this.allLoaded = false;
      this.loadProgress = { total: 0, loaded: 0, failed: 0 };
    }

    /**
     * 注册一个图集
     * @param {string} id      — 图集ID（如 'monsters', 'beasts', 'mouse'）
     * @param {SpriteSheet} sheet
     */
    add(id, sheet) {
      this.sheets[id] = sheet;
      return this;
    }

    /**
     * 加载所有已注册的图集
     * @returns {Promise<SpriteAtlas>}
     */
    async loadAll() {
      const entries = Object.entries(this.sheets);
      this.loadProgress.total = entries.length;
      this.loadProgress.loaded = 0;
      this.loadProgress.failed = 0;

      const results = await Promise.allSettled(
        entries.map(async ([id, sheet]) => {
          try {
            await sheet.load();
            this.loadProgress.loaded++;
          } catch (e) {
            this.loadProgress.failed++;
            console.warn(`[SpriteAtlas] Sheet "${id}" failed to load`);
          }
        })
      );

      this.allLoaded = this.loadProgress.failed === 0;
      console.log(
        `[SpriteAtlas] Load complete: ${this.loadProgress.loaded}/${this.loadProgress.total}` +
        (this.loadProgress.failed > 0 ? ` (${this.loadProgress.failed} failed)` : '')
      );

      return this;
    }

    /**
     * 获取图集
     * @param {string} id
     * @returns {SpriteSheet|null}
     */
    get(id) {
      return this.sheets[id] || null;
    }

    /**
     * 在所有图集中查找指定精灵（按注册顺序）
     * @param {string} name
     * @returns {{ sheet: SpriteSheet, def: object }|null}
     */
    find(name) {
      for (const sheet of Object.values(this.sheets)) {
        if (sheet.sprites[name] && sheet.loaded) {
          return { sheet, def: sheet.sprites[name] };
        }
      }
      return null;
    }

    /**
     * 在所有图集中绘制指定精灵
     * @returns {boolean} 是否成功渲染
     */
    draw(ctx, name, x, y, scale, animFrame, opts) {
      const found = this.find(name);
      if (!found) return false;
      return found.sheet.draw(ctx, name, x, y, scale, animFrame, opts);
    }
  }

  // ============================================================
  // SpriteRenderer — 兼容 Sprites API 的渲染桥接层
  // ============================================================
  //
  // 核心思想：
  //   每个 Sprites.drawXXX 调用先尝试用 SpriteSheet 渲染，
  //   失败（图集未加载/精灵未定义）则 fallback 到原 Sprites 的 Canvas 绘制。
  //   这样可以逐步替换——每完成一批精灵图，注册进 atlas 即可自动生效。

  class SpriteRenderer {
    /**
     * @param {SpriteAtlas} atlas           — 图集管理器
     * @param {object}      fallbackSprites — 原 window.Sprites 对象
     */
    constructor(atlas, fallbackSprites) {
      this.atlas = atlas;
      this.fallback = fallbackSprites;
      // 精灵图集缩放比率
      // SpriteSheet scale 乘以整帧(48×48)尺寸
      // SCALE_RATIO × PIXEL_SCALE(3) × 48 = 最终像素宽度
      this.SCALE_RATIO = 0.75;        // 鼠鼠 & 怪物: 48×3×0.75 = 108px
      this.BEAST_SCALE_RATIO = 0.55;  // 灵兽: 48×3×0.55 = 79px (比鼠鼠小，作为宠物)
      this.MOUNT_SCALE_RATIO = 0.6;   // 坐骑: 64×3×0.6 = 115px (比鼠鼠宽但矮，驮载感)
    }

    // --- 怪物 ---
    drawMonsterByName(ctx, name, x, y, scale, animFrame, hitAnim) {
      // 尝试 Sprite Sheet
      const opts = {};
      if (hitAnim > 0) {
        opts.tint = '#FFF';
        opts.tintAlpha = Math.min(hitAnim / 5, 0.6);
      }
      const adjustedScale = scale * this.SCALE_RATIO;
      const adjustedY = y + 6 * scale; // 精灵底部对齐地面
      const ok = this.atlas.draw(ctx, name, x, adjustedY, adjustedScale, animFrame, opts);
      if (!ok) {
        // fallback 原始 Canvas 绘制
        this.fallback.drawMonsterByName(ctx, name, x, y, scale, animFrame, hitAnim);
      }
    }

    // --- 鼠鼠（含境界/皮肤） ---
    drawMouseByRealm(ctx, x, y, scale, realmIndex, animFrame, attacking, options) {
      const opts = options || {};
      let spriteName = `mouse_realm_${realmIndex}`;
      
      // 如果有皮肤，尝试带皮肤的精灵
      if (opts.equippedArmorSkin) {
        const skinName = `${spriteName}_as_${opts.equippedArmorSkin}`;
        if (this.atlas.find(skinName)) spriteName = skinName;
      }
      if (opts.equippedWeaponSkin) {
        const skinName = `${spriteName}_ws_${opts.equippedWeaponSkin}`;
        if (this.atlas.find(skinName)) spriteName = skinName;
      }

      const drawOpts = {};
      const adjustedScale = scale * this.SCALE_RATIO;
      const adjustedY = y + 6 * scale;
      const ok = this.atlas.draw(ctx, spriteName, x, adjustedY, adjustedScale, animFrame, drawOpts);
      if (!ok) {
        this.fallback.drawMouseByRealm(ctx, x, y, scale, realmIndex, animFrame, attacking, options);
      }
    }

    // --- 灵兽 ---
    drawActiveBeast(ctx, x, y, scale, beastTemplateId, animFrame) {
      const adjustedScale = scale * this.BEAST_SCALE_RATIO;
      const adjustedY = y + 4 * scale;
      const ok = this.atlas.draw(ctx, beastTemplateId, x, adjustedY, adjustedScale, animFrame);
      if (!ok) {
        this.fallback.drawActiveBeast(ctx, x, y, scale, beastTemplateId, animFrame);
      }
    }

    // --- 坐骑 ---
    drawMountCrane(ctx, x, y, scale, animFrame) {
      const adjustedScale = scale * this.MOUNT_SCALE_RATIO;
      const adjustedY = y + 4 * scale;
      const ok = this.atlas.draw(ctx, 'mount_crane', x, adjustedY, adjustedScale, animFrame);
      if (!ok) {
        this.fallback.drawMountCrane(ctx, x, y, scale, animFrame);
      }
    }

    drawMountQilin(ctx, x, y, scale, animFrame) {
      const adjustedScale = scale * this.MOUNT_SCALE_RATIO;
      const adjustedY = y + 4 * scale;
      const ok = this.atlas.draw(ctx, 'mount_qilin', x, adjustedY, adjustedScale, animFrame);
      if (!ok) {
        this.fallback.drawMountQilin(ctx, x, y, scale, animFrame);
      }
    }

    // --- 武器皮肤（抽卡预览用）---
    drawWeaponWithSkin(ctx, x, y, scale, tier, frame, attacking, skinId) {
      if (skinId) {
        const ok = this.atlas.draw(ctx, `ws_${skinId}`, x, y, scale, frame);
        if (ok) return;
      }
      this.fallback.drawWeaponWithSkin(ctx, x, y, scale, tier, frame, attacking, skinId);
    }

    // --- 衣服皮肤覆盖（抽卡预览用）---
    drawArmorSkinOverlay(ctx, x, y, scale, skinId) {
      // 衣服皮肤通常直接包含在鼠鼠精灵中，预览时 fallback
      this.fallback.drawArmorSkinOverlay(ctx, x, y, scale, skinId);
    }

    // --- 怪物血条（纯UI，不需要Sprite Sheet）---
    drawMonsterHPBar(ctx, x, y, scale, hpPercent, name) {
      this.fallback.drawMonsterHPBar(ctx, x, y, scale, hpPercent, name);
    }

    // --- 透传原始工具函数 ---
    get armorSkinColors() {
      return this.fallback.armorSkinColors;
    }

    get rect() { return this.fallback.rect; }
    get px() { return this.fallback.px; }
    get circle() { return this.fallback.circle; }
    get ellipse() { return this.fallback.ellipse; }
    get roundRect() { return this.fallback.roundRect; }
  }

  // ============================================================
  // 图集配置 — 定义所有精灵在图集中的位置
  // ============================================================
  //
  // 当前为空白模板——等精灵图制作完成后，在此填入真实坐标。
  // 图集未加载时，系统自动 fallback 到原 Canvas 绘制，所以现在就能上线。

  function createDefaultAtlas() {
    const atlas = new SpriteAtlas();

    // --- 怪物图集 ---
    const monstersSheet = new SpriteSheet('assets/monsters.png', 48, 48);
    monstersSheet.defineAll({
      // 炼气期 (tier 0) — row 0-2 — 图集面RIGHT，需翻转
      '灰毛妖鼠':     { row: 0, col: 0, frames: 4, flipX: true },
      '毒蟾蜍':       { row: 1, col: 0, frames: 4, flipX: true },
      '赤狐妖':       { row: 2, col: 0, frames: 4, flipX: true },
      // 筑基期 (tier 1) — row 3-5
      '铁甲傀儡':     { row: 3, col: 0, frames: 4, flipX: false },   // CENTER
      '墨蛟蛇':       { row: 4, col: 0, frames: 4, flipX: false },   // 已面LEFT
      '暴猿妖':       { row: 5, col: 0, frames: 4, flipX: false },   // 已面LEFT
      // 金丹期 (tier 2) — row 6-8
      '冰魄蜘蛛':     { row: 6, col: 0, frames: 4, flipX: false },   // 已面LEFT
      '三眼火鸦':     { row: 7, col: 0, frames: 4, flipX: false },   // CENTER
      '豹形雷兽':     { row: 8, col: 0, frames: 4, flipX: true },    // 面RIGHT，需翻转
      // 元婴期 (tier 3) — row 9-11
      '鬼影修士':     { row: 9,  col: 0, frames: 4, flipX: true },   // 面RIGHT，需翻转
      '化龙妖蛟':     { row: 10, col: 0, frames: 4, flipX: false },  // 已面LEFT
      '血衣魔修':     { row: 11, col: 0, frames: 4, flipX: false },  // 已面LEFT
      // 化神期 (tier 4) — row 12-14
      '天魔老祖':     { row: 12, col: 0, frames: 4, flipX: false },  // 已面LEFT
      '九尾天狐':     { row: 13, col: 0, frames: 4, flipX: false },  // 已面LEFT
      '血魔宗主':     { row: 14, col: 0, frames: 4, flipX: false },  // 已面LEFT
      // 大乘期 (tier 5) — row 15-17
      '劫雷真龙':     { row: 15, col: 0, frames: 4, flipX: false },  // 已面LEFT
      '混沌古兽':     { row: 16, col: 0, frames: 4, flipX: false },  // 已面LEFT
      '天道魔神':     { row: 17, col: 0, frames: 4, flipX: false },  // 已面LEFT
    });
    atlas.add('monsters', monstersSheet);

    // --- 灵兽图集 ---
    const beastsSheet = new SpriteSheet('assets/beasts.png', 48, 48);
    beastsSheet.defineAll({
      // renderer.js 中灵兽绘制带 ctx.scale(-1,1)，所以精灵需先面LEFT
      // 面RIGHT的加flipX:true翻成LEFT → renderer翻回RIGHT（朝怪物）✅
      // 面LEFT的不翻 → renderer翻为RIGHT（朝怪物）✅
      'fire_cat':       { row: 0, col: 0, frames: 4, flipX: true },   // 图集面RIGHT
      'ice_wolf':       { row: 1, col: 0, frames: 4, flipX: true },   // 图集面RIGHT
      'thunder_eagle':  { row: 2, col: 0, frames: 4, flipX: false },  // CENTER
      'shadow_serpent':  { row: 3, col: 0, frames: 4, flipX: true },  // 图集面RIGHT
      'jade_dragon':    { row: 4, col: 0, frames: 4, flipX: false },  // 图集面LEFT
      'phoenix':        { row: 5, col: 0, frames: 4, flipX: false },  // 图集面LEFT
    });
    atlas.add('beasts', beastsSheet);

    // --- 坐骑图集 ---
    const mountsSheet = new SpriteSheet('assets/mounts.png', 64, 48);
    mountsSheet.defineAll({
      // renderer.js 中坐骑绘制带 ctx.scale(-1,1)，逻辑同灵兽
      // 面RIGHT的加flipX:true翻成LEFT → renderer翻回RIGHT ✅
      'mount_crane': { row: 0, col: 0, frames: 4, flipX: false },   // CENTER
      'mount_qilin': { row: 1, col: 0, frames: 4, flipX: true },    // 面RIGHT
    });
    atlas.add('mounts', mountsSheet);

    // --- 鼠鼠图集（6境界 × idle 4帧）---
    // 当前只有 idle 动画帧，攻击动画通过冲刺位移模拟（在 renderer.js 中实现）
    const mouseSheet = new SpriteSheet('assets/mouse.png', 48, 48);
    mouseSheet.defineAll({
      'mouse_realm_0': { row: 0, col: 0, frames: 4 },  // 炼气期
      'mouse_realm_1': { row: 1, col: 0, frames: 4 },  // 筑基期
      'mouse_realm_2': { row: 2, col: 0, frames: 4 },  // 金丹期
      'mouse_realm_3': { row: 3, col: 0, frames: 4 },  // 元婴期
      'mouse_realm_4': { row: 4, col: 0, frames: 4 },  // 化神期
      'mouse_realm_5': { row: 5, col: 0, frames: 4 },  // 大乘期
    });
    atlas.add('mouse', mouseSheet);

    // --- 武器皮肤图集 ---
    const weaponsSheet = new SpriteSheet('assets/weapons.png', 32, 32);
    // 20种武器皮肤，后续根据实际制作填入
    atlas.add('weapons', weaponsSheet);

    return atlas;
  }

  // ============================================================
  // 初始化 & 集成入口
  // ============================================================

  let _atlas = null;
  let _renderer = null;

  /**
   * 初始化 Sprite Sheet 系统
   * 调用后开始异步加载图集，加载期间自动 fallback 到原 Canvas 绘制
   * 
   * @param {object} fallbackSprites — 原 window.Sprites 对象
   * @returns {SpriteRenderer} — 可以替代 Sprites 使用的渲染器
   */
  function init(fallbackSprites) {
    _atlas = createDefaultAtlas();
    _renderer = new SpriteRenderer(_atlas, fallbackSprites);

    // 异步加载图集（不阻塞游戏启动）
    _atlas.loadAll().then(() => {
      console.log('[SpriteLoader] All sheets loaded, switching to Sprite Sheet rendering');
    }).catch(() => {
      console.warn('[SpriteLoader] Some sheets failed, using Canvas fallback');
    });

    return _renderer;
  }

  /**
   * 获取加载进度（用于显示 loading bar）
   * @returns {{ total: number, loaded: number, failed: number, percent: number }}
   */
  function getProgress() {
    if (!_atlas) return { total: 0, loaded: 0, failed: 0, percent: 0 };
    const p = _atlas.loadProgress;
    return {
      ...p,
      percent: p.total > 0 ? Math.round((p.loaded / p.total) * 100) : 0,
    };
  }

  /**
   * 获取图集管理器（高级用法：运行时注册新精灵）
   */
  function getAtlas() { return _atlas; }

  /**
   * 获取渲染器
   */
  function getRenderer() { return _renderer; }

  // ============================================================
  // 导出
  // ============================================================

  return {
    SpriteSheet,
    SpriteAtlas,
    SpriteRenderer,
    init,
    getProgress,
    getAtlas,
    getRenderer,
    // 常量
    DEFAULT_FRAME_W,
    DEFAULT_FRAME_H,
    ANIM_SPEED,
  };

})();

// Node.js 兼容
if (typeof module !== 'undefined') module.exports = SpriteLoader;