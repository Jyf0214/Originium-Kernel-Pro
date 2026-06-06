---
name: unified-ui-component-extraction
description: 系统化提取全项目硬编码按钮/标签/输入框样式为统一 UI 组件库并替换
source: auto-skill
extracted_at: '2026-06-06T10:57:26.163Z'
---

# 统一 UI 组件提取与替换

当项目中出现大量重复的硬编码 Tailwind 按钮/标签/输入框样式（通常 >50 处）时，使用此流程系统化提取为统一组件库并全项目替换。

## 适用条件

- 项目中存在 10+ 种重复的样式模式
- 同一模式出现在 5+ 个不同文件中
- 样式细节存在细微差异（不同 rounded 值、不同 shadow、不同 padding）

## 流程

### 阶段 1：审计（Audit Agent）

启动一个 Explore Agent 扫描 `app/` 和 `components/` 目录下所有 `.tsx` 文件：

1. 搜索以下模式：
   - `bg-zinc-900 text-white`（深色主按钮）
   - `bg-white text-zinc-600 border border-zinc-200`（浅色次要按钮）
   - `text-[10px] font-bold uppercase tracking-wider`（标签/徽章）
   - `px-4 py-2 rounded-full text-sm font-medium`（筛选按钮）
   - `h-10 px-3 border border-zinc-200 rounded-lg`（输入框）
   - `text-red-500 hover:bg-red-50`（危险操作按钮）
   - `disabled:opacity-50` / `disabled:opacity-30`（禁用状态）
   - `active:scale-95` / `active:scale-\[0.97\]`（按压反馈）
   - `focus:border-zinc-400` / `focus:ring-2`（焦点样式）

2. 输出报告包含：
   - 每个样式模式的分组
   - 每个文件路径 + 行号
   - 完整 class 字符串
   - 出现次数统计
   - 不一致发现（同模式不同值）

### 阶段 2：创建组件库

在 `components/ui/` 下创建组件：

| 组件 | 覆盖样式 | Props |
|------|---------|-------|
| `Button.tsx` | 深色/浅色/危险/幽灵/链接按钮 | `variant`, `size`, `rounded`, `iconOnly`, `block`, `loading`, `icon` |
| `FilterPill.tsx` | 筛选/分类选中/未选中 | `selected`, `onClick`, `icon` |
| `Tag.tsx` | 标签/徽章 5 种变体 | `variant`, `size` |
| `Input.tsx` | 统一输入框 | `label`, `error`, `wrapperClassName` |

设计原则：
- 使用 `'use client'` 指令（如果用到 useState/useCallback 等）
- 支持 `className` prop 附加到基础样式后
- 不引入外部依赖（仅 React + 项目已有依赖）
- 所有组件导出到 `components/ui/index.ts`

### Button 组件关键设计决策

**iconOnly 尺寸必须匹配代码库实际模式：** 扫描所有硬编码按钮中 `w-* h-*` 或 `p-*` 的实际值，统计最常见的尺寸，将 Button 的 iconOnly 尺寸设为这些精确值。

常见模式及映射：
- 紧凑图标按钮（toolbar）：`w-8 h-8` 对应 `size="sm" iconOnly`
- 中等图标按钮（操作栏）：`w-10 h-10` 对应 `size="md" iconOnly`
- 大图标按钮（FAB）：`w-12 h-12` 对应 `size="lg" iconOnly`

在已经存在大量硬编码按钮的项目中，**不要使用推测的尺寸**（如 w-7/w-9/w-11），必须用 `git show <commit>:path` 读取基准版本的代码统计实际值。

**Button 完整 Props：**
| Prop | 类型 | 说明 |
|------|------|------|
| `variant` | `'primary' | 'default' | 'secondary' | 'danger' | 'ghost' | 'link'` | 视觉风格 |
| `size` | `'sm' | 'md' | 'lg'` | 按钮尺寸 |
| `rounded` | `'sm' | 'md' | 'lg' | 'full' | 'none'` | 独立圆角控制 |
| `iconOnly` | `boolean` | 等宽高方形按钮，auto-detected 当 icon 无 children |
| `block` | `boolean` | `w-full` |
| `icon` | `ReactNode` | 前置图标 |
| `loading` | `boolean` | 加载旋转态 |

### 阶段 2.5：变体补齐检查

**在启动并行替换前，必须先检查现有组件是否能覆盖所有硬编码按钮样式。** 这是防止 Agent 冲突的关键步骤。

1. 审计所有硬编码按钮的样式模式，与组件 `variantStyles` 逐一对比
2. 列出所有缺失的变体（例如 `filled`、`success`、`warning`）
3. **一次性补全所有缺失变体到组件中**，再启动并行 Agent
4. 这样所有 Agent 只需修改各自文件，不会同时修改组件文件导致冲突

### 阶段 2.6：维度与动效对齐检查

**静态度量对齐：** 计算自定义组件各 size 的实际渲染高度，与 AntD 标准对比：

| Size | AntD height | 自定义公式 | 目标 py |
|------|-------------|-----------|---------|
| sm | 24px | `py-1`=4px + font-xs~18px = 26px | ✅ |
| md | 32px | `py-1.5`=6px + font-sm~21px = 33px | ✅ |
| lg | 40px | `py-2`=8px + font-base~24px = 40px | ✅ |

**动效补齐检查：** AntD 默认包含 hover/active 动效，自定义组件容易遗漏：

| 效果 | AntD 默认 | 检查点 |
|------|-----------|--------|
| default hover 背景 | `hover:bg-zinc-50` | 自定义 default variant 是否有？ |
| secondary hover 背景 | `hover:bg-zinc-50` | 自定义 secondary variant 是否有？ |
| danger active | `active:bg-red-100` | 自定义 danger variant 是否有？ |
| 按压缩放 | 微妙缩小 | base styles 是否有 `active:scale-[0.97]`？ |
| 阴影增强 | filled variant 有 shadow 变化 | 是否有 `shadow-sm hover:shadow-md`？ |

**对齐原则：** 组件与 AntD 的视觉差距应该通过修改组件修复，不能通过修改页面 className 补偿。

### AntD `type` → 自定义 `variant` 映射表

当项目从 Ant Design 迁移到自定义 Button 时，使用此映射：

| AntD Button prop | 自定义 Button prop |
|---|---|
| `type="primary"` | `variant="primary"` |
| `type="text"` | `variant="ghost"` |
| `type="link"` | `variant="link"` |
| `type="default"` | `variant="default"` |
| `danger` | `variant="danger"` |
| `size="small"` | `size="sm"` |
| `size="large"` | `size="lg"` |
| `htmlType="submit"` | `type="submit"`（原生透传） |
| `block` | `block` |
| `loading` | `loading` |
| `icon` | `icon` |
| `style={{ marginTop: 24 }}` | `className="mt-6"` 或保留 style |

### 警告：AntD props 继承陷阱

**AntD 会静默忽略不认识的 props，自定义组件不会！**

迁移中最常见的 bug：原始代码中 `variant="filled"` 是传给 AntD `<Button>` 的无效 prop，AntD 忽略它并渲染为默认透明按钮。
迁移到自定义 Button 后，`variant="filled"` 变成了有效 prop，渲染为实心黑底按钮，出现视觉回归。

**必须做两件事：**
1. 在迁移时，对每个非标准 prop 判断：它是 AntD 忽略的遗留 prop，还是真正需要的样式？
2. 如果是遗留 prop，在 **自定义组件中设计正确的样式**（如 `filled: 'bg-transparent text-zinc-400 border-none'` 用于 Input 后缀图标按钮），然后在页面中保留 `variant="filled"` 不变

**规则：永远不要修改页面代码来适配组件缺陷。如果组件缺少所需样式，修改组件。**

### Agent 提示词纪律

并行替换 Agent 的提示词必须包含以下严格要求，否则 Agent 会只分析不修改：

1. **必须直接修改文件** — "用 edit/write 工具写代码，不要只分析或建议"
2. **禁止使用硬编码按钮** — "不允许自己写 `<button>` 标签，必须使用 `@/components/ui/Button`"
3. **如果缺少需要的变体** — "先修改 `components/ui/Button.tsx` 添加该变体，再使用"
4. **末尾加一句**：`你必须直接修改文件，只输出修改结果摘要，不做分析和方案`

### 阶段 3：并行替换

将文件按目录分区，启动多个 Agent **在同一个工作区内并行**修改，每区负责不重叠的文件：

| Agent | 覆盖范围 |
|-------|---------|
| Agent A | `app/diary/`, `app/article/`, `app/about/`, `app/editor/` |
| Agent B | `app/faces/`, `app/tickets/`, `app/admin/`, `app/archives/` |
| Agent C | `components/` 根目录下的组件 |
| Agent D | 筛选按钮（`CategoryBar`, `HomePostGrid`, `PostListClient`, `FacesListClient`） |

替换规则：
- 每个文件添加相应 import（`import { Button } from '@/components/ui/Button'`）
- 保留原有事件处理器和非样式 class（布局类如 `flex items-center gap-2`）
- **处理 antd 命名冲突**：如果文件同时使用 antd `Button` 和自定义 `Button`，将 antd 引入重命名：`import { Button as AntButton, ... } from 'antd'`，文件中所有 antd `<Button>` 改为 `<AntButton>`
- **跳过已修改文件**：替换前检查 import 中是否已有自定义组件，若已有则跳过（避免重复修改覆盖）
- **多遍清扫**：第一遍替换主要模式后，做第二遍扫描捕捉剩余模式
- 不替换 antd 组件（antd 的 Input、Select、DatePicker 等有独立的 API）
- 每修改 2-3 个文件运行一次 `npx tsc --noEmit` 检查

### 阶段 4：验证

1. `npx tsc --noEmit` — 零类型错误
2. `npx eslint . --max-warnings=500` — 检查新组件的使用是否正确
3. 构建验证 — `npm run build` 确认无运行时问题
