<template>
  <article class="learning-document-card">
    <div class="learning-document-card__main">
      <div class="learning-document-card__icon" aria-hidden="true">
        <el-icon><Document /></el-icon>
      </div>
      <div class="learning-document-card__body">
        <span class="learning-document-card__role">{{ roleLabel }}</span>
        <h3>{{ document.label }}</h3>
        <p>{{ document.pages }} 页 · {{ formatBytes(document.bytes) }} · PDF</p>
      </div>
    </div>
    <div class="learning-document-card__actions">
      <a
        :href="url"
        target="_blank"
        rel="noopener noreferrer"
        class="learning-action learning-action--primary"
        :aria-label="`在新标签页阅读${document.label}`"
      >
        <el-icon aria-hidden="true"><View /></el-icon>
        在线阅读
        <el-icon class="learning-document-card__external" aria-hidden="true"><TopRight /></el-icon>
      </a>
      <a
        :href="url"
        :download="document.filename"
        class="learning-action"
        :aria-label="`下载${document.label}，PDF格式`"
      >
        <el-icon aria-hidden="true"><Download /></el-icon>
        下载 PDF
      </a>
    </div>
    <details class="learning-document-card__details">
      <summary>文件与来源信息</summary>
      <dl>
        <div><dt>原始文件名</dt><dd>{{ document.filename }}</dd></div>
        <div><dt>资料内路径</dt><dd>{{ document.originalPath }}</dd></div>
        <div><dt>SHA-256</dt><dd><code>{{ document.sha256 }}</code></dd></div>
      </dl>
    </details>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Document, Download, TopRight, View } from '@element-plus/icons-vue'
import { materialUrl } from '../../data/learning'
import type { MaterialDocument } from '../../data/learning'

const props = defineProps<{ document: MaterialDocument }>()
const url = computed(() => materialUrl(props.document))
const roleLabel = computed(() => ({ questions: '题目', solutions: '解析', notes: '讲义' })[props.document.role])

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.learning-document-card {
  display: grid;
  gap: 18px;
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--site-border);
  border-radius: 10px;
  background: rgb(var(--site-accent-rgb) / 0.025);
}

.learning-document-card__main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.learning-document-card__icon {
  display: grid;
  flex: 0 0 42px;
  place-items: center;
  height: 50px;
  border: 1px solid var(--site-border);
  border-radius: 7px;
  color: var(--site-accent);
  font-size: 24px;
}

.learning-document-card__body {
  min-width: 0;
}

.learning-document-card__role {
  color: var(--site-accent);
  font-size: 13px;
}

.learning-document-card h3 {
  margin: 3px 0 6px;
  color: var(--site-text);
  font-size: 18px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.learning-document-card p {
  margin: 0;
  color: var(--site-muted);
  font-size: 14px;
}

.learning-document-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.learning-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  padding: 8px 15px;
  border: 1px solid var(--site-border);
  border-radius: 7px;
  color: var(--site-text);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.learning-action--primary {
  border-color: rgb(var(--site-accent-rgb) / 0.25);
  color: var(--site-accent);
  background: rgb(var(--site-accent-rgb) / 0.08);
}

.learning-action:hover,
.learning-action:focus-visible {
  border-color: var(--site-accent);
  color: var(--site-accent);
  text-decoration: none;
}

.learning-document-card__external {
  font-size: 12px;
}

.learning-document-card__details {
  padding-top: 12px;
  border-top: 1px solid var(--site-border);
  color: var(--site-muted);
  font-size: 12px;
  line-height: 1.7;
}

.learning-document-card__details summary {
  width: fit-content;
  cursor: pointer;
}

.learning-document-card__details dl {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
}

.learning-document-card__details dl > div {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 12px;
}

.learning-document-card__details dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.learning-document-card__details code {
  font-size: 11px;
}

@media (max-width: 640px) {
  .learning-document-card {
    padding: 18px;
  }

  .learning-document-card__actions .learning-action {
    flex: 1 1 auto;
  }

  .learning-document-card__details dl > div {
    grid-template-columns: 1fr;
    gap: 1px;
  }
}
</style>
