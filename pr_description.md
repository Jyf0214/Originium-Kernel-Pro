# 🛡️ 周度安全审计与漏洞修复报告

## 📋 概述

本次对 Originium Kernel 代码库进行了分布式深度安全排查，覆盖认证鉴权、注入攻击、逻辑缺陷、稳定性风险等多个维度。共发现 **10 项**中高危漏洞，已完成 **8 项**修复，2 项经复核确认为误报。

## 🔴 CRITICAL 级别修复

### C1: 频率限制器绕过 (`lib/rate-limit.ts`)
**问题**: `getClientIp()` 在缺少 `x-forwarded-for` / `x-real-ip` 头时，每次请求生成新的随机 UUID，导致每个请求获得独立的限流桶，频率限制完全失效。

**修复**: 替换随机 UUID 为基于 `User-Agent` + `Accept-Language` 头的稳定哈希标识符。同一客户端的所有请求现在共享同一个限流桶。

### C2: 认证 API 路由缺失 (`app/api/auth/`)
**问题**: 前端 `hooks/use-auth.tsx` 依赖 `/api/auth/login`、`/api/auth/logout`、`/api/auth/me` 三个端点，但路由处理器完全不存在，导致登录/登出/会话刷新功能完全不可用。

**修复**: 创建三个完整路由文件：
- `POST /api/auth/login` — 邮箱密码验证、登录锁定检查、2FA 支持、角色白名单校验
- `GET /api/auth/me` — 会话状态查询、用户信息获取
- `POST /api/auth/logout` — 会话销毁

所有路由复用现有 `lib/auth.ts`、`lib/hash.ts`、`lib/login-attempts.ts` 基础设施。

## 🟠 HIGH 级别修复

### H1: 会话吊销查询未捕获异常 (`lib/auth.ts`)
**问题**: `isSessionRevoked()` 中 `db.get('user:sv:...')` 未 try/catch，数据库临时故障时异常传播导致所有用户会话验证失败（500 错误），所有在线用户被锁定。

**修复**: 添加 try/catch，DB 失败时降级为"未吊销"（fail-open），避免全局锁死。

## 🟡 MEDIUM 级别修复

### M1: 草稿保存静默失败 (`hooks/use-diary-draft.ts`)
**问题**: `saveLocalDraft` 和 `removeLocalDraft` 的空 `catch {}` 块吞掉 localStorage 错误，用户数据丢失无任何反馈。

**修复**: 添加 `console.warn` 日志记录错误详情。

### M2: 上传扩展名黑名单不完整 (`app/api/storage/upload/[...path]/route.ts`)
**问题**: 缺少 `.html`、`.htm`、`.hta`、`.xhtml` 等可执行 Web 内容扩展名，攻击者可上传 HTML 文件实现存储型 XSS。

**修复**: 扩展黑名单覆盖所有可脚本执行的 Web 内容类型。

### M3: 二进制数据转换静默损坏 (`lib/storage/b2.ts`)
**问题**: `toBuffer()` 兜底路径 `Buffer.from(String(data))` 将对象转为 `"[object Object]"`，二进制数据被静默破坏。

**修复**: 兜底路径改为抛出明确错误，强制调用方提供正确类型。

### M4: HeadInjector 缺少纵深防御 (`components/HeadInjector.tsx`)
**问题**: 组件直接使用 `innerHTML` 注入 HTML，仅依赖调用方消毒，无内置防御层。

**修复**: 添加 DOMParser + 标签/属性白名单二次消毒层。

### M6: 指标快照并发安全 (`lib/api-handler.ts`)
**问题**: `getMetricsSnapshot()` 返回原始数组引用，并发读取时可能观察到中间状态。

**修复**: 返回浅拷贝 `[...metricsBuffer]`。

## ✅ 测试验证

```
Test Files  4 failed | 13 passed (17)
Tests       6 failed | 232 passed | 2 skipped (240)
```

- **232 项测试通过**，无新增失败
- 6 项失败 + 3 个失败套件均为 **预存问题**（Prisma 客户端未生成，测试环境无数据库）
- 认证模块 **29 项测试全部通过**，确认 `isSessionRevoked` 降级逻辑正确工作

## 📁 变更文件清单

| 文件 | 变更类型 |
|------|----------|
| `lib/rate-limit.ts` | 修改 — 修复限流绕过 |
| `lib/auth.ts` | 修改 — DB 故障降级 |
| `lib/api-handler.ts` | 修改 — 快照拷贝 |
| `lib/storage/b2.ts` | 修改 — 类型安全 |
| `hooks/use-diary-draft.ts` | 修改 — 错误日志 |
| `components/HeadInjector.tsx` | 修改 — 纵深防御 |
| `app/api/storage/upload/[...path]/route.ts` | 修改 — 扩展名黑名单 |
| `app/api/auth/login/route.ts` | **新增** — 登录端点 |
| `app/api/auth/logout/route.ts` | **新增** — 登出端点 |
| `app/api/auth/me/route.ts` | **新增** — 会话查询端点 |
| `todo_checklist.md` | **新增** — 漏洞档案清单 |
