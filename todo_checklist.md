# 安全审计修复销项清单

**审计日期：** 2026-07-05（两轮）
**审计范围：** 全站安全扫描（API 路由、认证、授权、文件系统、递归遍历、并发控制、DoS 防护）
**来源文件：** issue_details.md

---

## Cycle 1（commit 055e406）

- [x] **F1** `app/api/auth/bind-verify/route.ts` — timingSafeEqual() 常量时间比较（CRITICAL）
  - ✅ 已验证：import { timingSafeEqual } from 'crypto'，调用 timingSafeEqual(Buffer.from(storedCode), Buffer.from(code))
- [x] **F2** `app/api/page/sdk/comments/route.ts` — POST 端点频率限制（HIGH）
  - ✅ 已验证：checkRateLimit(req, 'comment-post', 10, 60_000)
- [x] **F3** `components/sanitize.ts` — 增强 HTML/CSS 消毒正则（HIGH）
  - ✅ 已验证：DANGEROUS_TAGS 含 svg/math/xss，DANGEROUS_PROTOCOL 含 vbscript，data: URL 拦截
- [x] **F4** `components/MarkdownRenderer/MermaidBlock.tsx` — SVG 消毒 iframe/object/embed 清理（HIGH）
  - ✅ 已验证：.replace(<foreignObject>), .replace(<iframe>), .replace(<object>), .replace(<embed>)
- [x] **F5** `lib/content-registry.ts` — buildRegistry() O(n²) → O(1) Map 查找（MEDIUM）
  - ✅ 已验证：Map<string, RegistryEntry> titleMap，O(1) 查找
- [x] **F6** `lib/rate-limit.ts` — getClientIp() IPv4/IPv6 正则验证（MEDIUM）
  - ✅ 已验证：getClientIp() 含 IPv4/IPv6 正则校验

---

## Cycle 2（commit 0630916）

- [x] **H3** `app/api/auth/bind-verify/route.ts` + `app/api/webhooks/clerk/route.ts` — getDb() null-safety（HIGH）
  - ✅ 已验证：webhooks/clerk/route.ts 使用 getDb() + db.prisma 空值检查
- [x] **H5** `app/api/storage/search/route.ts` + `app/api/storage/stats/route.ts` — 文件系统遍历 DoS 防护（HIGH）
  - ✅ 已验证：MAX_FILES=1000, MAX_BYTES=50MB, TIMEOUT_MS=8000, 并发锁
- [x] **H6** `app/api/page/sdk/comments/route.ts` — writeLock 并发控制（HIGH）
  - ✅ 已验证：withWriteLock() Promise-based 互斥锁，POST 和 DELETE 均使用
- [x] **M5** `app/api/auth/reset-password/route.ts` — token 校验后立即删除（MEDIUM）
  - ✅ 已验证：db.del(`reset:${token}`) 在验证通过后立即执行（行 124）
- [x] **M7** `app/api/auth/bind-verify/route.ts` — rateLimitLocks 互斥锁（MEDIUM）
  - ✅ 已验证：withRateLimitLock() Promise-based 互斥锁，行 160 调用
- [x] **M11** `app/api/search/route.ts` — 递归深度限制 maxDepth=10（MEDIUM）
  - ✅ 已验证：maxDepth: 10, depth >= state.maxDepth 时停止
- [x] **M12** `app/api/navigation/route.ts` — 递归深度限制 maxDepth=10（MEDIUM）
  - ✅ 已验证：maxDepth = 10, depth >= maxDepth 时返回空数组
- [x] **M13** `app/api/requests/route.ts` + `app/api/requests/[id]/route.ts` — getDb() null-safety（MEDIUM）
  - ✅ 已验证：requests/route.ts 使用 getDb()
- [x] **M14** `app/api/auth/bind-send-code/route.ts` — 复用 lib/mail.ts 缓存 transporter（MEDIUM）
  - ✅ 已验证：import { sendMail } from '@/lib/mail'，调用 sendMail()

---

## 代码质量修复（Cycle 2）

- [x] **ESLint** `bind-verify/route.ts` — 复杂度 16→11（提取 completeBinding/sanitizeRole/syncClerkBinding）
- [x] **ESLint** `search/route.ts` — 参数 8→1，复杂度 16→10（LegacyScanState 接口）
- [x] **ESLint** `navigation/route.ts` — 复杂度 18→8（提取 processDirectoryEntry）

---

## 验证状态

- [x] npx vitest run — 全部通过
- [x] npx eslint — 0 errors
- [x] npx tsc --noEmit — 0 errors

**全部 15 项漏洞已修复并验证通过。**
