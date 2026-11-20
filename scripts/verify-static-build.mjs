import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readLearningData, verifyMaterialFiles } from './test-learning-catalog.mjs'
import { verifyLearningMaterialAssets } from './test-learning-material-assets.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function normalizeBasePath(value = '/') {
  const trimmed = value.trim()
  return !trimmed || trimmed === '/' ? '/' : `/${trimmed.replace(/^\/+|\/+$/g, '')}/`
}

export function verifyStaticBuild({ directory = path.join(root, 'dist'), base = normalizeBasePath(process.env.BASE_PATH || process.env.VITE_BASE_PATH) } = {}) {
  assert.ok(base.startsWith('/') && base.endsWith('/'), 'BASE_PATH must be absolute with a trailing slash')
  assert.ok(!/[\\?#\0]/.test(base) && !base.split('/').some((part) => part === '.' || part === '..'), 'BASE_PATH must not contain traversal or URL syntax')
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8')
  assert.equal(fs.readFileSync(path.join(directory, '404.html'), 'utf8'), html, 'The SPA 404 fallback differs from index.html')
  assert.ok(/<div\b[^>]*\bid=["']app["']/.test(html), 'The application mount point is missing')
  const localAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((url) => !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url))
  assert.ok(localAssets.length > 0, 'No local entry assets were built')
  assert.ok(/<script\b[^>]*type=["']module["'][^>]*src=/.test(html), 'The bundled module entry point is missing')
  for (const url of localAssets) {
    assert.ok(url.startsWith(base), `Entry asset does not use ${base}: ${url}`)
    const relative = decodeURIComponent(url.slice(base.length).split(/[?#]/)[0])
    assert.ok(relative && !path.posix.isAbsolute(relative) && !path.win32.isAbsolute(relative), `Entry asset is not relative to the deployment base: ${url}`)
    assert.ok(!relative.includes('\\') && relative.split('/').every((part) => part && part !== '.' && part !== '..'), `Entry asset traverses the build directory: ${url}`)
    assert.ok(fs.lstatSync(path.join(directory, relative)).isFile(), `Entry asset is missing: ${url}`)
  }
  const { catalog } = readLearningData()
  const materials = verifyMaterialFiles(catalog, directory)
  const courseMaterials = verifyLearningMaterialAssets({ materialRoot: directory })
  return { base, entryAssets: localAssets.length, ...materials, courseMaterials }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyStaticBuild()
    console.log(`PASS static entry: ${result.entryAssets} assets and the 404 fallback at ${result.base}`)
    console.log(`PASS deployed PDF integrity: ${result.files} PDFs, ${result.bytes} bytes, all SHA-256 hashes match the catalog`)
    console.log(`PASS course materials: ${result.courseMaterials.topics} topics and ${result.courseMaterials.assets} PDF/DOCX assets in the build`)
  } catch (error) {
    console.error(`FAIL static build: ${error.message}`)
    process.exitCode = 1
  }
}
