import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const roles = new Set(['questions', 'solutions', 'notes'])
const localPath = /file:\/\/|\/(?:tmp|home|Users|private|root|var\/folders)\/|[a-z]:[\\/]|\\\\[^\\\s]+\\/i

function record(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`)
  return value
}

function text(value, label) {
  assert.equal(typeof value, 'string', `${label} must be text`)
  assert.ok(value.trim().length > 0, `${label} must not be empty`)
  return value
}

function integer(value, label, minimum = 0) {
  assert.ok(Number.isSafeInteger(value) && value >= minimum, `${label} must be an integer >= ${minimum}`)
}

function list(value, label, minimum = 0) {
  assert.ok(Array.isArray(value) && value.length >= minimum, `${label} must be an array of at least ${minimum} items`)
  return value
}

function textList(value, label, minimum = 0) {
  list(value, label, minimum).forEach((item, index) => text(item, `${label}[${index}]`))
  assert.equal(new Set(value).size, value.length, `${label} contains duplicates`)
}

function relativePath(value, label) {
  text(value, label)
  assert.ok(!path.posix.isAbsolute(value) && !path.win32.isAbsolute(value), `${label} must be relative`)
  assert.ok(!/[\\?#\0]/.test(value), `${label} must be a plain POSIX path`)
  assert.ok(value.split('/').every((part) => part && part !== '.' && part !== '..'), `${label} must not traverse directories`)
  return value
}

function rejectLocalPaths(value, label) {
  if (typeof value === 'string') assert.ok(!localPath.test(value), `${label} exposes a machine-local path`)
  else if (Array.isArray(value)) value.forEach((item, index) => rejectLocalPaths(item, `${label}[${index}]`))
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) rejectLocalPaths(item, `${label}.${key}`)
  }
}

function indexById(items, label) {
  const indexed = new Map()
  for (const [index, item] of list(items, label, 1).entries()) {
    record(item, `${label}[${index}]`)
    text(item.id, `${label}[${index}].id`)
    assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${label} has an invalid id`)
    assert.ok(!indexed.has(item.id), `${label} contains duplicate id ${item.id}`)
    indexed.set(item.id, item)
  }
  return indexed
}

function materialMetadata(document, label) {
  record(document, label)
  assert.ok(roles.has(document.role), `${label}.role is invalid`)
  text(document.label, `${label}.label`)
  relativePath(document.originalPath, `${label}.originalPath`)
  assert.ok(document.originalPath.endsWith('.pdf'), `${label}.originalPath must name a PDF`)
  relativePath(document.url, `${label}.url`)
  assert.match(document.url, /^materials\/[0-9a-f]{16}\.pdf$/, `${label}.url must be a content-addressed materials/ PDF`)
  integer(document.pages, `${label}.pages`, 1)
  integer(document.bytes, `${label}.bytes`, 1)
  assert.match(text(document.sha256, `${label}.sha256`), /^[0-9a-f]{64}$/, `${label}.sha256 is invalid`)
  assert.equal(document.url, `materials/${document.sha256.slice(0, 16)}.pdf`, `${label}.url does not match its hash`)
}

const sourceKey = (collectionId, originalPath) => `${collectionId}/${originalPath}`
const sum = (items, key) => items.reduce((total, item) => total + item[key], 0)

function statistics(topics, files) {
  const unique = [...new Map(files.map((file) => [file.sha256, file])).values()]
  const pairedTopics = topics.filter((topic) => topic.documents.length === 2).length
  return {
    sourceFiles: files.length,
    uniqueFiles: unique.length,
    topics: topics.length,
    sourcePages: sum(files, 'pages'),
    pages: sum(unique, 'pages'),
    sourceBytes: sum(files, 'bytes'),
    bytes: sum(unique, 'bytes'),
    duplicates: files.length - unique.length,
    pairedTopics,
    unpairedTopics: topics.length - pairedTopics,
  }
}

function compareStatistics(actual, expected, label, keys = Object.keys(expected)) {
  record(actual, label)
  for (const key of keys) {
    integer(actual[key], `${label}.${key}`)
    assert.equal(actual[key], expected[key], `${label}.${key} does not match the records`)
  }
}

export function readLearningData(root = defaultRoot) {
  const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
  return {
    catalog: readJson('src/data/learning/catalog.json'),
    manifest: readJson('content/source-manifest.json'),
  }
}

async function readTypeScriptData(relativeFilename, root = defaultRoot) {
  const filename = path.join(root, relativeFilename)
  const { outputText, diagnostics } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  assert.ok(!diagnostics?.some((item) => item.category === ts.DiagnosticCategory.Error), `${relativeFilename} has TypeScript syntax errors`)
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}

export async function readErrata(root = defaultRoot) {
  return readTypeScriptData('src/data/learning/errata.ts', root)
}

/** Validate the published schema against its independent source and review records. */
export function validateLearningData({ catalog, manifest, errata, getTopicErrata }) {
  record(catalog, 'catalog')
  record(manifest, 'manifest')
  for (const [label, data] of [['catalog', catalog], ['manifest', manifest]]) {
    assert.equal(data.schemaVersion, 1, `${label}.schemaVersion is unsupported`)
    assert.ok(!Number.isNaN(Date.parse(text(data.generatedAt, `${label}.generatedAt`))), `${label}.generatedAt is invalid`)
    rejectLocalPaths(data, label)
  }
  assert.equal(catalog.generatedAt, manifest.generatedAt, 'Catalog and source manifest were generated separately')
  const subjects = indexById(catalog.subjects, 'catalog.subjects')
  const collections = indexById(catalog.collections, 'catalog.collections')
  const topics = indexById(catalog.topics, 'catalog.topics')
  const sourceTopics = indexById(manifest.topics, 'manifest.topics')
  assert.deepEqual(manifest.subjects, catalog.subjects, 'Subject metadata differs between catalog and manifest')
  assert.deepEqual(manifest.collections, catalog.collections, 'Collection metadata differs between catalog and manifest')
  assert.deepEqual([...sourceTopics.keys()].sort(), [...topics.keys()].sort(), 'Manifest and catalog topic IDs differ')

  for (const subject of subjects.values()) {
    text(subject.name, `subject ${subject.id}.name`)
    text(subject.description, `subject ${subject.id}.description`)
  }
  record(manifest.sourceRoots, 'manifest.sourceRoots')
  assert.deepEqual(Object.keys(manifest.sourceRoots).sort(), [...collections.keys()].sort(), 'Source roots must cover every collection')
  for (const collection of collections.values()) {
    assert.ok(subjects.has(collection.subjectId), `Collection ${collection.id} has no subject`)
    text(collection.name, `collection ${collection.id}.name`)
    text(collection.description, `collection ${collection.id}.description`)
    relativePath(manifest.sourceRoots[collection.id], `source root ${collection.id}`)
  }
  const review = record(manifest.review, 'manifest.review')
  assert.ok(!Number.isNaN(Date.parse(text(review.date, 'manifest.review.date'))), 'Review date is invalid')
  for (const key of ['summaryBasis', 'editorialBasis', 'pairingBasis', 'textPolicy']) text(review[key], `manifest.review.${key}`)

  const documents = new Map()
  const documentIds = new Set()
  const urls = new Set()
  const hashes = new Set()
  const publicTopicKeys = ['id', 'subjectId', 'collectionId', 'title', 'category', 'summary', 'tags', 'prerequisites', 'difficulty', 'order', 'relatedIds', 'reportId']
  for (const topic of topics.values()) {
    const label = `topic ${topic.id}`
    assert.ok(collections.has(topic.collectionId), `${label} has no collection`)
    assert.equal(topic.subjectId, collections.get(topic.collectionId).subjectId, `${label} has the wrong subject`)
    for (const key of ['title', 'category', 'summary', 'difficulty']) text(topic[key], `${label}.${key}`)
    textList(topic.tags, `${label}.tags`, 1)
    textList(topic.prerequisites, `${label}.prerequisites`, 1)
    integer(topic.order, `${label}.order`, 1)
    if (topic.relatedIds !== undefined) {
      textList(topic.relatedIds, `${label}.relatedIds`)
      for (const id of topic.relatedIds) assert.ok(id !== topic.id && topics.has(id), `${label} has a broken related topic ${id}`)
    }
    const sourceTopic = sourceTopics.get(topic.id)
    for (const key of publicTopicKeys) assert.deepEqual(sourceTopic[key], topic[key], `${label}.${key} differs from its source record`)
    for (const key of ['key', 'summaryBasis', 'editorialBasis']) text(sourceTopic[key], `manifest ${label}.${key}`)
    assert.equal(topic.id, `${topic.collectionId}-${createHash('sha256').update(sourceTopic.key).digest('hex').slice(0, 12)}`, `${label} has an unstable source-key ID`)
    if (sourceTopic.sourceNotes !== undefined) textList(sourceTopic.sourceNotes, `manifest ${label}.sourceNotes`)
    list(topic.documents, `${label}.documents`, 1)
    assert.ok(topic.documents.length <= 2, `${label} must be a question/solution pair or a single document`)
    const topicRoles = topic.documents.map((document) => document.role).sort()
    if (topicRoles.length === 2) assert.deepEqual(topicRoles, ['questions', 'solutions'], `${label} has an invalid pair`)
    else assert.ok(['questions', 'notes'].includes(topicRoles[0]), `${label} has an orphaned solution`)
    assert.equal(sourceTopic.hasSolutions, topicRoles.includes('solutions'), `${label}.hasSolutions is inconsistent`)
    for (const document of topic.documents) {
      const documentLabel = `${label} document ${document.id}`
      materialMetadata(document, documentLabel)
      assert.equal(document.id, `doc-${document.sha256.slice(0, 16)}`, `${documentLabel} has an unstable ID`)
      assert.equal(document.filename, path.posix.basename(document.originalPath), `${documentLabel}.filename differs from its original path`)
      assert.ok(!documentIds.has(document.id), `Duplicate document ID ${document.id}`)
      assert.ok(!urls.has(document.url) && !hashes.has(document.sha256), `Duplicate published PDF ${document.url}`)
      const key = sourceKey(topic.collectionId, document.originalPath)
      assert.ok(!documents.has(key), `Duplicate canonical source path ${key}`)
      documents.set(key, { document, topic })
      documentIds.add(document.id)
      urls.add(document.url)
      hashes.add(document.sha256)
    }
  }
  for (const collection of collections.values()) {
    const orders = catalog.topics.filter((topic) => topic.collectionId === collection.id).map((topic) => topic.order).sort((a, b) => a - b)
    assert.deepEqual(orders, orders.map((_, index) => index + 1), `Collection ${collection.id} has duplicate or missing reading-order positions`)
  }

  const files = list(manifest.files, 'manifest.files', 1)
  const sourceFiles = new Map()
  for (const file of files) {
    const key = sourceKey(file.collectionId, file.originalPath)
    materialMetadata(file, `source ${key}`)
    assert.ok(!sourceFiles.has(key), `Duplicate source record ${key}`)
    assert.ok(topics.has(file.topicId), `Source ${key} has no topic`)
    assert.equal(topics.get(file.topicId).collectionId, file.collectionId, `Source ${key} has the wrong collection`)
    sourceFiles.set(key, file)
  }
  const matchedDocuments = new Set()
  for (const [key, file] of sourceFiles) {
    const canonicalPath = file.duplicateOf === null ? file.originalPath : relativePath(file.duplicateOf, `source ${key}.duplicateOf`)
    const canonicalKey = sourceKey(file.collectionId, canonicalPath)
    const canonical = sourceFiles.get(canonicalKey)
    assert.ok(canonical && canonical.duplicateOf === null, `Source ${key} has a missing or chained canonical source`)
    assert.ok(file.duplicateOf === null || canonicalKey !== key, `Source ${key} duplicates itself`)
    const published = documents.get(canonicalKey)
    assert.ok(published, `Source ${key} has no published document`)
    assert.equal(file.topicId, published.topic.id, `Source ${key} maps to the wrong topic`)
    for (const field of ['role', 'label', 'url', 'pages', 'bytes', 'sha256']) {
      assert.equal(file[field], published.document[field], `Source ${key}.${field} differs from the published PDF`)
      assert.equal(file[field], canonical[field], `Duplicate source ${key}.${field} differs from its canonical record`)
    }
    matchedDocuments.add(canonicalKey)
    if (file.pairedPath !== null) {
      relativePath(file.pairedPath, `source ${key}.pairedPath`)
      const paired = sourceFiles.get(sourceKey(file.collectionId, file.pairedPath))
      assert.ok(paired && paired !== file, `Source ${key} has a missing pair`)
      assert.equal(paired.pairedPath, file.originalPath, `Source ${key} has a nonreciprocal pair`)
      assert.equal(paired.topicId, file.topicId, `Source ${key} is paired across topics`)
      assert.notEqual(paired.sha256, file.sha256, `Source ${key} is paired with an identical PDF`)
      assert.deepEqual([file.role, paired.role].sort(), ['questions', 'solutions'], `Source ${key} has invalid paired roles`)
      const evidence = record(file.pairingEvidence, `source ${key}.pairingEvidence`)
      text(evidence.method, `source ${key}.pairingEvidence.method`)
      for (const field of ['answerMarkers', 'pairedAnswerMarkers']) integer(evidence[field], `source ${key}.pairingEvidence.${field}`)
      if (evidence.sameOpeningCjkChars !== undefined) integer(evidence.sameOpeningCjkChars, `source ${key}.pairingEvidence.sameOpeningCjkChars`)
      assert.equal(evidence.answerMarkers, paired.pairingEvidence?.pairedAnswerMarkers, `Source ${key} has inconsistent answer evidence`)
      assert.equal(evidence.pairedAnswerMarkers, paired.pairingEvidence?.answerMarkers, `Source ${key} has inconsistent paired answer evidence`)
    } else {
      assert.equal(published.topic.documents.length, 1, `Source ${key} omits its declared pair`)
      text(file.unpairedReason, `source ${key}.unpairedReason`)
    }
  }
  assert.deepEqual([...matchedDocuments].sort(), [...documents.keys()].sort(), 'Published documents are missing from the source manifest')
  const stats = statistics(catalog.topics, files)
  compareStatistics(manifest.stats, stats, 'manifest.stats')
  compareStatistics(catalog.stats, stats, 'catalog.stats', ['sourceFiles', 'uniqueFiles', 'topics', 'pages', 'bytes'])
  record(manifest.collectionStats, 'manifest.collectionStats')
  assert.deepEqual(Object.keys(manifest.collectionStats).sort(), [...collections.keys()].sort(), 'Collection statistics are incomplete')
  for (const collectionId of collections.keys()) {
    compareStatistics(manifest.collectionStats[collectionId], statistics(catalog.topics.filter((topic) => topic.collectionId === collectionId), files.filter((file) => file.collectionId === collectionId)), `collectionStats.${collectionId}`)
  }

  const errataById = indexById(errata, 'errata')
  rejectLocalPaths(errata, 'errata')
  assert.equal(typeof getTopicErrata, 'function', 'getTopicErrata is missing')
  const allDocuments = [...documents.values()].map(({ document }) => document)
  for (const entry of errataById.values()) {
    for (const key of ['title', 'correction', 'evidence']) text(entry[key], `erratum ${entry.id}.${key}`)
    list(entry.sources, `erratum ${entry.id}.sources`, 1)
    const sourceReferences = new Set()
    for (const source of entry.sources) {
      text(source.filename, `erratum ${entry.id}.filename`)
      assert.equal(source.filename, path.posix.basename(source.filename), `Erratum ${entry.id} must cite a filename`)
      integer(source.page, `erratum ${entry.id}.page`, 1)
      const matches = allDocuments.filter((document) => document.filename === source.filename)
      assert.ok(matches.length > 0, `Erratum ${entry.id} cites an unknown document ${source.filename}`)
      assert.ok(matches.every((document) => source.page <= document.pages), `Erratum ${entry.id} cites a page outside ${source.filename}`)
      const reference = `${source.filename}:${source.page}`
      assert.ok(!sourceReferences.has(reference), `Erratum ${entry.id} repeats ${reference}`)
      sourceReferences.add(reference)
    }
  }
  for (const topic of topics.values()) {
    const filenames = new Set(topic.documents.map((document) => document.filename))
    const expected = errata.filter((entry) => entry.sources.some((source) => filenames.has(source.filename))).map((entry) => entry.id).sort()
    assert.deepEqual(getTopicErrata(topic).map((entry) => entry.id).sort(), expected, `Topic ${topic.id} resolves the wrong errata`)
  }
  return { ...stats, errata: errata.length, errataSources: errata.reduce((count, entry) => count + entry.sources.length, 0), collections: collections.size }
}

/** Keep the source learning notes and the committed, compiled metadata in sync. */
export async function verifyLearningNotes(topics, root = defaultRoot) {
  const { generatedDocMeta } = await readTypeScriptData('src/data/docs/generated.ts', root)
  const docsRoot = path.join(root, 'src/data/docs')
  const metadata = list(generatedDocMeta, 'generatedDocMeta', 1)
  rejectLocalPaths(metadata, 'generatedDocMeta')
  const paths = new Set()
  const identities = new Set()
  for (const entry of metadata) {
    record(entry, 'generated note metadata')
    assert.ok(['note', 'post'].includes(entry.type), `Invalid content type for ${entry.id}`)
    text(entry.id, 'generated note ID')
    const identity = `${entry.type}:${entry.id}`
    assert.ok(!identities.has(identity), `Duplicate content identity ${identity}`)
    identities.add(identity)
    text(entry.path, `${identity}.path`)
    assert.ok(entry.path.startsWith('./'), `${identity}.path must be relative to the source docs directory`)
    const sourcePath = relativePath(entry.path.slice(2), `${identity}.path`)
    assert.match(sourcePath, /^(?:notes|posts)\/.+\.md$/, `${identity}.path must point to source notes or posts`)
    assert.ok(!paths.has(sourcePath), `Duplicate compiled source path ${sourcePath}`)
    paths.add(sourcePath)
    const filename = path.join(docsRoot, sourcePath)
    assert.ok(fs.lstatSync(filename).isFile(), `Missing Markdown source ${sourcePath}`)
    const raw = fs.readFileSync(filename, 'utf8')
    rejectLocalPaths(raw, `source note ${sourcePath}`)
    const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---/)
    assert.ok(frontmatter, `Missing frontmatter in ${sourcePath}`)
    const scalar = (key) => frontmatter[1].match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1].trim().replace(/^['"]|['"]$/g, '')
    assert.equal(entry.id, scalar('id') || path.posix.basename(sourcePath, '.md'), `${identity} has an incorrect source ID`)
    assert.equal(entry.type, scalar('type') || (sourcePath.startsWith('notes/') ? 'note' : 'post'), `${identity} has an incorrect source type`)
    for (const field of ['title', 'summary', 'date']) {
      text(entry[field], `${identity}.${field}`)
      if (scalar(field)) assert.equal(entry[field], scalar(field), `${identity}.${field} is stale; run pnpm docs:sync`)
    }
    textList(entry.tags, `${identity}.tags`)
    integer(entry.wordCount, `${identity}.wordCount`, 1)
    integer(entry.readingMinutes, `${identity}.readingMinutes`, 1)
    assert.equal(typeof entry.updated, 'string', `${identity}.updated must be text`)
  }
  function markdownPaths(directory, prefix = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const relative = `${prefix}${entry.name}`
      if (entry.isDirectory()) return markdownPaths(path.join(directory, entry.name), `${relative}/`)
      return entry.name.endsWith('.md') ? [relative] : []
    })
  }
  assert.deepEqual([...paths].sort(), markdownPaths(docsRoot).sort(), 'Compiled metadata does not cover all source Markdown notes')
  for (const topic of topics) {
    if (topic.reportId !== undefined) {
      assert.ok(identities.has(`note:${topic.reportId}`) || identities.has(`post:${topic.reportId}`), `Topic ${topic.id} links to an unknown report ${topic.reportId}`)
    }
  }
  return { notes: metadata.filter((entry) => entry.type === 'note').length, entries: metadata.length }
}

function pdfPaths(directory, prefix = 'materials') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${prefix}/${entry.name}`
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return pdfPaths(fullPath, relative)
    return entry.name.toLowerCase().endsWith('.pdf') ? [relative] : []
  })
}

/** Check every expected PDF and reject missing, extra, redirected or altered copies. */
export function verifyMaterialFiles(catalog, materialRoot) {
  const documents = catalog.topics.flatMap((topic) => topic.documents)
  const expected = new Map()
  let bytes = 0
  for (const document of documents) {
    materialMetadata(document, `material ${document.id}`)
    assert.ok(!expected.has(document.url), `Duplicate material URL ${document.url}`)
    expected.set(document.url, document)
    const filename = path.join(materialRoot, document.url)
    const stat = fs.lstatSync(filename)
    assert.ok(stat.isFile(), `Material is not a regular file: ${document.url}`)
    assert.equal(stat.size, document.bytes, `Material size mismatch: ${document.url}`)
    const contents = fs.readFileSync(filename)
    assert.equal(contents.subarray(0, 5).toString(), '%PDF-', `Material is not a PDF: ${document.url}`)
    assert.equal(createHash('sha256').update(contents).digest('hex'), document.sha256, `Material SHA-256 mismatch: ${document.url}`)
    bytes += stat.size
  }
  const actualPaths = pdfPaths(path.join(materialRoot, 'materials')).sort()
  assert.deepEqual(actualPaths, [...expected.keys()].sort(), `${materialRoot} contains missing or undeclared PDFs`)
  assert.equal(documents.length, catalog.stats.uniqueFiles, 'Unique file statistics disagree with the published files')
  assert.equal(bytes, catalog.stats.bytes, 'Download size statistics disagree with the published files')
  return { files: documents.length, bytes }
}

async function main() {
  const data = readLearningData()
  const { errata, getTopicErrata } = await readErrata()
  const stats = validateLearningData({ ...data, errata, getTopicErrata })
  const verified = verifyMaterialFiles(data.catalog, path.join(defaultRoot, 'public'))
  const notes = await verifyLearningNotes(data.catalog.topics)
  console.log(`PASS catalog schema: ${stats.collections} collections, ${stats.topics} topics`)
  console.log(`PASS source coverage: ${stats.sourceFiles} source records, ${stats.duplicates} duplicate aliases`)
  console.log(`PASS document relationships: ${stats.pairedTopics} pairs, ${stats.unpairedTopics} single documents`)
  console.log(`PASS source integrity: ${verified.files} PDFs, ${verified.bytes} bytes, ${stats.pages} pages`)
  console.log(`PASS errata references: ${stats.errata} entries, ${stats.errataSources} source references, all PDF pages resolve`)
  console.log(`PASS source notes: ${notes.notes} notes, ${notes.entries} compiled metadata entries, all source paths resolve`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`FAIL learning catalog: ${error.message}`)
    process.exitCode = 1
  })
}
