# dsh-github-auth

[简体中文](README.zh.md) | English

Two independently installable plugins for the official DeepSeek Harness web app:

| Package | Capability |
| --- | --- |
| `dsh-copilot-auth` | GitHub Copilot account authorization and account model-list checks |
| `dsh-github-repo-auth` | GitHub CLI account authorization and repository command integration |

This repository and its releases are **public**. The packages are not published to
npm. Each user signs in with their own accounts; credentials are never included in
the packages.

## Current status

Copilot `0.1.0-beta.3` and repository authorization `0.1.0-beta.2` are available
in the public `v0.1.0-beta.3` prerelease. Anyone can download the archives;
Copilot and repository access still depend on each user's own account.

Windows acceptance passed: 24 unit/contract tests, five official-profile
installation scenarios, real Copilot authorization and development-task
verification, private repository operations, and restart recovery. The real task
passed with Claude Sonnet 5; model-specific and Windows sandbox limitations are
documented in [VALIDATION.md](VALIDATION.md).

Cross-platform CI is active on Windows, Linux and macOS. Release remains gated on
all three jobs passing; current results are recorded in [VALIDATION.md](VALIDATION.md).

## Requirements

- Node.js 24 or newer; a working official Harness web installation.
- Compatibility baseline: `@deepseek-ai/dsh@0.1.5-alpha.1` with `@earendil-works/pi-ai@0.85.1`.
- Repository access also requires Git and GitHub CLI on the Harness host's PATH.
- Copilot access requires an eligible account and any organization approvals required by GitHub.
- First release targets a local, loopback-served official web profile. Repository authorization targets github.com. Enterprise Copilot authorization is not claimed as verified.

The plugin build does not bundle or replace Harness, React, Git or GitHub CLI.
The two authorizations are separate; one does not grant the other's permissions.

## Build and install now

Clone this public repository:

```sh
gh repo clone Jacky521L/dsh-github-auth
cd dsh-github-auth
npm ci
npm run verify
```

This checks types, builds both plugins, runs the tests and creates two `.tgz`
packages plus `SHA256SUMS.txt` in `dist/`. Stop the target Harness instance, keep
its usual `DSH_HOME` and launch environment, then install either or both packages:

```sh
dsh plugin --profile web add ./dist/dsh-copilot-auth-0.1.0-beta.3.tgz
dsh plugin --profile web add ./dist/dsh-github-repo-auth-0.1.0-beta.2.tgz
```

Restart that same Harness instance with its normal startup command. The two
settings cards should appear; account authorization is a separate step below.
Keep this checkout and its `dist/` archives at stable paths. Reinstall from the
new location if you move them. The first command is unnecessary if you already
have the source checkout.

## Install prebuilt packages from the public Release

Use the `v0.1.0-beta.3` Release for the Copilot provider fix. The older beta.2
Copilot package still requires manually enabling the provider.

1. Download the desired `.tgz` files from the matching Release. No GitHub sign-in
   is needed to download them. Do not use GitHub's source-code ZIP as the plugin package.
2. Stop your Harness web process, then run the following in the download directory
   using the **same DSH_HOME and launch environment** as your regular Harness instance:

```sh
dsh plugin --profile web add ./dsh-copilot-auth-0.1.0-beta.3.tgz
dsh plugin --profile web add ./dsh-github-repo-auth-0.1.0-beta.2.tgz
dsh web
```

Install only the package you need. No extraction or source compilation is required.
If your installation uses `pnpm exec dsh`, replace `dsh` accordingly. A version-pinned
npx installation can use `npx @deepseek-ai/dsh@0.1.5-alpha.1` instead.
Keep downloaded local archives in a stable directory so future dependency restores
can resolve their file references.

## Connect accounts

**Copilot:** the plugin enables the GitHub Copilot provider in the selected profile. Open Settings → Models and use the GitHub
Copilot login card below the provider list. Copy the code, open the official link,
authorize, and keep Harness running. For a regular account, submit a blank enterprise
domain if the native flow asks for one. Check model access after login, then select
a model using Harness's existing selector. Version beta.3 filters that selector to
the intersection of the stored account grant and native catalog and refreshes it
when the grant changes. This does not prove a real model request succeeds. Reconnect
to refresh an old grant and verify with a real task.

**Repositories:** open Settings → GitHub. Existing GitHub CLI login is detected.
Otherwise connect, copy the device code and authorize on github.com. Account status
does not guarantee permission to every repository; organization SSO and repository
membership still apply. GitHub CLI prefers the system credential store and may
fall back to a local configuration file when unavailable.

Both cards offer English/Chinese, cancellation and retry. Repository sign-out
explicitly confirms that it also removes the shared machine GitHub CLI login for
the displayed account; Copilot sign-out removes only the Harness Copilot grant.
Neither operation revokes the provider's grant globally.

## How the plugins load

The official `dsh plugin --profile web add` command registers the package as a
dependency and bundle of the web profile under the selected `DSH_HOME`. On startup,
Harness reads its bundle patch, starts the plugin's backend service and loads its
web client. Copilot adds a card in Settings → Models; repository authorization
adds Settings → GitHub. No Electron application or ChatGPT login plugin is required.
Installing into another `DSH_HOME` does not affect the instance you normally run.

## Repository work through the agent

Select a workspace and ask the Harness agent to clone a repository or work on a PR.
The plugin contributes instructions for a bundled `repo-command.js` launcher; the
agent invokes it through Harness's normal command tools, using `git` or `gh` as the
first argument. Git operations get a command-scoped github.com credential helper;
the launcher does not edit global or repository Git configuration. Plain commands
outside the launcher retain the user's existing Git behavior.

The normal sandbox and permission mechanism remain active. A sandbox denial is
reported, not retried outside the sandbox automatically. Pushes and PR changes need
to be part of the user's authorized task. The launcher refuses `gh auth` commands
so authentication management and tokens stay outside the conversation.

## Upgrade and uninstall

Stop Harness, add the desired newer version's `.tgz` using the same command, and
restart. To uninstall:

```sh
dsh plugin --profile web remove dsh-copilot-auth
dsh plugin --profile web remove dsh-github-repo-auth
```

Restart after removal. Uninstalling does not erase credentials or sessions. Sign out
before uninstalling if desired. An older generic OAuth plugin may show duplicate
Copilot controls; this plugin detects its host service and displays a notice, uses
a separate list slot, and never removes it or changes existing ChatGPT login.

## Troubleshooting

- Missing login card: confirm the web profile, DSH_HOME, restart and compatibility versions.
- Copilot flow unavailable: check that beta.3 is installed in the active web profile and restart Harness.
- Expired code: cancel and reconnect; use only the code from the current attempt.
- No models: reconnect to refresh the native account grant; check subscription and organization policy.
- Network failure: verify the Harness host can reach GitHub and the Copilot service.
- Missing CLI: add Git/gh to the host PATH and restart Harness, not just the browser.
- Environment token shown: GH_TOKEN/GITHUB_TOKEN override CLI storage; remove the override to use browser login.
- Invalid account: reconnect; grant organization SSO access if GitHub requires it.
- Release download gives 404: check the tag and exact asset filename on the Releases page.
- Windows `node --test` may hit the native sandbox's child-process restriction
  (`spawn EPERM`). Review the exact command and use Harness's one-time approval
  if appropriate; the login plugins do not change sandbox permissions.
- A model may fill native tool arguments incorrectly even after login succeeds.
  Actual model/task validation and observed limitations are recorded in VALIDATION.md.

## Development and verification

```sh
npm ci
npm run verify
```

TypeScript is checked before esbuild produces independent host/client bundles.
The HTTP request contract is shared in source and strictly checks action fields;
transport is Harness's authenticated Connection fetch extension. No generated
Typert descriptors or copied third-party prebuilt bundles are required.

The CI template builds/tests/packs on Windows, Linux and macOS. These jobs use fake authorization
providers and child processes, not a real Copilot subscription. See `VALIDATION.md`
for actual manual acceptance evidence. A package build is not a successful live
authorization or model test.

Maintenance notes are in [ci/README.md](ci/README.md).

To run the official-profile installation matrix, set `DSH_CLI_PATH` to the pinned
Harness installation's `lib/bin.js` and run `node tests/integration.mjs`. This creates
temporary homes under `.runtime/` and uses random loopback ports without accounts.
For a public prerelease, commit the validated revision, wait for all three CI jobs,
tag that commit, and upload both `.tgz` packages with `gh release create --prerelease`.
The legacy `release:private` helper is for the earlier private beta and cannot
publish from this public repository. No checksum file is attached to beta.3.
Never replace an already published version's archive; use a new version for upgrades.

MIT; see LICENSE and THIRD_PARTY_NOTICES.md for attribution.
