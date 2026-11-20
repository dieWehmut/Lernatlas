import type { SiteConfig } from '../../types/content'
import templateIdentity from './template-identity.json'

/**
 * Site-wide personal configuration.
 * All personal / private data is centralized here.
 * ⚠️  Modify this file to personalize your site.
 *
 * Maintainer note: in the upstream repository this file is named `config.starter.ts`
 * and `.github/workflows/sync-starter.yml` copies it over `config.ts` when exporting
 * the template. It is type-annotated and lives in the source tree so that `vue-tsc`
 * checks it: a new required field on `SiteConfig` breaks the build upstream instead
 * of silently shipping an incomplete `config.ts` to every fork.
 */

type CodeRunnerEnv = {
  VITE_CODE_RUNNER_API_URL?: string
  VITE_CODE_RUNNER_API_TOKEN?: string
}

const viteEnv = (import.meta.env || {}) as CodeRunnerEnv
const processEnv = typeof process === 'undefined' ? {} : process.env

export const siteConfig: SiteConfig = {
  // --- Identity ---
  githubUser: 'dieWehmut',
  githubRepo: 'Lernatlas',
  // Where this code came from. Keep it as-is after forking: your own repository
  // is not the template you forked from.
  templateRepoUrl: templateIdentity.repositoryUrl,
  owner: 'dieWehmut',
  displayName: '学科资料站',
  email: '',

  // --- Site Meta ---
  title: '学科资料站',
  subtitle: '按专题整理，循方法学习',
  description: '按学科与专题整理学习资料，提供题目、解析的在线阅读与下载。目前收录初中数学、高中数学和数学竞赛资料。',
  siteUrl: 'https://diewehmut.github.io/Lernatlas/',
  startedAt: '2026-11-20T00:00:00+08:00',
  colorScheme: 'purple',

  // --- External Services ---
  googleAnalyticsId: '',

  // --- ICP Filing (optional, set empty to hide) ---
  icpNumber: '',
  icpText: '',

  // --- Feature Flags (set false to hide page & nav entry) ---
  enableInfra: false,
  enableProject: false,

  // --- Code Runner ---
  codeRunner: {
    backendApiUrl: viteEnv.VITE_CODE_RUNNER_API_URL || processEnv.VITE_CODE_RUNNER_API_URL || '',
    backendToken: viteEnv.VITE_CODE_RUNNER_API_TOKEN || processEnv.VITE_CODE_RUNNER_API_TOKEN || '',
  },

  // --- Social Links ---
  links: [
    { label: 'GitHub', url: 'https://github.com/dieWehmut/Lernatlas' },
    { label: '资料目录', url: 'https://diewehmut.github.io/Lernatlas/math' },
  ],
}

export default siteConfig
