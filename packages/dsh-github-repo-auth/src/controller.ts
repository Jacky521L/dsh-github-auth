import { fileURLToPath } from 'node:url';
import { errorText, PublicError, type Notice, type RepoView } from '../../../shared/contracts.ts';
import { executable, run, type CommandResult } from './process.ts';
export interface Runner {
  executable(name: string): string | undefined;
  run: typeof run;
}
export function parseAccount(result: CommandResult): { account?: string; source?: string; error?: string } {
  try {
    const data = JSON.parse(result.stdout) as { hosts?: { 'github.com'?: { active?: boolean; state?: string; login?: string; tokenSource?: string }[] } };
    const active = data.hosts?.['github.com']?.find(row => row.active);
    if (active?.state === 'success' && typeof active.login === 'string') return { account: active.login, source: active.tokenSource };
    return { error: active ? 'GitHub credential is invalid or needs organization authorization. Reconnect and retry.' : undefined };
  } catch { return { error: result.code ? 'GitHub CLI status check failed. Check network access and reconnect.' : 'GitHub CLI returned an unsupported status format. Update GitHub CLI.' }; }
}
export function deviceNotice(text: string): Notice | undefined {
  const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
  const code = clean.match(/(?:one-time code|device code)[^A-Z0-9]*([A-Z0-9]{4}-[A-Z0-9]{4})/i)?.[1];
  return code ? { message: 'Enter this one-time device code on GitHub.', code, url: 'https://github.com/login/device' } : undefined;
}
export class RepoController {
  private attempt?: { abort: AbortController; done: Promise<void> };
  private notice?: Notice;
  private error?: string;
  private outcome?: string;
  private cached?: { at: number; view: RepoView };
  private probing?: Promise<RepoView>;
  private closed = false;
  private signingOut = false;
  constructor(private runner: Runner = { executable, run }, private env: NodeJS.ProcessEnv = process.env) {}
  private async probe(): Promise<RepoView> {
    const git = this.runner.executable('git'); const gh = this.runner.executable('gh');
    const environmentAuth = !!(this.env.GH_TOKEN || this.env.GITHUB_TOKEN);
    if (!git || !gh) return { git: !!git, gh: !!gh, configured: false, inFlight: false, environmentAuth };
    const status = await this.runner.run(gh, ['auth', 'status', '--hostname', 'github.com', '--json', 'hosts'], { env: this.env, input: '' });
    const account = parseAccount(status);
    return { git: true, gh: true, configured: !!account.account, inFlight: false, environmentAuth, ...account };
  }
  async status(force = false): Promise<RepoView> {
    // An explicit post-login check must not reuse a probe started before login completed.
    if (force) { if (this.probing) await this.probing; this.cached = undefined; }
    if (force || !this.cached || Date.now() - this.cached.at > 8000) {
      this.probing ??= this.probe().catch(error => ({ git: !!this.runner.executable('git'), gh: !!this.runner.executable('gh'), configured: false, inFlight: false, error: errorText(error) }))
        .then(view => { this.cached = { at: Date.now(), view }; return view; }).finally(() => { this.probing = undefined; });
      await this.probing;
    }
    return { ...this.cached!.view, inFlight: !!this.attempt || this.signingOut, notice: this.notice, outcome: this.outcome, error: this.error ?? this.cached!.view.error };
  }
  async begin(): Promise<RepoView> {
    if (this.closed || this.signingOut) throw new PublicError('GitHub login controller is unavailable');
    if (this.attempt) return this.status();
    const gh = this.runner.executable('gh');
    if (!gh || !this.runner.executable('git')) throw new PublicError('Install Git and GitHub CLI, add both to PATH, and restart Harness.');
    if (this.env.GH_TOKEN || this.env.GITHUB_TOKEN) throw new PublicError('GitHub CLI is using an environment token. Remove that override before browser login.');
    this.error = undefined; this.outcome = undefined; this.notice = undefined;
    const attempt = { abort: new AbortController(), done: Promise.resolve() };
    this.attempt = attempt;
    const browserHelper = fileURLToPath(new URL('./no-browser.js', import.meta.url));
    const env = { ...this.env, GH_BROWSER: `"${process.execPath}" "${browserHelper}"`, GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1' };
    // --web bypasses account selection; non-TTY stdin avoids global Git setup prompts.
    attempt.done = Promise.resolve().then(async () => {
      let transcript = '';
      try {
        const result = await this.runner.run(gh, ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web', '--skip-ssh-key'], {
          env, signal: attempt.abort.signal, timeout: 16 * 60 * 1000, input: '\n',
          onOutput: text => { transcript = (transcript + text).slice(-8192); this.notice = deviceNotice(transcript) ?? this.notice; },
        });
        if (result.code) throw new PublicError(errorText(result.stderr) || `GitHub login failed (exit ${result.code}).`);
        this.cached = undefined;
        const status = await this.status(true);
        if (!status.configured) throw new PublicError(status.error ?? 'GitHub authorization did not produce a usable login.');
        this.outcome = 'authorized';
      } catch (error) { if (attempt.abort.signal.aborted) this.outcome = 'cancelled'; else this.error = errorText(error); }
      finally { transcript = ''; this.notice = undefined; this.cached = undefined; if (this.attempt === attempt) this.attempt = undefined; }
    });
    return this.status();
  }
  async cancel(): Promise<void> { const attempt = this.attempt; if (attempt) { attempt.abort.abort(); await attempt.done; } }
  async signOut(account: unknown): Promise<void> {
    if (this.signingOut) throw new PublicError('Sign-out already running');
    this.signingOut = true;
    try {
      await this.cancel();
      const state = await this.status(true);
      if (state.environmentAuth) throw new PublicError('The environment supplies this credential; remove the override to sign out.');
      if (!state.account || account !== state.account) throw new PublicError('Account changed. Refresh before signing out.');
      const gh = this.runner.executable('gh'); if (!gh) throw new PublicError('GitHub CLI not found');
      const result = await this.runner.run(gh, ['auth', 'logout', '--hostname', 'github.com', '--user', state.account], { env: this.env, input: 'y\n' });
      if (result.code) throw new PublicError(errorText(result.stderr) || 'GitHub sign-out failed');
      this.cached = undefined; this.error = undefined; this.outcome = 'signed-out';
    } finally { this.signingOut = false; }
  }
  async dispose(): Promise<void> { this.closed = true; await this.cancel(); }
}
