# 原生宿主版本与真实 Agent 验收准备

核验日期：2026-10-03。平台：Apple silicon macOS，`aarch64-apple-darwin`。本页记录实际使用的工具；不把 card-host 的界面测试、响应注入或本地签名目录当作真实模型成功。

## 当前状态

- 独立 OctoSense Shell 已启动，AI providers 页面可用；新状态目录没有继承故事排练场的 mock provider。
- 城市红娘 `0.2.0` 已复制到专用测试目录并以临时测试发布者签名。`hub check` 无警告通过，本地 catalog `sequence 1`、`1 entries` 验签通过。
- 本地包摘要为 `d06e0ebf60adca1b8cf812c32726e1c0445738d8d9f31f453e0d3f163d579a0c`。测试签名没有写回仓库中的 `bundle/`。
- **真实模型调用尚未通过。** 截至本次检查，独立 profile 尚未保存。已打开宿主密钥输入向导，等待用户在本机完成配置；没有读取或记录用户密钥。
- **本地 catalog 安装待继续。** 镜像已准备，但没有在用户填写密钥时重启 Shell。此处的本地测试发布不是公开 App Hub 审核。

后续真实调用必须记录 provider/model、应用版本、实际输入、应用收到的有效提案、用户采用后的状态变化；只有连接测试成功还不算应用验收成功。

## 已核对的源码版本

历史构建源是没有 `.git` 的归档。此次通过公开 GitHub commit 的递归树，对本地文件计算 Git blob SHA，核对源码，而非猜测目录名或把文档阅读日期当版本。

| 组件 | 精确 commit | 核对结果 |
| --- | --- | --- |
| OctoSense Shell | [`7b03d2f3079777bf48f7dea9e5dd20d5b1f77732`](https://github.com/OctoSense-org/OctoSense/tree/7b03d2f3079777bf48f7dea9e5dd20d5b1f77732) | 2,300 个文件匹配；只有 `.cargo/config.toml` 添加了本地路径覆盖，无缺失 |
| Shell 内置 App Hub | [`e8601b80ce104db2e48208094714bdcffdce6b5a`](https://github.com/OctoSense-org/OctoSense-App-Hub/tree/e8601b80ce104db2e48208094714bdcffdce6b5a) | 120 个文件全部匹配 |
| 独立 `hub` / `card-host` | [`76bb34dc45d8b592fa99e4907ebf10fc0b55b5f5`](https://github.com/OctoSense-org/OctoSense-App-Hub/tree/76bb34dc45d8b592fa99e4907ebf10fc0b55b5f5) | 121 个文件全部匹配 |
| Octos | [`0e6db72d8c8d5f8101535690975b30a3f2cf7249`](https://github.com/octos-org/octos/tree/0e6db72d8c8d5f8101535690975b30a3f2cf7249) | 1,623 个文件匹配；本地 `Cargo.lock` 不同，无缺失；程序报告 `2.0.3-rc.13` |
| OctoScript | [`68f6a9df55692b5d8ef8873a12721e279a3f40d6`](https://github.com/OctoSense-org/Octoscript/tree/68f6a9df55692b5d8ef8873a12721e279a3f40d6) | 外层与 Shell 两份均为 278 个文件全部匹配 |
| Octoscript-Makepad | [`019e6bf043b484676ff39d6ff5be58a1e94abed8`](https://github.com/OctoSense-org/Octoscript-Makepad/tree/019e6bf043b484676ff39d6ff5be58a1e94abed8) | 两份均为 568 个文件全部匹配 |
| Makepad 基底 | [`bf318136a375c4d1fb7ee10e13e27336b6d98744`](https://github.com/OctoSense-org/makepad/tree/bf318136a375c4d1fb7ee10e13e27336b6d98744) | 独立工具使用基底；Shell 使用下述 Settings overlay |

Makepad 归档存在少量非编译文件的换行差异及忽略文件/符号链接缺失，不宣称全树逐字节相同。Shell 源码的额外变更可由该 OctoSense commit 中的 `tools/runtime-patches/makepad-settings.patch` 重建；已在临时副本成功应用，并核对覆盖文件。历史本地树未应用 `makepad-system-back.patch`，这一区别涉及 Android，当前仅验证 macOS。

Shell 使用一个本地薄 wrapper：入口仍为官方 `desktop/src/main.rs`，依赖官方 `crates/shell`，关闭默认 features，仅开启 `octos-core`、`app-hub`、`dev-mode`。本地配置把 Git 依赖映射到同 commit 的归档路径；它没有改写应用 API 或跳过城市应用的权限同意。编译进 `dev-mode` feature 不等于授予应用任意权限。

构建缓存记录的 Rust 为 `rustc 1.98.1 (48a229cea 2026-09-01)`，LLVM `22.1.8`。Octos 的实际 features 为 `api,matrix`，关闭默认 features；Shell 的实际 features 为 `app-hub,dev-mode,octos-core`。

## 二进制指纹

以下 SHA-256 指认本次使用的本机可执行文件，不代表不同机器重新编译会生成相同字节。

| 工具 | SHA-256 |
| --- | --- |
| `octosense` | `958092469df1b732344ceb7e53a87069dd246c9e4f1a2e1ac6dc46fa3e942e3c` |
| `octos` | `31e3804df95d2efd168789efa45d1ca2a0c4595ff9779bb25e0c9553cd033447` |
| `card-host` | `eda78da3921d1e8350558b47b1da3c4f9d4bded97b660997a94c0d929ceaab3e` |
| `hub` | `1ee0ec00bbac7acb361f95b152b5a9b5ae27f54f0dbebab8a227ec8f895ec1a1` |

## 启动与配置模型

从本仓库根目录运行。`OCTOSENSE_BIN`、`OCTOS_BIN` 是本机已安装工具的绝对路径，不是模型密钥：

```sh
OCTOSENSE_BIN=/path/to/octosense \
OCTOS_BIN=/path/to/octos \
./tools/start-shell.sh
```

脚本默认使用本仓库被忽略的 `.local-state/shell/`，启动可见的 AI providers 页面；也可用 `CITY_SHELL_HOME` 指向专用状态目录。`OCTOS_APP_CORE_DIR` 会被清除，由 Shell 在自己的状态目录派生内核数据目录，避免误用其他 Octos profile。脚本不包含 API key、不覆盖已保存模型、不写入旧排练场的状态。

用户在宿主界面完成：

1. **AI providers → Add model**。
2. 选择与自己账号相符的家族：MiniMax (China)、MiniMax、Moonshot (Kimi) 或 Kimi Coding Plan。普通 API 与 Coding Plan 不应混用。
3. 选该账号实际可用的模型和官方路由；不要将 catalog 的默认模型视为账号一定有权限。
4. 在 **OctoSense 宿主的 API key 页面**输入已有密钥。
5. **Test connection and save**。网络失败时的 “Save without testing” 仅保存配置，不算真实连接通过。

密钥由宿主保存到 keychain；城市应用只通过 `octos.*` 请求内置 Agent。此版本的官方 provider 配置路径是 API key 或宿主提供的加密导入，不会自动借用当前 Codex/浏览器登录态。

需要 UI 自动验收时才设置 `CITY_REMOTE_PORT`，例如 `18400`；默认不开启远程桥。使用 `CITY_HIDE_WINDOWS=1` 可启动隐藏窗口。输入凭据期间不截图、不导出输入控件或完整 profile。

## 本地 App Hub 安装

此次按官方 [本地发布演练](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/28b61424d43a76e3be2ca3a78c2b93b0ba115d06/docs/PUBLISHING.md) 使用新临时 anchor、catalog key 与 publisher key；私钥均在仓库外的忽略目录内、权限 `0600`。操作顺序为复制包、stamp、签 manifest、带发布者公钥 check、发布到本地 mirror、verify。没有使用 `--allow-unsigned` 通过本次签名检查，也没有伪造人工审查。

模型设置保存后，关闭这次测试 Shell，再用相同 `CITY_SHELL_HOME`、镜像路径与公开 anchor 重开：

```sh
OCTOSENSE_BIN=/path/to/octosense \
OCTOS_BIN=/path/to/octos \
CITY_SHELL_HOME=/path/to/city-test-state \
CITY_HUB_PATH=/path/to/local-signed-hub \
CITY_HUB_ANCHOR=PUBLIC_ANCHOR_HEX \
CITY_START_APP=apphub \
./tools/start-shell.sh
```

在 App Hub 选择城市红娘，核对四项权限后安装并打开。首次请求系统 Agent 时，按宿主显示给予本次应用需要的同意。测试通过后仍需走公开 App Hub 的提交与人工审核；本地 mirror 不能替代公开发布。

## 重建边界与最短路径

精确源码基底已可获取，但历史 wrapper 的完整 dependency lock 和本地 `nix 0.29.0` 路径覆盖没有作为本仓库构建产物发布。因此当前材料足以识别已测工具，**尚不能承诺评委仅克隆此仓库即可字节级重建历史工具**。

建议复测时使用上表固定的官方 Shell commit，在新目录执行其 `python3 tools/setup.py`，按官方 source lock 准备依赖，然后构建。下列是按源码 features 核对的最短命令，**本轮没有重跑完整编译，不能标为已经复现成功**：

```sh
# 在固定 commit 的 OctoSense 仓库中。
python3 tools/setup.py
python3 tools/setup.py --check --cargo
cargo build --release --locked -p octosense --no-default-features --features octos-core,app-hub,dev-mode

# 在固定 commit 的 Octos 仓库中。
cargo build --release --locked -p octos-cli --bin octos --no-default-features --features api,matrix

# 在上表固定的独立 App Hub 仓库中，先准备它锁定的兄弟源目录。
cargo build --release --locked -p octosense-card-host --bin card-host -p octosense-app-hub --bin hub
```

官方 `setup.py` 可能应用比历史本地树更完整的 runtime overlay。新构建应重新记录 commit、patch、工具哈希及真实验收结果，不直接继承这份历史二进制的通过记录。
