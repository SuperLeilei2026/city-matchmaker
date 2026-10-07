#!/usr/bin/env python3
"""Record the real production v0.4 OctoScript discovery flow.

Only pointer/scroll/text events drive the app. No test harness, state injection,
provider configuration, production bundle edit, or user-window capture is used.
Raw PNG frames and isolated app state remain in a temporary directory. Chinese
chapter captions are placed below the unchanged native image and name limits.
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
        self.frames, self.chapters, self.events, self.ui_operations, self.errors = [], [], [], [], []
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

    def click(self, text):
        self.driver.click(text)
        self.ui_operations.append({'time': self.elapsed(), 'kind': 'pointerClick', 'target': text})

    def scroll(self, dy):
        self.driver.scroll(dy)
        self.ui_operations.append({'time': self.elapsed(), 'kind': 'scroll', 'deltaY': dy})

    def top(self):
        self.driver.top()
        self.ui_operations.append({'time': self.elapsed(), 'kind': 'scrollToTop'})

    def type(self, value):
        self.driver.type(value)
        self.ui_operations.append({'time': self.elapsed(), 'kind': 'textInput', 'characterCount': len(value)})

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
    label.write_text('城市红娘 v0.4｜OctoScript 原生真实操作｜合成输入｜未冒充模型成功', encoding='utf8')
    caption_height = 210
    filters = [f'pad={width}:{height + caption_height}:0:0:color=0xf7f5ef',
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
    decode = subprocess.run([args.ffmpeg, '-v', 'error', '-i', str(temporary_video), '-f', 'null', '-'], capture_output=True, text=True)
    if decode.returncode != 0:
        raise RuntimeError('Full video decode failed: ' + decode.stderr)
    metadata = json.loads(subprocess.check_output([
        args.ffprobe, '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'format=duration,size,format_name:stream=codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames',
        '-of', 'json', str(temporary_video)
    ], text=True))
    video.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(temporary_video, video)
    stream = metadata['streams'][0]
    duration = float(metadata['format']['duration'])
    if not 120 <= duration <= 180:
        raise AssertionError(f'Expected a 2–3 minute demo, got {duration:.3f} seconds')
    return {'width': width, 'nativeHeight': height, 'height': height + caption_height, 'duration': duration, 'captureDuration': recording.duration,
            'fps': 25, 'capturedFrames': len(frames), 'requestedCaptureFPS': recording.fps, 'bytes': video.stat().st_size,
            'sha256': sha(video), 'codec': stream['codec_name'], 'pixelFormat': stream['pix_fmt'],
            'encodedFrameRate': stream['avg_frame_rate'], 'encodedFrames': int(stream['nb_frames']),
            'fullDecodePassed': True, 'fullDecodeErrorOutput': decode.stderr}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--card-host', default=os.environ.get('OCTO_CARD_HOST', str(ROOT.parent / 'runtime/target/release/card-host')))
    parser.add_argument('--hub', default=os.environ.get('OCTO_HUB', str(ROOT.parent / 'runtime/target/release/hub')))
    parser.add_argument('--port', type=int, default=18157)
    parser.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', shutil.which('ffmpeg') or 'ffmpeg'))
    parser.add_argument('--ffprobe', default=os.environ.get('FFPROBE', shutil.which('ffprobe') or 'ffprobe'))
    parser.add_argument('--font', default=os.environ.get('DEMO_FONT', '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
    parser.add_argument('--fps', type=float, default=5)
    parser.add_argument('--out', type=Path, default=ROOT / 'qa/native-demo-v0.4')
    parser.add_argument('--video', type=Path, default=ROOT / 'docs/demo-native-v0.4.mp4')
    args = parser.parse_args()
    if not 1 <= args.fps <= 12:
        parser.error('--fps must be between 1 and 12')
    for path in [args.card_host, args.hub, args.font]:
        if not Path(path).is_file():
            parser.error('Missing required file: ' + path)
    args.out.mkdir(parents=True, exist_ok=True)
    scratch = Path(tempfile.mkdtemp(prefix='city-native-demo-v04-'))
    bundle, state = scratch / 'bundle', scratch / 'state'
    shutil.copytree(ROOT / 'bundle', bundle)
    statefile = state / 'leilei-city-matchmaker/match.json'
    source_hash = sha(ROOT / 'bundle/main.splash')
    assert sha(bundle / 'main.splash') == source_hash
    manifest = json.loads((bundle / 'manifest.json').read_text())
    assert manifest['version'] == '0.4.0', manifest['version']
    assert not state.exists(), 'The isolated state directory must be empty before card-host starts'
    report = {'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'version': manifest['version'],
              'kind': 'real-hidden-card-host-frame-recording', 'productionMainSHA256': source_hash,
              'syntheticInputsOnly': True, 'stateInjected': False, 'sourceInjected': False, 'userWindowOperated': False,
              'emptyIsolatedStateAtLaunch': True, 'inputMechanism': 'real pointer, text, and scroll events through the card-host remote UI',
              'productionBundleCopiedWithoutSourceChanges': True, 'realModelSuccessVerified': False,
              'agentUnavailableShownAsFailure': False,
              'temporaryWorkspace': 'isolated system temporary directory; absolute path omitted from the public report',
              'port': args.port,
              'gitCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'runtime': {'cardHost': Path(args.card_host).name, 'cardHostSHA256': sha(Path(args.card_host)),
                          'hub': Path(args.hub).name, 'hubSHA256': sha(Path(args.hub))},
              'passed': False}
    holder = {}

    city_data = json.loads((ROOT / 'data/cities.json').read_text())
    city_names = {city['id']: city['name'] for city in city_data}
    config = json.loads((ROOT / 'data/joy-config.json').read_text())

    def saved():
        return json.loads(statefile.read_text())

    def perform(driver):
        recording = Recording(args.port, scratch, args.out, args.fps)
        holder['recording'] = recording
        try:
            recording.chapter('打开就看城市', '独立 card-host、空白存档；先看一种日常，不先填问卷。')
            labels = driver.labels()
            assert any('先看看你喜欢的日常' in line for line in labels), labels
            opening_name = next(name for name in city_names.values() if name in labels)
            assert not statefile.exists(), 'Opening the app must not require an injected save file'
            recording.event('opened_on_city_card_without_questionnaire', cityName=opening_name)
            recording.shot('01-opening-city.png')

            recording.at(8); recording.click('下一座 →')
            first_candidate = saved()[39]
            assert saved()[24] == [] and saved()[30:35] == [''] * 5 and saved()[41]
            recording.chapter('“下一座”只是继续浏览', '路过不会拒绝城市，也不会暗中补写五维偏好。')
            recording.event('next_preserved_blank_profile', cityId=first_candidate)

            recording.at(17); recording.click('留着看看 ♡')
            first_saved = saved()
            assert first_saved[1] == 20 and first_saved[40] == [first_candidate]
            assert first_saved[24] == [] and first_saved[30:35] == [''] * 5
            recording.chapter('留下第一座', '收藏只表示值得继续了解；应用自动带到下一张城市卡。')
            recording.event('first_city_saved', cityId=first_candidate, cityName=city_names[first_candidate])
            recording.shot('02-first-saved-next-card.png')

            recording.at(26); recording.click('已留 1 座')
            assert saved()[1] == 21 and saved()[40] == [first_candidate]
            recording.chapter('先看一眼已经留下的城市', '还差一座时，不硬给结论；可以随时继续逛。')
            recording.shot('03-one-city-shortlist.png')

            recording.at(34); recording.click('继续逛 →')
            assert saved()[1] == 20 and saved()[40] == [first_candidate]
            recording.chapter('继续浏览', '回到刚才那张卡，收藏、路过记录和空白偏好都保留。')
            recording.event('continued_browsing_after_first_save')

            recording.at(43); recording.click('下一座 →')
            second_candidate = saved()[39]
            assert second_candidate != first_candidate
            recording.chapter('再看一种日常', '先比较吸引力与代价；“下一座”仍不等于拒绝。')

            recording.at(51); recording.click('留着看看 ♡')
            comparison = saved()
            assert comparison[1] == 21 and comparison[40] == [first_candidate, second_candidate]
            assert comparison[30:35] == [''] * 5
            recording.chapter('留下第二座，直接比较', '先并排看自己留下的两种生活，不替你宣布唯一赢家。')
            recording.event('second_city_saved_and_comparison_opened', cityId=second_candidate,
                            cityName=city_names[second_candidate], pair=comparison[40])
            recording.shot('04-two-city-comparison.png')

            recording.at(64); recording.click('我还拿不准')
            question_state = saved()
            dimension = question_state[45]
            assert 0 <= dimension < 5
            dimension_config = config['dimensions'][dimension]
            answer = dimension_config['options'][0]
            recording.chapter('拿不准时，才补一问', '问题来自两城已有的可比较差异；这一题可以跳过。')
            recording.event('optional_comparison_question_opened', dimensionId=dimension_config['id'], question=dimension_config['question'])
            recording.shot('05-optional-question.png')

            recording.at(73); recording.click(answer['label'])
            answered = saved()
            assert answered[1] == 21 and answered[40] == [first_candidate, second_candidate]
            assert answered[30 + dimension] == answer['id'] and answered[45] == -2 - dimension
            recording.chapter('回答只补一项明确偏好', '两座收藏保持原样；界面说明现有证据能否拉开差异。')
            recording.event('optional_question_answered', dimensionId=dimension_config['id'], answerId=answer['id'])
            recording.scroll(260)
            assert any('你选了' in line for line in driver.labels()), driver.labels()
            recording.shot('06-comparison-response.png')

            first_name = city_names[first_candidate]
            recording.at(83); recording.top(); recording.click('了解' + first_name)
            assert saved()[1] == 7 and saved()[43] == first_candidate and saved()[44] == 21
            recording.chapter('按需打开城市细节', '详情仍同时呈现吸引力、代价和没有证据的条件。')
            recording.event('opened_detail_for_saved_city', cityId=first_candidate)

            recording.at(91); recording.click('查看 / 收起公开依据')
            recording.scroll(140)
            recording.chapter('来源与未知项一起展示', '公开来源支持的是线索，不是喜欢概率、岗位承诺或通勤证明。')
            recording.event('sources_opened_in_real_ui', cityId=first_candidate)
            recording.shot('07-sources-and-unknowns.png')

            recording.at(103); recording.click('用一句话请 Agent 帮忙')
            recording.at(107); recording.click('我想调整的是…')
            recording.type('请帮我避开潮湿天气。')
            before_request = statefile.read_bytes()
            recording.at(112); recording.click('让 Agent 提出修改')
            recording.scroll(120)
            labels = driver.labels()
            assert any('应用 Agent 当前不可用' in line for line in labels), labels
            assert statefile.read_bytes() == before_request
            recording.chapter('Agent 不可用，就明确失败', 'card-host 没有模型服务；没有伪造回复，也没有修改存档。')
            recording.event('agent_unavailable_preserves_saved_state', cityId=first_candidate)
            report['agentUnavailableShownAsFailure'] = True
            recording.shot('08-agent-unavailable.png')

            recording.at(125); recording.click('← 回到刚才')
            assert saved()[1] == 21 and saved()[40] == [first_candidate, second_candidate]
            recording.at(127); recording.click('资料')
            profile = saved()
            assert profile[1] == 8 and sum(bool(value) for value in profile[30:35]) == 1
            recording.chapter('资料是按需入口', '只记录刚才亲自回答的一项；其余继续显示“未确认，不代你猜”。')
            recording.event('profile_opened_on_demand', confirmedDimension=dimension_config['id'])
            recording.shot('09-profile-on-demand.png')

            recording.at(140); recording.scroll(260)
            recording.chapter('收藏没有变成人格推断', '五维仍有四项留白；资料、收藏与城市事实各自有清楚边界。')
            assert sum(bool(value) for value in saved()[30:35]) == 1

            recording.at(149); recording.click('回到刚才')
            recording.top()
            assert saved()[1] == 21 and saved()[40] == [first_candidate, second_candidate]
            recording.chapter('v0.4 原生主线完成', '真实 UI 完成浏览、收藏、比较、追问、来源、资料和失败处理。')
            recording.shot('10-final-comparison.png')
            recording.at(158)
            final_state = saved()
            report['finalSyntheticState'] = {'screen': final_state[1], 'guide': final_state[2], 'joy': final_state[30:35],
                                             'likedCityIds': final_state[40], 'browsedCityIds': final_state[41],
                                             'comparisonDimensionState': final_state[45]}
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
            report['chapters'], report['events'] = recording.chapters, recording.events
            report['uiOperations'], report['captureErrors'] = recording.ui_operations, recording.errors
            report['uiOperationCounts'] = {
                kind: sum(1 for operation in recording.ui_operations if operation['kind'] == kind)
                for kind in sorted({operation['kind'] for operation in recording.ui_operations})
            }
            gaps = [b['time'] - a['time'] for a, b in zip(recording.frames, recording.frames[1:])]
            report['maxFrameGapSeconds'] = max(gaps) if gaps else None
            (scratch / 'capture-index.json').write_text(json.dumps(recording.frames, indent=2))
        (args.out / 'recording-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'video': str(args.video), 'report': str(args.out / 'recording-report.json'), 'passed': report['passed'],
                      'productionMainStillCurrent': report.get('productionMainStillCurrent'), 'temporaryDirectory': str(scratch)}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
