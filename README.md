# Originium Kernel

一个基于 Next.js 16 构建的现代内容发布平台，支持文章管理、GitHub 同步、用户系统、工单系统、人脸画廊、WebDAV 存储池与自定义 HTML 页面等功能。

## 核心功能

- **Clerk 认证（可选）** - 集成 Clerk 身份认证，支持邮箱/社交登录，可选启用
- **文章管理** - 创建、编辑、删除文章，支持 Markdown 格式与语法高亮
- **Posts 系统** - 支持公开/私密文章，基于 slug 的 URL 路由
- **Faces 画廊** - 人脸/图片画廊管理，支持 CRUD 操作
- **日记管理** - 日记内容全部存储于数据库，支持创建、编辑、删除、置顶、分组、引用与草稿自动保存
- **GitHub 同步** - 通过 Octokit 将配置同步到 GitHub 仓库
- **用户管理** - 三级权限系统（sudo/admin/user），支持 Clerk 账号绑定
- **工单系统** - 可自定义工单模板，支持多种字段类型（input / textarea / dropdown）
- **文章删除申请** - 普通用户可对私密 Posts 发起删除申请，管理员审批
- **回收站** - 文章删除后进入回收站，30 天缓冲期可恢复
- **存储池（WebDAV / Backblaze B2）** - 通过环境变量 `STORAGE_TYPE` 切换存储后端：WebDAV（Nextcloud / 群晖 / 坚果云等）或 Backblaze B2（S3 兼容，支持 Cloudflare CDN 免费出口流量）。支持文件夹级 ACL、公开/私有访问与目录密码
- **自定义 HTML 页面** - 构建时从远端存储同步到本地 `./pages/`，通过沙箱 iframe 渲染，支持目录密码保护
- **全局搜索** - `Ctrl/Cmd+K` 唤起搜索面板，跨文章/Posts/Faces/页面
- **密码重置** - 基于 SMTP 邮件的密码重置功能
- **多语言支持** - 完整的中英文国际化（next-intl）
- **系统配置** - 站点标题、描述、背景图片、自定义 CSS/Head、加载动画等可配置
- **环境变量监控** - 管理员可查看环境变量配置状态
- **定时清理** - 自动清理过期的待删除文章
- **暗色模式** - 自动检测系统主题偏好
- **API 统一封装** - `apiHandler(method, options, fn)` 统一处理鉴权、日志、错误响应

## 页面路由

### 公开页面

| 路由 | 描述 | 权限 |
|------|------|------|
| `/` | 首页（文章列表） | 公开 |
| `/about` | 关于页 | 公开 |
| `/archives` | 归档索引（按年分组） | 公开 |
| `/tags/[tag]` | 标签详情页 | 公开 |
| `/posts` | Posts 列表 | 公开 |
| `/posts/[...slug]` | Post 详情（slug 路由） | 公开 |
| `/faces` | Faces 画廊 | 公开 |
| `/faces/[...slug]` | Face 详情 | 公开 |
| `/article/[id]` | 文章详情（id 路由） | 公开 |
| `/article/view` | 文章查看（通过查询参数） | 公开 |
| `/page` | 自定义 HTML 页面索引 | 公开 |
| `/page/[...path]` | 自定义 HTML 页面渲染（沙箱 iframe） | 公开 / 目录密码 |
| `/files/[...path]` | WebDAV 公开读代理 | 公开 / 登录（按 ACL） |
| `/[user]` | 用户主页 | 公开 |
| `/[user]/[article]` | 用户文章详情 | 公开 |
| `/login` | 登录页面 | 公开 |
| `/forgot-password` | 忘记密码 | 公开 |
| `/reset-password` | 重置密码 | 公开 |
| `/clerk/sign-in/[[...rest]]` | Clerk 登录 | 公开 |
| `/clerk/sign-up/[[...rest]]` | Clerk 注册 | 公开 |

### 登录用户页面

| 路由 | 描述 | 权限 |
|------|------|------|
| `/posts/private` | 私密 Posts | 登录用户 |
| `/faces/new` | 创建 Face | 登录用户 |
| `/faces/edit/[...slug]` | 编辑 Face | 登录用户 |
| `/tickets` | 工单列表 | 登录用户 |
| `/tickets/new` | 创建工单 | 登录用户 |
| `/tickets/[...slug]` | 工单详情 | 登录用户 |
| `/editor` | 文章编辑器 | 登录用户 |
| `/dashboard` | 用户仪表盘 | 登录用户 |
| `/dashboard/articles` | 文章管理（含回收站） | 登录用户 |
| `/dashboard/settings` | 用户设置 | 登录用户 |
| `/clerk/bind` | Clerk 账号绑定 | 登录用户 |
| `/clerk/after-auth` | Clerk 认证后回调 | 登录用户 |

### 管理员页面

| 路由 | 描述 | 权限 |
|------|------|------|
| `/admin` | 管理员首页 | admin/sudo |
| `/admin/users` | 用户管理 | admin/sudo |
| `/admin/config` | 系统配置编辑 | admin/sudo |
| `/admin/config/preview` | 配置预览（diff 视图） | admin/sudo |
| `/admin/env` | 环境变量状态 | admin/sudo |
| `/admin/tickets` | 工单模板管理 | admin/sudo |
| `/admin/tickets/new` | 创建工单模板 | admin/sudo |
| `/admin/requests` | 文章删除申请审批 | admin/sudo |
| `/admin/storage` | WebDAV 存储池管理（文件夹/文件/上传） | sudo |
| `/diary` | 日记列表 | admin/sudo |
| `/diary/new` | 新建日记 | admin/sudo |
| `/diary/drafts` | 日记草稿列表 | admin/sudo |
| `/diary/[id]/edit` | 编辑日记 | admin/sudo |

## API 接口

### 认证相关

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/reset-password` | 发送密码重置邮件 |
| PUT | `/api/auth/reset-password` | 通过 token 重置密码 |
| POST | `/api/auth/bind-send-code` | 发送绑定验证码 |
| POST | `/api/auth/bind-verify` | 验证并绑定 |
| DELETE | `/api/auth/bind-verify` | 解绑 |
| GET | `/api/auth/clerk-check` | Clerk 认证状态检查 |

### 日记相关（admin/sudo）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/diary` | 获取日记条目列表 |
| POST | `/api/diary` | 创建日记条目 |
| GET | `/api/diary/[id]` | 获取日记条目详情 |
| PUT | `/api/diary/[id]` | 更新日记条目 |
| PATCH | `/api/diary/[id]` | 切换置顶状态 |
| DELETE | `/api/diary/[id]` | 删除日记条目 |
| GET | `/api/diary/draft` | 获取草稿 |
| POST | `/api/diary/draft` | 保存草稿 |
| DELETE | `/api/diary/draft` | 删除草稿 |
| GET | `/api/diary/export` | 导出全部日记为 Markdown 文件下载 |

### 文章相关

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/articles` | 获取文章列表 |
| POST | `/api/articles` | 创建文章 |
| GET | `/api/articles/[id]` | 获取文章详情 |
| PATCH | `/api/articles/[id]` | 更新文章（需登录） |
| DELETE | `/api/articles/[id]` | 删除文章（需登录） |

### Posts 相关

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/posts` | 获取 Posts 列表 |

### Faces 相关

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/faces` | 获取 Faces 列表 |
| POST | `/api/faces` | 创建 Face |
| PATCH | `/api/faces` | 更新 Face |
| DELETE | `/api/faces` | 删除 Face |
| GET | `/api/faces/[...slug]` | Face 详情（按 slug） |

### 工单相关

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/tickets` | 获取工单列表（需登录） |
| POST | `/api/tickets` | 创建工单（需登录） |
| GET | `/api/tickets/[...slug]` | 工单详情（需登录） |
| PATCH | `/api/tickets/[...slug]` | 更新工单（需登录） |
| GET | `/api/ticket-templates` | 获取工单模板（需登录） |
| POST | `/api/ticket-templates` | 创建/更新工单模板（admin） |

### 用户相关

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/users` | 获取用户列表（需登录） |
| GET | `/api/users/[uid]` | 获取用户详情（需登录） |
| PATCH | `/api/users/[uid]` | 更新用户（admin） |
| GET | `/api/user/profile` | 获取自己的资料（需登录） |
| PUT | `/api/user/profile` | 更新自己的资料（需登录） |
| GET | `/api/admin/users` | 管理员获取全量用户列表（admin） |

### 文章删除申请

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/requests` | 获取申请列表（admin） |
| PATCH | `/api/requests/[id]` | 审批申请（admin） |

### 回收站

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/recycle-bin` | 获取待删除文章（需登录） |
| POST | `/api/recycle-bin` | 恢复文章（admin） |
| DELETE | `/api/recycle-bin` | 永久删除文章（admin） |

### 系统相关

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/config` | 获取系统配置 |
| POST | `/api/config` | 更新系统配置 |
| PUT | `/api/config` | 更新系统配置（部分字段） |
| GET | `/api/site-config` | 获取公开站点配置（冻结结构） |
| GET | `/api/env-status` | 获取环境变量状态（admin） |
| GET | `/api/cleanup` | 获取清理统计（admin） |
| POST | `/api/cleanup` | 执行清理任务（admin） |
| GET | `/api/search` | 全局搜索（公开） |
| POST | `/api/share` | 分享事件埋点（公开） |

### GitHub 同步

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/github` | 读取 GitHub 文件（需登录） |
| POST | `/api/github` | GitHub 通用操作（需登录） |
| POST | `/api/github/sync` | 同步配置到 GitHub（需登录） |

### 存储池（WebDAV，admin/sudo）

所有存储池接口都经过统一的 `apiHandler` 包装，路径解析与错误码（`503 NOT_CONFIGURED` / `400 invalid-path` / `413 payload-too-large`）由 `app/api/storage/_helpers.ts` 统一处理。

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/storage/config` | WebDAV 配置与开关状态 |
| GET | `/api/storage/folders` | 列出所有 `StorageFolder` 元数据 |
| GET | `/api/storage/folder/[...path]` | 读取单个文件夹元数据 |
| PATCH | `/api/storage/folder/[...path]` | 更新文件夹 `public` / `description` / `password` |
| GET | `/api/storage/list/[...path]` | 列出 WebDAV 指定路径下的条目 |
| POST | `/api/storage/mkdir/[...path]` | 创建文件夹并写入元数据 |
| DELETE | `/api/storage/rmdir/[...path]` | 递归删除文件夹并清除元数据 |
| POST | `/api/storage/upload/[...path]` | 上传文件（单文件 ≤ 50 MB） |
| DELETE | `/api/storage/file/[...path]` | 删除文件 |

### 短链

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/u/[username]/[articleId]` | 用户文章短链（公开） |

### Webhook

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/webhooks/clerk` | Clerk Webhook 回调 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.2.4 (App Router, Standalone) |
| 语言 | TypeScript 5.9.3 |
| UI 库 | Ant Design 6.1.1 + 自建组件库（`components/ui/`） |
| 样式 | Tailwind CSS 4.2.2 + antd-style |
| 数据库 | PostgreSQL + Prisma 6.19.2 |
| 认证 | Clerk（可选） + Jose 6.2.2 (JWT) |
| GitHub | Octokit 5.0.5 |
| 邮件 | Nodemailer 8.0.4 |
| WebDAV | webdav 5.10.0 |
| 国际化 | next-intl 4.8.3 |
| 动画 | Motion 12.23.24 |
| Markdown | react-markdown 10.1.0 + react-syntax-highlighter + remark-gfm + rehype-highlight |
| 测试 | Vitest 4.1.5 |
| 包管理 | npm / Bun（兼容） |

## 环境变量

> **URL 解析顺序**（详见 `const/url.ts`）：`APP_URL` → `VERCEL_PROJECT_PRODUCTION_URL`（warn）→ `VERCEL_URL`（warn）→ 抛错。
> **存储后端切换**（`STORAGE_TYPE`）：`webdav`（默认）或 `backblaze`，决定存储池与自定义页面使用哪个后端。
> **WebDAV 启用判定**（`lib/env.ts → isWebDavConfigured`）：`WEBDAV_URL` / `WEBDAV_USER` / `WEBDAV_PASS` 三者必须同时存在。
> **Backblaze B2 启用判定**（`lib/env.ts → isBackblazeConfigured`）：`B2_KEY_ID` / `B2_APP_KEY` / `B2_BUCKET` 三者必须同时存在。

| 变量名 | 描述 | 必需 | 默认值 |
|--------|------|------|--------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | 是 | - |
| `POSTGRES_URL` | PostgreSQL 连接地址（备选） | 否 | - |
| `POSTGRES_PRISMA_URL` | PostgreSQL Prisma 专用连接地址 | 否 | - |
| `POSTGRES_URL_NON_POOLING` | PostgreSQL 非连接池地址 | 否 | - |
| `AUTH_SECRET` | JWT 签名密钥（至少 32 字符） | 是 | - |
| `ADMIN_EMAIL` | 初始管理员邮箱 | 否 | - |
| `ADMIN_PASSWORD` | 初始管理员密码 | 否 | - |
| `APP_URL` | 站点根地址（生产环境必填；影响 og:url / 分享链接 / 版权链接 / OAuth 回调）。缺失时运行时回退到 Vercel 注入的环境变量（`next build` 时会发出 build warning） | 否 | `http://localhost:3000` |
| `GITHUB_REPO` | GitHub 仓库（格式：`用户名/仓库名`） | 否 | - |
| `GITHUB_TOKEN` | GitHub 访问令牌（需要 repo 权限） | 否 | - |
| `CRON_SECRET` | 定时任务认证密钥 | 否 | - |
| `SMTP_HOST` | SMTP 服务器地址 | 否 | - |
| `SMTP_PORT` | SMTP 服务器端口 | 否 | `587` |
| `SMTP_USER` | SMTP 用户名 | 否 | - |
| `SMTP_PASS` | SMTP 密码 | 否 | - |
| `SMTP_FROM` | 发件人邮箱地址 | 否 | - |
| `SMTP_SECURE` | 是否使用 SSL（布尔值） | 否 | 自动（端口 465 时为 true） |
| `WEBDAV_URL` | WebDAV 服务器地址（如 `https://dav.example.com/remote.php/dav/files/user`）。缺省时整个存储池与自定义页面功能降级为不可用 | 否(WebDAV 模式) | - |
| `WEBDAV_USER` | WebDAV 用户名 | 否 | - |
| `WEBDAV_PASS` | WebDAV 密码 | 否 | - |
| `STORAGE_TYPE` | 存储后端类型：`webdav`（默认）或 `backblaze` | 否 | `webdav` |
| `B2_KEY_ID` | Backblaze B2 应用程序密钥 ID | 否(B2 模式) | - |
| `B2_APP_KEY` | Backblaze B2 应用程序密钥 | 否(B2 模式) | - |
| `B2_BUCKET` | Backblaze B2 存储桶名称 | 否(B2 模式) | - |
| `B2_DOWNLOAD_URL` | (可选) 自定义下载端点（如 Cloudflare CDN URL，无尾斜杠）。启用后下载请求走 CDN 而非 B2 直连 | 否 | - |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 公钥（启用 Clerk 认证时需要） | 否 | - |
| `CLERK_SECRET_KEY` | Clerk 私钥（启用 Clerk 认证时需要） | 否 | - |
| `SKIP_DB_INIT` | 跳过数据库初始化 | 否 | - |
| `DISABLE_HMR` | 禁用热更新（开发用） | 否 | - |

> 平台隐式变量（无需手动设置）：`VERCEL`（构建时为 `"1"`）、`VERCEL_URL`、`VERCEL_PROJECT_PRODUCTION_URL`、`NODE_ENV`。

## 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd PrivateJournal

# 安装依赖（npm 或 bun 均可）
npm install
# 或: bun install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际配置

# 初始化数据库
npm run db:push

# 生成 Prisma 客户端
npm run db:generate

# 启动开发服务器
npm run dev

# 构建生产版本（自动执行: type-check → lint → test → db:generate → db:init → sync:pages → next build）
npm run build

# 启动生产服务器
npm run start
```

### 可用脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + Lint + 测试 + Prisma 生成 + DB 初始化 + Pages 同步 + Next.js 构建 |
| `npm run start` | 启动生产服务器 |
| `npm run test` | 运行 Vitest 测试 |
| `npm run check` | 类型检查 + Lint |
| `npm run type-check` | TypeScript 类型检查 |
| `npm run lint` | ESLint 检查（`--max-warnings=0`） |
| `npm run db:push` | 推送数据库 Schema |
| `npm run db:generate` | 生成 Prisma 客户端 |
| `npm run db:migrate` | 运行数据库迁移（dev） |
| `npm run db:studio` | 启动 Prisma Studio |
| `npm run db:init` | 初始化数据库（种子数据） |
| `npm run sync:pages` | 从 WebDAV 同步自定义 HTML 页面到本地 `./pages/`（`prebuild` 自动调用） |
| `npm run clean` | 清理 Next.js 构建缓存 |

> **构建前置依赖**：执行 `npm run build` 时会先运行 `prebuild` 钩子（`sync:pages`），该脚本会调用 WebDAV 读取 `pages/` 目录并写入本地。如果未配置 `WEBDAV_*` 三项，sync 脚本会跳过同步并打 warning；构建继续进行，但 `/page` 与 `/page/[...path]` 路由将无可用内容。

## 项目结构

```
PrivateJournal/
├── app/                                # Next.js App Router 页面与 API
│   ├── api/                            # API 路由（统一由 lib/api-handler.ts 包装）
│   │   ├── auth/                       # 认证（login / logout / me / reset / bind / clerk）
│   │   ├── articles/                   # 文章 CRUD
│   │   ├── diary/                      # 日记 CRUD + draft + export
│   │   ├── posts/                      # Posts 列表
│   │   ├── faces/                      # Faces 画廊 CRUD
│   │   ├── tickets/                    # 工单 CRUD
│   │   ├── ticket-templates/           # 工单模板
│   │   ├── users/                      # 用户列表/详情/编辑
│   │   ├── user/                       # 当前用户资料
│   │   ├── requests/                   # 文章删除申请
│   │   ├── config/                     # 系统配置
│   │   ├── site-config/                # 公开站点配置（GET）
│   │   ├── github/                     # GitHub 同步
│   │   ├── recycle-bin/                # 回收站
│   │   ├── cleanup/                    # 定时清理
│   │   ├── env-status/                 # 环境变量状态
│   │   ├── admin/                      # 管理员接口
│   │   ├── storage/                    # WebDAV 存储池（config / folders / list / mkdir / rmdir / upload / file / folder）
│   │   ├── search/                     # 全局搜索
│   │   ├── share/                      # 分享事件埋点
│   │   ├── u/                          # 用户短链
│   │   └── webhooks/                   # Webhook 回调（Clerk）
│   ├── admin/                          # 管理员页面（users / config / config/preview / env / tickets / requests / storage）
│   ├── clerk/                          # Clerk 认证页面（sign-in / sign-up / bind / after-auth）
│   ├── dashboard/                      # 用户仪表盘（articles / settings）
│   ├── diary/                          # 日记（list / new / drafts / [id]/edit）
│   ├── editor/                         # 文章编辑器
│   ├── posts/                          # Posts 列表 / 详情 / private
│   ├── faces/                          # Faces 画廊 / 详情 / new / edit
│   ├── tickets/                        # 工单列表 / 详情 / new
│   ├── article/                        # 文章详情（[id] / view）
│   ├── page/                           # 自定义 HTML 页面（index / [...path] 沙箱渲染）
│   ├── files/                          # WebDAV 公开读代理（ACL 网关）
│   ├── tags/[tag]/                     # 标签详情
│   ├── about/                          # 关于页
│   ├── archives/                       # 归档索引
│   ├── login/                          # 登录
│   ├── forgot-password/                # 忘记密码
│   ├── reset-password/                 # 重置密码
│   ├── [user]/                         # 用户主页（动态路由）
│   ├── layout.tsx                      # 根布局
│   ├── providers.tsx                   # 全局 Provider 装配
│   ├── loading.tsx                     # 全局 Loading
│   ├── globals.css                     # 全局样式
│   └── HeroBanner.tsx                  # 首页 Hero
├── components/                         # React 组件
│   ├── ArticleCard.tsx                 # 文章卡片
│   ├── ArticleCopyright.tsx            # 文章版权声明
│   ├── AuthCard.tsx                    # 认证卡片
│   ├── AuthLayout.tsx                  # 认证布局
│   ├── AuthorCard.tsx                  # 作者信息卡
│   ├── Avatar.tsx                      # 头像
│   ├── BackgroundProvider.tsx          # 背景主题 Provider
│   ├── CategoryBar.tsx                 # 分类导航
│   ├── ClerkAuthProvider.tsx           # Clerk Provider
│   ├── ClerkLoginSection.tsx           # Clerk 登录区
│   ├── ConfigProvider.tsx              # 应用配置 Provider
│   ├── CopyInterceptor.tsx             # 复制事件拦截
│   ├── CustomHead.tsx                  # 自定义 Head
│   ├── FontSizeProvider.tsx            # 字号 Provider
│   ├── Navbar.tsx                      # 顶栏（含搜索/时钟/用户菜单）
│   ├── PostEditLink.tsx                # 文章内联编辑链接
│   ├── ReadModeShare.tsx               # 阅读模式分享栏
│   ├── RecentUpdatesBar.tsx            # 最近更新条
│   ├── RewardArea.tsx                  # 打赏区
│   ├── TopHeader.tsx                   # 面包屑头
│   ├── UserMenu.tsx                    # 用户菜单
│   ├── style.ts                        # 共享样式 token
│   ├── config/                         # 配置面板组件（AccessControl / Background / GitHubStatus / LoadingAnimation / SiteConfigForm）
│   ├── Footer/                         # Footer 组合（Avatar / Brand / Copyright / Links / Social / config / types）
│   ├── GitHubDiff/                     # GitHub Diff 查看器
│   ├── HomePostGrid/                   # 首页 Post 网格（Hero / PostCard / Cover / Pagination / QuickLinks / filter hook）
│   ├── LanguageSwitcher/               # 语言切换
│   ├── Loading/                        # 全局 Loading 浮层
│   ├── MarkdownRenderer/               # Markdown 渲染（CodeBlock / HeadingAnchor / renderer-config / use-markdown-config / types）
│   ├── SearchDialog/                   # 全局搜索弹窗（Ctrl/Cmd+K）
│   ├── ShareButtons/                   # 分享按钮行
│   ├── ShareModal/                     # 分享弹窗
│   ├── Sidebar/                        # 侧边栏（目录化，含 customPages / fileManager 入口）
│   └── ui/                             # 原子 UI 组件库
│       ├── Button/                     # 统一 Button（含自动 loading 状态）
│       ├── TOC/                        # 重建后的 TOC
│       ├── Input / Textarea / Select / Tag
│       ├── HeroBanner / PageContainer / ProCard / StatusCard / EmptyState / FormField / ToggleField
│       ├── 各 Config 组件（AccessControl / Background / CodeBlock / Config / Copy / Copyright / Cover / ErrorImg / Footer / LoadingAnimation / MainTone / Mourn / Nav / PostEdit / PostMeta / Reward / Share / SiteConfig / Social / WordCount / Toc / AuthorStatus）
│       └── index.ts                    # barrel 导出
├── lib/                                # 工具库
│   ├── api-handler.ts                  # apiHandler 统一包装（鉴权/日志/错误）
│   ├── api-logger.ts                   # API 路由日志
│   ├── auth.ts                         # 认证与 Session
│   ├── clerk-dynamic.ts                # 动态 Clerk 导入（避免 build 时强依赖）
│   ├── config.ts                       # 配置加载/保存管线（YAML）
│   ├── constants.ts                    # 项目常量
│   ├── content.ts                      # 文件系统内容读取（articles/posts/faces，日记除外）
│   ├── db-init.ts                      # DB 初始化与种子
│   ├── db.ts                           # Prisma 客户端 + KV 接口（基于 OriginiumKV）
│   ├── diary-crypto.ts                 # 日记加解密
│   ├── draft-storage.ts                # 草稿持久化
│   ├── env.ts                          # 环境变量（getEnvConfig / validateEnv / isWebDavConfigured / isGitHubConfigured / isCronEnabled）
│   ├── error.tsx                       # 前端错误展示（showError）
│   ├── github.ts                       # Octokit GitHub 集成
│   ├── hash.ts                         # 哈希工具
│   ├── mail.ts                         # Nodemailer 邮件服务
│   ├── markdown.ts                     # Markdown 工具
│   ├── tickets.ts                      # 工单模板逻辑
│   ├── ui.ts                           # UI 工具
│   ├── user.ts                         # 用户管理
│   ├── webdav.ts                       # WebDAV 客户端单例 + requireWebDavClient
│   ├── utils/                          # 通用工具子模块
│   │   ├── env.ts                      # 环境工具
│   │   └── platform.ts                 # 平台检测（server vs client）
│   ├── storage/                        # 存储池与自定义页面支撑
│   │   ├── acl.ts                      # checkAccess / checkPageAccess / isFolderPublic / normalizePath / getTopLevelFolder
│   │   ├── path.ts                     # joinPath / splitDirFilename / isValidPath / encodeFilePath
│   │   ├── types.ts                    # WebDavEntry / StorageFolderMeta / AccessResult
│   │   └── migration-from-kv.ts        # KV → StorageFolder 历史迁移（dryRun 默认，无 API 暴露）
│   └── page-source/                    # 自定义 HTML 页面源
│       ├── shared.ts                   # PAGES_PREFIX / isHtmlPath / extractTitle / buildPageRelativePath
│       ├── webdav.ts                   # fetchPageHtml / scanPagesHtmlDeep
│       └── normalize-webdav.mjs        # UTF-8 归一化（Node sync 脚本复用）
├── hooks/                              # React Hooks
│   ├── use-auth.tsx                    # 认证 context
│   ├── use-config.ts                   # 站点配置 context
│   ├── use-diary-draft.ts              # 日记草稿自动保存
│   ├── use-error-img.ts                # 坏图兜底
│   ├── use-github-config-sync.ts       # config.yaml 与 GitHub 同步
│   ├── use-github-diff.tsx             # GitHub Diff UI
│   ├── use-i18n.ts                     # 国际化（next-intl 包装）
│   ├── useIsDark.ts                    # 暗色模式
│   ├── use-main-tone.ts                # 背景主色提取
│   ├── use-media-query.ts              # 媒体查询
│   └── use-mobile.ts                   # 移动端断点
├── i18n/                               # 国际化配置
│   ├── config.ts                       # i18n 配置
│   ├── provider.tsx                    # i18n Provider
│   ├── zh-CN.json                      # 中文翻译
│   └── en.json                         # 英文翻译
├── const/                              # 常量
│   ├── branding.ts                     # 品牌配置
│   └── url.ts                          # 站点 URL 解析（APP_URL / Vercel fallback）
├── prisma/                             # Prisma
│   └── schema.prisma                   # 数据库模型
├── scripts/                            # 脚本
│   ├── db-init.mjs                     # DB 初始化
│   └── sync-pages.mjs                  # 构建时 WebDAV → ./pages/ 同步
├── pages/                              # 构建时同步生成的自定义 HTML 页面（git ignore）
├── proxy.ts                            # Next.js 16 代理（原 middleware）
├── i18n.ts                             # 国际化入口
├── config.yaml                         # 站点配置（由 lib/config.ts 读写）
├── metadata.json                       # 应用元数据
└── next.config.ts                      # Next.js 配置
```

## 用户角色

| 角色 | 权限 |
|------|------|
| `user` | 创建/编辑/删除自己的文章、Posts、Faces；发起文章删除申请 |
| `admin` | `user` 全部权限 + 管理所有用户、系统配置、工单模板、文章删除申请、回收站 |
| `sudo` | `admin` 全部权限 + WebDAV 存储池管理（`/admin/storage` 唯一入口） |

权限检查统一通过 `apiHandler` 的 `requireAdmin`（含 `admin` 与 `sudo`）实现；`/admin/storage` 单独要求 `sudo`。

## 数据库模型

| 模型 | 表名 | 关键字段 | 用途 |
|------|------|----------|------|
| `User` | `users` | `uid`, `email` (unique), `username?` (unique), `name`, `password`, `role` (默认 `user`), `userGroup?`, `status` (默认 `active`), `clerkId?` (unique), `clerkLinkedAt?` | 用户表 |
| `UserGroup` | `user_groups` | `id`, `name` (unique), `description?`, `permissions` (`String[]`, 默认 `[]`) | 用户组 |
| `OriginiumKV` | `originium_kv` | `key` (id), `value?`, `expiry?` (BigInt), `createdAt` | 通用 KV 存储（草稿、计数器等） |
| `Diary` | `diaries` | `id`, `title`, `content`, `tags` (`String[]`), `group?` (默认 `默认`), `references` (Json, 默认 `[]`), `date`, `pinned` (默认 `false`) | 日记（数据库独占，不依赖文件系统或 GitHub） |
| `Request` | `requests` | `id`, `userId`, `userName`, `postSlug`, `postTitle`, `reason?`, `status` (默认 `pending`) | 文章删除申请 |
| `StorageFolder` | `storage_folders` | `path` (id, 无前/后斜杠), `public` (默认 `false`, `is_public`), `description?`, `password?`（明文，MVP 决策，可升级为 bcrypt） | WebDAV 顶层文件夹元数据 + 自定义页面 ACL |

> `StorageFolder` 顶层目录用空字符串 `""` 表示根目录；只存文件夹级元数据，不存文件清单与文件内容（文件内容始终存放在 WebDAV）。

## 站点配置

通过 `config.yaml`（YAML 格式，本地 + 可选 GitHub 双向同步）或管理员面板（`/admin/config`）配置。基础结构示例：

```yaml
site:
  title: Originium Kernel
  description: 现代内容发布平台
  lang: zh-CN

appearance:
  background:
    url: ''
    opacity: 0.8
  customCSS: ''
  customHead: ''

access:
  posts:
    public: ['*']
    private: []
  faces:
    public: ['*']
    private: []
  diary:
    public: ['*']
    private: []

auth:
  allowRegistration: true
```

WebDAV 存储池与自定义页面的元数据（`StorageFolder`）不入 `config.yaml`，统一持久化在 Prisma `storage_folders` 表，通过 `/admin/storage` 管理。

## License

Private project. All rights reserved. 详见 [NOTICE.md](./NOTICE.md)。
