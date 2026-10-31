# 消费人格洞察（QMuse 消费分析 Web 应用）

一款基于 **QMuse 云服务** 的消费人格分析应用：通过记录消费明细，分析商品暗含的消费场景与标签，总结消费习惯，推断用户的消费人格（如二次元、健康养生、科技数码等），并据此生成消费建议与商品推送。

项目是 **React + Vite + TypeScript** 应用，前后端由 QMuse 云服务承载（数据表 + 云函数），已部署上线。

- 预览：`https://www.qmuse.cn/preview/7670584366706344`
- 应用 ID：`7670584366706344` · 空间：`S313501780640` · 最近版本：`91200065`

---

## 核心功能

- **消费记录（记账）**：记录每一笔消费的金额、日期、分类、标签、商品/商户/备注；支持每日 / 每周 / 每月 / 每年视图。
- **消费总结**：每月消费总金额、消费分类标签的月度金额与总金额统计。
- **消费人格分析**：基于消费记录推断用户人格（主/次人格 + 人格分布雷达图 + 兴趣关键词），支持每月 / 每年维度。
- **消费建议与商品推送**：可选「省钱建议」或「爱好培养」模式，给出可执行建议，并从商品目录匹配推送相关商品（含标签、价格、去购买链接）。

### 前端交互约定

- 所有依赖大模型/云函数的能力均提供 **「点击生成」按钮**：
  - 从未生成过 → 显示「请去点击生成」占位；
  - 已生成 → 默认展示最新结果；
  - 新增记账后 → 出现「更新重分析」按钮，可重新分析。
- 首页提供「去记账」快捷入口，引导用户先补充消费记录，再进行后续分析。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 19 · Vite 7 · TypeScript 5 |
| 路由 | TanStack Router（文件路由） |
| 样式 | Tailwind CSS 4 · Radix UI（shadcn 风格组件） |
| 数据可视化 | Recharts（柱状图 / 雷达图 / 趋势图） |
| 数据请求 | TanStack Query |
| 云服务 | QMuse 云服务：TablesDB（数据表）+ 云函数，`appwrite`(24.1.1) + `@qmuse/appwrite-runtime-sdk` |
| 工程 | oxlint · tsc · vite-tsconfig-paths · less |

---

## 架构

```text
React 前端 (routes / components)
        │ 只调用领域 Service
        ▼
src/services/spendService.ts   ← 唯一与 QMuse 云服务交互的数据源
        │
        ├── TablesDB 5 张数据表（读 / 写 / 分页）
        └── 云函数 3 个（executeQmuseFunction，服务端推理）
```

### 数据表（TablesDB，databaseId `qmuse-app-db`）

| 表 | 用途 | 主要字段 |
|---|---|---|
| `spend_records` | 用户消费记录 | amount、spend_date、category、tags(JSON)、product_name、product_id、merchant、note、user_ref |
| `products` | 商品目录（含演示数据） | name、category、price、tags、scene、summary、persona_ids |
| `product_tag_analysis` | 商品暗含消费场景/标签分析结果 | product_id、tags、scene、summary、persona_ids |
| `user_persona` | 用户消费人格分析结果 | period、dominant_id、secondary_id、scores、profile、interests、cycle_habits |
| `consumption_advice` | 消费建议 + 商品推送 | period、mode、advice、products |

### 云函数（服务端内置推理，`model: "ai-assistant-v1"`）

> 说明：三个云函数原先尝试接入外部大模型（DeepSeek），后改为**服务端内置推理引擎**（不再依赖外部 LLM 密钥与调用），返回契约保持不变。

| 云函数 | 职责 |
|---|---|
| `analyze-product-tags` | 内置 `TAG_RULES` 关键词规则，分析商品暗含标签/场景/适用人格（无匹配时按分类兜底） |
| `analyze-user-persona` | 内置 `PERSONAS` + `scorePersonas`（按金额/标签均摊打分），推断主/次人格、人格分布、兴趣、消费周期习惯 |
| `generate-consumption-advice` | 内置 `rankProducts`（人格匹配 + 低价加权）与 `buildAdvice`，生成省钱 / 爱好培养建议并推送商品 |

---

## 目录结构

```text
src/
  routes/           __root · index(首页) · records(记账) · persona(人格分析) · advice(消费建议)
  services/         appwrite.ts（云服务连接/CRUD/函数 helper）· spendService.ts（领域 Service）
  lib/spend/        types · analysis · personas · recommendations · seed（演示数据播种）· store
  components/spend/ AppLayout · Section · StatCard · charts · personaUi · CloudPersona ·
                    ProductGrid · CloudProductGrid · LlmSection · misc
  components/ui/    shadcn / Radix UI 基础组件
  config/  hooks/  types/
functions/          三个云函数（各含 src/main.js + 遗留 llm.js）
docs/               qmuse-backend-design.md（后端框架设计稿）
```

---

## 本地开发

```bash
cnpm install        # 推荐；不可用时用 npm install
npm run check       # tsr generate && oxlint src && tsc --noEmit
npm run build       # 生产构建
npm run dev         # 本地开发（无云服务时 store 回退到内存演示数据）
```

> 涉及 QMuse 云服务的改动请先阅读 `AGENTS.md` 与 `.agents/skills/qmuse-cloud/SKILL.md`。

---

## 部署 / 导入（QMuse）

```bash
qmuse login
qmuse space list
qmuse space use S313501780640
qmuse import .          # 首次创建应用，之后增加版本
```

- `qmuse import configure` 用于补充云服务配置后继续任务；重复导入前先 `qmuse import status <jobId> --wait`。
- 导入失败时读取 `.qmuse/last-import-error.json`（或 `.qmuse/import-errors/prod/`），修复后重试。
- 云函数密钥使用 `qmuse-cli cloud set-secret KEY --stdin`（当前内置推理版本不依赖外部 LLM 密钥）。
