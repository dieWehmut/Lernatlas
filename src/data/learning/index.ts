import catalogData from './catalog.json'
import courseCatalogData from './course-catalog.json'
import type { Catalog, CollectionId, MaterialDocument, Topic } from './types'

export type { Catalog, Collection, MaterialDocument, SourceDownload, Topic } from './types'

/**
 * Topic categories that stay out of every browsing surface.
 *
 * The topics are kept in the catalog on purpose: their pages, PDF files and
 * direct links keep working, so hiding a category is a browsing decision and
 * never deletes published material. Only listings (catalog grids, category
 * filters, home counts, related topics) skip them.
 */
const HIDDEN_TOPIC_CATEGORIES: Partial<Record<CollectionId, readonly string[]>> = {
  'grade10-volume1': ['增分测评卷'],
}

/** True when a topic may appear in a catalog listing. */
export function isTopicListed(topic: Topic): boolean {
  const hidden = HIDDEN_TOPIC_CATEGORIES[topic.collectionId]
  return !hidden?.includes(topic.category)
}

const originalCatalog = catalogData as Catalog
const courseCatalog = courseCatalogData as Catalog
const mergedTopics = [...originalCatalog.topics, ...courseCatalog.topics]
const listedTopics = mergedTopics.filter(isTopicListed)
const mergedCollections = [...originalCatalog.collections, ...courseCatalog.collections]
const mergedSubjects = [...new Map(
  [...originalCatalog.subjects, ...courseCatalog.subjects].map((subject) => [subject.id, subject]),
).values()]

export const catalog: Catalog = {
  ...originalCatalog,
  generatedAt: courseCatalog.generatedAt || originalCatalog.generatedAt,
  subjects: mergedSubjects,
  collections: mergedCollections,
  topics: listedTopics,
  stats: {
    sourceFiles: originalCatalog.stats.sourceFiles + courseCatalog.stats.sourceFiles,
    uniqueFiles: originalCatalog.stats.uniqueFiles + courseCatalog.stats.uniqueFiles,
    topics: listedTopics.length,
    pages: originalCatalog.stats.pages + courseCatalog.stats.pages,
    bytes: originalCatalog.stats.bytes + courseCatalog.stats.bytes,
    sourceDownloads: courseCatalog.stats.sourceDownloads ?? { files: 0, bytes: 0 },
  },
}
export const topics = catalog.topics
export const collections = catalog.collections

// Resolve against every topic, including hidden categories, so a direct link to
// a hidden topic still opens instead of falling through to the not-found page.
const topicsById = new Map(mergedTopics.map((topic) => [topic.id, topic]))

export function getTopic(id: string): Topic | undefined {
  return topicsById.get(id)
}

/** Resolve a material from both a root site and a GitHub Pages project site. */
export function materialUrl(document: MaterialDocument): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}${document.url.replace(/^\/+/, '')}`
}
