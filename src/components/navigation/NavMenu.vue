<template>
  <nav class="nav-menu" aria-label="学科导航">
    <RouterLink
      v-for="item in navItems"
      :key="item.name"
      class="nav-menu__item"
      :class="{ 'nav-menu__item--active': isActive(item) }"
      :to="item.to"
      @pointerenter="preloadNavItem(item.to)"
      @focus="preloadNavItem(item.to)"
      @click="handleNavigate(item.to)"
    >
      <el-icon class="nav-menu__icon">
        <component :is="item.icon" />
      </el-icon>
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  Collection,
  House,
  Notebook,
  Reading,
  User,
} from '@element-plus/icons-vue'
import { preloadPrimaryRoutes, preloadRouteByPath } from '../../router'

const emit = defineEmits(['navigate'])

const route = useRoute()

const navItems = [
  { name: 'home', label: '学科首页', to: '/home', icon: House },
  { name: 'math', label: '数学资料', to: '/math', icon: Collection },
  { name: 'english', label: '英语资料', to: '/english', icon: Reading },
  { name: 'notes', label: '学习路线', to: '/notes', icon: Notebook },
  { name: 'about', label: '关于本站', to: '/about', icon: User },
]

function isActive(item) {
  if (item.name === 'home') return route.path === '/' || route.path === '/home'
  if (item.name === 'about') return route.path === '/about'
  if (item.name === 'notes') return route.path === '/notes' || route.path.startsWith('/note/')
  if (item.name === 'english') return route.path.startsWith('/english')
  // No collection entries remain in the sidebar, so the math entry covers the
  // catalog and every topic page, including collection-filtered URLs.
  return item.name === 'math' && route.path.startsWith('/math')
}

function preloadNavItem(to) {
  preloadRouteByPath(to)
}

function handleNavigate(to) {
  preloadRouteByPath(to)
  emit('navigate')
}

onMounted(preloadPrimaryRoutes)
</script>

<style scoped>
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
  margin-top: 10px;
  flex: 1;
}

.nav-menu__item {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--site-muted);
  font-size: 14px;
  font-weight: 760;
  line-height: 1.35;
  text-decoration: none;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.nav-menu__item::after {
  position: absolute;
  inset: 0 auto 0 -44%;
  width: 32%;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--site-accent) 16%, transparent),
    transparent
  );
  content: "";
  pointer-events: none;
  transform: skewX(-10deg);
  transition: transform 260ms ease;
}

.nav-menu__item:hover,
.nav-menu__item:focus-visible,
.nav-menu__item--active {
  color: var(--site-accent);
  background: color-mix(in srgb, var(--site-accent) 10%, transparent);
  text-decoration: none;
  outline: none;
}

.nav-menu__item:hover::after,
.nav-menu__item:focus-visible::after,
.nav-menu__item--active::after {
  transform: translateX(430%) skewX(-10deg);
}

.nav-menu__item--bottom {
  margin-top: auto;
}

.nav-menu__icon {
  width: 18px;
  height: 18px;
  font-size: 18px;
}

@media (max-width: 900px) {
  .nav-menu {
    gap: 3px;
    margin-top: 14px;
  }

  .nav-menu__item {
    justify-content: center;
    min-height: 40px;
    padding: 0 10px;
    font-size: 14px;
  }

  .nav-menu__icon {
    width: 19px;
    height: 19px;
    font-size: 19px;
  }
}
</style>
