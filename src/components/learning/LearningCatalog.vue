<template>
  <section class="learning-catalog learning-section" :aria-labelledby="headingId">
    <div class="learning-section__heading">
      <h2 :id="headingId">{{ title }}</h2>
      <span class="learning-catalog__total">{{ topics.length }} 个专题</span>
    </div>
    <form class="learning-search" role="search" @submit.prevent="persistFilters">
      <label :for="`${headingId}-search`" class="learning-sr-only">搜索数学专题</label>
      <div class="learning-search__input">
        <el-icon aria-hidden="true"><Search /></el-icon>
        <input
          :id="`${headingId}-search`"
          v-model="query"
          type="search"
          name="q"
          autocomplete="off"
          placeholder="搜索专题、知识点或关键词"
          :aria-describedby="`${headingId}-hint`"
        />
      </div>
      <button class="learning-search__submit" type="submit">搜索</button>
    </form>
    <p :id="`${headingId}-hint`" class="learning-search__hint">
      可搜索标题、摘要、标签和前置知识，例如「函数」「几何」「数列」。
    </p>
    <div class="learning-filters">
      <div class="learning-filters__collections" role="group" aria-label="按资料合集筛选">
        <button
          type="button"
          :class="{ 'is-active': !selectedCollection }"
          :aria-pressed="!selectedCollection"
          @click="selectCollection('')"
        >全部<span>{{ topics.length }}</span></button>
        <button
          v-for="collection in collections"
          :key="collection.id"
          type="button"
          :class="{ 'is-active': selectedCollection === collection.id }"
          :aria-pressed="selectedCollection === collection.id"
          @click="selectCollection(collection.id)"
        >{{ collection.name }}<span>{{ collectionCount(collection.id) }}</span></button>
      </div>
      <div class="learning-filters__secondary">
        <label :for="`${headingId}-category`">专题方向</label>
        <select :id="`${headingId}-category`" :value="selectedCategory" @change="selectCategory">
          <option value="">全部方向</option>
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>
        <button v-if="hasFilters" type="button" class="learning-filters__clear" @click="clearFilters">
          清除筛选
        </button>
      </div>
    </div>
    <div v-if="selectedTag" class="learning-catalog__tag-filter">
      <span>标签：{{ selectedTag }}</span>
      <button type="button" @click="clearTag" :aria-label="`取消标签${selectedTag}的筛选`">
        <el-icon aria-hidden="true"><Close /></el-icon>
      </button>
    </div>
    <p class="learning-catalog__result-count" role="status" aria-live="polite">
      找到 <strong>{{ filteredTopics.length }}</strong> 个专题<span v-if="hiddenCount > 0">，先显示 {{ visibleTopics.length }} 个</span>
    </p>
    <div v-if="visibleTopics.length" class="learning-topic-grid">
      <LearningTopicCard v-for="topic in visibleTopics" :key="topic.id" :topic="topic" />
    </div>
    <div v-else class="learning-empty">
      <el-icon aria-hidden="true"><Search /></el-icon>
      <h3>暂时没有匹配的专题</h3>
      <p>试试更短的关键词，或清除当前筛选。</p>
      <button type="button" @click="clearFilters">查看全部专题</button>
    </div>
    <RouterLink v-if="hiddenCount > 0" class="learning-catalog__more" :to="allResultsRoute">
      查看全部 {{ filteredTopics.length }} 个专题
      <el-icon aria-hidden="true"><ArrowRight /></el-icon>
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowRight, Close, Search } from '@element-plus/icons-vue'
import LearningTopicCard from './LearningTopicCard.vue'
import { collections, topics } from '../../data/learning'
import type { CollectionId } from '../../data/learning/types'

const props = withDefaults(defineProps<{
  title?: string
  headingId?: string
  previewLimit?: number
}>(), {
  title: '专题目录',
  headingId: 'math-catalog',
  previewLimit: 0,
})

const route = useRoute()
const router = useRouter()
const query = ref('')
const selectedCollection = ref<CollectionId | ''>('')
const selectedCategory = ref('')
const selectedTag = ref('')

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function syncRouteFilters() {
  query.value = queryString(route.query.q)
  const collection = queryString(route.query.collection)
  selectedCollection.value = collections.some((item) => item.id === collection) ? collection as CollectionId : ''
  selectedCategory.value = queryString(route.query.category)
  selectedTag.value = queryString(route.query.tag)
}

syncRouteFilters()
watch(() => route.query, syncRouteFilters)

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().trim()
}

const categories = computed(() => [...new Set(topics
  .filter((topic) => !selectedCollection.value || topic.collectionId === selectedCollection.value)
  .map((topic) => topic.category))]
  .sort((left, right) => left.localeCompare(right, 'zh-CN')))

const filteredTopics = computed(() => {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean)
  return topics.filter((topic) => {
    if (selectedCollection.value && topic.collectionId !== selectedCollection.value) return false
    if (selectedCategory.value && topic.category !== selectedCategory.value) return false
    if (selectedTag.value && !topic.tags.some((tag) => normalize(tag) === normalize(selectedTag.value))) return false
    if (!terms.length) return true
    const collection = collections.find((item) => item.id === topic.collectionId)
    const text = normalize([
      topic.title,
      topic.summary,
      topic.category,
      collection?.name || '',
      ...topic.tags,
      ...topic.prerequisites,
    ].join(' '))
    return terms.every((term) => text.includes(term))
  })
})

const visibleTopics = computed(() => props.previewLimit > 0
  ? filteredTopics.value.slice(0, props.previewLimit)
  : filteredTopics.value)
const hiddenCount = computed(() => filteredTopics.value.length - visibleTopics.value.length)
const hasFilters = computed(() => Boolean(query.value || selectedCollection.value || selectedCategory.value || selectedTag.value))

const filterQuery = computed(() => {
  const result: Record<string, string> = {}
  if (query.value.trim()) result.q = query.value.trim()
  if (selectedCollection.value) result.collection = selectedCollection.value
  if (selectedCategory.value) result.category = selectedCategory.value
  if (selectedTag.value) result.tag = selectedTag.value
  return result
})
const allResultsRoute = computed(() => ({ path: '/math', query: filterQuery.value }))

function collectionCount(id: CollectionId): number {
  return topics.filter((topic) => topic.collectionId === id).length
}

function persistFilters() {
  void router.replace({ path: route.path, query: filterQuery.value })
}

function selectCollection(id: CollectionId | '') {
  selectedCollection.value = id
  selectedCategory.value = ''
  persistFilters()
}

function selectCategory(event: Event) {
  selectedCategory.value = (event.target as HTMLSelectElement).value
  persistFilters()
}

function clearTag() {
  selectedTag.value = ''
  persistFilters()
}

function clearFilters() {
  query.value = ''
  selectedCollection.value = ''
  selectedCategory.value = ''
  selectedTag.value = ''
  persistFilters()
}
</script>

<style scoped>
.learning-section__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 20px;
}

.learning-section__heading h2 {
  margin: 0;
  color: var(--site-text);
  font-size: 24px;
  line-height: 1.4;
  scroll-margin-top: 100px;
}

.learning-catalog__total,
.learning-search__hint,
.learning-catalog__result-count {
  color: var(--site-muted);
  font-size: 13px;
  line-height: 1.7;
}

.learning-search {
  display: flex;
  gap: 10px;
}

.learning-search__input {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 54px;
  padding: 0 16px;
  border: 1px solid var(--site-border);
  border-radius: 8px;
  color: var(--site-muted);
  background: rgb(var(--site-accent-rgb) / 0.025);
}

.learning-search__input:focus-within {
  border-color: var(--site-accent);
}

.learning-search__input > .el-icon {
  flex: 0 0 auto;
  font-size: 21px;
}

.learning-search input {
  width: 100%;
  min-width: 0;
  padding: 12px 0;
  border: 0;
  outline: none;
  color: var(--site-text);
  background: transparent;
  font: inherit;
  font-size: 16px;
}

.learning-search input::placeholder {
  color: var(--site-muted);
  opacity: 0.8;
}

.learning-search__submit,
.learning-empty button {
  flex: 0 0 auto;
  padding: 10px 20px;
  border: 1px solid rgb(var(--site-accent-rgb) / 0.3);
  border-radius: 8px;
  color: var(--site-accent);
  background: rgb(var(--site-accent-rgb) / 0.09);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.learning-search__hint {
  margin: 8px 0 20px;
}

.learning-filters {
  display: grid;
  gap: 14px;
}

.learning-filters__collections {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.learning-filters__collections button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 13px;
  border: 1px solid var(--site-border);
  border-radius: 7px;
  color: var(--site-muted);
  background: transparent;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.learning-filters__collections button span {
  font-size: 11px;
  opacity: 0.75;
}

.learning-filters__collections button.is-active {
  border-color: rgb(var(--site-accent-rgb) / 0.35);
  color: var(--site-accent);
  background: rgb(var(--site-accent-rgb) / 0.08);
}

.learning-filters__secondary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  color: var(--site-muted);
  font-size: 13px;
}

.learning-filters__secondary select {
  min-height: 36px;
  max-width: 100%;
  padding: 5px 30px 5px 10px;
  border: 1px solid var(--site-border);
  border-radius: 5px;
  color: var(--site-text);
  background: var(--site-bg);
  font: inherit;
}

.learning-filters__clear {
  padding: 5px 0;
  border: 0;
  color: var(--site-muted);
  background: transparent;
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.learning-catalog__tag-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 5px 9px;
  border-radius: 5px;
  color: var(--site-accent);
  background: rgb(var(--site-accent-rgb) / 0.08);
  font-size: 13px;
}

.learning-catalog__tag-filter button {
  display: grid;
  place-items: center;
  padding: 3px;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.learning-catalog__result-count {
  margin: 22px 0 14px;
}

.learning-catalog__result-count strong {
  color: var(--site-text);
}

.learning-topic-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.learning-catalog__more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-top: 18px;
  border: 1px solid var(--site-border);
  border-radius: 7px;
  color: var(--site-accent);
  font-size: 14px;
  text-decoration: none;
}

.learning-empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 40px 20px;
  border: 1px dashed var(--site-border);
  border-radius: 9px;
  color: var(--site-muted);
  text-align: center;
}

.learning-empty > .el-icon {
  font-size: 30px;
}

.learning-empty h3,
.learning-empty p {
  margin: 0;
}

.learning-empty h3 {
  color: var(--site-text);
  font-size: 18px;
}

.learning-empty p {
  font-size: 14px;
}

.learning-catalog button:focus-visible,
.learning-catalog select:focus-visible,
.learning-catalog a:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 3px;
}

.learning-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .learning-topic-grid {
    grid-template-columns: 1fr;
  }

  .learning-search {
    gap: 8px;
  }

  .learning-search__input {
    gap: 8px;
    padding-inline: 12px;
  }

  .learning-search input {
    font-size: 14px;
  }

  .learning-search__submit {
    padding-inline: 14px;
  }

  .learning-filters__collections {
    gap: 6px;
  }

  .learning-filters__collections button {
    gap: 6px;
    padding-inline: 10px;
    font-size: 13px;
  }
}
</style>
