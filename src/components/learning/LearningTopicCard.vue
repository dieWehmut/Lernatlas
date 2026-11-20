<template>
  <article class="learning-topic-card">
    <div class="learning-topic-card__meta">
      <RouterLink :to="collectionRoute" class="learning-topic-card__collection">
        {{ collectionName }}
      </RouterLink>
      <span>{{ topic.category }}</span>
    </div>
    <h3 class="learning-topic-card__title">
      <RouterLink :to="topicRoute">
        {{ topic.title }}
        <el-icon aria-hidden="true"><ArrowRight /></el-icon>
      </RouterLink>
    </h3>
    <p class="learning-topic-card__summary">{{ topic.summary }}</p>
    <div class="learning-topic-card__tags" aria-label="专题标签">
      <RouterLink
        v-for="tag in topic.tags.slice(0, 4)"
        :key="tag"
        :to="{ path: catalogPath, query: { tag } }"
        class="learning-tag"
      >{{ tag }}</RouterLink>
    </div>
    <div class="learning-topic-card__footer">
      <span class="learning-topic-card__documents">
        <el-icon aria-hidden="true"><Document /></el-icon>
        {{ topic.documents.length }} 份资料 · {{ totalPages }} 页
      </span>
      <span v-if="hasSolutions" class="learning-topic-card__solutions">含答案与解析</span>
      <span v-else class="learning-topic-card__level">{{ topic.difficulty }} · 编辑建议</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Document } from '@element-plus/icons-vue'
import { collections } from '../../data/learning'
import type { Topic } from '../../data/learning'

const props = defineProps<{ topic: Topic }>()
const catalogPath = computed(() => props.topic.subjectId === 'english' ? '/english' : '/math')
const topicRoute = computed(() => ({ path: `${catalogPath.value}/${props.topic.id}` }))
const collectionRoute = computed(() => ({ path: catalogPath.value, query: { collection: props.topic.collectionId } }))
const collectionName = computed(() => collections.find((item) => item.id === props.topic.collectionId)?.name || '数学资料')
const totalPages = computed(() => props.topic.documents.reduce((sum, document) => sum + document.pages, 0))
const hasSolutions = computed(() => props.topic.includesSolutions ?? props.topic.documents.some((document) => document.role === 'solutions'))
</script>

<style scoped>
.learning-topic-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--site-border);
  border-radius: 10px;
  background: rgb(var(--site-accent-rgb) / 0.025);
}

.learning-topic-card__meta,
.learning-topic-card__footer,
.learning-topic-card__documents,
.learning-topic-card__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.learning-topic-card__meta,
.learning-topic-card__footer {
  color: var(--site-muted);
  font-size: 13px;
  line-height: 1.5;
}

.learning-topic-card__collection {
  color: var(--site-accent);
  text-decoration: none;
}

.learning-topic-card__title {
  margin: 0;
  color: var(--site-text);
  font-size: 20px;
  font-weight: 800;
  line-height: 1.45;
}

.learning-topic-card__title a {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.learning-topic-card__title .el-icon {
  flex: 0 0 auto;
  margin-top: 5px;
  color: var(--site-muted);
  font-size: 18px;
}

.learning-topic-card__summary {
  margin: 0;
  color: var(--site-muted);
  font-size: 15px;
  line-height: 1.8;
}

.learning-topic-card__tags {
  gap: 6px;
}

.learning-tag {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 5px;
  color: var(--site-muted);
  background: rgb(var(--site-accent-rgb) / 0.06);
  font-size: 12px;
  line-height: 1.6;
  text-decoration: none;
}

.learning-topic-card__footer {
  justify-content: space-between;
  margin-top: auto;
  padding-top: 8px;
}

.learning-topic-card__documents {
  gap: 5px;
}

.learning-topic-card__solutions {
  color: var(--site-accent);
}

.learning-topic-card a:hover,
.learning-topic-card a:focus-visible {
  color: var(--site-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 640px) {
  .learning-topic-card {
    padding: 18px;
  }
}
</style>
