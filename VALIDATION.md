# Validation record

Version: 0.1.0-beta.1. Release visibility: PRIVATE.

This file distinguishes completed checks from pending acceptance. No real-account
success is inferred from mocked tests.

| Check | Result |
| --- | --- |
| TypeScript strict check | PASS, TypeScript 5.9.3, Node 24.11.1 |
| Host and browser build from source | PASS, both independent packages |
| Unit/contract tests | PASS, 22 tests on Windows |
| Windows clean official Harness profile | PASS, Harness 0.1.5-alpha.1 / pi-ai 0.85.1, independent home |
| Independent and combined installation/reinstall/uninstall | PASS, all 5 scenarios in tests/integration.mjs |
| Real Copilot authorization | PASS, owner completed native device authorization; 17 account models matched |
| Real model read/edit/check/report task | PASS, Copilot session, Claude Sonnet 5 repair and verification, 3 tests passed with one explicitly approved command |
| Private repository clone/pull/push/draft PR | PASS, bundled command wrapper, dedicated private fixture and draft PR |
| Restart credentials/model/history | PASS, both logins, model selection, original session and successful follow-up model response |
| Browser/log/archive credential exclusion | PASS, archive allowlist/path scan, exact credential comparison against sources, archives, logs, session projection and HTTP responses; visible page pattern check |
| GitHub Actions Windows/Linux/macOS | PASS, run 37624518641, all three matrix jobs completed successfully |

The owner will make the repository public manually, if desired. Development,
validation and the first Release must not change visibility.

## Completed observations (2026-09-11)

- Real official Harness web page loads the GitHub repository settings section.
- Repository login invokes GitHub CLI, displays the real device code and official
  authorization link. Copy-code button reports success. Human CLI authorization
  completed; the plugin reports the expected account, configured state and keyring source.
- Copilot card renders in Settings → Models. A real native flow accepts an empty
  enterprise domain, returns a GitHub device code, and cancels cleanly: the code is
  cleared, the cancel outcome is visible, and login becomes available again.
- The first uncompleted repository device flow timed out as expected. Its error
  handler now discards the obsolete code transcript and presents a retry message;
  a regression test verifies this behavior.
- Real HTTP checks: missing authentication 401, foreign Origin 403, arbitrary
  non-Copilot credential key 400, authenticated status endpoints 200.
- The dedicated private repository `Jacky521L/dsh-github-auth-test-20260911`
  passed clone, fast-forward pull, test-branch push and draft PR creation through
  the bundled `repo-command.js` entry. Draft PR: #1. No global Git credential
  helper configuration was changed. Windows checkout line endings are normalized
  by the fixture content assertion.
- The delivery repository `Jacky521L/dsh-github-auth` was created and verified
  PRIVATE. Its initial push was rejected because the CLI grant lacks `workflow`
  scope for `.github/workflows/ci.yml`. The owner later granted that scope and
  the workflow is now active. Run 37624518641 passed on Windows, Linux and macOS.
  No Release existed when this acceptance result was recorded.
- Installation matrix: both packages 200/200; repeated install plus restart 200/200;
  Copilot removed 404/200; repository removed and Copilot installed 200/404; both
  uninstalled 404/404. No duplicate bundle registrations.
- A same-name unpublished archive may be cached by pnpm even after add --force.
  Development acceptance uses content-specific archive paths. Published versions
  must be immutable; upgrades must have a new version.
- Human Copilot authorization completed independently of CLI authorization. The
  account-model check returned 17 matching entries without returning grant tokens.
- The Copilot session read the fixture files and repaired only `order.js`: price
  is multiplied by quantity and the percentage discount applies to the subtotal.
  Claude Sonnet 5 completed the repair and real verification; all 3 unchanged tests
  passed and the model reported the result in Chinese.
- Windows Harness confinement blocked Node's test runner with `spawn EPERM`.
  The owner explicitly approved one `node --test` execution through Harness's
  native approval UI. The session remained `workspace-write` throughout; no
  executor, sandbox setting or Harness core file was patched by these plugins.
- A prior GPT-5.3 Codex attempt repeatedly filled the optional escalation field
  with the current sandbox mode, causing native validation failures. It did not
  complete this task and is not marked as passing development acceptance.
- The test deployment was stopped and restarted with process-identity checks.
  Credential/settings hashes, session title, selected model and permission mode
  survived. The browser reopened the original transcript, and the same Copilot
  model correctly answered a follow-up about the changed file and 3 passing tests.
- An exact comparison against the saved native credential values found no
  matches in 49 source/archive/log/session-projection/API items. Public plugin
  responses stayed token-free before and after restart. A rendered-page scan
  found no GitHub-token or JWT patterns. Runtime credential storage itself is
  excluded from source control and release packages.

Runtime logs, device codes and temporary profiles stay in ignored `.runtime/` and
are not uploaded. This record deliberately contains no live credential or device code.
