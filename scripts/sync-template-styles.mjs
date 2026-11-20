import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const UPSTREAM = Object.freeze({ repository: 'dieWehmut/Vorlage', branch: 'main' })
export const LOCK_PATH = 'content/template-style-lock.json'
// Deliberately exact: new upstream modules/assets require an explicit compatibility review.
export const MANAGED_PATHS = Object.freeze([
  'public/giscus-nexus-green-light.css',
  'public/giscus-nexus-green.css',
  'public/giscus-nexus-light.css',
  'public/giscus-nexus.css',
  'src/assets/fonts/LXGWWenKai-Regular.ttf',
  'src/styles/animation/sakura/index.scss',
  'src/styles/animation/snow/index.scss',
  'src/styles/components/index.scss',
  'src/styles/console.scss',
  'src/styles/cursor/default/index.scss',
  'src/styles/cursor/index.scss',
  'src/styles/cursor/input/index.scss',
  'src/styles/cursor/pointer/index.scss',
  'src/styles/cursor/scrollbar/index.scss',
  'src/styles/fonts/index.scss',
  'src/styles/index.scss',
  'src/styles/layout/index.scss',
  'src/styles/markdown/index.scss',
  'src/styles/pages/index.scss',
  'src/styles/scrollbars/index.scss',
  'src/styles/tailwind/index.scss',
  'src/styles/theme/dark/index.scss',
  'src/styles/theme/light/index.scss',
  'src/tailwind.css',
])
const managed = new Set(MANAGED_PATHS)
const requiredStyles = ['src/styles/index.scss', 'src/styles/fonts/index.scss', 'src/styles/theme/light/index.scss', 'src/styles/theme/dark/index.scss', 'src/tailwind.css']
const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const digest = (value) => createHash('sha256').update(value).digest('hex')
const json = (value) => `${JSON.stringify(value, null, 2)}\n`
const revisionPattern = /^(?:[0-9a-f]{40}|local:[0-9a-f]{64})$/

export function assertRelativePath(value) {
  if (typeof value !== 'string' || !value || /[\\\0\r\n?#:]/.test(value)
    || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)
    || value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe relative path: ${JSON.stringify(value)}`)
  }
  return value
}

export function assertManagedPath(value) {
  assertRelativePath(value)
  if (!managed.has(value)) throw new Error(`Path is not on the template style allowlist: ${value}`)
  return value
}

// Reject symlinks in every existing component, including the final file. Never follow them.
function safePath(root, relative) {
  assertRelativePath(relative)
  let current = root
  for (const part of relative.split('/')) {
    current = path.join(current, part)
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink is not permitted: ${relative}`)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  return current
}

function read(root, relative, optional = false) {
  const filename = safePath(root, relative)
  try {
    if (!fs.statSync(filename).isFile()) throw new Error(`Not a regular file: ${relative}`)
    return fs.readFileSync(filename)
  } catch (error) {
    if (optional && error.code === 'ENOENT') return null
    throw error
  }
}

function readLock(root) {
  const bytes = read(root, LOCK_PATH, true)
  if (!bytes) return null
  const lock = JSON.parse(bytes.toString('utf8'))
  if (lock.version !== 1 || lock.repository !== UPSTREAM.repository || lock.branch !== UPSTREAM.branch
    || !revisionPattern.test(lock.sourceCommit) || !lock.files || Array.isArray(lock.files)
    || typeof lock.files !== 'object') throw new Error('Invalid template style lock or upstream identity')
  for (const [relative, record] of Object.entries(lock.files)) {
    assertManagedPath(relative)
    if (!record || !/^[0-9a-f]{64}$/.test(record.sha256)
      || !/^[0-9a-f]{64}$/.test(record.sourceSha256)) throw new Error(`Invalid lock hash: ${relative}`)
  }
  if (requiredStyles.some((relative) => !Object.hasOwn(lock.files, relative))
    || lock.license?.spdx !== 'MIT' || lock.license?.path !== 'LICENSE'
    || !/^[0-9a-f]{64}$/.test(lock.license?.sha256) || !Array.isArray(lock.localExtensions)) {
    throw new Error('Invalid template style lock: missing required styles, extensions, or license')
  }
  for (const relative of lock.localExtensions) assertLocalExtension(relative)
  return lock
}

function assertLocalExtension(relative) {
  assertRelativePath(relative)
  if (managed.has(relative) || !relative.startsWith('src/styles/') || !relative.endsWith('.scss')) {
    throw new Error(`Local style extension must stay inside src/styles: ${relative}`)
  }
}

function resolvedImport(relative, specifier) {
  if (!specifier.startsWith('.')) throw new Error(`Only relative style imports are permitted: ${specifier}`)
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), specifier))
  assertRelativePath(resolved)
  return resolved
}

function localImports(root) {
  const source = read(root, 'src/styles/index.scss', true)?.toString('utf8') ?? ''
  const imports = []
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*@(use|forward)\s+["'](\.[^"']+)["'][^;]*;\s*$/)
    if (!match) continue
    const relative = resolvedImport('src/styles/index.scss', match[2])
    if (managed.has(relative)) continue
    assertLocalExtension(relative)
    read(root, relative)
    imports.push({ relative, line })
  }
  return imports
}

function validateDependencies(incoming) {
  const check = (relative, specifier, isUrl = false) => {
    if (/^data:/i.test(specifier)) return
    // These four inherited Giscus themes are the only allowed network imports.
    if (/^https:\/\/giscus\.app\/themes\/(?:transparent_dark|light)\.css$/.test(specifier)) return
    if (!isUrl && (specifier === 'tailwindcss' || /^sass:[a-z-]+$/.test(specifier))) return
    if (/[${}]/.test(specifier)) throw new Error(`Dynamic style dependency needs review: ${relative}`)
    const dependency = resolvedImport(relative, specifier)
    assertManagedPath(dependency)
    if (!incoming.has(dependency)) throw new Error(`Missing upstream style dependency: ${relative} -> ${dependency}`)
  }
  for (const [relative, bytes] of incoming) {
    if (!/\.(?:scss|css)$/.test(relative)) continue
    const source = bytes.toString('utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const match of source.matchAll(/@(use|forward|import)\s+(["'])(.*?)\2/g)) check(relative, match[3])
    for (const match of source.matchAll(/url\(\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s)]*))\s*\)/g)) {
      check(relative, match[1] ?? match[2] ?? match[3], true)
    }
  }
}

function sourceRevision(sourceDir, incoming) {
  try {
    const changed = execFileSync('git', ['-C', sourceDir, 'status', '--porcelain', '--', ...MANAGED_PATHS], { encoding: 'utf8', stdio: 'pipe' })
    const sha = execFileSync('git', ['-C', sourceDir, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: 'pipe' }).trim()
    if (!changed && /^[0-9a-f]{40}$/.test(sha)) return sha
  } catch { /* A plain fixture directory is a supported offline source. */ }
  return `local:${digest(json([...incoming].map(([relative, bytes]) => [relative, digest(bytes)])))}`
}

export function syncTemplateStyles({ sourceDir, targetDir = defaultRoot, check = false, dryRun = false }) {
  const sourceRoot = fs.realpathSync(sourceDir)
  const root = fs.realpathSync(targetDir)
  if (root === sourceRoot || root.startsWith(`${sourceRoot}${path.sep}`) || sourceRoot.startsWith(`${root}${path.sep}`)) {
    throw new Error('Source and target directories must be separate')
  }
  const lock = readLock(root)
  const incoming = new Map()
  for (const relative of MANAGED_PATHS) {
    const bytes = read(sourceRoot, relative, true)
    if (bytes) incoming.set(relative, bytes)
  }
  for (const relative of requiredStyles) {
    if (!incoming.has(relative)) throw new Error(`Required upstream style is missing: ${relative}`)
  }
  const license = read(sourceRoot, 'LICENSE')
  if (!license.toString('utf8').startsWith('MIT License\n') || !license.equals(read(root, 'LICENSE'))) {
    throw new Error('Upstream license changed: review and preserve attribution in LICENSE before syncing')
  }
  validateDependencies(incoming)
  const extensions = localImports(root)
  const sourceCommit = sourceRevision(sourceRoot, incoming)
  const files = {}
  const writes = []
  const deletions = []
  for (const [relative, original] of incoming) {
    let bytes = original
    if (relative === 'src/styles/index.scss' && extensions.length) {
      bytes = Buffer.from(`${original.toString('utf8').trimEnd()}\n${extensions.map((item) => item.line).join('\n')}\n`)
    }
    files[relative] = { sourceSha256: digest(original), sha256: digest(bytes) }
    const current = read(root, relative, true)
    if (current && !current.equals(bytes)) {
      if (!lock?.files[relative]) throw new Error(`Refusing to overwrite an unowned local file: ${relative}`)
      if (digest(current) !== lock.files[relative].sha256) throw new Error(`Local edit conflicts with template ownership: ${relative}`)
    }
    if (!current || !current.equals(bytes)) writes.push({ relative, bytes })
  }
  for (const [relative, previous] of Object.entries(lock?.files ?? {})) {
    if (incoming.has(relative)) continue
    const current = read(root, relative, true)
    if (!current) continue
    if (digest(current) !== previous.sha256) throw new Error(`Refusing to delete a locally edited file: ${relative}`)
    deletions.push(relative)
  }
  const ownershipChanged = !lock || json(lock.files) !== json(files)
  const nextLock = ownershipChanged ? {
    version: 1,
    ...UPSTREAM,
    sourceCommit,
    license: { spdx: 'MIT', path: 'LICENSE', sha256: digest(license) },
    localExtensions: extensions.map((item) => item.relative),
    files,
  } : lock
  const lockChanged = !lock || json(lock) !== json(nextLock)
  const paths = [...writes.map((item) => item.relative), ...deletions, ...(lockChanged ? [LOCK_PATH] : [])].sort()
  if (!check && !dryRun) {
    // All reads, ownership checks, and dependency checks finish before the first write.
    for (const { relative, bytes } of writes) {
      const destination = safePath(root, relative)
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      fs.writeFileSync(destination, bytes)
    }
    for (const relative of deletions) fs.unlinkSync(safePath(root, relative))
    if (lockChanged) {
      const destination = safePath(root, LOCK_PATH)
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      fs.writeFileSync(destination, json(nextLock))
    }
  }
  return { changed: paths.length > 0, sourceCommit, files: incoming.size, writes: writes.map((item) => item.relative), deletions, paths }
}

function parseArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (['--check', '--dry-run', '--help'].includes(argument)) options[argument.slice(2)] = true
    else if (['--source-dir', '--target-dir'].includes(argument) && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      options[argument === '--source-dir' ? 'sourceDir' : 'targetDir'] = path.resolve(argv[++index])
    } else throw new Error(`Unknown argument or missing value: ${argument}`)
  }
  return options
}

function verifyLockedFiles(root, lock) {
  for (const [relative, record] of Object.entries(lock.files)) {
    const current = read(root, relative, true)
    if (!current || digest(current) !== record.sha256) throw new Error(`Local template file differs from lock: ${relative}`)
  }
  for (const relative of lock.localExtensions) read(root, relative)
  if (digest(read(root, 'LICENSE')) !== lock.license?.sha256) throw new Error('Local LICENSE differs from template lock')
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.help) {
    console.log('Usage: node scripts/sync-template-styles.mjs [--check | --dry-run] [--source-dir DIR] [--target-dir DIR]')
    return
  }
  let temporary
  try {
    const targetDir = options.targetDir ?? defaultRoot
    const lock = readLock(targetDir)
    let result
    if (!options.sourceDir) {
      const remote = `https://github.com/${UPSTREAM.repository}.git`
      const head = execFileSync('git', ['ls-remote', '--exit-code', remote, `refs/heads/${UPSTREAM.branch}`], { encoding: 'utf8', timeout: 60_000 }).trim().split(/\s+/)[0]
      if (!/^[0-9a-f]{40}$/.test(head)) throw new Error('Invalid upstream commit SHA')
      if (lock?.sourceCommit === head) {
        verifyLockedFiles(targetDir, lock)
        result = { changed: false, sourceCommit: head, files: Object.keys(lock.files).length, writes: [], deletions: [], paths: [] }
      } else {
        temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vorlage-styles-'))
        options.sourceDir = path.join(temporary, 'source')
        execFileSync('git', ['clone', '--depth', '1', '--single-branch', '--branch', UPSTREAM.branch, remote, options.sourceDir], { stdio: 'pipe', timeout: 180_000 })
      }
    }
    result ??= syncTemplateStyles({ ...options, check: Boolean(options.check), dryRun: Boolean(options['dry-run']) })
    console.log(JSON.stringify(result, null, 2))
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${result.changed}\nsource_commit=${result.sourceCommit}\npaths=${JSON.stringify(result.paths)}\n`)
    if (options.check && result.changed) process.exitCode = 1
    return result
  } finally {
    if (temporary) fs.rmSync(temporary, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) { console.error(`Template style sync failed: ${error.message}`); process.exitCode = 1 }
}
