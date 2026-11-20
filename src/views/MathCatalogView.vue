<template>
  <section class="math-page math-view math-catalog page-surface">
    <div class="math-view__main">
      <RouterLink class="math-back-link" to="/home"><el-icon aria-hidden="true"><Back /></el-icon>返回学习首页</RouterLink>
      <PageHeading
        title="数学专题目录"
        description="按初中、高中和竞赛浏览资料，也可以搜索知识点、题型与方法。专题页提供 PDF 阅读、Word 原件下载及答案解析标记。"
        :icon="Collection"
      />
      <LearningCatalog />
    </div>
  </section>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterLink } from 'vue-router'
import { Back, Collection } from '@element-plus/icons-vue'
import PageHeading from '../components/content/PageHeading.vue'
import LearningCatalog from '../components/learning/LearningCatalog.vue'
import { siteConfig } from '../data/site/config'

watchEffect(() => {
  if (typeof document !== 'undefined') document.title = `数学专题目录 · ${siteConfig.title}`
})
</script>

<style scoped>
.math-view :deep(.page-heading h1) {
  font-family: inherit;
  line-height: 1.4;
}

.math-view__main {
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

.math-back-link:hover,
.math-back-link:focus-visible {
  color: var(--site-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
