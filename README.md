# 数学资料学习站

基于 [dieWehmut/dieWehmut.github.io](https://github.com/dieWehmut/dieWehmut.github.io) 的 Vorlage 模板构建，沿用 Vue 3、Vite、TypeScript、Element Plus 组件和主题样式，用于整理数学学习资料、讲义与配套解析。

这是可直接部署到 GitHub Pages 的静态网站。原始 PDF 保持不变；资料索引、内容摘要、勘误和阅读建议与原文分开维护。

## 本地开发

使用 Node.js 22.12 或更高版本，以及 `package.json` 中固定的 pnpm 10.32.1。安装依赖时保留锁文件：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

构建和预览：

```bash
pnpm build
pnpm preview
```

构建会从仓库内的 Markdown 和静态资源生成内容索引，再输出到 `dist/`。默认构建不执行模板的外部服务状态探测，也不需要 API 凭据。

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy.yml`。在仓库的 `Settings → Pages → Build and deployment` 中，将 `Source` 设为 **GitHub Actions**。推送到 `main` 或手动运行工作流即可部署。

工作流使用 `pnpm-lock.yaml` 安装依赖，构建后检查首页引用的本地资源、部署子路径以及 `404.html` 回退页，再上传 `dist/` 并调用 `actions/deploy-pages`。部署成功后，可从工作流的 `github-pages` 环境进入网站。

路径由工作流依据仓库名自动设置：

| 仓库形式 | `BASE_PATH` | 访问地址示例 |
| --- | --- | --- |
| `USERNAME.github.io` | `/` | `https://USERNAME.github.io/` |
| `tutor-math-site` 等项目仓库 | `/仓库名/` | `https://USERNAME.github.io/仓库名/` |

用户名页仓库的名称比较忽略大小写；项目页路径保留实际仓库名。未配置自定义域名。

本地模拟项目子路径：

```bash
BASE_PATH=/tutor-math-site/ pnpm build
BASE_PATH=/tutor-math-site/ pnpm preview
```

打开预览地址下的 `/tutor-math-site/`。部署为其他项目名时，将示例中的仓库名替换为实际名称。Vite 同时支持 `VITE_BASE_PATH`，设置两者时优先使用 `BASE_PATH`。`vite.config.ts` 会规范化路径，并在构建结束后将首页复制为 `404.html`，供 GitHub Pages 加载站内深层链接。

## 内容与维护

- 站点名称、介绍和导航配置位于 `src/data/site/config.ts`。
- 模板的 Markdown 内容位于 `src/data/docs/`，静态公开文件位于 `public/`。
- 使用 `import.meta.env.BASE_URL` 拼接公开资源路径，使资料阅读和下载兼容 GitHub Pages 项目子路径。
- 修改后先运行 `pnpm build`；需要检查 TypeScript 时运行 `pnpm typecheck`。
- 原始资料的配对、引用和说明应以实际正文及文件信息为依据；编辑建议应明确标注。

## 来源与许可

网站模板来源于 [dieWehmut/dieWehmut.github.io](https://github.com/dieWehmut/dieWehmut.github.io)，模板项目为 [dieWehmut/Vorlage](https://github.com/dieWehmut/Vorlage)。保留上游的 [MIT 许可证](LICENSE) 和版权声明。

MIT 许可适用于本仓库相应的网站代码；学习资料的作者、出处与适用许可按各资料本身的说明记录。
