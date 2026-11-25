import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function verifyAsset(materialRoot, url, expectedBytes, expectedSha256, expectedMagic) {
  assert.ok(url && !url.startsWith('/') && !url.includes('..'), `expected a safe relative asset URL: ${url}`)
  const publicRoot = path.resolve(materialRoot)
  const assetPath = path.resolve(publicRoot, url)
  assert.ok(assetPath.startsWith(publicRoot + path.sep), `asset escaped the material directory: ${url}`)
  const bytes = fs.readFileSync(assetPath)
  assert.ok(fs.statSync(assetPath).isFile(), `${url}: expected a regular file`)
  assert.equal(bytes.length, expectedBytes, `${url}: byte count mismatch`)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedSha256, `${url}: SHA-256 mismatch`)
  assert.ok(bytes.subarray(0, expectedMagic.length).equals(expectedMagic), `${url}: file signature mismatch`)
}

export function verifyLearningMaterialAssets({ root = defaultRoot, materialRoot = path.join(root, 'public') } = {}) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/data/learning/course-catalog.json'), 'utf8'))
  const original = JSON.parse(fs.readFileSync(path.join(root, 'src/data/learning/catalog.json'), 'utf8'))
  const serialized = JSON.stringify(catalog)

  assert.equal(catalog.schemaVersion, 1)
  assert.equal(catalog.topics.length, 14, 'new materials should have 14 indexed topics')
  assert.equal(catalog.stats.topics, 14)
  assert.equal(catalog.topics.filter((topic) => topic.collectionId === 'english-bridge').length, 14)
  assert.equal(new Set(catalog.topics.map((topic) => topic.id)).size, catalog.topics.length, 'topic ids must be unique')
  assert.equal(new Set([...original.topics, ...catalog.topics].map((topic) => topic.id)).size, original.topics.length + catalog.topics.length, 'new topic ids must not collide with the existing catalog')
  assert.ok(!serialized.includes('/mnt/') && !serialized.includes('\\Desktop\\'), 'local source paths must not be published')

  const verifiedAssets = new Set()
  for (const topic of catalog.topics) {
    assert.ok(topic.title && topic.summary && topic.category, `${topic.id}: missing searchable metadata`)
    assert.ok(['math', 'english'].includes(topic.subjectId), `${topic.id}: invalid subject`)
    assert.equal(topic.collectionId === 'english-bridge', topic.subjectId === 'english', `${topic.id}: subject and collection mismatch`)
    assert.ok(topic.documents.length > 0, `${topic.id}: missing documents`)

    for (const document of topic.documents) {
      assert.ok(document.pages > 0, `${document.id}: invalid page count`)
      const pdfKey = `${document.url}:${document.sha256}`
      if (!verifiedAssets.has(pdfKey)) {
        verifyAsset(materialRoot, document.url, document.bytes, document.sha256, Buffer.from('%PDF-'))
        verifiedAssets.add(pdfKey)
      }

      assert.equal(document.role, 'lesson')
      assert.ok(document.sourceDownload, `${document.id}: missing original DOCX download`)
      assert.equal(document.sourceDownload.format, 'docx')
      const docxKey = `${document.sourceDownload.url}:${document.sourceDownload.sha256}`
      if (!verifiedAssets.has(docxKey)) {
        verifyAsset(materialRoot, document.sourceDownload.url, document.sourceDownload.bytes, document.sourceDownload.sha256, Buffer.from('PK'))
        verifiedAssets.add(docxKey)
      }
    }
  }

  assert.equal(verifiedAssets.size, 28, 'each PDF and original DOCX should be represented exactly once')
  assert.equal(catalog.stats.sourceFiles, 14)
  assert.equal(catalog.stats.uniqueFiles, 14)
  assert.equal(catalog.stats.pages, 294)
  assert.equal(catalog.stats.bytes, 6_102_295)
  assert.equal(catalog.stats.sourceDownloads.files, 14)
  assert.equal(catalog.stats.sourceDownloads.bytes, 5_334_385)

  return { topics: catalog.topics.length, assets: verifiedAssets.size, pages: catalog.stats.pages }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyLearningMaterialAssets()
  console.log(`Verified ${result.topics} topics and ${result.assets} PDF/DOCX assets (${result.pages} pages).`)
}
