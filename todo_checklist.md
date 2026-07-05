# 安全审计 — 周度巡检任务清单

**审计日期：** 2026-07-05 (Cycle 2)
**审计范围：** 全站 76 个 API 路由文件 + 46 个 lib 文件 + 全部组件
**审计方法：** 3 个并行分布式子代理深度扫描

---

## 前序审计回归确认 ✅

| # | 项目 | 状态 |
|---|------|------|
| R1 | F1 bind-verify timingSafeEqual | ✅ 已确认未回归 |
| R2 | F2 comments POST 频率限制 | ✅ 已确认未回归 |
| R3 | F3 sanitize.ts 正则增强 | ✅ 已确认未回归 |
| R4 | F4 MermaidBlock SVG 消毒增强 | ✅ 已确认未回归 |
| R5 | F5 content-registry Map 优化 | ✅ 已确认未回归 |
| R6 | F6 rate-limit IP 解析加固 | ✅ 已确认未回归 |

---

## 本轮审计摘要

| 严重度 | 数量 | 已修复 |
|--------|------|--------|
| CRITICAL | 1 | 0 |
| HIGH | 6 | 1 |
| MEDIUM | 14 | 0 |
| **合计** | **21** | **1** |

---

## CRITICAL

- [ ] **C1** — 服务端内存状态在 Vercel Serverless 中无效
  - **文件：** `lib/rate-limit.ts`, `lib/login-attempts.ts`, `lib/api-handler.ts`, `lib/config.ts`, `lib/content-registry.ts`, `lib/content.ts`
  - **问题：** 所有速率限制、登录尝试追踪、指标缓冲、配置缓存均使用模块级 `Map`/`Array` 变量。Vercel Serverless 中每次调用启动独立进程，状态不共享。速率限制在生产环境中完全无效，攻击者可通过请求命中不同实例绕过所有限制。
  - **修复方案：** 架构级改造——迁移到 Vercel KV / Upstash Redis。需单独讨论，本次 PR 不包含。
  - **备注：** 标记为已知限制 L-NEW-1。

---

## HIGH

- [ ] **H1** — `/api/config` GET 向管理员会话泄漏 `_remoteConfig` 原始内容
  - **文件：** `app/api/config/route.ts` (行 89-93, 127-139)
  - **问题：** 管理员会话获取完整 config.yaml 原始内容（`_remoteConfig`），可能包含敏感值（API keys, tokens, webhook secrets）。
  - **修复方案：** 从管理员响应中剥离 `_remoteConfig`，仅返回 `_remoteConfigStatus` 和布尔标志。

- [ ] **H2** — 无全局 middleware.ts，所有认证仅在路由级别
  - **文件：** 项目根目录（缺失 `middleware.ts`）
  - **问题：** 每个路由独立决定是否强制认证。新增路由若忘记添加 auth 检查，将完全无保护。
  - **修复方案：** 架构级改造——创建全局 middleware.ts，对所有 `/api/*` 路由默认强制认证，显式允许公开路由白名单。需单独讨论，本次 PR 不包含。
  - **备注：** 标记为已知限制 L-NEW-2。

- [x] **H3** — Clerk Webhook 和 Bind-Verify 绕过 `getDb()` 空值安全检查
  - **文件：** `app/api/webhooks/clerk/route.ts` (行 133), `app/api/auth/bind-verify/route.ts` (行 99)
  - **问题：** 两个文件直接 `import { prisma } from '@/lib/db'`，绕过 `getDb()` 的 null-safety。未配置数据库时会尝试 Prisma 操作并静默失败。
  - **修复方案：** 改用 `getDb()` + `db.prisma` 空值检查。Clerk webhook 在 DB 不可用时返回非 200 状态码。

- [ ] **H4** — 非原子多步操作（14+ 路由）
  - **文件：** `app/api/page/create/route.ts`, `app/api/auth/reset-password/route.ts`, `app/api/faces/route.ts`, `app/api/articles/route.ts` 等
  - **问题：** 所有操作执行多步顺序（读→验证→写→清理），无事务包装或锁机制。并发请求可交错执行导致数据损坏。
  - **修复方案：** 架构级改造——引入 Prisma 事务、悲观锁或条件写入。需单独讨论，本次 PR 不包含。
  - **备注：** 标记为已知限制 L-NEW-3。

- [x] **H5** — Storage Search/Stats 递归扫描无超时/限制，存在 DoS 风险
  - **文件：** `app/api/storage/search/route.ts`, `app/api/storage/stats/route.ts`
  - **问题：** 递归遍历整个存储树，无超时、无并发限制、无字节/文件数上限。单个请求可耗尽全部 Serverless 函数时间。
  - **修复方案：** 添加超时（8s）、并发限制（1）、字节上限（50MB）、文件数上限（1000）。

- [x] **H6** — Comments 读-改-写竞态条件
  - **文件：** `app/api/page/sdk/comments/route.ts`
  - **问题：** `readComments()` → 修改内存数组 → `writeComments()` 模式。并发 POST/DELETE 交错可导致评论静默丢失。
  - **修复方案：** 实现文件级互斥锁（写入并发限制为 1）或使用 ETag 乐观锁。

---

## MEDIUM

- [ ] **M1** — 正则 HTML 消毒器存在绕过风险
  - **文件：** `components/sanitize.ts`
  - **问题：** `sanitizeHeadHtml()` 使用正则黑名单，代码注释明确承认无法覆盖所有绕过向量（HTML 实体编码、嵌套标签等）。被 `CustomHead.tsx` 和 `HeadInjector.tsx` 使用。
  - **修复方案：** 用 DOMPurify 替换正则消毒器。

- [ ] **M2** — `/api/posts/route.ts` 缺少认证强制
  - **文件：** `app/api/posts/route.ts` (行 1-47)
  - **问题：** 注释说"仅供后台管理使用"，但 GET 无 `apiHandler` 包装、无 `requireAuth`。与声明意图不一致。
  - **修复方案：** 添加明确的认证要求或修正注释。

- [ ] **M3** — `/api/faces/route.ts` GET 无限速
  - **文件：** `app/api/faces/route.ts` (行 1-60)
  - **问题：** GET 无速率限制，攻击者可快速枚举所有公开联系人条目。
  - **修复方案：** 添加速率限制（30 req/min/IP）。

- [ ] **M4** — `/api/tickets/[...slug]/route.ts` 绕过 apiHandler 标准化
  - **文件：** `app/api/tickets/[...slug]/route.ts` (行 18-80)
  - **问题：** GET 和 PATCH 手动调用 `getSession()` 而非使用 `apiHandler`。缺少 try/catch 包装、指标收集、方法验证。
  - **修复方案：** 重构为使用 `apiHandler` 模式。

- [x] **M5** — 密码重置令牌竞态条件
  - **文件：** `app/api/auth/reset-password/route.ts` (行 100-130)
  - **问题：** 读令牌→检查过期→删除令牌→更新密码为非原子步骤。并发请求可两次使用同一令牌。
  - **修复方案：** 使用原子数据库操作：`prisma.passwordResetToken.deleteMany({ where: { token, expiresAt: { gt: new Date() } } })` + 检查 count。

- [ ] **M6** — 配置更新竞态条件
  - **文件：** `app/api/config/route.ts` POST handler
  - **问题：** 读取→合并→验证→写入。并发更新可互相覆盖。
  - **修复方案：** 使用数据库版本列实现乐观并发控制。

- [x] **M7** — Bind-Verify 速率限制竞态条件
  - **文件：** `app/api/auth/bind-verify/route.ts` (行 34-39)
  - **问题：** `checkRateLimit` 读取→递增→写入为非原子步骤。并发请求可绕过 5 次尝试限制。
  - **修复方案：** 使用原子递增或互斥锁。

- [ ] **M8** — 16+ 路由未使用 apiHandler 标准化
  - **文件：** `app/api/auth/me/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/2fa/disable/route.ts` 等
  - **问题：** 绕过统一 `apiHandler` 包装，缺少结构化日志、标准错误格式、请求时长追踪。
  - **修复方案：** 逐步迁移到 `apiHandler` 模式（本次 PR 处理最关键的几个）。

- [ ] **M9** — 关键路径静默吞错
  - **文件：** `app/api/webhooks/clerk/route.ts` (行 137), `app/api/storage/rename/[...path]/route.ts` (行 31-44), `app/api/navigation/route.ts` (行 62-72), `app/api/admin/stats/route.ts` (行 52)
  - **问题：** 多个 catch 块静默吞错或仅 console.error，不传播错误。
  - **修复方案：** 使用结构化日志器，Clerk webhook 返回 500 状态码。

- [ ] **M10** — 直接使用 console.warn/console.error 而非结构化日志器
  - **文件：** 多个文件（~145 处）
  - **问题：** 绕过 `lib/api-logger.ts` 结构化日志，生产环境日志不可搜索/过滤/告警。
  - **修复方案：** 替换为结构化日志器（本次 PR 处理最关键的几个）。

- [x] **M11** — Search Legacy Fallback 无限递归深度
  - **文件：** `app/api/search/route.ts`, 函数 `searchPostsDirectoryLegacy`
  - **问题：** 递归扫描无深度限制，深层嵌套目录可导致栈溢出。
  - **修复方案：** 添加 `maxDepth` 参数。

- [x] **M12** — Navigation Tree 无限递归深度
  - **文件：** `app/api/navigation/route.ts`, 函数 `buildNavigationTree` (行 52)
  - **问题：** 递归处理目录无深度限制。空 catch 块静默跳过损坏文件。
  - **修复方案：** 添加 `maxDepth` 参数，为空 catch 添加日志。

- [x] **M13** — Requests 路由直接导入 prisma 绕过 getDb()
  - **文件：** `app/api/requests/route.ts`, `app/api/requests/[id]/route.ts`
  - **问题：** 直接 `import { prisma }` 绕过 `getDb()` 空值安全。未配置 DB 时产生不透明错误。
  - **修复方案：** 改用 `getDb()` + null 检查。

- [x] **M14** — Bind-Send-Code 每次请求创建新 Transporter
  - **文件：** `app/api/auth/bind-send-code/route.ts` (行 59)
  - **问题：** 每次请求创建新 SMTP 连接池，而非使用 `lib/mail.ts` 的缓存单例。
  - **修复方案：** 使用 `lib/mail.ts` 的 `getTransporter()` 或 `sendMail()`。

---

## 已知限制（架构级，本次不修复）

- **L-NEW-1** — 服务端内存状态在 Vercel Serverless 中无效（C1）。需迁移到 Redis/KV。
- **L-NEW-2** — 无全局 middleware.ts（H2）。需创建全局认证中间件。
- **L-NEW-3** — 非原子多步操作（H4）。需引入事务/锁机制。

---

## 上次审计遗留已知限制

- **L1** — 内存速率限制在 Vercel Serverless 中无效（与 C1 相同）
- **L2** — CORS 未配置，API 默认接受任何来源请求
- **L3** — 旧 API Key 权限向后兼容：null permissions = 完全访问

---

## 本次 PR 修复范围

本次 PR 修复以下可独立安全修复的问题（不涉及架构级改造）：

| ID | 修复内容 | 文件 |
|----|----------|------|
| H3 | Clerk Webhook 和 Bind-Verify 改用 getDb() + null 检查 | `webhooks/clerk/route.ts`, `bind-verify/route.ts` |
| H5 | Storage Search/Stats 添加超时、并发限制、字节/文件数上限 | `storage/search/route.ts`, `storage/stats/route.ts` |
| H6 | Comments 写操作添加互斥锁 | `page/sdk/comments/route.ts` |
| M5 | 密码重置令牌使用原子 deleteMany | `auth/reset-password/route.ts` |
| M7 | Bind-Verify 速率限制使用原子递增 | `auth/bind-verify/route.ts` |
| M11 | Search Legacy 添加递归深度限制 | `search/route.ts` |
| M12 | Navigation Tree 添加递归深度限制 | `navigation/route.ts` |
| M13 | Requests 路由改用 getDb() | `requests/route.ts`, `requests/[id]/route.ts` |
| M14 | Bind-Send-Code 使用缓存 Transporter | `auth/bind-send-code/route.ts` |
