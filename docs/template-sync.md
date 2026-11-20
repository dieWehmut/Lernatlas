# Vorlage 样式自动同步

本站的兼容上游固定为 `dieWehmut/Vorlage` 的 `main` 分支。该仓库由个人博客 `dieWehmut/dieWehmut.github.io` 正式导出；原始导出记录继续保存在 `.template-source.json` 和 `docs/template-provenance.md`。自动同步使用模板仓库的提交，而不把个人博客的新功能、个人内容或配置直接合并到学习站。

## 自动更新流程

`.github/workflows/sync-template-styles.yml` 每 6 小时检查一次（UTC 的 00:23、06:23、12:23、18:23；北京时间 08:23、14:23、20:23、次日 02:23），也支持 Actions 页的 **Run workflow** 及 `repository_dispatch` 的 `template-styles-updated` 事件。定时任务可能被 GitHub 延迟，并非实时 webhook。

1. 运行不依赖网络和项目依赖的 Node 同步边界测试。
2. 查询上游 `main` 的 SHA。与锁中 SHA 一致时，校验本地哈希后结束；有新 SHA 时，在临时目录浅克隆固定上游，不执行其中的脚本或安装上游依赖。
3. 比较白名单文件的内容。仅 README、业务代码或其他非样式发生变化时不改锁、不提交、不部署；日志仍显示本次检查的上游 SHA。锁中的 SHA 表示最后一次导入样式的提交。
4. 验证样式导入、资源依赖、所有权和许可后应用变更。运行本站 `pnpm run check`、生产构建及静态产物验证，成功后才提交。
5. 用仓库 GitHub App 自带的 `GITHUB_TOKEN` 提交并推送默认分支；只暂存脚本返回的受管路径和样式锁文件。不会强推；并发出现新提交时推送失败，等待重新执行。
6. 显式调用 `gh workflow run deploy.yml` 部署更新后的默认分支。GitHub 不会因为 `GITHUB_TOKEN` 产生的普通 push 再启动部署，因此这里授予 `contents: write`（提交）和 `actions: write`（dispatch）。不需要自建 App 或 PAT。部署的 Pages 权限仍由原 `deploy.yml` 管理。

该工作流只在默认分支运行，忽略外部事件的 payload，外部事件不能指定仓库、分支、URL、源目录或写入路径。失败会保留 Actions 日志；提交之前失败不会推送。如推送成功而 dispatch 失败，可以单独手动运行 `deploy.yml` 恢复部署。

依据：[GitHub 的 GITHUB_TOKEN 触发规则](https://docs.github.com/en/actions/concepts/security/github_token)、[工作流触发方式](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)、[schedule 与 repository_dispatch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)。

## 文件所有权

精确白名单在 `scripts/sync-template-styles.mjs` 的 `MANAGED_PATHS` 中，共 24 个文件：

| 上游拥有的路径 | 范围 |
| --- | --- |
| `src/styles/theme/{light,dark}/index.scss` | 明暗主题与配色变量 |
| `src/styles/fonts/index.scss` | LXGW WenKai 字体声明 |
| `src/assets/fonts/LXGWWenKai-Regular.ttf` | 被字体声明实际引用的字体二进制 |
| `src/styles/layout/index.scss` | 基础页面、侧栏、响应式布局 |
| `src/styles/components/index.scss` | 模板全局基础组件规则 |
| `src/styles/pages/index.scss` | 模板全局页面规则 |
| `src/styles/markdown/index.scss` | Markdown 排版与数学展示 |
| `src/styles/console.scss` | 模板控制台规则 |
| `src/styles/scrollbars/index.scss` | 全局滚动条 |
| `src/styles/cursor/index.scss` 及 `cursor/{default,pointer,scrollbar,input}/index.scss` | 模板光标规则 |
| `src/styles/animation/{snow,sakura}/index.scss` | 模板背景效果规则 |
| `src/styles/tailwind/index.scss`、`src/tailwind.css` | 模板 Tailwind 入口 |
| `src/styles/index.scss` | 模板聚合入口，附加保留本地扩展导入 |
| `public/giscus-nexus{,-light,-green,-green-light}.css` | 模板评论区主题 CSS |

`src/styles/math-layout.scss` 是本站扩展，不属于白名单。聚合入口中原有的独立行相对 `@use` / `@forward` 导入，只要指向 `src/styles/` 内的非白名单 `.scss` 文件，都会保留到上游入口末尾；目前即 `@use "./math-layout.scss" as *;`。本地扩展自身的内容完全不写入。新增、修改本地扩展通常只需编辑独立文件；若要改变受管聚合入口，应同时审查并更新锁中的结果哈希。

以下内容始终由本站拥有：`src/components/learning/**`、学习页面和其 Vue scoped 样式、`src/data/learning/**`、`content/source-manifest.json`、原始课程目录和 `public/materials/**` PDF、站点配置、路由、`package.json`、依赖锁、构建和导入脚本。同步不复制上游 Vue 组件、示例文章或个人配置，不会全仓覆盖或递归删除目录。

`content/template-style-lock.json` 记录来源仓库、分支、最后导入的提交、MIT 许可哈希、本地扩展、每个上游源文件哈希和导入后的文件哈希。入口因保留本地导入而具有不同的源/结果哈希；其他文件逐字节相同。删除严格限于锁中曾受管、仍位于当前白名单且未被本地修改的文件。没有所有权的现存文件若与导入结果不同，会拒绝覆盖；本地修改的受管文件也会报冲突。

样式新增依赖时，导入路径必须也在白名单且实际存在。字体资产与 CSS 一起复制，缺失字体、未知模块、未知外部 URL、路径越界和符号链接会在写入前中止。新增模块、改名资源、不同的 Sass 导入形式或许可变更需要人工审查后扩展白名单或适配解析规则，避免悄悄丢失布局或引用不存在的资源。根目录 MIT `LICENSE` 和原有来源记录保留；上游许可与本地不同时先中止，不能自动覆盖署名。

## 本地使用和离线验证

要求 Node.js 22+、Git；同步脚本本身不需要安装 npm 依赖。

```bash
# 查询固定上游并列出拟修改路径；不写文件
node scripts/sync-template-styles.mjs --dry-run

# 检查当前站点是否与上游一致；有待同步变更时退出码为 1
node scripts/sync-template-styles.mjs --check

# 实际同步，再运行本站检查并审查 git diff
node scripts/sync-template-styles.mjs
node --test scripts/test-template-styles.mjs
pnpm run check

# 使用预先克隆的本地模板目录，不访问网络
node scripts/sync-template-styles.mjs --source-dir /path/to/Vorlage --dry-run
node scripts/sync-template-styles.mjs --source-dir /path/to/Vorlage --check
```

`--target-dir /path/to/site` 用于隔离副本和测试，源、目标不能重叠。本地源是已提交且样式干净的 Git 目录时记录其提交；普通离线目录或样式已修改的目录记录 `local:<内容哈希>`，避免把本地试验冒充成上游提交。自动工作流始终使用固定远程源。`--dry-run` 有差异也返回 0，`--check` 有差异返回 1；两者都不修改样式、资产或锁文件。

测试使用临时目录，覆盖：本地课程资料/配置/PDF 和扩展样式保护、白名单外文件、路径遍历与恶意锁、缺失字体、新增未知导入、符号链接、所有权冲突、安全删除、二进制字体更新、重复同步幂等，以及仅上游非样式提交时无锁文件抖动。

2026-11-20 的首次验证使用真实模板 `main` 提交 `2ce9549bb02b122403fa867959f5bde77ee4569b`。24 个受管文件已与本站一致，首次同步仅建立样式锁，样式和资产均为 0 写入、0 删除。

## 可选的即时通知

默认定时检查已可独立工作，不需要修改模板仓库。拥有目标学习站写权限的外部集成可发送以下事件提前检查；该事件仍只读取固定上游 `main`，不会直接信任 payload 的版本信息。

```bash
gh api --method POST repos/dieWehmut/Lernatlas/dispatches \
  -f event_type=template-styles-updated
```

如果以后希望模板发布时立即发事件，需要在模板仓库另行配置有目标仓库权限的 GitHub App 或受限集成；模板仓库自己的默认 `GITHUB_TOKEN` 不能跨仓写入本站。本次未对模板仓库添加凭据、工作流或 webhook。

## 复用到其他学科站

复制同步脚本、测试和工作流，保留固定模板源和精确白名单。先确认对方站点全局模板样式与上游的差异，将业务覆盖放在独立 `src/styles/*.scss` 文件或 Vue scoped 样式中，保留本地聚合入口的相对导入。不要直接复制本站的样式锁；在对方仓库用 `--dry-run` 审核后生成自己的锁，再接入它自己的测试与部署工作流。部署工作流文件名若不是 `deploy.yml`，须对应修改显式 dispatch 及工作流测试。
