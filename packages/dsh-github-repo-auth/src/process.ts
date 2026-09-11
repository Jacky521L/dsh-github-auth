import { spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';
import { errorText } from '../../../shared/contracts.ts';
export function executable(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const path = Object.entries(env).find(([key]) => key.toUpperCase() === 'PATH')?.[1] ?? '';
  for (const dir of path.split(delimiter).filter(isAbsolute)) {
    const file = join(dir.replace(/^"|"$/g, ''), process.platform === 'win32' ? `${name}.exe` : name);
    try { accessSync(file, process.platform === 'win32' ? constants.F_OK : constants.X_OK); return file; } catch { /* try next PATH entry */ }
  }
  return undefined;
}
export interface CommandResult { code: number; stdout: string; stderr: string }
export function run(file: string, args: string[], options: { env?: NodeJS.ProcessEnv; signal?: AbortSignal; input?: string; timeout?: number; onOutput?: (text: string, write: (text: string) => void) => void } = {}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) { reject(new Error('Cancelled')); return; }
    const child = spawn(file, args, { windowsHide: true, shell: false, env: options.env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', cancelled = false;
    const stop = () => { cancelled = true; child.kill(); };
    const timer = setTimeout(stop, options.timeout ?? 25000);
    options.signal?.addEventListener('abort', stop, { once: true });
    const clean = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', stop); };
    const write = (text: string) => { if (child.stdin.writable) child.stdin.write(text, () => {}); };
    child.stdin.on('error', () => {});
    child.stdout.on('data', chunk => { const text = chunk.toString(); stdout = (stdout + text).slice(-65536); options.onOutput?.(text, write); });
    child.stderr.on('data', chunk => { const text = chunk.toString(); stderr = (stderr + text).slice(-65536); options.onOutput?.(text, write); });
    child.on('error', error => { clean(); reject(new Error(errorText(error))); });
    child.on('close', code => { clean(); if (cancelled) reject(new Error(options.signal?.aborted ? 'Cancelled' : 'Command timed out')); else resolve({ code: code ?? 1, stdout, stderr }); });
    if (options.input !== undefined) child.stdin.end(options.input);
  });
}
export function credentialConfig(gh: string): string[] {
  // Git runs !helpers in its POSIX shell, including on Windows. Quote the executable once for that shell.
  const quoted = "'" + gh.replaceAll('\\', '/').replaceAll("'", "'\\''") + "'";
  return ['-c', 'credential.https://github.com.helper=', '-c', `credential.https://github.com.helper=!${quoted} auth git-credential`];
}
