---
name: security-default-audit
description: 代码库默认值安全审计的 7 类风险排查方法论
source: auto-skill
extracted_at: '2026-05-30T03:44:17.496Z'
---

# 默认值安全审计方法论

## 7 类风险排查清单

### P0-认证密钥硬编码
搜索模式：
- `process.env.AUTH_SECRET || '...'` — 硬编码 fallback
- `process.env.AUTH_SECRET ?? '...'`
- `process.env.NODE_ENV === 'production' ? '' : 'fallback-...'`

**修复原则**：
- 生产环境缺失时直接抛错（`throw new Error(...)`）
- 开发环境使用 `crypto.randomBytes(32).toString('hex')` 替代硬编码
- init 脚本中缺失时 `process.exit(1)`

### P0-URL 默认占位符
搜索 `APP_URL`、`SITE_URL`、`NEXT_PUBLIC_SITE_URL`：
```typescript
const url = process.env.APP_URL ?? 'http://localhost:3000';  // ❌
const url = process.env.APP_URL ?? (() => { throw new Error('APP_URL 未配置'); })();  // ✅
```

### P1-功能默认启用
搜索 `?? true` / `|| true`，逐行判断：
- 涉金（打赏/支付）、第三方 JS 加载（分享/统计）、用户数据展示 → `?? false`
- 纯内部行为控制（代码高亮/主题色）→ 可保留 `?? true`

### P2-数据库静默降级
搜索 `DATABASE_URL ?? ''` / `POSTGRES_URL ?? ''`：
- 末尾 `?? ''` 去掉，让调用方拿到 `undefined`，自行决定如何处理

### P2-请求超时缺失
搜索所有 `fetch(` 调用，检查是否有 `AbortController` + 超时：
- 用户触发的操作（保存/提交/登录）应添加 15-30s 超时
- 可封装通用 `fetchWithTimeout(url, options, timeoutMs)` 工具

### P2-通用错误掩盖
API 路由 catch 块中 `'操作失败'` 等模糊消息：
- 添加 `requestId` 或 `errorCode` 到响应（不暴露堆栈）
- 服务器日志打印完整错误

### 审计执行方法
1. 对每个类别使用 grep 搜索特定模式
2. 读取上下文判断是否为真实风险
3. 按严重程度分级（P0=严重，P1=高，P2=中，P3=低）
4. 区分"无害的 UI 默认值"（如 `?? []`、`?? ''` 防御性编程）和"可能隐藏错误的安全默认值"
