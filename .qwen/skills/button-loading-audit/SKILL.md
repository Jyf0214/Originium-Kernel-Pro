---
name: button-loading-audit
description: 全站按钮加载状态审计和修复的方法论
source: auto-skill
extracted_at: '2026-05-30T03:44:17.496Z'
---

# 按钮加载状态审计方法论

## 标准
所有异步按钮点击后应**立即显示旋转加载动画**（Loader2/animate-spin），**不附带任何加载文字**（如"加载中""保存中""提交中""删除中"等）。

## 审计步骤

### 第一步：搜索覆盖
搜索以下关键词覆盖所有按钮位置：
- `loading` / `Loader2` / `animate-spin` — 已有 spinner 的按钮
- `加载中` / `处理中` / `删除中` / `编辑中` / `保存中` / `提交中` / `配置中` / `上传中` — 仍需移除的文字
- `saving` / `deleting` / `submitting` / `operating` / `pinning` — 加载状态变量
- `<button` / `<Button` — 所有按钮元素

### 第二步：分类评估

| 状态 | 含义 | 操作 |
|---|---|---|
| 已有 Loader2 + 无文字 | ✅ 正确 | 不动 |
| 已有 Ant Design `loading` prop + 无文字 | ✅ 正确 | 不动 |
| 只有 `disabled` 无 spinner | ❌ 缺少 | 添加 Loader2 |
| 有 spinner + 有加载文字 | ❌ 文字多余 | 移除文字 |
| 无加载状态变量 | ❌ 完全遗漏 | 添加状态变量 + Loader2 |

### 第三步：修复模式

**原生 `<button>` 加 spinner：**
```tsx
// 之前
<button disabled={operating === id}>
  <Trash2 size={18} />
</button>

// 之后
<button disabled={operating === id}>
  {operating === id
    ? <Loader2 size={18} className="animate-spin" />
    : <Trash2 size={18} />
  }
</button>
```

**Ant Design `<Button>` 加 loading：**
```tsx
// 之前
<Button disabled={loading} icon={<Save />} />

// 之后  
<Button loading={loading} icon={<Save />} />
```

**移除加载文字：**
```tsx
// 之前
{loading ? '提交中...' : '确认提交'}

// 之后
'确认提交'  // 固定文字，由 loading prop 提供动画
```

### 第四步：验证
1. `npx next build` 确保构建通过
2. 确认无 ESLint `no-unused-vars` 错误（Loader2 需正确导入）
