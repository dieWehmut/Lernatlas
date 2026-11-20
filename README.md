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

工作流使用 `pnpm-lock.yaml` 安装依赖，先运行类型检查和新站合同测试；构建后检查全部 PDF 的字节数与 SHA-256、首页入口资源的部署子路径以及 `404.html` 回退页，再上传 `dist/` 并调用 `actions/deploy-pages`。部署成功后，可从工作流的 `github-pages` 环境进入网站。

路径由工作流依据仓库名自动设置：

| 仓库形式 | `BASE_PATH` | 访问地址示例 |
| --- | --- | --- |
| `USERNAME.github.io` | `/` | `https://USERNAME.github.io/` |
| `tutor` 等项目仓库 | `/仓库名/` | `https://USERNAME.github.io/仓库名/` |

用户名页仓库的名称比较忽略大小写；项目页路径保留实际仓库名。未配置自定义域名。

本地模拟项目子路径：

```bash
BASE_PATH=/tutor/ pnpm build
BASE_PATH=/tutor/ pnpm verify:build
BASE_PATH=/tutor/ pnpm preview
```

打开预览地址下的 `/tutor/`。部署为其他项目名时，将示例中的仓库名替换为实际名称。Vite 同时支持 `VITE_BASE_PATH`，设置两者时优先使用 `BASE_PATH`。`vite.config.ts` 会规范化路径，并在构建结束后将首页复制为 `404.html`，供 GitHub Pages 加载站内深层链接。

## 提交前验证

```bash
# 类型检查，以及适用于数学资料站的核心合同与相关回归测试。
pnpm check

# 构建与产物校验使用相同的部署路径；构建期间不要同时启动其他构建。
BASE_PATH=/tutor/ pnpm build
BASE_PATH=/tutor/ pnpm verify:build
```

也可以分别运行 `pnpm typecheck`、`pnpm test`、`pnpm test:learning-catalog`。`pnpm test` 校验目录 schema、唯一 ID、来源清单覆盖、练习与解析的双向配对、重复来源映射、分组和总计统计、原始 PDF 哈希与字节数、勘误文件名和页码，以及学习笔记源文件与编译元数据。统计由实际记录重算，再与清单比较。测试同时保留适用的公式占位符、图片整理、Vue scoped 样式和 PDF 导出相关回归检查。

`pnpm verify:build` 需要已完成的 `dist/`，会核验目录声明的全部 PDF、入口资源的子路径和 SPA 回退页。普通开发、类型检查、测试与构建只依赖 Node.js 和 pnpm，无需原始资料盘、Python 或私有凭据。

上游的其他 `test:*` 命令保留，便于维护原模板功能；其中部分断言依赖原作者的个人样例、控制台默认设置、已移除的 Infra 页面或仓库外的资源同步脚本。这些尚未适配的测试不属于本站的必过套件。`pnpm check` 通过只表示上述新站门禁通过，不代表所有保留的上游测试均已通过。

## 内容与维护

- 站点名称、介绍和导航配置位于 `src/data/site/config.ts`。
- 来源清单与核对依据位于 `content/source-manifest.json`，公开目录为 `src/data/learning/catalog.json`，原稿勘误为 `src/data/learning/errata.ts`。
- 学习路线源文位于 `src/data/docs/notes/math-learning-guide.md`；`pnpm docs:sync` 生成 `src/data/docs/generated.ts`，其中路径必须指向实际存在的相对 Markdown 源文件。公开元数据和源文不保存机器临时目录或私人文件路径。
- 原始 PDF 按内容哈希存放于 `public/materials/`；数据结构与重新导入过程见 [目录维护说明](docs/catalog-data.md)，研究范围见 [研究记录](docs/math-research-notes.md)。
- 使用 `import.meta.env.BASE_URL` 拼接公开资源路径，使资料阅读和下载兼容 GitHub Pages 项目子路径。
- 修改后运行 `pnpm check`，再使用目标部署路径构建并运行 `pnpm verify:build`。
- 原始资料的配对、引用和说明应以实际正文及文件信息为依据；编辑建议应明确标注。

## 来源与许可

网站模板来源于 [dieWehmut/dieWehmut.github.io](https://github.com/dieWehmut/dieWehmut.github.io)，模板项目为 [dieWehmut/Vorlage](https://github.com/dieWehmut/Vorlage)。保留上游的 [MIT 许可证](LICENSE) 和版权声明。

MIT 许可适用于本仓库相应的网站代码；学习资料的作者、出处与适用许可按各资料本身的说明记录。
