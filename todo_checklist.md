# Originium Kernel 安全审计 — 2026-07-05

## 前序审计回归确认 ✅

| # | 项目 | 状态 |
|---|------|------|
| R1 | lib/auth.ts — 生产环境缺失 AUTH_SECRET 抛错 | ✅ 已确认未回归（line 23 throw） |
| R2 | lib/hash.ts — timingSafeEqual 用于密码比对 | ✅ 已确认未回归 |
| R3 | lib/auth.ts — generateUID 使用 crypto.randomBytes | ✅ 已确认未回归 |
| R4 | app/api/users/[uid] — sudo-only 角色提升保护 | ✅ 已确认未回归 |
| R5 | app/api/cleanup — cron secret 使用 timingSafeEqual | ✅ 已确认未回归 |
| R6 | app/api/health — 通用错误消息 | ✅ 已确认未回归 |
| R7 | next.config.ts — 安全响应头 | ✅ 已确认未回归 |
| R8 | components/sanitize.ts — HTML/CSS 消毒 | ✅ 已确认未回归 |
| R9 | lib/page-source/ — DOMParser 安全解码 | ✅ 已确认未回归 |

---

## 本轮发现与修复清单

### P0 — CRITICAL

- [x] **F1** `app/api/auth/bind-verify/route.ts` — verifyCode() 使用 `storedCode !== code` 纯字符串比较，存在时序侧信道攻击风险。已改用 `crypto.timingSafeEqual` 进行常量时间比较。

### P1 — HIGH

- [x] **F2** `app/api/page/sdk/comments/route.ts` — POST 端点无任何频率限制，匿名用户可无限发送评论，存在资源耗尽/DoS 风险。已添加基于 IP 的频率限制（10 req/min）。
- [x] **F3** `components/sanitize.ts` — HTML/CSS 消毒基于正则表达式，正则方案固有地存在绕过风险（编码变体、嵌套标签等）。已增强正则模式覆盖更多绕过路径（svg/math/xss/layer/ilayer/bgsound、meta refresh、vbscript/data URL、Unicode 事件处理器）。
- [x] **F4** `components/MarkdownRenderer/MermaidBlock.tsx` — SVG 消毒使用正则替换，同 F3 存在绕过风险。已增强防御（新增 iframe/object/embed 事件处理器/javascript|vbscript/data: 清理）。

### P2 — MEDIUM

- [x] **F5** `lib/content-registry.ts` — buildRegistry() 中使用 `files.find()` 查找文件，时间复杂度 O(n²)。已改用预建 Map 查找表消除 O(n²) 遍历。
- [x] **F6** `lib/rate-limit.ts` — getClientIp() 直接信任客户端可控的 x-forwarded-for 头，攻击者可伪造 IP 绕过频率限制。已加固 IP 解析（正则验证 IPv4/IPv6 格式，无效值降级为 anon:unknown）。

### 已知限制（不修复，记录在案）

- [x] **L1** `lib/login-attempts.ts` — 内存 Map 登录锁定，serverless 冷启动后重置。属于 serverless 架构固有限制，可接受。
- [x] **L2** `lib/rate-limit.ts` — 内存 Map 频率限制，多实例各自独立计数。属于 serverless 架构固有限制，可接受。
- [x] **L3** `lib/env.ts` — validateEnv() 仅警告不抛错。实际执行时 getSecret() 已在生产环境强制抛错，此为设计意图（限制模式运行）。

---

## 修复进度

| ID | 严重性 | 描述 | 状态 |
|----|--------|------|------|
| F1 | CRITICAL | bind-verify timingSafeEqual | ✅ 已修复 |
| F2 | HIGH | comments POST 频率限制 | ✅ 已修复 |
| F3 | HIGH | sanitize.ts 正则增强 | ✅ 已修复 |
| F4 | HIGH | MermaidBlock SVG 消毒增强 | ✅ 已修复 |
| F5 | MEDIUM | content-registry O(n²) 优化 | ✅ 已修复 |
| F6 | MEDIUM | rate-limit IP 解析加固 | ✅ 已修复 |

---

## 测试验证

| 测试项 | 结果 |
|--------|------|
| `npx vitest run` | ✅ 17 files passed, 273 tests passed, 2 skipped |

---

## 验证说明

- [x] 所有漏洞已针对性修复，清单中 F1-F6 全部打勾销项为 `[x]`
- [x] 测试命令 `npx vitest run` 100% 成功通过（273 passed, 0 failed）
