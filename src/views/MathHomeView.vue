<template>
  <section class="math-page math-view math-home page-surface">
    <div class="math-view__main">
      <PageHeading
        title="学科资料站"
        description="把数学与英语资料整理成可检索、可阅读的专题目录。按学科和资料合集浏览，结合原始资料安排学习。"
        :icon="Reading"
      />
      <dl class="learning-stats" aria-label="已收录资料统计">
        <div><dt>课程专题</dt><dd>{{ catalog.stats.topics }}<span>个</span></dd></div>
        <div><dt>PDF 阅读文件</dt><dd>{{ catalog.stats.uniqueFiles }}<span>份</span></dd></div>
        <div><dt>资料页数</dt><dd>{{ catalog.stats.pages.toLocaleString('zh-CN') }}<span>页</span></dd></div>
      </dl>

      <section class="learning-section" aria-labelledby="learning-subjects">
        <div class="learning-section__heading">
          <h2 id="learning-subjects">从学科开始</h2>
          <span>按学科查找资料</span>
        </div>
        <RouterLink
          v-for="subject in catalog.subjects"
          :key="subject.id"
          :to="subjectPath(subject.id)"
          class="learning-subject-card"
        >
          <span class="learning-subject-card__icon" aria-hidden="true"><el-icon><component :is="subjectIcon(subject.id)" /></el-icon></span>
          <span class="learning-subject-card__body">
            <strong>{{ subject.name }}</strong>
            <span>{{ subject.description }}</span>
            <small>{{ subjectTopics(subject.id).length }} 个专题</small>
          </span>
          <el-icon class="learning-subject-card__arrow" aria-hidden="true"><ArrowRight /></el-icon>
        </RouterLink>
      </section>

      <section
        v-for="subject in catalog.subjects"
        :key="`collections-${subject.id}`"
        class="learning-section"
        :aria-labelledby="`learning-collections-${subject.id}`"
      >
        <div class="learning-section__heading">
          <h2 :id="`learning-collections-${subject.id}`">按{{ subject.name }}资料合集浏览</h2>
          <RouterLink :to="subjectPath(subject.id)">全部专题 <el-icon aria-hidden="true"><ArrowRight /></el-icon></RouterLink>
        </div>
        <div class="learning-collections">
          <RouterLink
            v-for="collection in subjectCollections(subject.id)"
            :key="collection.id"
            :to="{ path: subjectPath(subject.id), query: { collection: collection.id } }"
            class="learning-collection-card"
          >
            <el-icon class="learning-collection-card__icon" aria-hidden="true"><component :is="collectionIcon(collection.id)" /></el-icon>
            <h3>{{ collection.name }}</h3>
            <p>{{ collection.description }}</p>
            <span>{{ collectionCount(collection.id) }} 个专题 <el-icon aria-hidden="true"><ArrowRight /></el-icon></span>
          </RouterLink>
        </div>
      </section>

      <LearningCatalog
        subject-id="math"
        heading-id="home-search-math"
        title="搜索数学专题"
        :preview-limit="6"
      />

      <section class="learning-section learning-guide" aria-labelledby="learning-guide">
        <h2 id="learning-guide">怎样使用这些资料</h2>
        <ol>
          <li><strong>找到一个专题</strong><span>按学科与资料合集浏览，也可以搜索知识点、题型和语言规则。</span></li>
          <li><strong>打开资料阅读</strong><span>进入专题页在线阅读 PDF，也可以下载 PDF 或原始 Word 文件。</span></li>
          <li><strong>结合资料复习</strong><span>专题会注明是否标记含答案与解析；请结合原始文件内容使用。</span></li>
        </ol>
        <p class="learning-guide__note">
          专题难度与前置知识是编辑阅读建议；原始资料内容以 PDF 为准。
          <RouterLink to="/about">了解资料整理方式</RouterLink>
        </p>
      </section>
    </div>
    <ScrollSpySidebar root-selector=".math-home .math-view__main" heading-selector="h2[id]" />
  </section>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, ChatDotRound, Notebook, Reading, Trophy } from '@element-plus/icons-vue'
import PageHeading from '../components/content/PageHeading.vue'
import ScrollSpySidebar from '../components/system/ScrollSpySidebar.vue'
import LearningCatalog from '../components/learning/LearningCatalog.vue'
import { catalog, collections, topics } from '../data/learning'
import { siteConfig } from '../data/site/config'
import type { CollectionId } from '../data/learning/types'

const collectionIcons: Record<string, typeof Notebook> = {
  junior: Notebook,
  senior: Reading,
  competition: Trophy,
  'english-bridge': ChatDotRound,
}

function subjectPath(subjectId: string): string {
  return subjectId === 'english' ? '/english' : '/math'
}

function subjectIcon(subjectId: string) {
  return subjectId === 'english' ? ChatDotRound : Reading
}

function subjectTopics(subjectId: string) {
  return topics.filter((topic) => topic.subjectId === subjectId)
}

function subjectCollections(subjectId: string) {
  return collections.filter((collection) => collection.subjectId === subjectId)
}

function collectionIcon(collectionId: CollectionId) {
  return collectionIcons[collectionId] || Notebook
}

function collectionCount(id: CollectionId): number {
  return topics.filter((topic) => topic.collectionId === id).length
}

watchEffect(() => {
  if (typeof document !== 'undefined') document.title = siteConfig.title
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

.learning-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 42px;
}

.learning-stats > div {
  padding: 18px;
  border: 1px solid var(--site-border);
  border-radius: 8px;
  background: rgb(var(--site-accent-rgb) / 0.025);
}

.learning-stats dt {
  color: var(--site-muted);
  font-size: 13px;
}

.learning-stats dd {
  margin: 8px 0 0;
  color: var(--site-accent);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 34px;
  font-weight: 800;
  line-height: 1.2;
}

.learning-stats dd span {
  margin-left: 6px;
  color: var(--site-muted);
  font-family: var(--font-family-base);
  font-size: 12px;
  font-weight: 400;
}

.learning-section + .learning-section {
  margin-top: 42px;
}

.learning-section__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 18px;
}

.learning-section h2 {
  margin: 0;
  color: var(--site-text);
  font-size: 24px;
  line-height: 1.4;
  scroll-margin-top: 100px;
}

.learning-section__heading > span {
  color: var(--site-muted);
  font-size: 13px;
}

.learning-section__heading > a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--site-accent);
  font-size: 13px;
  text-decoration: none;
}

.learning-subject-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  border: 1px solid rgb(var(--site-accent-rgb) / 0.25);
  border-radius: 10px;
  color: var(--site-text);
  background: rgb(var(--site-accent-rgb) / 0.05);
  text-decoration: none;
}

.learning-subject-card__icon {
  display: grid;
  flex: 0 0 58px;
  place-items: center;
  height: 64px;
  border-radius: 10px;
  color: var(--site-accent);
  background: rgb(var(--site-accent-rgb) / 0.08);
  font-size: 32px;
}

.learning-subject-card__body {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.learning-subject-card__body strong {
  color: var(--site-text);
  font-size: 24px;
}

.learning-subject-card__body > span {
  color: var(--site-muted);
  font-size: 15px;
  line-height: 1.8;
}

.learning-subject-card__body small {
  color: var(--site-accent);
  font-size: 12px;
}

.learning-subject-card__arrow {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--site-accent);
  font-size: 22px;
}

.learning-collections {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.learning-collection-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--site-border);
  border-radius: 9px;
  color: var(--site-text);
  background: rgb(var(--site-accent-rgb) / 0.025);
  text-decoration: none;
}

.learning-collection-card__icon {
  color: var(--site-accent);
  font-size: 25px;
}

.learning-collection-card h3 {
  margin: 0;
  font-size: 18px;
}

.learning-collection-card p {
  margin: 0;
  color: var(--site-muted);
  font-size: 13px;
  line-height: 1.8;
}

.learning-collection-card > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  color: var(--site-accent);
  font-size: 12px;
}

.learning-subject-card:hover,
.learning-collection-card:hover {
  border-color: rgb(var(--site-accent-rgb) / 0.55);
  text-decoration: none;
}

.learning-subject-card:focus-visible,
.learning-collection-card:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 3px;
}

.learning-guide {
  padding-top: 28px;
  border-top: 1px solid var(--site-border);
}

.learning-guide ol {
  display: grid;
  gap: 16px;
  margin: 20px 0;
  padding-left: 22px;
  color: var(--site-accent);
}

.learning-guide li {
  padding-left: 6px;
}

.learning-guide li strong,
.learning-guide li span {
  display: block;
}

.learning-guide li strong {
  margin-bottom: 4px;
  color: var(--site-text);
  font-size: 15px;
}

.learning-guide li span,
.learning-guide__note {
  color: var(--site-muted);
  font-size: 14px;
  line-height: 1.8;
}

.learning-guide__note {
  margin: 24px 0 0;
}

.learning-guide__note a {
  color: var(--site-accent);
  text-underline-offset: 3px;
}

@media (max-width: 900px) {
  .math-view {
    display: block;
  }
}

@media (max-width: 640px) {
  .learning-stats {
    gap: 8px;
    margin-bottom: 32px;
  }

  .learning-stats > div {
    padding: 14px 10px;
  }

  .learning-stats dt {
    font-size: 12px;
  }

  .learning-stats dd {
    font-size: 26px;
  }

  .learning-stats dd span {
    margin-left: 3px;
  }

  .learning-section + .learning-section {
    margin-top: 32px;
  }

  .learning-subject-card {
    gap: 14px;
    padding: 20px 16px;
  }

  .learning-subject-card__icon {
    flex-basis: 42px;
    height: 50px;
    font-size: 25px;
  }

  .learning-subject-card__body strong {
    font-size: 22px;
  }

  .learning-subject-card__body > span {
    font-size: 14px;
  }

  .learning-subject-card__arrow {
    display: none;
  }

  .learning-collections {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .learning-collection-card {
    gap: 10px;
    padding: 18px;
  }
}
</style>
