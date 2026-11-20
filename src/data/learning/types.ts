/** Public learning catalog. All paths are relative to the deployed site. */
export type CollectionId = 'junior' | 'senior' | 'competition'
export type DocumentRole = 'questions' | 'solutions' | 'notes'

export interface MaterialDocument {
  id: string
  role: DocumentRole
  label: string
  filename: string
  /** Relative to this document's collection root, never a machine-local path. */
  originalPath: string
  /** Content-addressed PDF path without a leading slash or deployment base. */
  url: string
  pages: number
  bytes: number
  sha256: string
}

export interface Collection {
  id: CollectionId
  subjectId: string
  name: string
  description: string
}

export interface Topic {
  id: string
  subjectId: string
  collectionId: CollectionId
  title: string
  category: string
  summary: string
  tags: string[]
  /** Editorial reading suggestions, rather than labels supplied by the PDF. */
  prerequisites: string[]
  /** Editorial relative level; not an official grade or examination rating. */
  difficulty: string
  order: number
  documents: MaterialDocument[]
  relatedIds?: string[]
  reportId?: string
}

export interface Catalog {
  schemaVersion: 1
  generatedAt: string
  subjects: Array<{ id: string; name: string; description: string }>
  collections: Collection[]
  topics: Topic[]
  stats: {
    sourceFiles: number
    uniqueFiles: number
    topics: number
    /** Physical PDF pages, counted once per unique file. */
    pages: number
    /** Total downloadable bytes, counted once per unique file. */
    bytes: number
  }
}
