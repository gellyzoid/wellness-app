// Wrapper that strips ELECTRON_RUN_AS_NODE before launching electron-vite.
// Some user/system environments set this var globally, which forces Electron
// to run as plain Node and breaks `electron.app` access in the main process.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

delete process.env.ELECTRON_RUN_AS_NODE

const [subcommand, ...rest] = process.argv.slice(2)
if (!subcommand) {
  console.error('Usage: node scripts/run.mjs <dev|preview|build> [args...]')
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const isWin = process.platform === 'win32'
const bin = join(here, '..', 'node_modules', '.bin', isWin ? 'electron-vite.cmd' : 'electron-vite')

const child = spawn(bin, [subcommand, ...rest], { stdio: 'inherit', shell: isWin })

child.on('exit', (code) => process.exit(code ?? 1))
