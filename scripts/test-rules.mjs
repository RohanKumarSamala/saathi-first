// Runs tests/firestore.rules.test.js against the Firestore emulator, then makes sure the
// emulator's Java process is gone: on Windows `firebase emulators:exec` can leave it
// running, which blocks the port for the next run.
import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const port = JSON.parse(readFileSync('firebase.json', 'utf8')).emulators.firestore.port

function stopEmulator() {
  try {
    if (process.platform === 'win32') {
      const lines = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' }).split('\n')
      const pids = new Set(
        lines
          .filter((line) => line.includes(`:${port} `) && line.includes('LISTENING'))
          .map((line) => line.trim().split(/\s+/).at(-1)),
      )
      for (const pid of pids) execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
    } else {
      execSync(`lsof -ti tcp:${port} | xargs -r kill`, { stdio: 'ignore', shell: '/bin/sh' })
    }
  } catch {
    // Nothing was listening.
  }
}

stopEmulator()
const result = spawnSync(
  'firebase',
  ['emulators:exec', '--only', 'firestore', '--project', 'demo-saathi-first', '"node --test --test-concurrency=1 tests/firestore.rules.test.js tests/settlement.test.ts"'],
  { stdio: 'inherit', shell: true },
)
stopEmulator()
process.exit(result.status ?? 1)
