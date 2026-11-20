import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { LOCK_PATH, MANAGED_PATHS, assertManagedPath, syncTemplateStyles } from './sync-template-styles.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = path.join(root, 'scripts/sync-template-styles.mjs')
const license = fs.readFileSync(path.join(root, 'LICENSE'))
const put = (root, relative, value) => {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true })
  fs.writeFileSync(path.join(root, relative), value)
}
const get = (root, relative) => fs.readFileSync(path.join(root, relative), 'utf8')

function fixture(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'template-style-test-'))
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }))
  const sourceDir = path.join(temporary, 'source')
  const targetDir = path.join(temporary, 'target')
  fs.mkdirSync(sourceDir)
  fs.mkdirSync(targetDir)
  for (const directory of [sourceDir, targetDir]) put(directory, 'LICENSE', license)
  for (const relative of MANAGED_PATHS) {
    const value = relative.endsWith('.ttf') ? Buffer.from([0, 1, 2, 255]) : `/* ${relative} */\n`
    put(sourceDir, relative, value)
  }
  put(sourceDir, 'src/styles/index.scss', '@use "./fonts/index.scss" as *;\n@use "./theme/light/index.scss" as *;\n')
  put(sourceDir, 'src/styles/fonts/index.scss', '@font-face { src: url("../../assets/fonts/LXGWWenKai-Regular.ttf"); }\n')
  put(sourceDir, 'src/tailwind.css', '@import "tailwindcss";\n')
  return { sourceDir, targetDir, sync: (options = {}) => syncTemplateStyles({ sourceDir, targetDir, ...options }) }
}

test('syncs only approved styles, retains local imports/content/config/PDF and is idempotent', (t) => {
  const { sourceDir, targetDir, sync } = fixture(t)
  for (const relative of MANAGED_PATHS) put(targetDir, relative, fs.readFileSync(path.join(sourceDir, relative)))
  const protectedFiles = {
    'src/styles/math-layout.scss': '.local-math { display: grid; }\n',
    'src/components/learning/LearningLibrary.vue': '<template>real courses</template>',
    'src/data/learning/catalog.json': '{"courses":["real"]}',
    'src/data/site/config.ts': 'export const base = "/Lernatlas/"',
    'public/materials/immutable.pdf': '%PDF-original-binary',
    'content/source-manifest.json': '{"sha256":"original"}',
    'package.json': '{"private":true}',
    'src/styles/unowned-local.scss': 'local',
  }
  for (const [relative, value] of Object.entries(protectedFiles)) {
    put(targetDir, relative, value)
    put(sourceDir, relative, 'upstream example must never replace local work')
  }
  const extension = '@use "./math-layout.scss" as *;\n'
  fs.appendFileSync(path.join(targetDir, 'src/styles/index.scss'), extension)
  const first = sync()
  assert.equal(first.writes.length, 0, 'bootstrap records identical styles without replacing anything')
  assert.deepEqual(first.paths, [LOCK_PATH])
  const baseline = get(targetDir, LOCK_PATH)
  put(sourceDir, 'src/styles/theme/light/index.scss', ':root { --site-accent: purple; }\n')
  const update = sync()
  assert.deepEqual(update.writes, ['src/styles/theme/light/index.scss'])
  assert.ok(get(targetDir, 'src/styles/index.scss').endsWith(extension))
  for (const [relative, value] of Object.entries(protectedFiles)) assert.equal(get(targetDir, relative), value)
  assert.notEqual(get(targetDir, LOCK_PATH), baseline)
  const lock = get(targetDir, LOCK_PATH)
  assert.equal(sync().changed, false)
  assert.equal(get(targetDir, LOCK_PATH), lock)
  assert.equal(sync({ check: true }).changed, false)
})

test('--check exits one on pending changes, --dry-run exits zero, neither writes', (t) => {
  const { sourceDir, targetDir } = fixture(t)
  const run = (flag) => spawnSync(process.execPath, [script, flag, '--source-dir', sourceDir, '--target-dir', targetDir], { encoding: 'utf8' })
  const check = run('--check')
  assert.equal(check.status, 1, check.stderr)
  assert.equal(JSON.parse(check.stdout).changed, true)
  assert.equal(run('--dry-run').status, 0)
  assert.equal(fs.existsSync(path.join(targetDir, LOCK_PATH)), false)
  assert.equal(fs.existsSync(path.join(targetDir, 'src/styles/index.scss')), false)
})

test('deletes only files recorded as owned; preserves a missing-upstream unowned file', (t) => {
  const { sourceDir, targetDir, sync } = fixture(t)
  sync()
  const owned = 'public/giscus-nexus.css'
  const unowned = 'public/giscus-nexus-light.css'
  const lock = JSON.parse(get(targetDir, LOCK_PATH))
  delete lock.files[unowned]
  put(targetDir, LOCK_PATH, JSON.stringify(lock))
  fs.unlinkSync(path.join(sourceDir, owned))
  fs.unlinkSync(path.join(sourceDir, unowned))
  assert.deepEqual(sync().deletions, [owned])
  assert.equal(fs.existsSync(path.join(targetDir, owned)), false)
  assert.equal(fs.existsSync(path.join(targetDir, unowned)), true)
})

test('rejects traversal and unknown lock paths before writing or deleting', (t) => {
  const { targetDir, sync } = fixture(t)
  sync()
  for (const relative of ['../outside', '/etc/passwd', 'src\\styles\\evil', 'src/styles/../../package.json', 'src/styles/new.scss', 'content/source-manifest.json']) {
    assert.throws(() => assertManagedPath(relative), /Unsafe|allowlist/)
    const lock = JSON.parse(get(targetDir, LOCK_PATH))
    lock.files[relative] = { sha256: '0'.repeat(64), sourceSha256: '0'.repeat(64) }
    put(targetDir, LOCK_PATH, JSON.stringify(lock))
    assert.throws(() => sync(), /Unsafe|allowlist/)
    delete lock.files[relative]
    put(targetDir, LOCK_PATH, JSON.stringify(lock))
  }
})

test('rejects missing font dependencies and newly referenced unapproved modules without partial writes', (t) => {
  const { sourceDir, targetDir, sync } = fixture(t)
  fs.unlinkSync(path.join(sourceDir, 'src/assets/fonts/LXGWWenKai-Regular.ttf'))
  assert.throws(() => sync(), /Missing upstream style dependency/)
  assert.equal(fs.existsSync(path.join(targetDir, LOCK_PATH)), false)
  put(sourceDir, 'src/assets/fonts/LXGWWenKai-Regular.ttf', Buffer.from([0, 1]))
  fs.appendFileSync(path.join(sourceDir, 'src/styles/index.scss'), '@use "./new-module/index.scss" as *;\n')
  put(sourceDir, 'src/styles/new-module/index.scss', 'body { color: red; }')
  assert.throws(() => sync(), /allowlist/)
  assert.equal(fs.existsSync(path.join(targetDir, 'src/styles/index.scss')), false)
})

test('protects existing unowned or locally edited managed files, including deletion conflicts', (t) => {
  const { sourceDir, targetDir, sync } = fixture(t)
  const relative = 'public/giscus-nexus.css'
  put(targetDir, relative, 'local customization')
  assert.throws(() => sync(), /unowned local file/)
  fs.unlinkSync(path.join(targetDir, relative))
  sync()
  put(targetDir, relative, 'local customization')
  assert.throws(() => sync(), /Local edit conflicts/)
  fs.unlinkSync(path.join(sourceDir, relative))
  assert.throws(() => sync(), /Refusing to delete a locally edited/)
  assert.equal(get(targetDir, relative), 'local customization')
})

test('rejects source and target symlinks, including directory symlinks', (t) => {
  const { sourceDir, targetDir, sync } = fixture(t)
  const relative = 'public/giscus-nexus.css'
  fs.unlinkSync(path.join(sourceDir, relative))
  fs.symlinkSync(path.join(sourceDir, 'LICENSE'), path.join(sourceDir, relative))
  assert.throws(() => sync(), /Symlink/)
  fs.unlinkSync(path.join(sourceDir, relative))
  put(sourceDir, relative, 'body {}')
  fs.symlinkSync(path.join(sourceDir, 'public'), path.join(targetDir, 'public'), 'dir')
  assert.throws(() => sync(), /Symlink/)
})

test('a new upstream commit with no style changes creates no lock churn', (t) => {
  const { sourceDir, targetDir, sync } = fixture(t)
  const git = (...args) => execFileSync('git', ['-C', sourceDir, ...args], { stdio: 'pipe' })
  git('init', '-b', 'main')
  git('add', '.')
  git('-c', 'user.name=Template fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'initial styles')
  sync()
  const before = get(targetDir, LOCK_PATH)
  put(sourceDir, 'README.md', 'An upstream documentation update')
  git('add', 'README.md')
  git('-c', 'user.name=Template fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'docs only')
  assert.equal(sync().changed, false)
  assert.equal(get(targetDir, LOCK_PATH), before)
})

test('upstream license changes require attribution review', (t) => {
  const { sourceDir, sync } = fixture(t)
  put(sourceDir, 'LICENSE', 'Different license')
  assert.throws(() => sync(), /Upstream license changed/)
})

test('updates font bytes together with their importing stylesheet', (t) => {
  const { sourceDir, targetDir, sync } = fixture(t)
  sync()
  const relative = 'src/assets/fonts/LXGWWenKai-Regular.ttf'
  const font = Buffer.from([0, 2, 0, 255, 254, 0])
  put(sourceDir, relative, font)
  assert.deepEqual(sync().writes, [relative])
  assert.deepEqual(fs.readFileSync(path.join(targetDir, relative)), font)
  assert.equal(sync().changed, false)
})

test('workflow checks default branch, gates writes on tests, and explicitly dispatches deployment', () => {
  const workflow = get(root, '.github/workflows/sync-template-styles.yml')
  assert.match(workflow, /schedule:[\s\S]*cron: '23 \*\/6 \* \* \*'/)
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /repository_dispatch:\s+types: \[template-styles-updated\]/)
  assert.match(workflow, /permissions:\s+contents: write\s+actions: write/)
  assert.match(workflow, /if: github.ref == format\('refs\/heads\/\{0\}', github.event.repository.default_branch\)/)
  assert.ok(workflow.indexOf('pnpm run check') < workflow.indexOf('git commit -m'))
  assert.ok(workflow.indexOf('pnpm run verify:build') < workflow.indexOf('git commit -m'))
  assert.ok(workflow.indexOf('git push origin') < workflow.indexOf('gh workflow run deploy.yml'))
  assert.match(workflow, /if: steps.commit.outputs.pushed == 'true'/)
  assert.doesNotMatch(workflow, /client_payload|git add \.|git push[^\n]*--force/)
})
