#!/usr/bin/env python3
"""Record real production OctoScript UI in an isolated hidden card-host.

Only pointer/scroll/text events drive the app. No test harness, state injection,
provider configuration, production bundle edit, or user-window capture is used.
Raw PNG frames and isolated app state remain in a temporary directory. Captions
are placed BELOW the unchanged native image and explicitly name the limitations.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import threading
import time

from native_agent_smoke import Driver, run_host

ROOT = Path(__file__).resolve().parents[1]
PNG_HEADER = b'\x89PNG\r\n\x1a\n'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class Recording:
    def __init__(self, port, scratch, out, fps):
        self.driver = Driver(port)
        self.scratch, self.out, self.fps = scratch, out, fps
        self.frames, self.chapters, self.events, self.errors = [], [], [], []
        self.stop_event = threading.Event()
        self.start_time = time.monotonic()
        self.thread = threading.Thread(target=self._capture, daemon=True)
        self.thread.start()

    def elapsed(self):
        return time.monotonic() - self.start_time

    def _capture(self):
        target = self.start_time
        while not self.stop_event.is_set():
            try:
                before = self.elapsed()
                image = self.driver.request('/g', raw=1)
                when = self.elapsed()
                if not image.startswith(PNG_HEADER):
                    raise ValueError('The native screenshot endpoint did not return PNG')
                filename = self.scratch / f'frame-{len(self.frames):06d}.png'
                filename.write_bytes(image)
                self.frames.append({'time': when, 'requestStarted': before, 'file': filename.name})
            except Exception as error:
                self.errors.append({'time': self.elapsed(), 'error': str(error)})
                if len(self.errors) >= 3:
                    return
            target += 1 / self.fps
            self.stop_event.wait(max(0, target - time.monotonic()))

    def at(self, seconds):
        remaining = seconds - self.elapsed()
        if remaining > 0:
            self.stop_event.wait(remaining)

    def chapter(self, title, detail):
        self.chapters.append({'start': self.elapsed(), 'title': title, 'detail': detail})
        print(f'{self.elapsed():6.1f}s {title}', flush=True)

    def event(self, name, **details):
        self.events.append({'time': self.elapsed(), 'name': name, **details})

    def shot(self, name):
        self.driver.shot(self.out / name)

    def finish(self):
        self.duration = self.elapsed()
        self.stop_event.set()
        self.thread.join(timeout=12)
        if self.thread.is_alive():
            raise RuntimeError('Screenshot capture did not finish')
        if self.errors:
            raise RuntimeError(f'Native frame capture had errors: {self.errors}')
        if not self.frames:
            raise RuntimeError('No native frames captured')
        self.frames[0]['time'] = 0
        return self.duration


def reveal_label(driver, text):
    for _ in range(32):
        matches = [item for item in driver.snap() if item.get('ty') == 'Label'
                   and text in item.get('t', '') and item['r'][1] >= 80
                   and item['r'][1] < 610 and item['r'][3] > 0]
        if matches:
            return
        driver.scroll(160)
    raise AssertionError('Cannot reveal native label: ' + text)


def wrapped(text, width=29):
    return '\n'.join(text[i:i + width] for i in range(0, len(text), width))


def encode(recording, args, video):
    frames, scratch = recording.frames, recording.scratch
    concat = []
    for index, frame in enumerate(frames):
        end = frames[index + 1]['time'] if index + 1 < len(frames) else recording.duration
        duration = max(.001, end - frame['time'])
        concat.extend([f"file '{scratch / frame['file']}'", f'duration {duration:.6f}'])
    concat.append(f"file '{scratch / frames[-1]['file']}'")
    manifest = scratch / 'frames.ffconcat'
    manifest.write_text('\n'.join(concat) + '\n')
    data = (scratch / frames[0]['file']).read_bytes()
    width, height = struct.unpack('>II', data[16:24])
    label = scratch / 'caption-label.txt'
    label.write_text('JOY CITY / OctoScript 原生真实操作 · 合成资料 · 非模型成功演示', encoding='utf8')
    filters = [f'pad={width}:{height + 200}:0:0:color=0xf7f5ef',
               f"drawtext=fontfile='{args.font}':textfile='{label}':fontsize=20:fontcolor=0x65655f:x=26:y={height + 22}"]
    for index, chapter in enumerate(recording.chapters):
        end = recording.chapters[index + 1]['start'] if index + 1 < len(recording.chapters) else recording.duration
        title = scratch / f'title-{index}.txt'
        detail = scratch / f'detail-{index}.txt'
        title.write_text(chapter['title'], encoding='utf8')
        detail.write_text(wrapped(chapter['detail'], 31), encoding='utf8')
        condition = f"between(t,{chapter['start']:.3f},{end:.3f})"
        filters += [f"drawtext=fontfile='{args.font}':textfile='{title}':fontsize=30:fontcolor=0x1d201e:x=26:y={height + 61}:enable='{condition}'",
                    f"drawtext=fontfile='{args.font}':textfile='{detail}':fontsize=24:line_spacing=8:fontcolor=0x4e5b54:x=26:y={height + 108}:enable='{condition}'"]
    filter_file = scratch / 'captions.ffscript'
    filter_file.write_text(','.join(filters), encoding='utf8')
    temporary_video = scratch / 'demo-native.mp4'
    subprocess.run([args.ffmpeg, '-y', '-hide_banner', '-loglevel', 'warning', '-f', 'concat', '-safe', '0', '-i', str(manifest),
                    '-filter_script:v', str(filter_file), '-r', '25', '-c:v', 'libx264', '-preset', 'medium', '-crf', '25',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-t', str(recording.duration), str(temporary_video)], check=True)
    subprocess.run([args.ffmpeg, '-v', 'error', '-i', str(temporary_video), '-f', 'null', '-'], check=True)
    metadata = json.loads(subprocess.check_output([args.ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(temporary_video)], text=True))
    video.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(temporary_video, video)
    return {'width': width, 'nativeHeight': height, 'height': height + 200, 'duration': float(metadata['format']['duration']), 'captureDuration': recording.duration,
            'fps': 25, 'capturedFrames': len(frames), 'requestedCaptureFPS': recording.fps, 'bytes': video.stat().st_size,
            'sha256': sha(video), 'fullDecodePassed': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--card-host', default=os.environ.get('OCTO_CARD_HOST', str(ROOT.parent / 'runtime/target/release/card-host')))
    parser.add_argument('--hub', default=os.environ.get('OCTO_HUB', str(ROOT.parent / 'runtime/target/release/hub')))
    parser.add_argument('--port', type=int, default=18157)
    parser.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', shutil.which('ffmpeg') or 'ffmpeg'))
    parser.add_argument('--ffprobe', default=os.environ.get('FFPROBE', shutil.which('ffprobe') or 'ffprobe'))
    parser.add_argument('--font', default=os.environ.get('DEMO_FONT', '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
    parser.add_argument('--fps', type=float, default=5)
    parser.add_argument('--out', type=Path, default=ROOT / 'qa/native-demo')
    parser.add_argument('--video', type=Path, default=ROOT / 'docs/demo-native.mp4')
    args = parser.parse_args()
    if not 1 <= args.fps <= 12:
        parser.error('--fps must be between 1 and 12')
    for path in [args.card_host, args.hub, args.font]:
        if not Path(path).is_file():
            parser.error('Missing required file: ' + path)
    args.out.mkdir(parents=True, exist_ok=True)
    scratch = Path(tempfile.mkdtemp(prefix='city-native-demo-'))
    bundle, state = scratch / 'bundle', scratch / 'state'
    shutil.copytree(ROOT / 'bundle', bundle)
    statefile = state / 'leilei-city-matchmaker/match.json'
    source_hash = sha(ROOT / 'bundle/main.splash')
    assert sha(bundle / 'main.splash') == source_hash
    report = {'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'version': json.loads((bundle / 'manifest.json').read_text())['version'],
              'kind': 'real-hidden-card-host-frame-recording', 'productionMainSHA256': source_hash,
              'syntheticInputsOnly': True, 'stateInjected': False, 'sourceInjected': False, 'userWindowOperated': False,
              'realModelSuccessVerified': False, 'temporaryDirectory': str(scratch), 'port': args.port, 'passed': False}
    holder = {}

    def saved():
        return json.loads(statefile.read_text())

    def perform(driver):
        recording = Recording(args.port, scratch, args.out, args.fps)
        holder['recording'] = recording
        try:
            recording.chapter('从真实原生应用开始', '独立 card-host 与空白存档；所有操作使用合成资料。')
            assert any('ENFP 狗' in line for line in driver.labels())
            recording.shot('01-welcome.png')
            recording.at(5); driver.click('从想过的日子开始 →')
            recording.chapter('先确认 AI 方向', '方向用于整理期待，不承诺任何城市已有合适职位。')
            assert '你想怎样参与 AI 应用？' in driver.labels()
            recording.at(11); driver.click('○ AI 应用与产品')
            stages = [(18, '○ 经常换一种新玩法', '新鲜感'), (25, '○ 到水边、树下走走', '恢复精力'),
                      (32, '○ 不断遇到新朋友', '关系'), (39, '○ 把自己的想法做出来', '职业期待'),
                      (46, '○ 先试一段，再决定', '不确定性')]
            for index, (at, text, dimension) in enumerate(stages, 1):
                assert f'想过的日子 · {index} / 5' in driver.labels()
                recording.chapter(f'生活场景 {index} / 5：{dimension}', '一次只选一个真实期待；可跳过，不从人格标签猜答案。')
                if index == 2: recording.shot('02-scene-recovery.png')
                recording.at(at); driver.click(text)
            assert saved()[30:35] == ['new', 'nature', 'new', 'build', 'explore']
            recording.event('five_scenes_answered_through_ui')
            recording.chapter('天气偏好与现实条件', '明确底线会保留；预算、住房和通勤仍需现实核验。')
            recording.at(51); driver.click('○ 炎热')
            recording.at(54); driver.click('补充预算、住房与通勤（可选）')
            recording.at(57); driver.click('○ 4000')
            recording.at(59); driver.click('○ 独立整租')
            recording.at(61); driver.click('○ 单程 45 分钟')
            recording.at(64); driver.click('记下这些，核对生活画像 →'); driver.top()
            assert '这是你想过的日子吗？' in driver.labels()
            recording.chapter('先核对画像，再认识城市', '每句话都来自明确选择；点修改，只重答对应场景。')
            recording.shot('03-portrait.png')
            recording.at(70); driver.click('修改：新鲜感')
            recording.at(73); driver.click('○ 熟悉的日常里，偶尔换换'); driver.top()
            assert saved()[30] == 'mix' and saved()[31:35] == ['nature', 'new', 'build', 'explore']
            recording.event('single_portrait_scene_revised_without_erasing_other_answers')
            recording.at(79); driver.click('画像准确，先认识一座城 →'); driver.top()
            assert any('先见一面' in line for line in driver.labels())
            recording.chapter('第一轮：先介绍一座探索候选', '看具体理由，也看代价；证据区间重叠，不宣称唯一最佳。')
            recording.event('first_city', cityId=saved()[25])
            recording.shot('04-first-city.png')
            recording.at(87); driver.scroll(360)
            recording.at(92); driver.click('想调整日常恢复方式'); driver.top()
            recording.chapter('反馈后，只追问一个相关场景', '合成用户重新确认恢复方式，其他四维保持原样。')
            recording.at(98); driver.click('安安静静待一会儿'); driver.top()
            assert saved()[31] == 'quiet' and saved()[30] == 'mix'
            assert any('先去了解 ' in line for line in driver.labels())
            recording.event('feedback_refinement_changes_explicit_preference')
            recording.chapter('第二轮：解释变化，也承认未知', '安静需具体街区证据；确认偏好并不保证一定换城。')
            recording.shot('05-second-city.png')
            recording.at(106)
            previous_joy = saved()[30:35]
            driver.click('换另一位红娘看同一份资料'); driver.top()
            assert saved()[2] == 'cat' and saved()[30:35] == previous_joy
            recording.chapter('换一位介绍人，看同一份资料', '小猫侧重职业、小狗侧重生活；答案、事实与底线保留。')
            recording.event('guide_switch_preserves_answers')
            recording.at(115); reveal_label(driver, '用普通日子验证这座城')
            recording.chapter('把偏好变成三条体验行动', '尝试节奏、关系验证、普通一天；不靠未知资料暗中加分。')
            recording.shot('06-trial-plan.png')
            recording.at(122); driver.click('查看 / 收起公开依据')
            recording.chapter('公开依据与尚未确认的条件', '八城仅 47/136 个 Joy 信号可探索比较，仍有大量未知。')
            driver.scroll(180); recording.shot('07-evidence.png')
            recording.event('sources_opened_in_real_ui')
            recording.at(131); driver.top(); driver.click('我想调整的是…')
            driver.type('我想尽量避开潮湿天气。')
            before_request = statefile.read_bytes()
            driver.click('让 Agent 提出修改'); driver.scroll(120)
            labels = driver.labels()
            assert any('应用 Agent 当前不可用' in line for line in labels), labels
            assert statefile.read_bytes() == before_request
            recording.chapter('真实宿主限制，也如实展示', 'card-host 未提供应用 Agent 服务；失败没有修改档案。')
            recording.event('agent_unavailable_preserves_saved_state')
            recording.shot('08-agent-unavailable.png')
            recording.at(143); driver.top()
            recording.chapter('原生主流程完成，真实模型仍待验收', '这是生产 OctoScript 的真实操作，不是 Web 视频或注入响应。')
            recording.shot('09-final.png')
            recording.at(151)
            report['finalSyntheticProfile'] = {'guide': saved()[2], 'aiRole': saved()[35], 'joy': saved()[30:35],
                                               'rentBudget': saved()[17], 'housingType': saved()[36], 'maxCommuteMinutes': saved()[37]}
            report['uiFlowPassed'] = True
        finally:
            recording.finish()

    try:
        run_host(args, bundle, state, scratch / 'card-host.log', perform)
        assert sha(bundle / 'main.splash') == source_hash, 'Recorded production main changed during recording'
        assert sha(ROOT / 'bundle/main.splash') == source_hash, 'Production main changed during recording; re-record the frozen version'
        recording = holder['recording']
        report['video'] = encode(recording, args, args.video)
        report['productionMainStillCurrent'] = sha(ROOT / 'bundle/main.splash') == source_hash
        assert report['productionMainStillCurrent'], 'Production main changed during encoding; this video is not the final artifact'
        report['productionBundleModifiedByRecording'] = False
        report['passed'] = True
    finally:
        if 'recording' in holder:
            recording = holder['recording']
            report['chapters'], report['events'], report['captureErrors'] = recording.chapters, recording.events, recording.errors
            gaps = [b['time'] - a['time'] for a, b in zip(recording.frames, recording.frames[1:])]
            report['maxFrameGapSeconds'] = max(gaps) if gaps else None
            (scratch / 'capture-index.json').write_text(json.dumps(recording.frames, indent=2))
        (args.out / 'recording-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'video': str(args.video), 'report': str(args.out / 'recording-report.json'), 'passed': report['passed'],
                      'productionMainStillCurrent': report.get('productionMainStillCurrent'), 'temporaryDirectory': str(scratch)}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
