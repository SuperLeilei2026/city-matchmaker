#!/usr/bin/env python3
"""Render the reproducible 16:9 product film from verified app captures.

The optional first ten seconds may later be replaced by a MiniMax-generated
transition clip. Product behavior is always shown with repository screenshots.
"""

from __future__ import annotations

import argparse
import math
import subprocess
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
W, H, FPS, DURATION = 1600, 900, 24, 82.0
NAVY = (5, 10, 28)
NAVY_2 = (12, 23, 48)
CYAN = (32, 210, 229)
MAGENTA = (239, 84, 170)
YELLOW = (252, 204, 69)
IVORY = (247, 244, 236)
MUTED = (151, 168, 199)
WHITE = (245, 248, 255)
FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"


def font(size: int, weight: int = 0) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size=size, index=weight)


def ease(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return 1.0 - (1.0 - value) ** 3


def fade(value: float, span: float = 0.12) -> float:
    return min(1.0, value / span, (1.0 - value) / span)


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    line = ""
    for char in text:
        trial = line + char
        if line and draw.textbbox((0, 0), trial, font=face)[2] > width:
            lines.append(line)
            line = char
        else:
            line = trial
    if line:
        lines.append(line)
    return lines


def draw_text_block(
    image: Image.Image,
    xy: tuple[int, int],
    text: str,
    size: int,
    width: int,
    color=WHITE,
    spacing: int = 12,
    weight: int = 0,
) -> int:
    draw = ImageDraw.Draw(image)
    face = font(size, weight)
    y = xy[1]
    for line in wrap(draw, text, face, width):
        draw.text((xy[0], y), line, font=face, fill=color)
        y += size + spacing
    return y


def gradient(dark: bool = True) -> Image.Image:
    top, bottom = (NAVY, NAVY_2) if dark else ((254, 253, 249), (235, 246, 247))
    arr = np.zeros((H, W, 3), dtype=np.uint8)
    for y in range(H):
        p = y / (H - 1)
        arr[y, :, :] = [int(top[c] * (1 - p) + bottom[c] * p) for c in range(3)]
    return Image.fromarray(arr, "RGB").convert("RGBA")


def add_header(image: Image.Image, section: str, dark: bool = True) -> None:
    draw = ImageDraw.Draw(image)
    fg = WHITE if dark else (22, 35, 49)
    draw.text((72, 48), "毕业第一站", font=font(28), fill=fg)
    draw.text((72, 84), section, font=font(16), fill=CYAN if dark else (20, 139, 151))
    draw.rounded_rectangle((1378, 52, 1528, 92), radius=20, outline=(74, 96, 136), width=2)
    draw.text((1410, 61), "v0.6", font=font(18), fill=fg)


def add_rails(image: Image.Image, phase: float, y: int = 820, dark: bool = True) -> None:
    draw = ImageDraw.Draw(image)
    base = (81, 96, 127) if dark else (178, 190, 192)
    for offset in (0, 16):
        draw.line((0, y + offset, W, y + offset), fill=base, width=3)
    for x in range(-120, W + 120, 130):
        draw.line((x + phase * 130, y - 7, x + 42 + phase * 130, y + 26), fill=base, width=5)
    draw.line((0, y - 12, W, y - 12), fill=CYAN, width=4)
    draw.line((0, y + 36, W, y + 36), fill=MAGENTA, width=4)


def load_asset(path: Path, max_size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    return image


def paste_shadow_card(canvas: Image.Image, asset: Image.Image, xy: tuple[int, int], radius: int = 28) -> None:
    x, y = xy
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x + 14, y + 20, x + asset.width + 14, y + asset.height + 20), radius=radius, fill=(0, 0, 0, 145))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas.alpha_composite(shadow)
    mask = Image.new("L", asset.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, asset.width, asset.height), radius=radius, fill=255)
    canvas.paste(asset, (x, y), mask)


CAT = load_asset(ROOT / "bundle/assets/guide-cat.png", (155, 155))
DOG = load_asset(ROOT / "bundle/assets/guide-dog.png", (155, 155))
SCREENS = {
    "reality": load_asset(ROOT / "bundle/screenshots/02-reality.png", (570, 720)),
    "shortlist": load_asset(ROOT / "bundle/screenshots/03-shortlist.png", (570, 720)),
    "duel": load_asset(ROOT / "bundle/screenshots/04-duel.png", (570, 720)),
    "passport": load_asset(ROOT / "bundle/screenshots/05-passport.png", (570, 720)),
}


def real_agent_capture() -> Image.Image:
    source = Image.open(ROOT / "qa/real-agent-e2e-v0.6/07-real-model-proposal.png").convert("RGBA")
    crop = source.crop((220, 205, 2160, 1510))
    crop.thumbnail((900, 620), Image.Resampling.LANCZOS)
    return crop


AGENT_CAPTURE = real_agent_capture()


def mascot_pair(canvas: Image.Image, x: int, y: int, local: float) -> None:
    bob = int(math.sin(local * math.tau) * 7)
    canvas.alpha_composite(CAT, (x, y + bob))
    canvas.alpha_composite(DOG, (x + 126, y - bob))


def segment_intro(local: float) -> Image.Image:
    image = gradient(False)
    draw = ImageDraw.Draw(image)
    add_header(image, "A DUAL-CITY DECISION LAB", False)
    add_rails(image, local, 760, False)
    ticket_x = int(800 - 310 * ease(local))
    draw.rounded_rectangle((ticket_x - 255, 275, ticket_x + 255, 545), radius=34, fill=IVORY, outline=(20, 45, 62), width=4)
    draw.ellipse((ticket_x - 274, 380, ticket_x - 238, 416), fill=(235, 246, 247))
    draw.ellipse((ticket_x + 238, 380, ticket_x + 274, 416), fill=(235, 246, 247))
    draw.text((ticket_x - 192, 325), "GRADUATION", font=font(26), fill=(72, 92, 110))
    draw.text((ticket_x - 192, 383), "FIRST STOP", font=font(54, 1), fill=(12, 32, 49))
    mascot_pair(image, ticket_x - 144, 523, local)
    draw_text_block(image, (72, 150), "真正难的，\n不是没有选择", 62, 610, (15, 32, 48), 18, 1)
    return image


def segment_choices(local: float) -> Image.Image:
    image = gradient(True)
    draw = ImageDraw.Draw(image)
    add_header(image, "THE PROBLEM", True)
    add_rails(image, local)
    draw_text_block(image, (72, 165), "而是每个选择，\n都像对的", 68, 670, WHITE, 18, 1)
    cities = [("北京", CYAN), ("上海", MAGENTA), ("深圳", CYAN), ("杭州", MAGENTA)]
    for i, (name, color) in enumerate(cities):
        col, row = i % 2, i // 2
        x = 890 + col * 280
        y = 205 + row * 185 + int((1 - ease(local)) * 55)
        draw.rounded_rectangle((x, y, x + 235, y + 128), radius=24, fill=(18, 31, 61), outline=color, width=4)
        draw.text((x + 44, y + 35), name, font=font(38, 1), fill=WHITE)
        draw.text((x + 46, y + 84), "看起来都不错", font=font(18), fill=MUTED)
    draw.rounded_rectangle((72, 570, 708, 688), radius=24, fill=(22, 32, 53), outline=YELLOW, width=3)
    draw.text((108, 598), "一个总分，解释不了你的纠结", font=font(28), fill=YELLOW)
    mascot_pair(image, 1180, 585, local)
    return image


def segment_assumption(local: float) -> Image.Image:
    image = gradient(True)
    draw = ImageDraw.Draw(image)
    add_header(image, "ASSUMPTION AUDIT", True)
    draw_text_block(image, (72, 155), "把倾向，先当成\n待验证假设", 62, 620, WHITE, 18, 1)
    cards = [
        ("“深圳成本低、机会多”", CYAN, 820, 200),
        ("“成都好玩、压力小”", MAGENTA, 905, 430),
    ]
    for text, color, x, y in cards:
        dx = int((1 - ease(local)) * 130)
        draw.rounded_rectangle((x + dx, y, x + 550 + dx, y + 160), radius=28, fill=(17, 30, 58), outline=color, width=4)
        draw.text((x + 34 + dx, y + 36), text, font=font(30), fill=WHITE)
        draw.text((x + 34 + dx, y + 101), "倾向 ≠ 已确认事实", font=font(21), fill=YELLOW)
    draw.text((72, 650), "先问：哪条信息一变，我就会改选？", font=font(29), fill=MUTED)
    add_rails(image, local)
    return image


def segment_ui(local: float, key: str, heading: str, subheading: str, blocks: list[tuple[str, tuple[int, int, int]]]) -> Image.Image:
    image = gradient(True)
    draw = ImageDraw.Draw(image)
    add_header(image, "HOW IT WORKS", True)
    draw_text_block(image, (72, 160), heading, 55, 680, WHITE, 16, 1)
    draw_text_block(image, (72, 305), subheading, 26, 660, MUTED, 12, 0)
    for i, (label, color) in enumerate(blocks):
        y = 455 + i * 62
        width = 170 + len(label) * 18
        draw.rounded_rectangle((72, y, 72 + width, y + 46), radius=23, fill=(*color, 44), outline=color, width=2)
        draw.text((94, y + 10), label, font=font(20), fill=WHITE)
    screen = SCREENS[key]
    x = int(975 + (1 - ease(local)) * 170)
    y = 120
    paste_shadow_card(image, screen, (x, y))
    mascot_pair(image, 700, 648, local)
    add_rails(image, local)
    return image


def segment_evidence(local: float) -> Image.Image:
    image = gradient(True)
    draw = ImageDraw.Draw(image)
    add_header(image, "COUNTEREVIDENCE / UNKNOWN", True)
    draw_text_block(image, (72, 145), "反例和未知，\n不能被总分平均掉", 57, 760, WHITE, 18, 1)
    draw.rounded_rectangle((805, 150, 1490, 385), radius=30, fill=(18, 30, 58), outline=YELLOW, width=3)
    draw.text((845, 184), "同口径小户型套租基准", font=font(23), fill=MUTED)
    draw.text((845, 250), "杭州 2638", font=font(46, 1), fill=MAGENTA)
    draw.text((1170, 250), "深圳 3696", font=font(46, 1), fill=CYAN)
    draw.text((845, 327), "“深圳成本更低”证据不足", font=font(27), fill=YELLOW)
    items = [
        ("具身智能", "不能拿泛 AI 资料代替", CYAN),
        ("潮湿红线", "资料缺失不能算通过", YELLOW),
        ("WLB", "取决于公司、团队与岗位", MAGENTA),
    ]
    for i, (title, copy, color) in enumerate(items):
        y = 455 + i * 100
        draw.rounded_rectangle((805, y, 1490, y + 78), radius=20, fill=(13, 24, 48), outline=color, width=2)
        draw.text((838, y + 18), title, font=font(24, 1), fill=color)
        draw.text((1045, y + 18), copy, font=font(23), fill=WHITE)
    mascot_pair(image, 180, 585, local)
    add_rails(image, local)
    return image


def segment_agent(local: float) -> Image.Image:
    image = gradient(True)
    draw = ImageDraw.Draw(image)
    add_header(image, "DECISIVE QUESTION AGENT", True)
    draw_text_block(image, (72, 150), "Agent 只找一个\n会改变决定的问题", 54, 650, WHITE, 18, 1)
    draw.text((72, 338), "不投票 · 不改排序 · 不替你选城", font=font(25), fill=MUTED)
    draw.rounded_rectangle((72, 418, 635, 515), radius=24, fill=(57, 48, 12), outline=YELLOW, width=3)
    draw.text((104, 445), "确认后，任务才会保存", font=font(28), fill=YELLOW)
    cap = AGENT_CAPTURE.copy()
    x = int(640 + (1 - ease(local)) * 170)
    y = 130
    paste_shadow_card(image, cap, (x, y), 24)
    mascot_pair(image, 350, 604, local)
    add_rails(image, local)
    return image


def segment_passport(local: float) -> Image.Image:
    image = gradient(True)
    draw = ImageDraw.Draw(image)
    add_header(image, "DUAL-CITY PASSPORT", True)
    draw_text_block(image, (72, 145), "带走的不是答案，\n是下一步", 60, 700, WHITE, 18, 1)
    draw.text((72, 340), "先验证深圳 · 杭州仍是备选", font=font(30), fill=CYAN)
    tasks = ["查真实岗位", "核住房与通勤", "试一次普通日常"]
    for i, task in enumerate(tasks):
        y = 430 + i * 78
        draw.rounded_rectangle((72, y, 610, y + 55), radius=27, fill=(17, 31, 58), outline=(67, 90, 132), width=2)
        draw.text((100, y + 13), f"0{i + 1}  {task}", font=font(22), fill=WHITE)
    screen = SCREENS["passport"]
    x = int(990 + (1 - ease(local)) * 170)
    paste_shadow_card(image, screen, (x, 112))
    mascot_pair(image, 660, 610, local)
    draw.text((72, 727), "毕业第一站 · 先验证，再出发", font=font(32, 1), fill=YELLOW)
    add_rails(image, local)
    return image


SEGMENTS = [
    (0.0, 5.0, segment_intro),
    (5.0, 13.0, segment_choices),
    (13.0, 22.0, segment_assumption),
    (22.0, 32.0, lambda p: segment_ui(p, "reality", "先装上现实", "行业、兴趣、预算和气候红线，决定比较什么。MBTI 与星座只留在票角。", [("具身智能", CYAN), ("散步 · 阅读", MAGENTA), ("月租 4000", CYAN), ("潮湿红线", YELLOW)])),
    (32.0, 41.0, lambda p: segment_ui(p, "shortlist", "最后两座，\n由你亲手留下", "系统只缩小范围。你的原始倾向会被封存为待验证判断，不进入排序。", [("深圳", CYAN), ("杭州", MAGENTA)])),
    (41.0, 54.0, lambda p: segment_ui(p, "duel", "工作 · 日常 · 代价", "三幕同时展示生活草稿、可核验线索和未知。看不出来，也是一条有效答案。", [("发展线", CYAN), ("日常线", MAGENTA), ("落地线", YELLOW)])),
    (54.0, 64.0, segment_evidence),
    (64.0, 73.0, segment_agent),
    (73.0, 82.0, segment_passport),
]


def frame_at(t: float) -> Image.Image:
    for index, (start, end, renderer) in enumerate(SEGMENTS):
        if start <= t < end or index == len(SEGMENTS) - 1:
            local = (t - start) / (end - start)
            image = renderer(local)
            transition = 0.38
            if index + 1 < len(SEGMENTS) and end - t < transition:
                nxt = SEGMENTS[index + 1][2](0.0)
                image = Image.blend(image, nxt, (transition - (end - t)) / transition)
            overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
            od = ImageDraw.Draw(overlay)
            od.rounded_rectangle((72, 795, 530, 799), radius=2, fill=(76, 93, 126))
            progress = min(1.0, t / DURATION)
            od.rounded_rectangle((72, 795, 72 + int(458 * progress), 799), radius=2, fill=YELLOW)
            od.text((1318, 790), "不预测 offer / WLB / 幸福", font=font(15), fill=MUTED)
            return Image.alpha_composite(image, overlay).convert("RGB")
    raise AssertionError(t)


def render_video(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", str(path),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    total = int(DURATION * FPS)
    for n in range(total):
        process.stdin.write(frame_at(n / FPS).tobytes())
        if n % (FPS * 10) == 0:
            print(f"rendered {n / FPS:.0f}s / {DURATION:.0f}s", flush=True)
    process.stdin.close()
    if process.wait() != 0:
        raise SystemExit("ffmpeg video encoder failed")


def render_music(path: Path) -> None:
    sample_rate = 44100
    count = int(DURATION * sample_rate)
    t = np.arange(count, dtype=np.float64) / sample_rate
    music = np.zeros(count, dtype=np.float64)
    notes = [110.0, 130.81, 164.81, 196.0]
    for bar, start in enumerate(np.arange(0, DURATION, 4.0)):
        freq = notes[bar % len(notes)]
        mask = (t >= start) & (t < start + 4.0)
        local = t[mask] - start
        music[mask] += 0.18 * np.sin(2 * np.pi * freq * local) * np.exp(-local / 5.5)
        music[mask] += 0.07 * np.sin(2 * np.pi * freq * 2 * local) * np.exp(-local / 2.8)
    for beat in np.arange(0, DURATION, 0.5):
        mask = (t >= beat) & (t < beat + 0.12)
        local = t[mask] - beat
        music[mask] += 0.05 * np.sin(2 * np.pi * (660 if int(beat * 2) % 4 else 880) * local) * np.exp(-local * 28)
    for mark in [5, 13, 22, 32, 41, 54, 64, 73]:
        mask = (t >= mark) & (t < mark + 0.55)
        local = t[mask] - mark
        music[mask] += 0.14 * np.sin(2 * np.pi * (520 + 420 * local) * local) * np.exp(-local * 6)
    music *= np.minimum(1.0, t / 2.0) * np.minimum(1.0, (DURATION - t) / 3.0)
    stereo = np.stack([music, music * 0.94], axis=1)
    pcm = np.clip(stereo * 32767, -32768, 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(sample_rate)
        out.writeframes(pcm.tobytes())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, default=ROOT / "video/build/visuals.mp4")
    parser.add_argument("--music", type=Path, default=ROOT / "video/build/music.wav")
    args = parser.parse_args()
    render_music(args.music)
    render_video(args.video)
    print(args.video)
    print(args.music)


if __name__ == "__main__":
    main()
