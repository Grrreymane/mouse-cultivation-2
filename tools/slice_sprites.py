#!/usr/bin/env python3
"""
slice_sprites.py v4 — 鼠鼠修仙2 Sprite Sheet 切割工具

改进点：
- 全局背景色检测（不仅靠角落，用整图亮度直方图的两个峰值）
- 自适应容差（基于两种背景色之间的距离）
- 文字标签检测和过滤
- 抗锯齿半透明边缘处理
- v4: 新增区域检测模式——对含文字标签的图集(如sheet_3)自动定位精灵区域，
      不再依赖等分切割，彻底解决精灵碎片化问题
"""

import os
import numpy as np
from PIL import Image
from scipy import ndimage

ART_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art')
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets')


def detect_bg_global(arr):
    """
    全局检测棋盘格背景的两种颜色。
    策略：对整图做亮度直方图，找出两个最大峰值。
    """
    pixels = arr.reshape(-1, 3).astype(float)
    brightness = np.mean(pixels, axis=1)
    
    # 粗粒度直方图找峰值
    hist, edges = np.histogram(brightness, bins=64, range=(0, 256))
    centers = (edges[:-1] + edges[1:]) / 2
    
    # 找最高峰
    peak1_idx = np.argmax(hist)
    peak1_val = centers[peak1_idx]
    
    # 屏蔽 peak1 附近，找第二峰
    mask = np.abs(centers - peak1_val) > 20
    hist_masked = hist * mask
    
    if np.max(hist_masked) > 0:
        peak2_idx = np.argmax(hist_masked)
        peak2_val = centers[peak2_idx]
    else:
        peak2_val = peak1_val + 50
    
    # 确保 dark < light
    dark_b, light_b = sorted([peak1_val, peak2_val])
    
    # 找到接近这两个亮度的像素，计算实际 RGB 均值
    dark_mask = np.abs(brightness - dark_b) < 10
    light_mask = np.abs(brightness - light_b) < 10
    
    if np.sum(dark_mask) > 0:
        dark_color = np.mean(pixels[dark_mask], axis=0)
    else:
        dark_color = np.array([dark_b, dark_b, dark_b])
    
    if np.sum(light_mask) > 0:
        light_color = np.mean(pixels[light_mask], axis=0)
    else:
        light_color = np.array([light_b, light_b, light_b])
    
    return dark_color, light_color


def remove_bg(cell_arr, global_dark, global_light, tolerance=None):
    """
    去除单个精灵单元格的棋盘格背景。
    使用全局检测的背景色 + 自适应容差。
    """
    h, w = cell_arr.shape[:2]
    pixels = cell_arr[:, :, :3].astype(float)
    
    # 自适应容差：基于两种背景色的距离
    color_dist = np.linalg.norm(global_dark - global_light)
    if tolerance is None:
        # 容差 = 两种背景色距离的 30%，最小20，最大50
        tolerance = max(20, min(50, color_dist * 0.35))
    
    # 计算到两种背景色的距离
    dist_dark = np.sqrt(np.sum((pixels - global_dark) ** 2, axis=2))
    dist_light = np.sqrt(np.sum((pixels - global_light) ** 2, axis=2))
    min_dist = np.minimum(dist_dark, dist_light)
    
    # 创建 alpha 通道
    # 距离 < tolerance → 完全透明
    # tolerance < 距离 < tolerance*1.5 → 半透明过渡（抗锯齿）
    # 距离 > tolerance*1.5 → 完全不透明
    alpha = np.zeros((h, w), dtype=np.uint8)
    outer = tolerance * 1.5
    
    full_opaque = min_dist > outer
    semi_trans = (min_dist > tolerance) & (min_dist <= outer)
    
    alpha[full_opaque] = 255
    # 半透明过渡
    if np.any(semi_trans):
        t = (min_dist[semi_trans] - tolerance) / (outer - tolerance)
        alpha[semi_trans] = (t * 255).astype(np.uint8)
    
    # 创建 RGBA
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = cell_arr[:, :, :3]
    rgba[:, :, 3] = alpha
    
    return rgba


def tight_crop(rgba_arr, alpha_threshold=10):
    """找到RGBA图中不透明区域的紧密边界框"""
    alpha = rgba_arr[:, :, 3]
    rows = np.any(alpha > alpha_threshold, axis=1)
    cols = np.any(alpha > alpha_threshold, axis=0)
    
    if not np.any(rows) or not np.any(cols):
        return None
    
    r_min, r_max = np.where(rows)[0][[0, -1]]
    c_min, c_max = np.where(cols)[0][[0, -1]]
    
    return rgba_arr[r_min:r_max+1, c_min:c_max+1]


def remove_text_labels(rgba_arr, min_component_area=50):
    """
    移除可能残留的文字标签。
    文字通常是小的、分散的不透明区域。
    用连通域分析，只保留最大的连通域（精灵本体）。
    """
    alpha = rgba_arr[:, :, 3]
    binary = alpha > 10
    
    # 连通域标记
    labeled, n_features = ndimage.label(binary)
    
    if n_features <= 1:
        return rgba_arr
    
    # 找出每个连通域的面积
    areas = ndimage.sum(binary, labeled, range(1, n_features + 1))
    
    # 只保留最大的连通域
    max_label = np.argmax(areas) + 1
    max_area = areas[max_label - 1]
    
    # 也保留面积 > 最大面积 10% 的其他域（可能是精灵的一部分）
    threshold = max_area * 0.1
    
    keep_mask = np.zeros_like(binary)
    for i in range(1, n_features + 1):
        if areas[i-1] >= threshold:
            keep_mask |= (labeled == i)
    
    result = rgba_arr.copy()
    result[~keep_mask, 3] = 0
    
    return result


def fit_to_frame(rgba_arr, frame_w, frame_h, padding=1):
    """将精灵等比缩放到目标帧，底部对齐"""
    if rgba_arr is None:
        return Image.new('RGBA', (frame_w, frame_h), (0, 0, 0, 0))
    
    sprite = Image.fromarray(rgba_arr, 'RGBA')
    
    usable_w = frame_w - padding * 2
    usable_h = frame_h - padding * 2
    
    scale = min(usable_w / sprite.width, usable_h / sprite.height)
    new_w = max(1, int(sprite.width * scale))
    new_h = max(1, int(sprite.height * scale))
    
    resized = sprite.resize((new_w, new_h), Image.NEAREST)
    
    canvas = Image.new('RGBA', (frame_w, frame_h), (0, 0, 0, 0))
    paste_x = (frame_w - new_w) // 2
    paste_y = frame_h - padding - new_h
    canvas.paste(resized, (paste_x, paste_y), resized)
    
    return canvas


def find_sprite_regions(row_arr, dark_color, light_color, tolerance, min_width=100):
    """
    在一行图像中检测宽度>min_width的精灵区域。
    用于处理含文字标签的图集（如 monsters_sheet_3），
    这些图集无法用简单的等分切割来提取精灵帧。
    
    返回: [(x_start, x_end), ...] 列表
    """
    ch, cw = row_arr.shape[:2]
    rpix = row_arr[:, :, :3].astype(float)
    dist_d = np.sqrt(np.sum((rpix - dark_color) ** 2, axis=2))
    dist_l = np.sqrt(np.sum((rpix - light_color) ** 2, axis=2))
    min_dist = np.minimum(dist_d, dist_l)
    opaque = min_dist > tolerance * 1.5
    x_profile = np.sum(opaque, axis=0)
    
    regions = []
    in_region = False
    region_start = 0
    for x in range(cw):
        if x_profile[x] > 0:
            if not in_region:
                region_start = x
                in_region = True
        else:
            if in_region:
                width = x - region_start
                if width >= min_width:
                    regions.append((region_start, x - 1))
                in_region = False
    if in_region:
        width = cw - region_start
        if width >= min_width:
            regions.append((region_start, cw - 1))
    return regions


def process_sheet_regions(input_file, output_file, rows, target_cols=4,
                          frame_w=48, frame_h=48, min_region_width=100):
    """
    区域检测模式切割。
    适用于含文字标签的图集（精灵帧数不等于列数的情况）。
    
    策略：对每行单独检测精灵区域（宽度>min_region_width），
    取前 target_cols 帧作为动画帧。
    """
    print(f"\n{'='*60}")
    print(f"📋 {os.path.basename(input_file)} [REGION MODE]")
    print(f"   Rows: {rows}, Target cols: {target_cols}, Frame: {frame_w}×{frame_h}")
    
    img = Image.open(input_file).convert('RGB')
    arr = np.array(img)
    src_h, src_w = arr.shape[:2]
    print(f"   Source: {src_w}×{src_h}")
    
    dark_bg, light_bg = detect_bg_global(arr)
    print(f"   BG colors: dark=({dark_bg[0]:.0f},{dark_bg[1]:.0f},{dark_bg[2]:.0f}), "
          f"light=({light_bg[0]:.0f},{light_bg[1]:.0f},{light_bg[2]:.0f})")
    
    color_dist = np.linalg.norm(dark_bg - light_bg)
    tol = max(20, min(50, color_dist * 0.35))
    print(f"   Color distance: {color_dist:.1f}, Tolerance: {tol:.1f}")
    
    cell_h = src_h // rows
    sprites = []
    
    for r in range(rows):
        y1, y2 = r * cell_h, (r + 1) * cell_h
        row = arr[y1:y2]
        
        regions = find_sprite_regions(row, dark_bg, light_bg, tol, min_region_width)
        print(f"   Row {r}: found {len(regions)} sprite regions (need {target_cols})")
        
        for c in range(target_cols):
            if c < len(regions):
                xs, xe = regions[c]
            else:
                # 不足target_cols帧，复制最后一帧
                xs, xe = regions[min(c, len(regions) - 1)]
            
            # 添加5px padding以确保精灵边缘完整
            xs = max(0, xs - 5)
            xe = min(src_w - 1, xe + 5)
            cell = row[:, xs:xe + 1]
            
            # 去背景（不需要remove_text_labels，因为区域检测已精确定位）
            rgba = remove_bg(cell, dark_bg, light_bg, tolerance=tol)
            cropped = tight_crop(rgba)
            frame = fit_to_frame(cropped, frame_w, frame_h)
            sprites.append(frame)
            
            content_size = f"{cropped.shape[1]}×{cropped.shape[0]}" if cropped is not None else "EMPTY"
            print(f"   [{r},{c}] region=[{xs},{xe}] {content_size} → {frame_w}×{frame_h}")
    
    # 组装
    sheet_w = target_cols * frame_w
    sheet_h = rows * frame_h
    sheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))
    
    for idx, sprite in enumerate(sprites):
        r, c = idx // target_cols, idx % target_cols
        sheet.paste(sprite, (c * frame_w, r * frame_h), sprite)
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    sheet.save(output_file, 'PNG', optimize=True)
    size_kb = os.path.getsize(output_file) / 1024
    print(f"   ✅ Output: {sheet_w}×{sheet_h} ({size_kb:.1f} KB)")
    
    return sheet


def process_sheet(input_file, output_file, rows, cols, frame_w=48, frame_h=48,
                  tolerance_override=None, skip_top_px=0):
    """处理一张原始 AI 生成图"""
    print(f"\n{'='*60}")
    print(f"📋 {os.path.basename(input_file)}")
    print(f"   Grid: {rows}r × {cols}c, Frame: {frame_w}×{frame_h}")
    
    img = Image.open(input_file).convert('RGB')
    arr = np.array(img)
    
    # 裁掉顶部标题栏（如有）
    if skip_top_px > 0:
        arr = arr[skip_top_px:]
        print(f"   Skipped top {skip_top_px}px")
    
    src_h, src_w = arr.shape[:2]
    print(f"   Source: {src_w}×{src_h}")
    
    # 全局背景色检测
    dark_bg, light_bg = detect_bg_global(arr)
    print(f"   BG colors: dark=({dark_bg[0]:.0f},{dark_bg[1]:.0f},{dark_bg[2]:.0f}), "
          f"light=({light_bg[0]:.0f},{light_bg[1]:.0f},{light_bg[2]:.0f})")
    
    color_dist = np.linalg.norm(dark_bg - light_bg)
    auto_tol = max(20, min(50, color_dist * 0.35))
    tol = tolerance_override if tolerance_override else auto_tol
    print(f"   Color distance: {color_dist:.1f}, Tolerance: {tol:.1f}")
    
    # 等分网格
    cell_h = src_h // rows
    cell_w = src_w // cols
    print(f"   Cell size: {cell_w}×{cell_h}")
    
    sprites = []
    for r in range(rows):
        for c in range(cols):
            y1, y2 = r * cell_h, (r + 1) * cell_h
            x1, x2 = c * cell_w, (c + 1) * cell_w
            cell = arr[y1:y2, x1:x2]
            
            # 去背景
            rgba = remove_bg(cell, dark_bg, light_bg, tolerance=tol)
            
            # 移除文字标签
            rgba = remove_text_labels(rgba)
            
            # 紧密裁切
            cropped = tight_crop(rgba)
            
            # 缩放到目标帧
            frame = fit_to_frame(cropped, frame_w, frame_h)
            sprites.append(frame)
            
            content_size = f"{cropped.shape[1]}×{cropped.shape[0]}" if cropped is not None else "EMPTY"
            print(f"   [{r},{c}] {content_size} → {frame_w}×{frame_h}")
    
    # 组装
    sheet_w = cols * frame_w
    sheet_h = rows * frame_h
    sheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))
    
    for idx, sprite in enumerate(sprites):
        r, c = idx // cols, idx % cols
        sheet.paste(sprite, (c * frame_w, r * frame_h), sprite)
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    sheet.save(output_file, 'PNG', optimize=True)
    size_kb = os.path.getsize(output_file) / 1024
    print(f"   ✅ Output: {sheet_w}×{sheet_h} ({size_kb:.1f} KB)")
    
    return sheet


def merge_sheets(sheets, output_file, cols, frame_w, frame_h):
    """纵向合并多张 sprite sheet"""
    total_h = sum(s.height for s in sheets)
    merged = Image.new('RGBA', (cols * frame_w, total_h), (0, 0, 0, 0))
    y = 0
    for s in sheets:
        merged.paste(s, (0, y), s)
        y += s.height
    merged.save(output_file, 'PNG', optimize=True)
    size_kb = os.path.getsize(output_file) / 1024
    print(f"   🔗 Merged: {merged.width}×{merged.height} ({size_kb:.1f} KB)")
    return merged


def detect_title_bar_height(arr, max_scan=300):
    """检测标题栏高度（通过找到第一行高方差像素行）"""
    for y in range(min(max_scan, arr.shape[0])):
        row = arr[y].astype(float)
        # 标题栏通常是纯色(黑色)背景+白色文字
        mean_brightness = np.mean(row)
        if mean_brightness > 50:  # 不再是纯黑标题栏
            return max(0, y)
    return 0


def main():
    print("=" * 60)
    print("🎮 鼠鼠修仙2 Sprite Sheet Processor v4")
    print("=" * 60)
    
    # --- 怪物 (3 × 6行×4列 → 18行×4列) ---
    # Sheet 1 & 2: 标准4等分切割（炼气/筑基/金丹/元婴）
    m1 = process_sheet(
        os.path.join(ART_DIR, 'monsters_sheet_1_01.png'),
        os.path.join(OUT_DIR, '_m1.png'),
        rows=6, cols=4, frame_w=48, frame_h=48
    )
    m2 = process_sheet(
        os.path.join(ART_DIR, 'monsters_sheet_2_01.png'),
        os.path.join(OUT_DIR, '_m2.png'),
        rows=6, cols=4, frame_w=48, frame_h=48
    )
    # Sheet 3: 区域检测模式（化神/大乘 — 含文字标签列）
    m3 = process_sheet_regions(
        os.path.join(ART_DIR, 'monsters_sheet_3_01.png'),
        os.path.join(OUT_DIR, '_m3.png'),
        rows=6, target_cols=4, frame_w=48, frame_h=48
    )
    
    print(f"\n{'='*60}")
    print("🔗 Merging 3 monster sheets into monsters.png")
    monsters = merge_sheets([m1, m2, m3], os.path.join(OUT_DIR, 'monsters.png'),
                           cols=4, frame_w=48, frame_h=48)
    
    for f in ['_m1.png', '_m2.png', '_m3.png']:
        p = os.path.join(OUT_DIR, f)
        if os.path.exists(p): os.remove(p)
    
    # --- 灵兽 ---
    process_sheet(
        os.path.join(ART_DIR, 'beasts_sheet_01.png'),
        os.path.join(OUT_DIR, 'beasts.png'),
        rows=6, cols=4, frame_w=48, frame_h=48
    )
    
    # --- 鼠鼠主角 ---
    process_sheet(
        os.path.join(ART_DIR, 'mouse_sheet_01.png'),
        os.path.join(OUT_DIR, 'mouse.png'),
        rows=6, cols=4, frame_w=48, frame_h=48
    )
    
    # --- 坐骑 (有黑色标题栏，需要自动检测并跳过) ---
    mount_img = Image.open(os.path.join(ART_DIR, 'mounts_sheet_01.png')).convert('RGB')
    mount_arr = np.array(mount_img)
    title_h = detect_title_bar_height(mount_arr)
    print(f"\n   Mounts: detected title bar = {title_h}px")
    
    process_sheet(
        os.path.join(ART_DIR, 'mounts_sheet_01.png'),
        os.path.join(OUT_DIR, 'mounts.png'),
        rows=2, cols=4, frame_w=64, frame_h=48,
        skip_top_px=title_h
    )
    
    # --- 汇总 ---
    print("\n" + "=" * 60)
    print("✅ All sprite sheets complete!")
    print("=" * 60)
    print("\n📦 Final assets:")
    for f in sorted(os.listdir(OUT_DIR)):
        if f.endswith('.png') and not f.startswith('_'):
            path = os.path.join(OUT_DIR, f)
            img = Image.open(path)
            size_kb = os.path.getsize(path) / 1024
            print(f"  {f:20s} {img.width:4d}×{img.height:<4d} ({size_kb:6.1f} KB)")


if __name__ == '__main__':
    main()