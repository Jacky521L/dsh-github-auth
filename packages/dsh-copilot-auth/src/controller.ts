// Authorization interaction design adapted from dsh-native-codex-oauth (MIT).
// See THIRD_PARTY_NOTICES.md. No OpenAI route or credential is accepted here.
import { randomUUID } from 'node:crypto';
import { errorText, PublicError, type AuthView, type CopilotContext, type CopilotModelCatalog, type Prompt, type Notice } from '../../../shared/contracts.ts';

export const COPILOT_KEY = 'llm-pi-ai/github-copilot';
/** The generic Harness catalog is advisory; Copilot's grant is account-specific. */
export function filterCopilotCatalog(catalog: CopilotModelCatalog, availableModelIds: unknown): CopilotModelCatalog {
  const allowed = new Set(Array.isArray(availableModelIds)
    ? availableModelIds.filter((id): id is string => typeof id === 'string') : []);
  const groups = catalog.groups.map(group => group.id === 'github-copilot'
    ? { ...group, models: group.models.filter(model => allowed.has(model.id)) }
    : group).filter(group => group.models.length > 0);
  const copilotModels = groups.find(group => group.id === 'github-copilot')?.models ?? [];
  const defaultModel = catalog.default?.provider === 'github-copilot' &&
    !copilotModels.some(model => model.id === catalog.default?.model)
    ? (copilotModels[0] ? { provider: 'github-copilot', model: copilotModels[0].id }
      : groups[0]?.models[0] ? { provider: groups[0].id, model: groups[0].models[0].id }
        : catalog.default)
    : catalog.default;
  return {
    ...catalog,
    groups,
    routableProviders: catalog.routableProviders.filter(provider => provider !== 'github-copilot' || copilotModels.length > 0),
    default: defaultModel,
  };
}

export class CopilotController {
  private attempt?: { abort: AbortController; done: Promise<void> };
  private pending?: { id: string; resolve(value: string): void; reject(error: Error): void; cleanup(): void; prompt: Prompt };
  private notice?: Notice;
  private outcome?: string;
  private error?: string;
  private checked?: AuthView['models'];
  private closed = false;
  private signingOut = false;
  constructor(private ctx: CopilotContext) {}

  async status(): Promise<AuthView> {
    const flow = this.ctx.authorization.describe(COPILOT_KEY);
    const record = await this.ctx.credentials.describeRecord(COPILOT_KEY);
    const p = this.pending;
    return { available: !!flow, configured: record.configured, writable: record.writable,
      inFlight: !!this.attempt || !!flow?.inFlight || this.signingOut,
      notice: this.notice, outcome: this.outcome, error: this.error,
      conflict: !!(this.ctx.get ? this.ctx.get('piAiOAuth') : this.ctx.piAiOAuth),
      prompt: p ? { id: p.id, kind: p.prompt.kind, message: p.prompt.message,
        ...('options' in p.prompt ? { options: p.prompt.options.map(({ id, label }) => ({ id, label })) } : { placeholder: p.prompt.placeholder }) } : undefined,
      modelCheck: this.checked === undefined ? 'unchecked' : this.checked.length ? 'available' : 'empty', models: this.checked };
  }
  async begin(): Promise<AuthView> {
    if (this.closed || this.signingOut) throw new PublicError('Authorization controller is unavailable');
    if (this.attempt) return this.status();
    const flow = this.ctx.authorization.describe(COPILOT_KEY);
    if (!flow?.methods.length) throw new PublicError('Enable GitHub Copilot in Settings → Models first.');
    if (flow.inFlight) throw new PublicError('A Copilot login is already running in another login plugin.');
    this.notice = undefined; this.outcome = undefined; this.error = undefined; this.checked = undefined;
    const abort = new AbortController();
    const attempt = { abort, done: Promise.resolve() };
    this.attempt = attempt;
    attempt.done = Promise.resolve().then(async () => {
      try {
        const result = await this.ctx.authorization.begin({ key: COPILOT_KEY, method: flow.methods[0].id, signal: abort.signal,
          interaction: { notify: notice => { if (!abort.signal.aborted) this.notice = { message: notice.message, url: notice.url, code: notice.code }; },
            prompt: prompt => this.ask(prompt, abort.signal) } });
        this.outcome = abort.signal.aborted ? 'cancelled' : result.status;
      } catch (error) { if (abort.signal.aborted) this.outcome = 'cancelled'; else this.error = errorText(error); }
      finally { this.rejectPrompt(); this.notice = undefined; if (this.attempt === attempt) this.attempt = undefined; }
    });
    return this.status();
  }
  private ask(prompt: Prompt, signal: AbortSignal): Promise<string> {
    if (this.pending) return Promise.reject(new PublicError('Concurrent authorization prompt'));
    if (signal.aborted || prompt.signal?.aborted) return Promise.reject(new PublicError('Authorization cancelled'));
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const cancel = () => { if (this.pending?.id === id) this.rejectPrompt(); };
      const cleanup = () => { signal.removeEventListener('abort', cancel); prompt.signal?.removeEventListener('abort', cancel); };
      this.pending = { id, prompt, resolve, reject, cleanup };
      signal.addEventListener('abort', cancel, { once: true });
      prompt.signal?.addEventListener('abort', cancel, { once: true });
    });
  }
  answer(promptId: unknown, value: unknown): void {
    const pending = this.pending;
    if (!pending || pending.id !== promptId || typeof value !== 'string' || value.length > 8192) throw new PublicError('Absent or stale authorization prompt');
    if (pending.prompt.kind === 'select' && !pending.prompt.options.some(option => option.id === value)) throw new PublicError('Invalid account option');
    this.pending = undefined; pending.cleanup(); pending.resolve(value);
  }
  private rejectPrompt(): void {
    const p = this.pending; this.pending = undefined;
    if (p) { p.cleanup(); p.reject(new PublicError('Authorization cancelled')); }
  }
  async cancel(): Promise<void> {
    const attempt = this.attempt;
    if (attempt) { attempt.abort.abort(); this.ctx.authorization.cancel(COPILOT_KEY); this.rejectPrompt(); await attempt.done; }
  }
  async signOut(): Promise<void> {
    if (this.signingOut) throw new PublicError('Sign-out already running');
    this.signingOut = true;
    try {
      await this.cancel();
      if (this.ctx.authorization.describe(COPILOT_KEY)?.inFlight) throw new PublicError('Cancel the login in the other plugin before signing out.');
      await this.ctx.credentials.deleteRecord(COPILOT_KEY);
      this.checked = undefined; this.error = undefined; this.outcome = 'signed-out';
    } finally { this.signingOut = false; }
  }
  async checkModels(): Promise<AuthView> {
    const record = await this.ctx.credentials.readRecord(COPILOT_KEY);
    if (record?.kind !== 'grant') throw new PublicError('Complete Copilot authorization first.');
    const payload = record.payload as { availableModelIds?: unknown } | undefined;
    if (!Array.isArray(payload?.availableModelIds)) throw new PublicError('No account model list in this grant. Reconnect Copilot to refresh permissions.');
    const ids = new Set(payload.availableModelIds.filter((v): v is string => typeof v === 'string'));
    const catalog = await this.ctx.sessionController.modelCatalog(AbortSignal.timeout(30000));
    this.checked = (catalog.groups.find(group => group.id === 'github-copilot')?.models ?? [])
      .filter(model => ids.has(model.id)).map(model => ({ id: model.id, name: model.name ?? model.id }));
    return this.status();
  }
  async dispose(): Promise<void> { this.closed = true; await this.cancel(); }
}
