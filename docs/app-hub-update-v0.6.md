# App Hub 更新回执：`leilei-city-matchmaker 0.6.0`

2026-10-14 按 App Hub“首次进入公开目录前在同一 Issue 更新版本”的规则，使用现有 [Issue #177](https://github.com/OctoSense-org/OctoSense-App-Hub/issues/177) 提交 v0.6.0。下面保留更新后的 Issue 正文与版本评论，作为公开操作的审计副本。

## Issue 标题

```text
Submit leilei-city-matchmaker 0.6.0
```

## Issue 正文

### Release status

GitHub release ready for review

### App id

leilei-city-matchmaker

### Version

0.6.0

### Repository URL

https://github.com/SuperLeilei2026/city-matchmaker

### Requested capabilities and app behavior

“毕业第一站”把毕业生已有的2–4座现实候选，或应用初筛出的候选，收束为由用户亲手留下的两座城。用户先写下原始倾向，再依次比较发展线、日常线和落地线。每幕分开显示可核验事实、编辑判断、反例与未知；三次选择不会自动产生赢家。最终用户明确选择“先验证”城市，另一座保留为备选，并带走三项现实核验任务。

系统 Agent 是受限的“决胜提问官”。只有用户主动请求时，它才读取本局两城、三幕、原始担忧和资料缺口，并返回一行七段 `DQ1`：一个最可能改变决定的问题和一项核验任务。应用验证资料版本、两城 ID、维度、长度、换行和当前对局；Agent 不能修改候选顺序、投票或首选城市。任务只有在用户确认后才保存。

- `storage`：在应用自有本机存储中保存候选、现实条件、对局、先验证城市与已确认任务。
- `octos.session.open`：用户主动请求决胜提问时打开系统 Agent 会话。
- `octos.turn.start`：只在用户主动请求后发送当前决策上下文。
- `octos.turn.interrupt`：取消仍在进行的 Agent 请求。

`network.hosts` 为空。城市、租金和来源资料随 bundle 提供；模型凭据由 OctoSense 宿主管理。参考宿主没有模型服务时，本地规则会生成问题，双城流程仍可完成。

### Tag

v0.6.0

### Full commit SHA

4b7f62789c7ddd842dd6bf5261883f1a6de69139

### Bundle path

bundle/

### GitHub workflow run URL

https://github.com/SuperLeilei2026/city-matchmaker/actions/runs/38447560800

`prepare` and `publish` completed successfully.

### Release and pack URL

https://github.com/SuperLeilei2026/city-matchmaker/releases/tag/v0.6.0

Release assets include `app.bundle.pack.json`, `octosense-app-manifest.json`, `release-receipt.json`, and the 82-second 1080p product film `graduation-first-station-v0.6.mp4`.

### Release pack SHA256

9b24fe311f683ef10aff57bd219cb23eb5369461e21b697dbd4136cddfa85d00

The independently downloaded pack SHA-256 matches `release-receipt.json` and the GitHub Release asset digest.

### Bundle BLAKE3 digest

eca6abb436954b5855fddab233f2806cbdcfa8fc719f38a3ca187ff710b5f04c

This is the digest recalculated and attested by the workflow-built Hub. The editable development manifest retains its earlier local development stamp; the value above is the authoritative v0.6 submission identity.

### Privacy policy URL

https://github.com/SuperLeilei2026/city-matchmaker/blob/v0.6.0/docs/privacy.md

### Support contact

https://github.com/SuperLeilei2026/city-matchmaker/issues

### Platforms tested

`macos` on Apple silicon is the only platform claimed in `bundle/listing.json`.

- The final editable bundle completed 12 native dual-city flow checks in the real hidden `card-host`.
- Agent behavior completed 2 production fallback checks and 38 injected-response protocol checks; injection occurred only in temporary test copies and was not presented as a model call.
- The same final source candidate was installed from a locally signed catalog into the full OctoSense Shell. One real MiniMax-M3 `DQ1` turn completed first-use consent, proposal-only state, explicit task confirmation, explicit city choice and restart recovery. Evidence: https://github.com/SuperLeilei2026/city-matchmaker/tree/v0.6.0/qa/real-agent-e2e-v0.6
- The downloaded GitHub pack was decoded with strict Base64 and path checks: its 25-file set exactly matched tagged `bundle/`, and every non-manifest byte matched the tag. The sealed manifest contains the GitHub attestation.

Android, HarmonyOS, iOS, Windows and Linux are not claimed as tested.

### App Hub revision the gate ran on

655114c4943cd2490daaefa2173e7b5aaa20669f

This is the immutable Hub revision in the existing continuity-preserving `.github/workflows/publish-app.yml`.

### Gate and publisher verification output

```json
{"app_id":"leilei-city-matchmaker","bundle_blake3":"eca6abb436954b5855fddab233f2806cbdcfa8fc719f38a3ca187ff710b5f04c","schema":1,"sha256":"ecb4959757b78908534967b0ec81e182b700f5f089705467c85ae78ec651d763","status":"awaiting-github-attestation","subject":"octosense-app-manifest.json","version":"0.6.0"}
{"app_id":"leilei-city-matchmaker","schema":1,"status":"publisher-proof-verified","version":"0.6.0"}
{"app_id":"leilei-city-matchmaker","digest":"eca6abb436954b5855fddab233f2806cbdcfa8fc719f38a3ca187ff710b5f04c","findings":[],"passed":true,"resources":[],"schema":1,"stage":"structural","version":"0.6.0"}
{"app_id":"leilei-city-matchmaker","bundle_blake3":"eca6abb436954b5855fddab233f2806cbdcfa8fc719f38a3ca187ff710b5f04c","pack_sha256":"9b24fe311f683ef10aff57bd219cb23eb5369461e21b697dbd4136cddfa85d00","schema":1,"status":"verified-pack-not-published","version":"0.6.0"}
```

Downloaded release-asset SHA-256 values:

```text
9b24fe311f683ef10aff57bd219cb23eb5369461e21b697dbd4136cddfa85d00  app.bundle.pack.json
ecb4959757b78908534967b0ec81e182b700f5f089705467c85ae78ec651d763  octosense-app-manifest.json
cb33d1b5fb40c207a2b6d3539e6bb262ee634fa35e5613a7f9756b854f7797d3  release-receipt.json
ac3cbee45da7bf2ad0843452257979480b967dd68ffe3031a3191598c4ca6558  graduation-first-station-v0.6.mp4
```

`release-receipt.json` records commit `4b7f62789c7ddd842dd6bf5261883f1a6de69139`, tag `v0.6.0`, run `38447560800`, and explicitly says Hub admission is not granted by the release workflow.

### Scan answers

1. **Name and behavior:** The name and listing match the implemented dual-city decision flow. The app does not display a public total score or predict happiness, admission, salary or WLB.
2. **Category and platform:** `lifestyle`; only Apple silicon macOS is claimed and all five listing screenshots are real native captures.
3. **Capabilities:** `storage` persists app-owned state. The three `octos.*` capabilities support the optional, user-triggered decision question and cancellation. No direct network host is granted and no model key is bundled.
4. **Deceptive interface:** None. The industrial station, cyan/magenta rails, signal yellow and passport are original. The app does not imitate login, payment, permission or another product.
5. **Assistant instructions:** `request_decision_agent` deliberately asks for constrained `DQ1` data. Output is treated as untrusted data, checked against the current game, previewed, and saved only after confirmation. It is never executed as code.
6. **Abuse or private-person inference:** None. MBTI, zodiac, school, age and favorites do not score cities. Missing data remains unknown and is not interpreted as a redline pass.
7. **Route:** `human-review`. The formal v0.6 scope passed 69 Node tests, 12 native flow checks, 2 production fallback checks and 38 temporary response-injection checks, plus one full-Shell MiniMax-M3 turn. Kimi, failover, target-user satisfaction, recommendation accuracy and mobile platforms remain unverified.

### Screenshots

All profiles shown are fictional or synthetic. Native captures at the immutable release commit:

- https://raw.githubusercontent.com/SuperLeilei2026/city-matchmaker/4b7f62789c7ddd842dd6bf5261883f1a6de69139/bundle/screenshots/01-entry.png
- https://raw.githubusercontent.com/SuperLeilei2026/city-matchmaker/4b7f62789c7ddd842dd6bf5261883f1a6de69139/bundle/screenshots/02-reality.png
- https://raw.githubusercontent.com/SuperLeilei2026/city-matchmaker/4b7f62789c7ddd842dd6bf5261883f1a6de69139/bundle/screenshots/03-shortlist.png
- https://raw.githubusercontent.com/SuperLeilei2026/city-matchmaker/4b7f62789c7ddd842dd6bf5261883f1a6de69139/bundle/screenshots/04-duel.png
- https://raw.githubusercontent.com/SuperLeilei2026/city-matchmaker/4b7f62789c7ddd842dd6bf5261883f1a6de69139/bundle/screenshots/05-passport.png

Product film: https://github.com/SuperLeilei2026/city-matchmaker/releases/download/v0.6.0/graduation-first-station-v0.6.mp4

### What is not verified

- App Hub maintainer approval and public catalog publication are pending.
- Kimi, provider failover, Android, HarmonyOS, iOS, Windows and Linux are not verified.
- The full-Shell run used the same final source candidate from a local signed catalog; it was not an installation of the subsequently downloaded GitHub pack.
- The two named target users have not yet completed the repository's test script.
- City-level evidence cannot establish personal offer, salary, WLB, housing or happiness outcomes.

### Optional legacy authentication

Not applicable. This release uses GitHub provenance and `publisher-github-v1`; no publisher private key is used.

### Confirmations

- [x] The tagged bundle and this issue contain no passwords, private keys, API keys or tokens.
- [x] The pushed `v0.6.0` tag will not be moved, deleted or recreated.
- [x] Pending checks are explicit; GitHub release success is not presented as App Hub approval.

## 同 Issue 版本评论

```markdown
## v0.6.0 release update

Per the pre-first-publication update rule, this release replaces the pending v0.4 review target on the same issue.

v0.6 changes the product from a city browser into a dual-city decision lab: the person records an initial assumption, chooses the final two cities, compares career/daily/landing evidence in three acts, and explicitly chooses a first-to-verify city while keeping the other as backup. A constrained `DQ1` Agent can propose only one decision-changing question and one verification task; it cannot rank or choose a city, and the task is saved only after confirmation.

- Tag: `v0.6.0`
- Full commit: `4b7f62789c7ddd842dd6bf5261883f1a6de69139`
- Workflow: https://github.com/SuperLeilei2026/city-matchmaker/actions/runs/38447560800 (`prepare` and `publish`: success)
- Release: https://github.com/SuperLeilei2026/city-matchmaker/releases/tag/v0.6.0
- Pack SHA-256: `9b24fe311f683ef10aff57bd219cb23eb5369461e21b697dbd4136cddfa85d00`
- Attested bundle BLAKE3: `eca6abb436954b5855fddab233f2806cbdcfa8fc719f38a3ca187ff710b5f04c`
- Product film: https://github.com/SuperLeilei2026/city-matchmaker/releases/download/v0.6.0/graduation-first-station-v0.6.mp4
- Full-Shell evidence: https://github.com/SuperLeilei2026/city-matchmaker/tree/v0.6.0/qa/real-agent-e2e-v0.6

The downloaded pack hash matches the release receipt and GitHub asset digest. Its 25-file set matches tagged `bundle/`; all non-manifest bytes match exactly, and the sealed manifest contains the GitHub attestation.

Still pending: App Hub admission/public catalog publication, Kimi and provider failover, mobile/other desktop platforms, and real target-user testing. The app does not claim recommendation accuracy or predict offer, WLB, housing or happiness outcomes.
```
