# v0.1.0-beta.1

Two standalone plugins add Copilot account sign-in and GitHub repository account
sign-in to the official Harness web app. Install either package or both; bilingual
controls include device-code copy, cancellation, retry and sign-out.

The Copilot plugin uses Harness's native authorization and credential services.
The repository plugin uses the existing GitHub CLI login and routes repository
commands through Harness's ordinary command tools and permission mechanism.

Compatibility baseline: Harness 0.1.5-alpha.1 / pi-ai 0.85.1, Node.js 24+.
Git and GitHub CLI are separate prerequisites for repository access.

See README.md / README.zh.md for installation and VALIDATION.md for exact checks
and limitations. This release remains in a PRIVATE repository. Only the owner may
make the repository public manually.
