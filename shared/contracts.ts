/** Small structural boundary for Harness 0.1.5-alpha.1's native services. */
export interface Notice { message: string; url?: string; code?: string }
export type Prompt = { signal?: AbortSignal } & (
  { kind: 'text' | 'secret'; message: string; placeholder?: string } |
  { kind: 'select'; message: string; options: readonly { id: string; label: string; description?: string }[] }
);
export interface CredentialInfo { configured: boolean; kind?: string; writable: boolean }
export interface AuthView {
  configured: boolean; writable: boolean; inFlight: boolean; available: boolean;
  notice?: Notice; prompt?: { id: string; kind: Prompt['kind']; message: string; placeholder?: string; options?: readonly { id: string; label: string }[] };
  outcome?: string; error?: string; conflict?: boolean;
  models?: { id: string; name: string }[]; modelCheck?: 'unchecked' | 'available' | 'empty';
}
export interface RepoView {
  git: boolean; gh: boolean; configured: boolean; inFlight: boolean;
  account?: string; source?: string; notice?: Notice; outcome?: string; error?: string;
  environmentAuth?: boolean;
}
export interface HttpContext {
  connection: { fetch: { register(route: { path: string; methods: string[]; requestBody: 'buffered'; fetch(request: Request): Promise<Response> }): unknown } };
  on(event: 'dispose', callback: () => unknown): unknown;
}
export interface CopilotContext extends HttpContext {
  get?(service: string): unknown;
  authorization: {
    describe(key: string): { methods: readonly { id: string; label: string }[]; inFlight: boolean } | undefined;
    begin(request: { key: string; method: string; signal: AbortSignal; interaction: { notify(notice: Notice): void; prompt(prompt: Prompt): Promise<string> } }): Promise<{ status: string }>;
    cancel(key: string): void;
  };
  credentials: {
    describeRecord(key: string): Promise<CredentialInfo>;
    deleteRecord(key: string): Promise<void>;
    readRecord(key: string): Promise<{ kind: string; payload?: unknown } | undefined>;
  };
  sessionController: { modelCatalog(signal: AbortSignal): Promise<{ groups: { id: string; models: { id: string; name?: string }[] }[] }> };
  piAiOAuth?: unknown;
}
export interface BrowserContext {
  locale: { locale: string; getLocale?(): string };
  slots: {
    inject(name: string, callback: () => unknown): unknown;
    register(spec: { name: string; id?: string; key?: string; order?: number; label?: () => string; inject?: () => object }, component: unknown): unknown;
  };
}

export class PublicError extends Error {}
export function errorText(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g, '[redacted]')
    .replace(/(bearer\s+|(?:access_token|refresh_token|oauth_token|token)\s*[=:]\s*)[^\s,;]+/gi, '$1[redacted]').slice(0, 600);
}
/** Only typed actions enter the host; caller-supplied credential keys are forbidden. */
export async function readAction(request: Request, actions: readonly string[]): Promise<Record<string, unknown> & { action: string }> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new PublicError('JSON request required');
  const raw = await request.text();
  if (raw.length > 16384) throw new PublicError('Request too large');
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new PublicError('Invalid request');
  const body = data as Record<string, unknown>;
  if (typeof body.action !== 'string' || !actions.includes(body.action)) throw new PublicError('Unknown action');
  const allowed = body.action === 'answer' ? ['action', 'promptId', 'value'] : body.action === 'logout' ? ['action', 'account'] : ['action'];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new PublicError('Unexpected request field');
  return body as Record<string, unknown> & { action: string };
}
export function endpoint(ctx: HttpContext, path: string, actions: readonly string[], handler: (body: Record<string, unknown> & { action: string }) => Promise<unknown>): void {
  ctx.connection.fetch.register({ path, methods: ['POST'], requestBody: 'buffered', async fetch(request) {
    try { return Response.json(await handler(await readAction(request, actions)), { headers: { 'Cache-Control': 'no-store' } }); }
    catch (error) { return Response.json({ error: errorText(error) }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
  } });
}
