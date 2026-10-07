# dsh-github-repo-auth

GitHub repository account sign-in using the official GitHub CLI.
Requires Node.js 24+, Harness 0.1.5-alpha.1, and Git/gh on the host PATH.

Install: `dsh plugin --profile web add ./dsh-github-repo-auth-0.1.0-beta.2.tgz`, then restart.
Open Settings → GitHub to connect or inspect the existing CLI account.
界面支持中英文。退出仓库账号会影响共用该 GitHub CLI 登录的其他工具，界面会先说明。
Repository login and Copilot login are separate.

The agent runs the bundled repo-command.js through normal Harness command tools,
preserving command approvals and the sandbox. Git credential configuration is
command scoped. No global Git configuration is changed. GitHub CLI owns credential
storage and may fall back from the system keychain to a local configuration file.

Remove: `dsh plugin --profile web remove dsh-github-repo-auth`, then restart.
Full bilingual instructions are in the public `Jacky521L/dsh-github-auth` repository.
