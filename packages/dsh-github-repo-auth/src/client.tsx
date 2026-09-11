import { DeviceNotice, Panel, isRepoView, useApi, useLanguage } from '../../../shared/ui.tsx';
import type { BrowserContext } from '../../../shared/contracts.ts';
export const inject = ['slots'];
export function RepoCard() {
  const [lang, setLang] = useLanguage(); const zh = lang === 'zh';
  const { state, error, busy, act } = useApi('/api/dsh-github-repo-auth', isRepoView);
  return <Panel title={zh ? 'GitHub 仓库授权' : 'GitHub repositories'} lang={lang} setLang={setLang}>
    <p>{!state ? (zh ? '正在检查 GitHub CLI…' : 'Checking GitHub CLI…') : state.account ? `${zh ? '已连接账号' : 'Connected account'}: ${state.account}` : (zh ? '尚未连接 GitHub 仓库账号' : 'No repository account connected')}</p>
    <p className="hint">{zh ? '此授权用于克隆、拉取、推送和 PR，与 Copilot 模型登录分别管理。仓库操作通过会话中的 Agent 完成。' : 'This connection enables clone, pull, push and PR operations through your agent. It is separate from Copilot model sign-in.'}</p>
    {state && (!state.git || !state.gh) && <p role="alert">{zh ? '缺少依赖，请安装后重启 Harness：' : 'Install the missing dependencies, add them to PATH, and restart Harness: '}
      {!state.git && <a href="https://git-scm.com/downloads" target="_blank" rel="noreferrer"> Git </a>}{!state.gh && <a href="https://cli.github.com/" target="_blank" rel="noreferrer"> GitHub CLI </a>}</p>}
    {state?.environmentAuth && <p>{zh ? '当前使用环境变量提供的凭据。网页登录及退出已停用；请先移除环境变量覆盖。' : 'An environment token overrides CLI credentials. Remove the override before browser login or sign-out.'}</p>}
    {state?.notice && <DeviceNotice notice={state.notice} lang={lang} />}
    <div className="actions"><button disabled={busy || !state?.git || !state.gh || state.inFlight || state.environmentAuth} onClick={() => void act('login')}>{state?.configured ? (zh ? '重新连接 GitHub' : 'Reconnect GitHub') : (zh ? '连接 GitHub 仓库' : 'Connect GitHub repositories')}</button>
      {state?.inFlight && <button disabled={busy} onClick={() => void act('cancel')}>{zh ? '取消登录' : 'Cancel login'}</button>}
      <button disabled={busy || !state?.gh || state.inFlight} onClick={() => void act('check')}>{zh ? '检查连接' : 'Check connection'}</button>
      <button disabled={busy || !state?.configured || state.inFlight || state.environmentAuth} onClick={() => {
        const message = zh ? `退出 ${state?.account} 将同时移除本机 GitHub CLI 中这个账号的登录，可能影响其他使用它的工具。Copilot 登录不受影响。继续退出？` : `Sign out ${state?.account} from this machine's shared GitHub CLI? Other tools using that login will be affected. Copilot remains connected.`;
        if (window.confirm(message)) void act('logout', { account: state?.account });
      }}>{zh ? '退出仓库账号' : 'Sign out repository account'}</button></div>
    {state?.outcome && <p role="status">{state.outcome === 'authorized' ? (zh ? 'GitHub 仓库授权完成。' : 'Repository account connected.') : state.outcome === 'cancelled' ? (zh ? '登录已取消，可以重试。' : 'Login cancelled. You can retry.') : (zh ? '已退出仓库账号。' : 'Repository account signed out.')}</p>}
    <p className="hint">{zh ? '凭据由 GitHub CLI 管理，优先使用系统凭据存储。系统存储不可用时，CLI 可能回退到本地配置文件。' : 'GitHub CLI manages credentials using the system credential store where available, with a local configuration-file fallback.'}</p>
    {(error || state?.error) && <p role="alert">{error || state?.error}</p>}
  </Panel>;
}
export function apply(ctx: BrowserContext): void {
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'dsh-github-repositories', order: 35, label: () => 'GitHub', inject: () => ({}) }, RepoCard));
}
