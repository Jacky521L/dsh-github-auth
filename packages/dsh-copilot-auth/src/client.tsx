import { useEffect, useState } from 'react';
import { DeviceNotice, Panel, isAuthView, useApi, useLanguage } from '../../../shared/ui.tsx';
import type { BrowserContext } from '../../../shared/contracts.ts';
export const inject = ['slots'];
export function CopilotCard() {
  const [lang, setLang] = useLanguage(); const zh = lang === 'zh';
  const { state, error, busy, act } = useApi('/api/dsh-copilot-auth', isAuthView);
  const [answer, setAnswer] = useState('');
  const prompt = state?.prompt;
  useEffect(() => setAnswer(prompt?.options?.[0]?.id ?? ''), [prompt?.id]);
  return <Panel title="GitHub Copilot" lang={lang} setLang={setLang}>
    <p>{!state ? (zh ? '正在读取授权状态…' : 'Loading authorization…') : state.configured ? (zh ? '已授权' : 'Authorized') : (zh ? '尚未授权' : 'Not authorized')}</p>
    {state?.conflict && <p role="alert">{zh ? '检测到旧通用登录插件。两处入口共用 Copilot 授权，请勿同时发起登录；本插件不会卸载旧插件。' : 'A legacy login plugin is installed. Both use the same Copilot grant; start only one login at a time. No plugin has been removed.'}</p>}
    {state && !state.available && <p>{zh ? '请先在此页面添加并启用 GitHub Copilot 提供方。' : 'Add and enable the GitHub Copilot provider on this page first.'}</p>}
    <p className="hint">{zh ? '复制设备验证码，在 GitHub 官方页面完成授权，并保持 Harness 运行。普通 GitHub 账号可将企业域名留空。' : 'Copy the device code, authorize on GitHub, and keep Harness running. Leave the enterprise domain blank for a regular GitHub account.'}</p>
    {state?.notice && <DeviceNotice notice={state.notice} lang={lang} />}
    {prompt && <form onSubmit={event => { event.preventDefault(); void act('answer', { promptId: prompt.id, value: answer }); setAnswer(''); }}>
      <label htmlFor="copilot-auth-answer">{prompt.message}</label>
      {prompt.kind === 'select' ? <select id="copilot-auth-answer" value={answer} onChange={e => setAnswer(e.target.value)}>{prompt.options?.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select>
        : <input id="copilot-auth-answer" type={prompt.kind === 'secret' ? 'password' : 'text'} value={answer} placeholder={prompt.placeholder} onChange={e => setAnswer(e.target.value)} autoComplete="off" />}
      <button disabled={busy} type="submit">{zh ? '继续' : 'Continue'}</button></form>}
    <div className="actions"><button disabled={busy || !state?.available || state.inFlight} onClick={() => void act('login')}>{state?.configured ? (zh ? '重新连接 Copilot' : 'Reconnect Copilot') : (zh ? '登录 Copilot' : 'Sign in to Copilot')}</button>
      {state?.inFlight && <button disabled={busy} onClick={() => void act('cancel')}>{zh ? '取消登录' : 'Cancel login'}</button>}
      <button disabled={busy || !state?.configured || state.inFlight} onClick={() => void act('models')}>{zh ? '检查模型权限' : 'Check model access'}</button>
      <button disabled={busy || !state?.configured || !state.writable} onClick={() => void act('logout')}>{zh ? '退出 Copilot' : 'Sign out of Copilot'}</button></div>
    {state?.models && <div className="models"><p>{zh ? `授权列表中有 ${state.models.length} 个匹配模型。请在 Harness 模型选择器中选择。实际请求仍需验证。` : `${state.models.length} models match the account grant. Select one in Harness. Actual requests still need verification.`}</p><ul>{state.models.map(model => <li key={model.id}>{model.name} ({model.id})</li>)}</ul></div>}
    {state?.outcome && <p role="status">{state.outcome === 'authorized' ? (zh ? '授权完成，可以检查模型权限。' : 'Authorized. You can check model access.') : state.outcome === 'cancelled' ? (zh ? '登录已取消，可以重试。' : 'Login cancelled. You can retry.') : (zh ? '已退出 Copilot。' : 'Signed out of Copilot.')}</p>}
    {(error || state?.error) && <p role="alert">{error || state?.error}</p>}
  </Panel>;
}
export function apply(ctx: BrowserContext): void {
  // A list slot avoids replacing the legacy adapter-family keyed card.
  ctx.slots.inject('settings.models.footer', () => ctx.slots.register({ name: 'settings.models.footer', id: 'dsh-copilot-auth', order: 20 }, CopilotCard));
}
