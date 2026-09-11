# dsh-copilot-auth

Standalone GitHub Copilot account sign-in for the official Harness web app.
Requires Node.js 24+, Harness 0.1.5-alpha.1 / pi-ai 0.85.1.

Install: `dsh plugin --profile web add ./dsh-copilot-auth-0.1.0-beta.1.tgz`, then restart.
Open Settings → Models, add/enable GitHub Copilot, then use the Copilot login card.
普通 GitHub 账号可在企业域名提示中留空继续。界面支持中英文。
Only the Copilot credential is managed; no ChatGPT sign-in dependency is installed.

Remove: `dsh plugin --profile web remove dsh-copilot-auth`, then restart.
Removal retains credentials; sign out first if desired.

Full English and Chinese instructions are in the private `Jacky521L/dsh-github-auth`
repository's README.md and README.zh.md. Model access still depends on your account.
