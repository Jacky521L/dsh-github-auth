# GitHub Actions template / 自动测试模板

`github-actions.yml` builds and tests on Windows, Linux and macOS. It is stored
outside `.github/workflows/`, so uploading this source repository does not enable
Actions. The current CLI grant has repository access but lacks the separate
`workflow` scope needed to upload an active workflow.

When the maintainer has authorized workflow updates, move the template to
`.github/workflows/ci.yml` and commit it. Check all three jobs before recording
their results in `acceptance.json`. The private-release command continues to
refuse release while those results are pending. No step changes visibility or
publishes to npm.

`github-actions.yml` 包含 Windows、Linux、macOS 的构建与测试流程，目前作为模板
保存，尚未启用。当前 CLI 登录有仓库权限，但未完成单独的 `workflow` 权限授权。

维护者授权工作流更新后，将模板移到 `.github/workflows/ci.yml` 并提交，再检查三个
平台的运行结果。全部通过后才更新 `acceptance.json`；此前发布脚本会拒绝创建
Release。该流程不会改变仓库可见性，也不会发布 npm。
