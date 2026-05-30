---
name: parallel-agent-analysis
description: 并行启动多个 Agent 分析不同代码模块，汇总报告后启动修复 Agent
source: auto-skill
extracted_at: '2026-05-30T03:44:17.496Z'
---

# 并行 Agent 分析 + 修复流程

当需要大规模重构/审计时，使用此流程并行启动多个分析 Agent，然后基于结果启动修复 Agent。

## 流程

### 第一步：分拆分析范围
将代码库按模块分拆，每个 Agent 负责一个独立模块：

| Agent | 范围 | 目标 |
|---|---|---|
| Agent 1 | `components/` + `app/` pages | UI 组件重复模式 |
| Agent 2 | `app/api/` | API 路由模板代码 |
| Agent 3 | `lib/` + `hooks/` + `types/` | 工具函数/类型冗余 |

### 第二步：并行启动 Explore Agent

```json
{
  "subagent_type": "general-purpose",
  "run_in_background": true,
  "description": "分析 [模块名]",
  "prompt": "你是一名...[角色描述]。不修改文件，只输出分析报告..."
}
```

- 每个 Agent 用 `description` 区分任务
- 使用 `run_in_background: true`
- 告知 Agent **不要修改任何文件**
- 对修改型任务使用 `isolation: "worktree"`

### 第三步：汇总报告
每个 Agent 完成后输出结构化报告，包含：
- 每个模式的文件路径和行号
- 建议的修复方式
- 预估减少代码量

### 第四步：启动修复 Agent
根据报告，启动一个或多个修复 Agent：

```json
{
  "subagent_type": "general-purpose", 
  "run_in_background": true,
  "isolation": "worktree",
  "description": "[具体修复任务]",
  "prompt": "修复方案..."
}
```

修复 Agent 要给出具体的代码替换方案，按组分批验证。

### 第五步：合并 worktree
如果使用 worktree 隔离，合并方式：

```bash
# 1. 从 worktree 生成补丁
cd /path/to/worktree && git diff HEAD -- <files> > /tmp/patch.patch

# 2. 应用到主干
cd /path/to/main && git apply /tmp/patch.patch

# 3. 删除 worktree
git worktree remove <worktree-path> --force
```

## 关键规则
- 分析 Agent 只读不写，修复 Agent 才写代码
- 每个修复 Agent 限定在单一模块（避免冲突）
- 每次一组文件修改后运行构建验证
- 修复 Agent 的输出要包含完整文件列表和构建状态
