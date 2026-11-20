<template>
  <div class="learning-category-select">
    <ElSelect
      :id="id"
      ref="selectRef"
      :model-value="modelValue"
      name="category"
      class="learning-category-select__control"
      aria-label="专题方向，可输入关键词筛选"
      filterable
      default-first-option
      fit-input-width
      :empty-values="[null, undefined]"
      placeholder="全部方向"
      no-match-text="没有匹配方向，请尝试其他关键词"
      no-data-text="暂无专题方向"
      popper-class="learning-category-popper"
      :popper-style="{ zIndex: 2200 }"
      :show-arrow="false"
      @update:model-value="updateValue"
    >
      <ElOption
        v-for="option in categoryOptions"
        :key="option.value"
        :value="option.value"
        :label="option.label"
      >
        <span class="learning-category-option__label">{{ option.label }}</span>
        <span class="learning-category-option__count">{{ option.count }} 个专题</span>
      </ElOption>
    </ElSelect>
    <button
      v-if="modelValue"
      type="button"
      class="learning-category-select__clear"
      aria-label="清除专题方向，显示全部方向"
      title="清除专题方向"
      @click="clearCategory"
    >
      <Close aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElOption, ElSelect } from 'element-plus'
import type { SelectInstance } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import 'element-plus/es/components/select/style/css'

const props = defineProps<{
  id: string
  modelValue: string
  options: Array<{ value: string; label: string; count: number }>
  totalCount: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
const selectRef = ref<SelectInstance>()

const categoryOptions = computed(() => [
  { value: '', label: '全部方向', count: props.totalCount },
  ...props.options.filter((option) => option.value !== ''),
])

function updateValue(value: unknown) {
  emit('update:modelValue', typeof value === 'string' ? value : '')
}

function clearCategory() {
  emit('update:modelValue', '')
  selectRef.value?.focus()
}
</script>

<style scoped>
.learning-category-select {
  display: flex;
  align-items: center;
  gap: 6px;
  width: min(100%, 20rem);
  min-width: 0;
  max-width: 100%;
}

.learning-category-select__control {
  --el-color-primary: var(--math-link);
  --el-border-color: var(--math-border);
  --el-border-color-hover: var(--math-link);
  --el-fill-color-blank: var(--math-surface);
  --el-text-color-regular: var(--site-text);
  --el-text-color-placeholder: var(--site-muted);
  --el-select-input-color: var(--site-muted);
  --el-border-radius-base: 7px;
  flex: 1;
  min-width: 0;
  font-family: inherit;
}

.learning-category-select__control :deep(.el-select__wrapper) {
  min-height: 46px;
  font-size: 16px;
}

.learning-category-select__control :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--math-link) inset, 0 0 0 3px var(--math-selection);
}

.learning-category-select__control :deep(.el-select__input:focus-visible) {
  outline: none;
}

.learning-category-select__clear {
  display: grid;
  flex: 0 0 44px;
  place-items: center;
  width: 44px;
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--math-border);
  border-radius: 7px;
  color: var(--site-muted);
  background: var(--math-surface);
  cursor: pointer;
}

.learning-category-select__clear svg { width: 18px; height: 18px; }
.learning-category-select__clear:hover { color: var(--math-link); border-color: var(--math-link); }
.learning-category-select__clear:focus-visible { outline: 3px solid var(--math-link); outline-offset: 3px; }

@media (max-width: 640px) {
  .learning-category-select { width: 100%; }
}
</style>

<style>
/* The dropdown is teleported outside .math-page, so derive the same tokens here. */
.learning-category-popper.el-popper {
  --category-surface: color-mix(in srgb, var(--site-bg) 97%, var(--site-text));
  --category-link: color-mix(in srgb, var(--site-accent) 78%, var(--site-text));
  --category-selection: color-mix(in srgb, var(--site-accent) 12%, var(--category-surface));
  --el-bg-color-overlay: var(--category-surface);
  --el-border-color-light: color-mix(in srgb, var(--site-text) 25%, var(--site-bg));
  --el-text-color-regular: var(--site-text);
  --el-text-color-secondary: var(--site-muted);
  --el-color-primary: var(--category-link);
  --el-fill-color-light: var(--category-selection);
  --el-font-size-base: 15px;
  --el-select-font-size: 14px;
  max-width: calc(100vw - 24px);
  font-family: inherit;
}

.learning-category-popper .el-select-dropdown__wrap { max-height: min(320px, 50dvh); }
.learning-category-popper .el-select-dropdown__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  height: auto;
  min-height: 44px;
  padding: 8px 14px;
  line-height: 1.5;
}

.learning-category-popper .el-select-dropdown__item.is-selected {
  box-shadow: 3px 0 0 var(--category-link) inset;
  background: var(--category-selection);
}

.learning-category-popper .learning-category-option__label { min-width: 0; white-space: normal; overflow-wrap: anywhere; }
.learning-category-popper .learning-category-option__count {
  flex: 0 0 auto;
  color: var(--site-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.learning-category-popper .el-select-dropdown__empty { padding: 16px; line-height: 1.7; white-space: normal; }
</style>
