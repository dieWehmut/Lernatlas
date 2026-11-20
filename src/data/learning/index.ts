import catalogData from './catalog.json'
import type { Catalog, MaterialDocument, Topic } from './types'

export type { Catalog, Collection, MaterialDocument, Topic } from './types'

export const catalog: Catalog = catalogData as Catalog
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
