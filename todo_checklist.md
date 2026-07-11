# 周度安全审计与缺陷修复清单

> 审计日期：2026-07-11
> 审计范围：鉴权路由安全 / 注入与数据安全 / 业务逻辑与稳定性

---

## 高危漏洞（High）

- [x] **H-1: 文章详情接口 GET 未要求认证**
  - 文件：`app/api/articles/[...id]/route.ts`
  - 问题：`GET` handler 使用 `apiHandler('GET', { label: '获取文章详情' })` 未设置 `requireAuth`，未认证用户可通过遍历 ID 探测草稿/未发布文章元数据。
  - 修复：添加 `requireAuth: true`，与 PATCH/DELETE 保持一致。

- [x] **H-2: `clerk-dynamic.ts` 使用 `new Function()` 动态导入**
  - 文件：`lib/clerk-dynamic.ts`
  - 问题：`new Function('s', 'return import(s)')` 等同于 eval，可能被 CSP `script-src` 策略阻断，且绕过 bundler 的 tree-shaking 和 nonce 注入。
  - 修复：替换为标准 `import(specifier)`，调用方已有 try/catch 降级处理。

---

## 中危漏洞（Medium）

- [x] **M-1: 日记创建页面仅客户端校验 sudo 权限**
  - 文件：`proxy.ts`
  - 问题：`isSudo` 检查仅在 `useAuth` hook 中执行（客户端），无服务端校验。禁用 JS 或伪造 auth state 可绕过。
  - 修复：在 middleware 中对 `/diary/new` 路径添加服务端 sudo 角色校验，未授权则重定向至登录页。

- [x] **M-2: Config 写入时未对 `customHead` 做写入时消毒**
  - 文件：`app/api/config/route.ts`
  - 问题：`customHead` 字段经 Zod schema 校验结构后直接写入 GitHub，恶意 HTML 仅在渲染时才由 `sanitizeHeadHtml()` 处理，存在存储型 XSS 风险。
  - 修复：在 POST handler 写入前对 `customHead` 和 `customCSS` 调用 `sanitizeHeadHtml()` / `sanitizeCss()`。

- [x] **M-3: `report-error` 接口 `rateLimitMap` 内存泄漏风险**
  - 文件：`app/api/report-error/route.ts`
  - 问题：`rateLimitMap` 仅在 size > 1000 时触发清理，分布式攻击下大量唯一 IP 可导致内存无限增长。
  - 修复：增加硬性上限 2000，超过时按最早时间戳淘汰至 1500。

- [x] **M-4: 多处 fire-and-forget `void promise` 吞掉错误**
  - 文件：`components/ConfigProvider.tsx`（其余文件已有内部 try/catch）
  - 问题：`void fetch().then(...)` 模式在 fetch 失败时 Promise rejection 被静默吞掉，用户无感知。
  - 修复：为 ConfigProvider.tsx 的 locale 加载添加 `.catch()` 错误日志。其余文件（Hitokoto、BacklinkPanel、TranslationSwitcher、faces、use-author、use-auth）已确认有内部错误处理，无需修改。

- [x] **M-5: `use-diary-draft.ts` 空 catch 块吞掉 localStorage 错误**
  - 文件：`hooks/use-diary-draft.ts`
  - 问题：`saveLocalDraft`、`removeLocalDraft`、`clearDraft` 中 `catch {}` 完全忽略错误。
  - 修复：添加 `console.warn` 记录错误信息，便于调试排查。

- [x] **M-6: storage/search 缓存 Map 并发竞态**
  - 文件：`app/api/storage/search/route.ts`
  - 问题：`cacheStore` 为模块级 Map，`pruneCache`、`getCachedResult`、`setCachedResult` 无同步保护，serverless 并发请求可能竞态。
  - 修复：添加 `withCacheLock` 互斥锁机制，序列化缓存读写操作。

- [x] **M-7: 日记表单 `hasUnsavedChanges` 竞态条件**
  - 文件：`app/diary/_form.tsx`
  - 问题：`lastSavedSnapshot` 仅在 `saveStatus === 'saved'` 时更新，用户快速导航时会误触发"未保存"提示。
  - 修复：添加 `pendingSaveRef` 标记正在进行的保存，`beforeunload` 检查该 ref 后跳过拦截。

- [x] **M-8: storage/stats 全量目录扫描无资源限制**
  - 文件：`app/api/storage/stats/route.ts`
  - 问题：递归扫描整个存储树（MAX_DEPTH=5, MAX_CONCURRENCY=8），大型存储池可能导致超时和内存暴增。
  - 修复：增加 `MAX_FILES = 5000` 硬性上限，超过后提前终止扫描。

---

## 低危漏洞（Low）

- [ ] **L-1: 健康检查接口暴露 uptime 和版本信息**
  - 文件：`app/api/health/route.ts`
  - 问题：公开 `/api/health` 返回 uptime（可推断部署时间）和 version。
  - 影响：信息泄露风险低，属于行业惯例。

- [ ] **L-2: 日记加密并行解密无数量限制**
  - 文件：`lib/diary-crypto.ts`
  - 问题：`Promise.all(storedList.map(...))` 对所有版本并行解密，版本过多时可能造成资源压力。
  - 影响：实际使用中版本数通常有限。

- [ ] **L-3: `MermaidBlock` 正则消毒 SVG 可被绕过**
  - 文件：`components/MarkdownRenderer/MermaidBlock.tsx`
  - 问题：正则消毒存在被精心构造的 mermaid 输入绕过的理论风险。
  - 缓解：mermaid 已设置 `securityLevel: 'strict'`。

---

## 已确认安全（通过）

- [x] SQL 注入：全部使用 Prisma ORM 参数化查询，无风险
- [x] 命令注入：仅构建脚本使用 `execSync`，无用户输入参与
- [x] 动态代码执行：无 `eval()` 调用
- [x] 无硬编码密钥
- [x] JWT 使用 jose 库限制算法为 HS256，防算法混淆
- [x] 文件上传有扩展名黑名单
- [x] 存储路径有 `isValidPath()` 防路径穿越
- [x] 登录有暴力破解防护（10次/15分钟锁定）
- [x] API Key 使用 HMAC-SHA256 哈希
