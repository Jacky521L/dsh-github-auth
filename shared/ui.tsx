import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuthView, Notice, RepoView } from './contracts.ts';

export type Lang = 'zh' | 'en';
export function useLanguage(): [Lang, (language: Lang) => void] {
  return useState<Lang>(typeof navigator !== 'undefined' && navigator.language.startsWith('zh') ? 'zh' : 'en');
}
export function isAuthView(value: unknown): value is AuthView {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AuthView>;
  return typeof v.configured === 'boolean' && typeof v.inFlight === 'boolean' && typeof v.available === 'boolean';
}
export function isRepoView(value: unknown): value is RepoView {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<RepoView>;
  return typeof v.configured === 'boolean' && typeof v.inFlight === 'boolean' && typeof v.gh === 'boolean' && typeof v.git === 'boolean';
}
export function useApi<T extends { inFlight: boolean }>(url: string, validate: (value: unknown) => value is T) {
  const [state, setState] = useState<T>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const serial = useRef(0);
  const alive = useRef(false);
  const acting = useRef(false);
  const controllers = useRef(new Set<AbortController>());
  const request = useCallback(async (action: string, data: object = {}) => {
    const revision = ++serial.current;
    const controller = new AbortController(); controllers.current.add(controller);
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }), signal: controller.signal });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(result && typeof result === 'object' && 'error' in result ? String(result.error) : `HTTP ${response.status}`);
      if (!validate(result)) throw new Error('Unexpected server response. Check the plugin and Harness versions.');
      if (alive.current && revision === serial.current) { setState(result); setError(''); }
    } catch (error) { if (alive.current && revision === serial.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { clearTimeout(timer); controllers.current.delete(controller); }
  }, [url, validate]);
  useEffect(() => {
    alive.current = true; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => { if (!acting.current) await request('status'); if (alive.current) timer = setTimeout(poll, 2000); };
    void poll();
    return () => { alive.current = false; clearTimeout(timer); for (const controller of controllers.current) controller.abort(); };
  }, [request]);
  const act = async (action: string, data: object = {}) => {
    if (acting.current) return;
    acting.current = true;
    setBusy(true); try { await request(action, data); } finally { acting.current = false; if (alive.current) setBusy(false); }
  };
  return { state, error, busy, act };
}
export function safeAuthUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'github.com' || url.hostname.endsWith('.ghe.com')) ? url.href : undefined;
  } catch { return undefined; }
}
export function Panel({ title, lang, setLang, children }: { title: string; lang: Lang; setLang(lang: Lang): void; children: ReactNode }) {
  return <section className="dsh-gh-auth" aria-label={title}>
    <style>{`.dsh-gh-auth{font:inherit;line-height:1.5;display:flex;flex-direction:column;gap:12px;padding:18px;border:1px solid var(--dsw-alias-border-l3,#9996);border-radius:12px;color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-bg-module-platform,transparent);overflow-wrap:anywhere}.dsh-gh-auth h3,.dsh-gh-auth p{margin:0}.dsh-gh-auth header,.dsh-gh-auth .actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.dsh-gh-auth header h3{flex:1}.dsh-gh-auth button,.dsh-gh-auth a.button{font:inherit;color:inherit;background:var(--dsw-alias-bg-layer-1,transparent);border:1px solid var(--dsw-alias-border-l3,#9998);border-radius:8px;padding:7px 12px;cursor:pointer;text-decoration:none}.dsh-gh-auth button:disabled{opacity:.5;cursor:default}.dsh-gh-auth button:focus-visible,.dsh-gh-auth input:focus-visible{outline:2px solid #4d79df;outline-offset:2px}.dsh-gh-auth input,.dsh-gh-auth select{font:inherit;padding:8px;border:1px solid #9998;border-radius:6px;background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;max-width:100%}.dsh-gh-auth [role=alert]{color:var(--dsw-alias-state-error-primary,#d34d4d)}.dsh-gh-auth .hint{font-size:13px;opacity:.8}.dsh-gh-auth code{font-size:20px;letter-spacing:2px;user-select:all}.dsh-gh-auth form{display:flex;flex-direction:column;gap:8px}.dsh-gh-auth .models{max-height:180px;overflow:auto}`}</style>
    <header><h3>{title}</h3><button type="button" aria-label="Language" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>{lang === 'zh' ? 'English' : '中文'}</button></header>
    {children}
  </section>;
}
export function DeviceNotice({ notice, lang }: { notice: Notice; lang: Lang }) {
  const [copyState, setCopyState] = useState('');
  useEffect(() => setCopyState(''), [notice.code, notice.url]);
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopyState(lang === 'zh' ? '已复制' : 'Copied'); }
    catch { setCopyState(lang === 'zh' ? '无法自动复制，请选中验证码或链接手动复制。' : 'Select and copy the code or link manually.'); } };
  const url = safeAuthUrl(notice.url);
  return <div><p>{notice.message}</p>{notice.code && <p><code>{notice.code}</code></p>}
    <div className="actions">{notice.code && <button onClick={() => void copy(notice.code!)}>{lang === 'zh' ? '复制验证码' : 'Copy code'}</button>}
      {url && <><a className="button" href={url} target="_blank" rel="noopener noreferrer">{lang === 'zh' ? '打开官方授权页' : 'Open authorization page'}</a>
        <button onClick={() => void copy(url)}>{lang === 'zh' ? '复制授权链接' : 'Copy authorization link'}</button></>}</div>
    {url && <p className="hint">{url}</p>}<p role="status">{copyState}</p></div>;
}
