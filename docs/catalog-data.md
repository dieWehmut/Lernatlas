# 数学资料目录的维护

`content/source-manifest.json` 是经过内容核对的来源清单和编辑元数据；`scripts/import-materials.py` 由它生成 `src/data/learning/catalog.json`，并将 PDF 原字节复制到 `public/materials/`。网站只导入 catalog，不导入来源清单或抽取正文。

## 当前范围与统计口径

2026-11-20 核对的三个源目录为 `初中数学`、`高中数学/专题`、`高中数学/竞赛`，共 284 个源文件、143 个专题。按完整 SHA-256 去重后发布 280 个 PDF，共 4,695 个物理页面、139,484,660 字节（约 133.02 MiB）。其中 137 个专题有配套解析，6 个专题没有独立解析文件。

| 分组 | 源文件 | 发布 PDF | 专题 | 配套解析专题 | 独立解析缺失专题 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 初中数学 | 124 | 120 | 60 | 60 | 0 |
| 高中数学 | 68 | 68 | 34 | 34 | 0 |
| 数学竞赛 | 92 | 92 | 49 | 43 | 6 |
| 总计 | 284 | 280 | 143 | 137 | 6 |

catalog 的 `stats.pages` 与 `stats.bytes` 都按唯一文件计算，包含题目和解析中的重合内容，因此页数不是独立题量。manifest 同时保留 `sourcePages`、`sourceBytes` 和各分组统计，以便追溯去重前后的差异。

## 接口与路径

`src/data/learning/types.ts` 定义 `Catalog`、`Topic`、`MaterialDocument`、`Collection`。`index.ts` 导出 `catalog`、`topics`、`collections`、`getTopic(id)` 和 `materialUrl(document)`。

专题 ID 为分组 ID 加编辑键的 SHA-256 前 12 位，如 `junior-…`；manifest 的 `key` 为持久身份，修改展示标题时保留它。文档 ID 是文件内容哈希的前 16 位。完整哈希仍保留在两份 JSON 中，导入器会拒绝短哈希碰撞。

`originalPath` 只相对于文档所在分组的源目录，例如 `不动点/不动点与数列.pdf`，不包含盘符或机器目录。`url` 固定为 `materials/<sha16>.pdf`，不带前导斜线、域名或站点子路径。渲染链接时必须调用 `materialUrl()`，它会添加 Vite 的 `import.meta.env.BASE_URL`，兼容 GitHub Pages 项目路径。

`role` 有 `questions`、`solutions`、`notes` 三种。练习版也可能包含理论与部分例题讲解，不代表文件内完全没有答案。公开 `label` 会保留这类必要说明。`prerequisites`、`difficulty`、分类、标签与阅读顺序是编辑建议，不是原资料的官方难度或年级划分；该依据保存在 manifest 的 `editorialBasis`。

## 重跑与核验

运行环境为 Python 3.10 或以上，须提供 PyMuPDF（`pymupdf`）。普通网站构建直接使用已提交的 catalog 与 PDF，不需要 Python、原资料盘或文本抽取工具。

```sh
# 默认源根目录为 /mnt/d/Desktop/tutor，默认仓库为脚本所在仓库。
python3 scripts/import-materials.py

# 在另一台机器上指定完整资料根目录与仓库。
python3 scripts/import-materials.py --source-root /path/to/tutor --repo-root /path/to/site

# 只读校验：所有来源、页面数、字节数、哈希、相互配对、公开资源与目录一致性。
python3 scripts/import-materials.py --check

# 克隆仓库后，不依赖原资料盘，核验已提交的全部公开文件。
python3 scripts/import-materials.py --check --published-only

# 完整重算已记录的“【答案】”数量，不保存或公开抽取正文。
python3 scripts/import-materials.py --check --verify-text

# 提交前查看新来源的测量值；只在标准输出展示结构化元数据。
python3 scripts/import-materials.py --source-root /path/to/tutor --inventory
```

正常导入先验证全部来源，再复制去重后的 PDF；通过临时文件与原子替换写入目标。源文件从不改写。相同输入重跑不会改变 catalog 的字节内容与 `generatedAt`，也不会重写已核验的 PDF。`generatedAt` 是清单版本的生成时间，只有实际更新来源或编辑清单时才调整它。

校验会拒绝源文件遗漏、新增但未审阅的 PDF、哈希/字节数/页数改变、无效或越界相对路径、重复专题 ID、悬空关联、错误统计、未双向登记的配对与题解角色冲突。公开目录中多出的 PDF 同样会报告为错误；导入器不会擅自删除旧文件。

## 新增或更新资料

1. 运行 `--inventory`，阅读原 PDF，确认专题范围、摘要及练习/解析的真实角色；对配套文件核对题干与训练答案结构，不能只看名字。
2. 在 manifest 的 `topics` 添加编辑信息。新专题用稳定的 `key` 与 `id`；ID 规则见脚本的 `topic_id()`。现有专题修改展示名时保留原 `key`。`order` 在每个分组内唯一。
3. 在 `files` 添加每个实际源文件的相对路径、角色、页数、字节数、完整哈希与资源 URL。两份配套文件互相填写 `pairedPath`；`pairingEvidence` 记录核实方法及双方答案标记数量。单份资料填写 `unpairedReason`。
4. 完全重复文件仍各有一条来源记录；`duplicateOf` 指向同组内的规范来源，并共享 `topicId`、角色与哈希。不要按相近题名合并不同字节的 PDF。
5. 更新 `stats` 和 `collectionStats`、调整清单版本时间，运行导入后再运行 `--check --verify-text`；确认差异后提交 catalog、manifest 与新增 PDF。

manifest 的 `summaryBasis` 和部分 `summaryEvidence` 保存摘要依据，配对证据保存题组、页码或标记比较。它们只记录核对范围，不表示逐题认证全部解答。经研究核实的勘误与阅读路线由研究内容单独维护。

## 已核对的命名例外

- 初中的 `规律/2.数与式的规律问题*.pdf`、`规律/3.坐标中的规律问题*.pdf` 与根目录同名四份文件完全相同；四条别名保留于 manifest，公开目录不重复展示。
- 初中 `分式方程增根与无解问题模型 (1).pdf` 是练习，未带 `(1)` 的文件是解析。另有多组 `(1)` 文件是解析，因此导入器只使用已审阅的显式角色。
- 初中 `30.三三垂直模型.pdf` 展示为“三垂直模型”，原文件名与来源路径保持不变。
- 竞赛“集合中的新定义问题一/二”是练习；带中文括号的“集合中的新定义问题（一）/（二）”是对应解析，各新增 6 个训练答案段。这四个文件构成两个专题。
- `洛必达法则综合训练解析 (1).pdf` 配对 `洛必达法则综合训练.pdf`，展示专题名去掉来源后缀，下载文件的原始名称保留。
- 竞赛中的“多项式定理、向量空间的新定义、微分的新定义、极限的新定义、矩阵运算的新定义、积分的新定义”没有独立解析；目录不生成空链接或虚构答案文件。
