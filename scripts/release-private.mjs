// Deliberately never creates a public release or changes repository visibility.
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const repo = 'Jacky521L/dsh-github-auth';
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
function gh(args) {
  const result = spawnSync(process.platform === 'win32' ? 'gh.exe' : 'gh', args, { encoding: 'utf8', windowsHide: true, shell: false });
  if (result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
  return result.stdout;
}
const metadata = JSON.parse(gh(['repo', 'view', repo, '--json', 'nameWithOwner,isPrivate']));
if (metadata.nameWithOwner !== repo || metadata.isPrivate !== true) throw new Error('Release requires the exact PRIVATE repository. No visibility changes were made.');
const validation = JSON.parse(await readFile('acceptance.json', 'utf8'));
const required = ['unit', 'typecheck', 'build', 'installationMatrix', 'copilotAuthorization', 'copilotTask', 'repositoryTask', 'restart', 'credentialExclusion', 'ciWindows', 'ciLinux', 'ciMacos'];
if (validation.version !== version || required.some(key => validation.checks?.[key] !== 'passed')) throw new Error('Required acceptance checks have not all passed.');
const assets = ['dsh-copilot-auth', 'dsh-github-repo-auth'].map(name => `dist/${name}-${version}.tgz`);
for (const asset of assets) {
  const hash = createHash('sha256').update(await readFile(asset)).digest('hex');
  if (validation.sha256?.[asset] !== hash) throw new Error('Acceptance belongs to a different build: ' + asset);
}
gh(['release', 'create', `v${version}`, '--repo', repo, '--prerelease', '--verify-tag', '--title', `v${version}`, '--notes-file', 'RELEASE_NOTES.md', ...assets.map(resolveAsset => resolve(resolveAsset)), resolve('dist/SHA256SUMS.txt')]);
console.log('Created release in the verified PRIVATE repository. Visibility unchanged.');
