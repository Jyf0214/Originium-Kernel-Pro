# Originium Kernel

一个基于 Next.js 16 构建的现代内容发布平台，支持文章管理、GitHub 同步、用户系统、人脸画廊与 WebDAV 存储池等功能。

## 核心功能

- **文章管理** - 创建、编辑、删除文章，支持 Markdown 格式与语法高亮
- **Posts 系统** - 支持公开/私密文章，基于 slug 的 URL 路由
- **Faces 画廊** - 人脸/图片画廊管理，支持 CRUD 操作
- **日记管理** - 日记内容全部存储于数据库，支持创建、编辑、删除、置顶、分组、引用与草稿自动保存
- **GitHub 同步** - 通过 Octokit 将配置同步到 GitHub 仓库
- **用户管理** - 三级权限系统（sudo/admin/user），支持双因素认证
- **回收站** - 文章删除后进入回收站，30 天缓冲期可恢复
- **存储池（WebDAV / Backblaze B2）** - 通过环境变量 `STORAGE_TYPE` 切换存储后端：WebDAV（Nextcloud / 群晖 / 坚果云等）或 Backblaze B2（S3 兼容，支持 Cloudflare CDN 免费出口流量）。支持文件夹级 ACL、公开/私有访问与目录密码
- **全局搜索** - `Ctrl/Cmd+K` 唤起搜索面板，跨文章/Posts/Faces/页面
- **密码重置** - 基于 SMTP 邮件的密码重置功能
- **系统配置** - 站点标题、描述、背景图片、自定义 CSS/Head、加载动画等可配置
- **环境变量监控** - 管理员可查看环境变量配置状态
- **定时清理** - 自动清理过期的待删除文章
- **暗色模式** - 自动检测系统主题偏好
- **API 统一封装** - `apiHandler(method, options, fn)` 统一处理鉴权、日志、错误响应

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js (App Router, Standalone) |
| 语言 | TypeScript |
| UI 库 | Ant Design + 自建组件库（`components/ui/`） |
| 样式 | Tailwind CSS + antd-style |
| 数据库 | PostgreSQL + Prisma |
| 认证 | Jose (JWT) |
| GitHub | Octokit |
| 邮件 | Nodemailer |
| 存储 | WebDAV / @aws-sdk/client-s3 (Backblaze B2) |
| 动画 | Motion |
| Markdown | react-markdown + react-syntax-highlighter + remark-gfm + rehype-highlight |
| 测试 | Vitest |

## 环境变量

> **URL 解析顺序**（详见 `const/url.ts`）：`APP_URL` → `VERCEL_PROJECT_PRODUCTION_URL`（warn）→ `VERCEL_URL`（warn）→ 抛错。
> **存储后端切换**（`STORAGE_TYPE`）：`webdav`（默认）或 `backblaze`，决定存储池使用哪个后端。
> **WebDAV 启用判定**（`lib/webdav.ts → isWebDavConfigured`）：`WEBDAV_URL` / `WEBDAV_USER` / `WEBDAV_PASS` 三者必须同时存在。
> **Backblaze B2 启用判定**（`lib/storage/b2.ts → isB2Configured`）：`B2_KEY_ID` / `B2_APP_KEY` / `B2_BUCKET` 三者必须同时存在。

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
| `WEBDAV_URL` | WebDAV 服务器地址（如 `https://dav.example.com/remote.php/dav/files/user`）。缺省时存储池功能降级为不可用 | 否(WebDAV 模式) | - |
| `WEBDAV_USER` | WebDAV 用户名 | 否 | - |
| `WEBDAV_PASS` | WebDAV 密码 | 否 | - |
| `STORAGE_TYPE` | 存储后端类型：`webdav`（默认）或 `backblaze` | 否 | `webdav` |
| `B2_KEY_ID` | Backblaze B2 应用程序密钥 ID | 否(B2 模式) | - |
| `B2_APP_KEY` | Backblaze B2 应用程序密钥 | 否(B2 模式) | - |
| `B2_BUCKET` | Backblaze B2 存储桶名称 | 否(B2 模式) | - |
| `B2_DOWNLOAD_URL` | (可选) 自定义下载端点（如 Cloudflare CDN URL，无尾斜杠）。启用后下载请求走 CDN 而非 B2 直连 | 否 | - |
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

# 构建生产版本（自动执行: type-check → lint → test → db:generate → db:init → 搜索索引 + 版本生成 → build-wrapper）
npm run build

# 启动生产服务器
npm run start
```

### 可用脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + Lint + 测试 + Prisma 生成 + DB 初始化 + 搜索索引 + 版本生成 + Next.js 构建 |
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
| `npm run clean` | 清理 Next.js 构建缓存 |

> **构建前置依赖**：执行 `npm run build` 时会先运行 `prebuild` 钩子。

## 用户角色

| 角色 | 权限 |
|------|------|
| `user` | 创建/编辑/删除自己的文章、Posts、Faces |
| `admin` | `user` 全部权限 + 管理所有用户、系统配置、回收站 |
| `sudo` | `admin` 全部权限 + WebDAV 存储池管理（`/dashboard/storage` 唯一入口） |

权限检查统一通过 `apiHandler` 的 `requireAdmin`（含 `admin` 与 `sudo`）实现；`/dashboard/storage` 单独要求 `sudo`。

## 数据库模型

| 模型 | 表名 | 关键字段 | 用途 |
|------|------|----------|------|
| `User` | `users` | `uid`, `email` (unique), `username?` (unique), `name`, `password`, `role` (默认 `user`), `userGroup?`, `status` (默认 `active`), `twoFactorSecret?`, `twoFactorEnabled` (默认 `false`) | 用户表 |
| `OriginiumKV` | `originium_kv` | `key` (id), `value?`, `expiry?` (BigInt), `createdAt` | 通用 KV 存储（草稿、计数器等） |
| `Diary` | `diaries` | `id`, `title`, `content`, `tags` (`String[]`), `group?` (默认 `默认`), `references` (Json, 默认 `[]`), `date`, `pinned` (默认 `false`), `status` (默认 `published`), `scheduledAt?` | 日记（数据库独占，不依赖文件系统或 GitHub） |
| `Request` | `requests` | `id`, `userId`, `userName`, `postSlug`, `postTitle`, `reason?`, `status` (默认 `pending`) | 文章删除申请 |
| `StorageFolder` | `storage_folders` | `path` (id, 无前/后斜杠), `public` (默认 `false`), `description?`, `password?`（scrypt 哈希） | WebDAV 顶层文件夹元数据 |
| `ApiKey` | `api_keys` | `id`, `uid`, `key` (unique, sk-xxx), `name`, `permissions?`, `lastUsed?` | API 密钥（替代 Cookie 的无状态认证） |
| `ShareLink` | `share_links` | `id` (auto), `token` (unique), `path`, `password?`, `expiresAt` | 存储池文件/文件夹的有时效分享链接 |
| `AuditLog` | `audit_logs` | `id` (auto), `action`, `target`, `detail?`, `userId` | 不可篡改的操作审计日志 |
| `DiaryVersion` | `diary_versions` | `id`, `diaryId` (FK), `content`, `title?`, `tags?` | 日记编辑历史版本快照 |

## 站点配置

通过 `config.yaml`（YAML 格式，本地 + 可选 GitHub 双向同步）或管理员面板（`/dashboard/config`）配置。基础结构示例：

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

WebDAV 存储池的元数据（`StorageFolder`）不入 `config.yaml`，统一持久化在 Prisma `storage_folders` 表，通过 `/dashboard/storage` 管理。

## License

Private project. All rights reserved. 详见 [NOTICE.md](./NOTICE.md)。
