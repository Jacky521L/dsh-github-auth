import { fileURLToPath } from 'node:url';
import { endpoint, type HttpContext } from '../../../shared/contracts.ts';
import { RepoController } from './controller.ts';
export const inject = ['connection', 'systemPrompt'];
interface RepoContext extends HttpContext { systemPrompt: { section(section: { name: string; order: number; text: string }): unknown } }
export function apply(ctx: RepoContext): void {
  const controller = new RepoController();
  endpoint(ctx, '/api/dsh-github-repo-auth', ['status', 'login', 'cancel', 'logout', 'check'], async body => {
    if (body.action === 'login') return controller.begin();
    if (body.action === 'cancel') await controller.cancel();
    if (body.action === 'logout') await controller.signOut(body.account);
    return controller.status(body.action === 'check');
  });
  const entry = fileURLToPath(new URL('./repo-command.js', import.meta.url));
  ctx.systemPrompt.section({ name: 'dsh-github-repo-auth:repository-commands', order: 650,
    text: `GitHub repository access is provided by the user's GitHub CLI login (separate from Copilot). For GitHub git/gh operations use the normal Harness command tool to run the Node executable ${JSON.stringify(process.execPath)} with script ${JSON.stringify(entry)}, followed by git or gh and the command arguments. Use shell-appropriate quoting; in PowerShell use the call operator for quoted executable paths. The wrapper uses a command-local GitHub credential helper and changes no global Git config. Example arguments: git clone https://github.com/OWNER/REPO.git; git pull --ff-only; git push origin BRANCH; gh pr create --draft --body-file FILE. Execute in the user's selected workspace. Preserve the normal sandbox and command approvals. Obtain authorization through Settings → GitHub repositories if needed. Never retrieve or display authentication tokens. Only push or create PRs when the user's task authorizes it. A Copilot grant does not authorize repositories.` });
  ctx.on('dispose', () => controller.dispose());
}
