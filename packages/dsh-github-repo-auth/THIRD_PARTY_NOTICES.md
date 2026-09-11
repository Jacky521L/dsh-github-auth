# Third-party notices

The Copilot authorization interaction controller adapts the lifecycle and prompt
bridge design in [dsh-native-codex-oauth](https://github.com/kfc966/dsh-native-codex-oauth),
commit `28273cc4615f2e4cb5a11cf0c57968b68101f737` (MIT).
Copyright (c) 2026 DeepSeek Harness community contributors. The MIT terms are
preserved in LICENSE. The new controller limits the credential route to Copilot,
uses the authenticated Harness fetch interface, fences cancellation and sign-out,
and has an independently built React client. The source project is not a runtime
dependency. No ChatGPT sign-in code or Electron runtime is included.

Harness (MIT) supplies the host plugin interfaces, authorization, credential store,
and pi-ai model adapter. React (MIT, Meta Platforms, Inc. and affiliates) is supplied
by Harness at runtime and is not bundled in the plugin. Git (GPL-2.0) and GitHub CLI
(MIT) remain separately installed executables and are not redistributed here.
