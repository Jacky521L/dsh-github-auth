# dsh-github-auth：Harness GitHub 登录插件

简体中文 | [English](README.md)

两个可独立安装的插件：`dsh-copilot-auth` 用于 Copilot 模型授权；
`dsh-github-repo-auth` 用于 GitHub 仓库授权和 Agent 仓库操作。

仓库和 Release 保持 **Private**。仅你及获得访问权限的协作者可以下载。
完成验收后也不会自动公开，由仓库所有者手动修改可见性；不发布 npm。

## 当前状态

`0.1.0-beta.2` 已提供源码和私有预发布安装包；仅仓库所有者和有访问权限的协作者可以获取。

Windows 已完成 24 项单元/接口测试、5 个官方 Profile 安装场景、真实 Copilot 授权与
开发任务、私有仓库操作及重启恢复。真实开发任务使用 Claude Sonnet 5 通过验收；
具体模型和 Windows 沙箱限制见 [验收记录](VALIDATION.md)。

三平台自动测试已启用，会在 Windows、Linux、macOS 上运行。首个 Release 仍需等待
三个平台全部通过，结果记录在[验收记录](VALIDATION.md)。

## 环境要求

需要 Node.js 24 以上和已运行的官方 Harness 网页版。
兼容基线为 Harness `0.1.5-alpha.1`、pi-ai `0.85.1`。
仓库授权还需要在运行 Harness 的电脑安装 Git、GitHub CLI，并加入 PATH。

## 现在安装：从源码构建

先使用有本私有仓库访问权限的账号登录 GitHub CLI，然后执行：

```sh
gh repo clone Jacky521L/dsh-github-auth
cd dsh-github-auth
npm ci
npm run verify
```

这会完成类型检查、构建、测试和打包，在 `dist/` 中生成两个 `.tgz` 安装包及
`SHA256SUMS.txt`。停止目标 Harness，保持与平时启动时相同的 `DSH_HOME` 和环境，
安装需要的一个或两个插件：

```sh
dsh plugin --profile web add ./dist/dsh-copilot-auth-0.1.0-beta.2.tgz
dsh plugin --profile web add ./dist/dsh-github-repo-auth-0.1.0-beta.2.tgz
```

再使用原来的启动入口重启同一个 Harness，即可看到登录卡片。安装与账号授权是
两个步骤，授权方法见下文。请保留源码目录和 `dist/` 安装包；移动路径后需要重新
安装。已有源码目录时，无需再执行克隆命令。

## 从私有 Release 安装预构建包

1. 登录有仓库访问权限的 GitHub 账号，从 `v0.1.0-beta.2` Release 下载插件 `.tgz`
   和 `SHA256SUMS.txt`。不要下载 Source code ZIP 作为插件，不需要解压安装包。
2. 比对 SHA-256：Windows 使用 `Get-FileHash <文件> -Algorithm SHA256`；
   Linux 使用 `sha256sum <文件>`；macOS 使用 `shasum -a 256 <文件>`。
3. 停止 Harness，在下载目录执行，保持与平时启动相同的 `DSH_HOME` 和环境：

```sh
dsh plugin --profile web add ./dsh-copilot-auth-0.1.0-beta.2.tgz
dsh plugin --profile web add ./dsh-github-repo-auth-0.1.0-beta.2.tgz
dsh web
```

只需要一项功能就只安装对应包。项目内安装可使用 `pnpm exec dsh`；
npx 安装可使用 `npx @deepseek-ai/dsh@0.1.5-alpha.1` 替代 `dsh`。
安装包请保留在固定目录，便于以后恢复依赖。

## 登录与使用

**Copilot：**在「设置 → 模型」添加并启用 GitHub Copilot，使用提供方列表下的
Copilot 登录卡片。复制设备码，打开官方授权页面，用自己的账号授权，保持 Harness
运行。普通账号遇到企业域名提示可留空继续。授权后检查模型权限，再用 Harness 原有
模型选择器选择模型。beta.2 会把选择器过滤为当前账号授权列表与原生目录的交集，
并在授权变化后刷新。模型检查不代替真实模型请求；旧授权需重新连接后刷新。

**仓库：**打开「设置 → GitHub」。已有 GitHub CLI 账号会被识别，否则点击连接，
复制设备码并在 GitHub 授权。连接成功后选择工作区，在会话中让 Agent 克隆、拉取、
推送代码或处理 PR。插件通过普通 Harness 命令工具调用封装入口，只对该次 Git
命令配置 GitHub 凭据帮助器，不修改全局或仓库 Git 配置。

Copilot 和仓库权限分别管理，一个账号登录成功不代表另一个授权已完成。
实际可用模型取决于账号，私有仓库和组织 SSO 仍需相应权限。

两张卡片都有中英文切换、取消和重试。退出 Copilot 只删除 Harness 的 Copilot 凭据；
退出仓库账号会影响本机共用该 GitHub CLI 登录的其他工具，因此界面会明确确认。
GitHub CLI 优先保存到系统凭据存储，不可用时可能回退到本地配置文件。

文件和命令沿用 Harness 的默认权限机制。沙箱拒绝会被报告，不会自动绕过。
推送和修改 PR 需要属于用户授权任务；凭据不会发送给模型或保存在插件包中。

## 插件如何生效

官方安装命令会将插件登记到所选 `DSH_HOME` 下 web Profile 的依赖和插件列表。
Harness 启动时读取插件声明，加载后端服务和网页界面：Copilot 登录卡片出现在
「设置 → 模型」，仓库登录卡片出现在「设置 → GitHub」。不需要 Electron 桌面软件，
也不依赖 GPT 登录插件。安装到了不同的 `DSH_HOME`，就不会影响你平时启动的那套环境。

## 升级和卸载

停止 Harness，使用相同安装命令添加新版包，再重启。

```sh
dsh plugin --profile web remove dsh-copilot-auth
dsh plugin --profile web remove dsh-github-repo-auth
```

卸载后重启；卸载保留凭据和会话，需要清除登录时请先退出。
如果存在旧通用 OAuth 插件，会提示登录入口重复，不会静默卸载它或改动 GPT 登录。

## 常见问题

- 看不到卡片：检查安装到的 web Profile、DSH_HOME、版本，并重启。
- Copilot 授权不可用：先添加并启用 GitHub Copilot 提供方。
- 设备码过期：取消并重新连接，使用本次生成的新码。
- 没有可用模型：重新授权刷新列表，检查 Copilot 订阅及组织策略。
- 网络错误：检查运行 Harness 的电脑能否访问 GitHub 和 Copilot 服务。
- 找不到 Git/gh：加入 PATH 后重启 Harness。
- 环境变量凭据：GH_TOKEN/GITHUB_TOKEN 会覆盖 CLI 登录，先移除覆盖再使用网页登录。
- 私有下载显示 404：使用有此仓库权限的账号登录 GitHub。
- Windows 的 `node --test` 可能因原生沙箱限制子进程而出现 `spawn EPERM`。
  请检查具体命令，必要时通过 Harness 的一次性审批执行；登录插件不更改沙箱权限。
- 登录成功后，模型仍可能错误填写工具参数；已实测模型和限制详见 `VALIDATION.md`。

## 开发与验证

```sh
npm ci
npm run verify
```

自动完成类型检查、独立构建、测试和打包。CI 会在 Windows/Linux/macOS 上运行无账号
测试，维护说明见 [CI 说明](ci/README.md)。这不代表三平台都完成了真实账号授权。
真实验收记录见 `VALIDATION.md`。
首版面向本机回环地址上的官方网页环境；仓库授权支持 github.com；企业 Copilot
授权不标记为已验证。

MIT 许可证；复用来源与版权说明见 `THIRD_PARTY_NOTICES.md`。
