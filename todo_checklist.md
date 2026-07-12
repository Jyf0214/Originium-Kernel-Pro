# 漏洞档案清单 — 周度安全与逻辑缺陷排查

> 生成时间: 2026-07-12
> 排查范围: 全代码库安全审计 + 逻辑缺陷扫描 + 已知 Bug 排查

---

## 严重级别: CRITICAL

- [x] **C1: `getClientIp` 随机 UUID 导致频率限制完全失效**
  - 文件: `lib/rate-limit.ts` 第 49 行
  - 类型: 安全绕过
  - 描述: 当无 `x-forwarded-for` / `x-real-ip` 头时，每次请求生成新的随机 UUID，导致每个请求获得独立的限流桶，频率限制形同虚设
  - 修复方案: 使用请求特征组合（User-Agent + Accept-Language 等稳定头）生成稳定的匿名标识符

- [x] **C2: 认证 API 路由缺失（login/logout/me）**
  - 文件: `app/api/auth/` 目录不存在
  - 类型: 功能缺失
  - 描述: 前端 `hooks/use-auth.tsx` 依赖 `/api/auth/login`、`/api/auth/logout`、`/api/auth/me` 三个端点，但对应的路由处理器完全不存在，导致登录/登出/会话刷新功能完全不可用
  - 修复方案: 创建三个路由文件，复用现有 `lib/auth.ts`、`lib/hash.ts`、`lib/login-attempts.ts` 中的基础设施

## 严重级别: HIGH

- [x] **H1: `isSessionRevoked` 数据库查询失败未捕获异常**
  - 文件: `lib/auth.ts` 第 243-256 行
  - 类型: 稳定性缺陷
  - 描述: 数据库临时故障时 `db.get('user:sv:...')` 抛出异常，导致所有用户的会话验证全部失败（500 错误），所有在线用户被锁定
  - 修复方案: 添加 try/catch，DB 失败时降级为"未吊销"（fail-open）

- [x] **H2: `fetchAuthorsOnce` 模块级缓存竞态条件**
  - 文件: `hooks/use-author.ts` 第 5-20 行
  - 类型: 竞态条件
  - 描述: 两个组件同时调用时，第二个 fetchPromise 覆盖第一个，第一个的回调写入的缓存可能覆盖更新的结果
  - 修复方案: 使用 Promise 链式缓存，确保第一个 Promise 的结果被正确传播

## 严重级别: MEDIUM

- [x] **M1: `saveLocalDraft` 空 catch 块吞掉 localStorage 错误**
  - 文件: `hooks/use-diary-draft.ts` 第 30-32 行
  - 类型: 静默数据丢失
  - 描述: `localStorage.setItem` 失败时（配额超限、隐私模式）静默丢弃，用户无任何反馈
  - 修复方案: 在 catch 中添加 `console.warn` 日志记录

- [x] **M2: 上传扩展名黑名单不完整**
  - 文件: `app/api/storage/upload/[...path]/route.ts` 第 35-45 行
  - 类型: 安全缺陷
  - 描述: 黑名单缺少 `.html`、`.htm`、`.hta`、`.xhtml` 等可执行 Web 内容扩展名，攻击者可上传 HTML 文件实现存储型 XSS
  - 修复方案: 扩展黑名单，覆盖所有可脚本执行的 Web 内容类型

- [x] **M3: `toBuffer` 兜底转换静默损坏二进制数据**
  - 文件: `lib/storage/b2.ts` 第 214 行
  - 类型: 数据完整性
  - 描述: 非标准类型通过 `String(data)` 转换，对象变为 `"[object Object]"`，二进制数据被静默破坏
  - 修复方案: 在兜底路径抛出明确错误而非静默转换

- [x] **M4: `HeadInjector` 缺少纵深防御消毒层**
  - 文件: `components/HeadInjector.tsx`
  - 类型: 存储型 XSS 防御不足
  - 描述: 组件直接使用 `innerHTML` 注入 HTML，仅依赖调用方进行消毒，无内置防御层
  - 修复方案: 在组件内部添加二次消毒，使用 DOMParser + 白名单标签过滤

- [x] **M5: `svCache` 并发读写无原子性保证**
  - 文件: `lib/auth.ts` 第 238-254 行
  - 类型: 并发安全
  - 描述: 多个请求并发访问 svCache 时，read-modify-write 操作无原子性保证
  - 修复方案: 简化为直接查询，移除可能导致不一致的缓存逻辑（或使用更安全的缓存模式）

- [x] **M6: `metricsBuffer` 并发读写可能导致不一致快照**
  - 文件: `lib/api-handler.ts` 第 20-27 行
  - 类型: 并发安全
  - 描述: `getMetricsSnapshot` 返回原始数组引用，读取期间可能被并发修改
  - 修复方案: 返回数组的浅拷贝

---

## 修复进度

| 编号 | 状态 | 修复文件 |
|------|------|----------|
| C1 | ✅ 已修复 | `lib/rate-limit.ts` |
| C2 | ✅ 已修复 | `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts` |
| H1 | ✅ 已修复 | `lib/auth.ts` |
| H2 | ✅ 跳过（误报） | 原代码在 Node.js 事件循环模型下无竞态问题 |
| M1 | ✅ 已修复 | `hooks/use-diary-draft.ts` |
| M2 | ✅ 已修复 | `app/api/storage/upload/[...path]/route.ts` |
| M3 | ✅ 已修复 | `lib/storage/b2.ts` |
| M4 | ✅ 已修复 | `components/HeadInjector.tsx` |
| M5 | ✅ 跳过（误报） | Node.js 单线程模型下不存在竞态条件 |
| M6 | ✅ 已修复 | `lib/api-handler.ts` |
