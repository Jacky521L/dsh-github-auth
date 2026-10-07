# v0.1.0-beta.3

The Copilot plugin now enables the GitHub Copilot provider through its own
Harness bundle. A user installing the plugin into an existing web profile can
sign in and see account-authorized models without adding the provider in
Settings first. The model selector continues to show only the intersection of
the account grant and Harness's native model catalog, and refreshes when the
grant changes.

The standalone plugin was tested in fresh web profiles with no provider
settings and with OpenAI Codex as the only configured provider. Both loaded
the Copilot login card and the granted Copilot model. Type checking and all
24 unit and contract tests passed.

Assets: `dsh-copilot-auth-0.1.0-beta.3.tgz` and the unchanged
`dsh-github-repo-auth-0.1.0-beta.2.tgz`. No checksum file is attached.

Compatibility baseline: Harness 0.1.5-alpha.1 / pi-ai 0.85.1, Node.js 24+.
This prerelease is public. Each user must authorize with their own GitHub account.
