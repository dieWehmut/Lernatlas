import catalogData from './catalog.json'
import courseCatalogData from './course-catalog.json'
import type { Catalog, MaterialDocument, Topic } from './types'

export type { Catalog, Collection, MaterialDocument, SourceDownload, Topic } from './types'

const originalCatalog = catalogData as Catalog
const courseCatalog = courseCatalogData as Catalog
const mergedTopics = [...originalCatalog.topics, ...courseCatalog.topics]
const mergedCollections = [...originalCatalog.collections, ...courseCatalog.collections]
const mergedSubjects = [...new Map(
  [...originalCatalog.subjects, ...courseCatalog.subjects].map((subject) => [subject.id, subject]),
).values()]

export const catalog: Catalog = {
  ...originalCatalog,
  generatedAt: courseCatalog.generatedAt || originalCatalog.generatedAt,
  subjects: mergedSubjects,
  collections: mergedCollections,
  topics: mergedTopics,
  stats: {
    sourceFiles: originalCatalog.stats.sourceFiles + courseCatalog.stats.sourceFiles,
    uniqueFiles: originalCatalog.stats.uniqueFiles + courseCatalog.stats.uniqueFiles,
    topics: mergedTopics.length,
    pages: originalCatalog.stats.pages + courseCatalog.stats.pages,
    bytes: originalCatalog.stats.bytes + courseCatalog.stats.bytes,
    sourceDownloads: courseCatalog.stats.sourceDownloads ?? { files: 0, bytes: 0 },
  },
}
export const topics = catalog.topics
export const collections = catalog.collections

const topicsById = new Map(topics.map((topic) => [topic.id, topic]))

export function getTopic(id: string): Topic | undefined {
  return topicsById.get(id)
}

/** Resolve a material from both a root site and a GitHub Pages project site. */
export function materialUrl(document: MaterialDocument): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}${document.url.replace(/^\/+/, '')}`
}
