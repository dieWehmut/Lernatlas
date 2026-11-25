import catalogData from './catalog.json'
import courseCatalogData from './course-catalog.json'
import type { Catalog, CollectionId, MaterialDocument, Topic } from './types'

export type { Catalog, Collection, MaterialDocument, SourceDownload, Topic } from './types'

/**
 * Collections kept off the site, together with every topic inside them.
 *
 * Nothing is deleted: the catalog JSON, the source PDFs and the Word originals
 * stay in the repository, so listing a collection again means removing it from
 * this list. Its topics stop resolving, so an old link reaches the topic
 * missing state instead of a half-populated page.
 */
const HIDDEN_COLLECTIONS: readonly CollectionId[] = ['grade10-volume1']

/** True when a topic may appear on the site. */
export function isTopicListed(topic: Topic): boolean {
  return !HIDDEN_COLLECTIONS.includes(topic.collectionId)
}

/**
 * Recount the publishing statistics from the listed topics, so the headline
 * numbers describe what the site actually offers rather than the raw archive.
 * Pages and bytes are counted once per unique file, matching the importer.
 */
function summarize(topics: readonly Topic[]) {
  const uniqueFiles = new Map<string, MaterialDocument>()
  const sourceDownloads = new Map<string, number>()
  let sourceFiles = 0
  for (const topic of topics) {
    for (const document of topic.documents) {
      sourceFiles += 1
      if (!uniqueFiles.has(document.sha256)) uniqueFiles.set(document.sha256, document)
      const download = document.sourceDownload
      if (download && !sourceDownloads.has(download.sha256)) sourceDownloads.set(download.sha256, download.bytes)
    }
  }
  const files = [...uniqueFiles.values()]
  return {
    sourceFiles,
    uniqueFiles: files.length,
    pages: files.reduce((sum, file) => sum + file.pages, 0),
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    sourceDownloads: {
      files: sourceDownloads.size,
      bytes: [...sourceDownloads.values()].reduce((sum, bytes) => sum + bytes, 0),
    },
  }
}

const originalCatalog = catalogData as Catalog
const courseCatalog = courseCatalogData as Catalog
const mergedTopics = [...originalCatalog.topics, ...courseCatalog.topics]
const listedTopics = mergedTopics.filter(isTopicListed)
const mergedCollections = [...originalCatalog.collections, ...courseCatalog.collections]
const listedCollections = mergedCollections.filter((collection) => !HIDDEN_COLLECTIONS.includes(collection.id))
const mergedSubjects = [...new Map(
  [...originalCatalog.subjects, ...courseCatalog.subjects].map((subject) => [subject.id, subject]),
).values()].filter((subject) => listedCollections.some((collection) => collection.subjectId === subject.id))

export const catalog: Catalog = {
  ...originalCatalog,
  generatedAt: courseCatalog.generatedAt || originalCatalog.generatedAt,
  subjects: mergedSubjects,
  collections: listedCollections,
  topics: listedTopics,
  stats: {
    ...summarize(listedTopics),
    topics: listedTopics.length,
  },
}
export const topics = catalog.topics
export const collections = catalog.collections

const topicsById = new Map(listedTopics.map((topic) => [topic.id, topic]))

export function getTopic(id: string): Topic | undefined {
  return topicsById.get(id)
}

/** Resolve a material from both a root site and a GitHub Pages project site. */
export function materialUrl(document: MaterialDocument): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}${document.url.replace(/^\/+/, '')}`
}
