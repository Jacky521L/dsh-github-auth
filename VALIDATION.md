# Validation record

Version: 0.1.0-beta.1. Release visibility: PRIVATE.

This file distinguishes completed checks from pending acceptance. No real-account
success is inferred from mocked tests.

| Check | Result |
| --- | --- |
| TypeScript strict check | PASS, TypeScript 5.9.3, Node 24.11.1 |
| Host and browser build from source | PASS, both independent packages |
| Unit/contract tests | PASS, 21 tests on Windows |
| Windows clean official Harness profile | PASS, Harness 0.1.5-alpha.1 / pi-ai 0.85.1, independent home |
| Independent and combined installation/reinstall/uninstall | PASS, all 5 scenarios in tests/integration.mjs |
| Real Copilot authorization | Pending user authorization |
| Real model read/edit/check/report task | Pending |
| Private repository clone/pull/push/draft PR | Pending |
| Restart credentials/model/history | Pending |
| Browser/log/archive credential exclusion | Archive allowlist and credential/personal-path scan PASS; live credential checks pending authorization |
| GitHub Actions Windows/Linux/macOS | Pending remote CI |

The owner will make the repository public manually, if desired. Development,
validation and the first Release must not change visibility.

## Completed observations (2026-09-11)

- Real official Harness web page loads the GitHub repository settings section.
- Repository login invokes GitHub CLI, displays the real device code and official
  authorization link. Copy-code button reports success. Human authorization is pending.
- Copilot card renders in Settings → Models. A real native flow accepts an empty
  enterprise domain, returns a GitHub device code, and cancels cleanly: the code is
  cleared, the cancel outcome is visible, and login becomes available again.
- Real HTTP checks: missing authentication 401, foreign Origin 403, arbitrary
  non-Copilot credential key 400, authenticated status endpoints 200.
- Installation matrix: both packages 200/200; repeated install plus restart 200/200;
  Copilot removed 404/200; repository removed and Copilot installed 200/404; both
  uninstalled 404/404. No duplicate bundle registrations.
- A same-name unpublished archive may be cached by pnpm even after add --force.
  Development acceptance uses content-specific archive paths. Published versions
  must be immutable; upgrades must have a new version.

Runtime logs, device codes and temporary profiles stay in ignored `.runtime/` and
are not uploaded. This record deliberately contains no live credential or device code.
