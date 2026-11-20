<template>
  <section class="math-page math-view math-topic page-surface">
    <div v-if="topic" class="math-view__main">
      <RouterLink class="math-back-link" :to="collectionRoute">
        <el-icon aria-hidden="true"><Back /></el-icon>返回{{ collectionName }}目录
      </RouterLink>
      <div class="math-topic__meta">
        <RouterLink :to="collectionRoute">{{ collectionName }}</RouterLink>
        <span>{{ topic.category }}</span>
      </div>
      <PageHeading :title="topic.title" :icon="Reading" />

      <section class="learning-section" aria-labelledby="topic-overview">
        <h2 id="topic-overview">专题概览</h2>
        <p class="math-topic__summary">{{ topic.summary }}</p>
        <div class="math-topic__tags" aria-label="专题标签">
          <RouterLink v-for="tag in topic.tags" :key="tag" :to="{ path: '/math', query: { tag } }" class="learning-tag">
            <el-icon aria-hidden="true"><PriceTag /></el-icon>{{ tag }}
          </RouterLink>
        </div>
      </section>

      <section v-if="topicErrata.length" class="learning-section learning-errata" aria-labelledby="topic-errata">
        <div class="learning-section__heading">
          <h2 id="topic-errata">原稿勘误</h2>
          <span>仅供核对学习 · 原始 PDF 保持不变</span>
        </div>
        <article v-for="item in topicErrata" :key="item.id" class="learning-erratum">
          <h3>{{ item.title }}</h3>
          <ul class="learning-erratum__sources">
            <li v-for="source in item.sources" :key="`${source.filename}:${source.page}`">
              <span>对应资料</span><strong>{{ source.filename }}</strong><span>PDF 第 {{ source.page }} 页</span>
            </li>
          </ul>
          <p>{{ item.correction }}</p>
          <details><summary>核对依据</summary><p>{{ item.evidence }}</p></details>
        </article>
      </section>

      <section class="learning-section" aria-labelledby="topic-documents">
        <div class="learning-section__heading">
          <h2 id="topic-documents">题目与解析</h2>
          <span>{{ topic.documents.length }} 份 PDF · {{ totalPages }} 页</span>
        </div>
        <p class="math-topic__document-hint">「在线阅读」会在新标签页打开原始 PDF；也可以下载后离线练习。</p>
        <div class="learning-document-grid">
          <LearningDocumentCard v-for="document in orderedDocuments" :key="document.id" :document="document" />
        </div>
        <p v-if="!hasSolutions" class="math-topic__document-note">这个专题当前只收录题目，尚未配入解析文件。</p>
      </section>

      <section class="learning-section learning-advice" aria-labelledby="topic-advice">
        <h2 id="topic-advice">阅读建议</h2>
        <p class="learning-advice__notice">以下难度与前置知识属于编辑建议，供安排阅读顺序时参考。</p>
        <dl class="learning-advice__list">
          <div><dt>建议难度</dt><dd>{{ topic.difficulty }}</dd></div>
          <div>
            <dt>前置知识</dt>
            <dd>
              <ul v-if="topic.prerequisites.length"><li v-for="item in topic.prerequisites" :key="item">{{ item }}</li></ul>
              <span v-else>可先浏览题目，结合自己的掌握情况选择起点。</span>
            </dd>
          </div>
        </dl>
      </section>

      <section v-if="relatedTopics.length" class="learning-section" aria-labelledby="topic-related">
        <div class="learning-section__heading">
          <h2 id="topic-related">继续学习</h2>
          <RouterLink :to="collectionRoute">浏览同一合集 <el-icon aria-hidden="true"><ArrowRight /></el-icon></RouterLink>
        </div>
        <div class="learning-related-grid">
          <LearningTopicCard v-for="related in relatedTopics" :key="related.id" :topic="related" />
        </div>
      </section>
    </div>
    <div v-else class="math-view__main math-topic__missing">
      <PageHeading title="没有找到这个专题" description="专题链接可能已经调整。回到目录，可以继续按标题或知识点查找资料。" :icon="Warning" />
      <RouterLink class="math-back-link" to="/math"><el-icon aria-hidden="true"><Back /></el-icon>返回数学专题目录</RouterLink>
    </div>
    <ScrollSpySidebar v-if="topic" root-selector=".math-topic .math-view__main" heading-selector="h2[id]" />
  </section>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowRight, Back, PriceTag, Reading, Warning } from '@element-plus/icons-vue'
import PageHeading from '../components/content/PageHeading.vue'
import ScrollSpySidebar from '../components/system/ScrollSpySidebar.vue'
import LearningDocumentCard from '../components/learning/LearningDocumentCard.vue'
import LearningTopicCard from '../components/learning/LearningTopicCard.vue'
import { collections, getTopic, topics } from '../data/learning'
import { getTopicErrata } from '../data/learning/errata'
import { siteConfig } from '../data/site/config'
import type { Topic } from '../data/learning'

const route = useRoute()
const topic = computed(() => getTopic(String(route.params.id || '')))
const topicErrata = computed(() => topic.value ? getTopicErrata(topic.value) : [])
const collectionName = computed(() => collections.find((collection) => collection.id === topic.value?.collectionId)?.name || '数学资料')
const collectionRoute = computed(() => ({ path: '/math', query: { collection: topic.value?.collectionId } }))
const totalPages = computed(() => topic.value?.documents.reduce((sum, document) => sum + document.pages, 0) || 0)
const hasSolutions = computed(() => topic.value?.documents.some((document) => document.role === 'solutions'))
const orderedDocuments = computed(() => {
  const roleOrder = { questions: 0, solutions: 1, notes: 2 }
  return [...(topic.value?.documents || [])].sort((left, right) => roleOrder[left.role] - roleOrder[right.role])
})
const relatedTopics = computed<Topic[]>(() => {
  const current = topic.value
  if (!current) return []
  if (current.relatedIds?.length) {
    return current.relatedIds.map((id) => getTopic(id)).filter((item): item is Topic => Boolean(item && item.id !== current.id)).slice(0, 4)
  }
  return topics.filter((item) => item.id !== current.id && item.collectionId === current.collectionId && item.category === current.category).slice(0, 2)
})

watchEffect(() => {
  if (typeof document !== 'undefined') document.title = `${topic.value?.title || '专题未找到'} · ${siteConfig.title}`
})
</script>

<style scoped>
.math-view :deep(.page-heading h1) {
  font-family: inherit;
  line-height: 1.4;
}

.math-view {
  display: flex;
  align-items: flex-start;
  gap: var(--site-view-aside-gap);
}

.math-view__main {
  flex: 1 1 auto;
  min-width: 0;
}

.math-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
  color: var(--site-muted);
  font-size: 13px;
  text-decoration: none;
}

.math-topic__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
  color: var(--site-muted);
  font-size: 13px;
}

.math-topic__meta a,
.learning-section__heading > a {
  color: var(--site-accent);
  text-decoration: none;
}

.learning-section + .learning-section {
  margin-top: 36px;
}

.learning-section h2 {
  margin: 0 0 16px;
  color: var(--site-text);
  font-size: 23px;
  line-height: 1.45;
  scroll-margin-top: 100px;
}

.learning-section__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}

.learning-section__heading h2 {
  margin: 0;
}

.learning-section__heading > span,
.learning-section__heading > a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--site-muted);
  font-size: 13px;
}

.math-topic__summary {
  margin: 0;
  color: var(--site-text);
  font-size: 17px;
  line-height: 1.9;
}

.math-topic__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.learning-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 5px;
  color: var(--site-muted);
  background: rgb(var(--site-accent-rgb) / 0.06);
  font-size: 13px;
  text-decoration: none;
}

.math-topic__document-hint,
.math-topic__document-note,
.learning-advice__notice {
  margin: 0 0 18px;
  color: var(--site-muted);
  font-size: 14px;
  line-height: 1.8;
}

.math-topic__document-note {
  margin: 14px 0 0;
}

.learning-document-grid,
.learning-related-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.learning-advice {
  padding: 22px;
  border: 1px solid var(--site-border);
  border-radius: 9px;
}

.learning-advice__notice {
  font-size: 13px;
}

.learning-advice__list {
  display: grid;
  gap: 16px;
  margin: 0;
}

.learning-advice__list > div {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 12px;
  font-size: 14px;
  line-height: 1.8;
}

.learning-advice__list dt {
  color: var(--site-muted);
}

.learning-advice__list dd {
  margin: 0;
  color: var(--site-text);
}

.learning-advice__list ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  padding-left: 16px;
}

.learning-erratum {
  display: grid;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--site-border);
  border-inline-start: 3px solid var(--site-accent);
  border-radius: 0 8px 8px 0;
  background: rgb(var(--site-accent-rgb) / 0.035);
}

.learning-erratum + .learning-erratum {
  margin-top: 12px;
}

.learning-erratum h3 {
  margin: 0;
  color: var(--site-text);
  font-size: 17px;
  line-height: 1.5;
}

.learning-erratum p {
  margin: 0;
  color: var(--site-text);
  font-size: 14px;
  line-height: 1.8;
}

.learning-erratum__sources {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  color: var(--site-muted);
  font-size: 12px;
  list-style: none;
}

.learning-erratum__sources li {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.learning-erratum__sources strong {
  color: var(--site-text);
  overflow-wrap: anywhere;
}

.learning-erratum details {
  color: var(--site-muted);
  font-size: 13px;
  line-height: 1.8;
}

.learning-erratum summary {
  width: fit-content;
  cursor: pointer;
}

.learning-erratum details p {
  margin-top: 8px;
  color: var(--site-muted);
  font-size: 13px;
}

.math-topic a:hover,
.math-topic a:focus-visible {
  color: var(--site-accent);
  text-underline-offset: 3px;
}

@media (max-width: 900px) {
  .math-view {
    display: block;
  }
}

@media (max-width: 640px) {
  .learning-document-grid,
  .learning-related-grid {
    grid-template-columns: 1fr;
  }

  .learning-advice {
    padding: 18px;
  }

  .learning-advice__list > div {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .math-topic__summary {
    font-size: 16px;
  }
}
</style>
