# GitHub Actions template / 自动测试模板

The active workflow is stored at `.github/workflows/ci.yml` and builds and tests
on Windows, Linux and macOS. This directory keeps the activation history and
maintainer notes.

Check all three jobs before recording their results in `acceptance.json`. The
private-release command continues to refuse release while those results are
pending. No step changes visibility or publishes to npm.

已启用的工作流位于 `.github/workflows/ci.yml`，会在 Windows、Linux、macOS 上构建
并测试。本目录保留启用历史及维护说明。

检查三个平台的运行结果，全部通过后才更新 `acceptance.json`；此前发布脚本会拒绝
创建 Release。该流程不会改变仓库可见性，也不会发布 npm。
