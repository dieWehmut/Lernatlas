import { ref } from 'vue'
import type { WebsiteEntry } from '../../types/content'

export const pages = ref<WebsiteEntry[]>([
  {
    name: 'Lernatlas',
    displayName: '学科资料站',
    repoUrl: 'https://github.com/dieWehmut/Lernatlas',
    date: '2026-11-20',
    url: 'https://diewehmut.github.io/Lernatlas/',
  },
])

export default pages
