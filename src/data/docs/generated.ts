export type GeneratedDocMeta = {
  id: string
  type: 'post' | 'note'
  title: string
  date: string
  tags: string[]
  summary: string
  wordCount: number
  readingMinutes: number
  updated: string
  codeRunner?: boolean
  path: string
}

export const generatedDocMeta: GeneratedDocMeta[] = [
  {
    "id": "math-learning-guide",
    "type": "note",
    "title": "数学资料的学习路线",
    "date": "2026-11-20",
    "tags": [
      "数学",
      "学习路线",
      "阅读方法"
    ],
    "summary": "按前置知识安排初中数学、高中专题与竞赛拓展的练习顺序，并区分原始讲义和校正提示。",
    "wordCount": 808,
    "readingMinutes": 3,
    "updated": "2026/10/30 16:15",
    "path": "./notes/math-learning-guide.md"
  }
] as GeneratedDocMeta[]

export default generatedDocMeta
