// Runs ansible-vault inside a throwaway container, so Ansible doesn't have to
// be installed locally. File paths are relative to deploy/ansible.
//
//   pnpm vault                  edit group_vars/all/vault.yml
//   pnpm vault view             view group_vars/all/vault.yml
//   pnpm vault create <file>    any ansible-vault subcommand and args
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ANSIBLE_CORE_VERSION = '2.21.5';
const DEFAULT_VAULT_FILE = 'group_vars/all/vault.yml';
// Subcommands that take a file; encrypt_string doesn't, so it never gets the default
const FILE_COMMANDS = new Set([
  'create',
  'decrypt',
  'edit',
  'encrypt',
  'rekey',
  'view',
]);

const ansibleDir = path.join(import.meta.dirname, '..', 'deploy', 'ansible');
const [command = 'edit', ...rest] = process.argv.slice(2);
const vaultArgs =
  rest.length === 0 && FILE_COMMANDS.has(command)
    ? [command, DEFAULT_VAULT_FILE]
    : [command, ...rest];

// Args are passed as an array (no shell), so this behaves the same on cmd, PowerShell and sh.
// In the container they reach ansible-vault as "$@", so sh never re-parses them.
const { status, error } = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-it',
    '-v',
    `${ansibleDir}:/work`,
    '-w',
    '/work',
    'python:3.13-alpine',
    'sh',
    '-c',
    `pip install -q --root-user-action=ignore ansible-core==${ANSIBLE_CORE_VERSION} && exec ansible-vault "$@"`,
    'sh',
    ...vaultArgs,
  ],
  { stdio: 'inherit' },
);

if (error) {
  console.error(`Could not run docker: ${error.message}`);
  process.exit(1);
}
process.exit(status ?? 1);
