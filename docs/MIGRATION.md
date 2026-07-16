# 数据迁移 Runbook

> 本文件描述 Originium Kernel 项目的**跨平台 / 跨服务迁移方案**，覆盖 PostgreSQL、WebDAV、GitHub 仓库、Clerk 项目、`StorageFolder` 路径重映射与 `config.yaml` schema 演进。
>
> 适用对象：运维 / 站点所有者 / 架构升级时的工程实施者。
> 最后更新：2026-06-07。
> 与之配套的备份文档：[BACKUP.md](./BACKUP.md)（迁移前必须先完成最新备份）。

---

## 目录

1. [迁移前的通用准备](#1-迁移前的通用准备)
2. [数据库迁移](#2-数据库迁移)
3. [WebDAV 迁移](#3-webdav-迁移)
4. [GitHub 仓库迁移](#4-github-仓库迁移)
5. [Clerk 项目迁移](#5-clerk-项目迁移)
6. [Storage Folder 重新映射](#6-storage-folder-重新映射)
7. [配置文件 Schema 演进](#7-配置文件-schema-演进)
8. [回滚策略](#8-回滚策略)
9. [迁移检查清单](#9-迁移检查清单)

---

## 1. 迁移前的通用准备

无论迁移哪种组件，以下步骤都**必须**先完成：

### 1.1 备份与审计

1. 触发一次完整备份（运行 `scripts/backup.sh`，详见 [BACKUP.md §4](./BACKUP.md#4-月度备份脚本)），并校验 SHA-256 清单。
2. 记录迁移前的关键状态：
   - PostgreSQL：`SELECT COUNT(*) FROM users, diaries, originium_kv, requests, storage_folders, user_groups;`
   - WebDAV：调用 `/api/storage/folders`（admin）获取所有 `StorageFolder` 元数据
   - GitHub：克隆到本地并 `git rev-parse HEAD` 记录 commit SHA
   - config.yaml：拷贝一份到 `docs/migrations/YYYYMMDD-HHMMSS-pre-migration-config.yaml`
3. 在 Vercel 项目中**冻结**部署窗口（暂停自动部署，避免迁移过程中代码与数据库状态错位）。

### 1.2 双写 / 灰度准备

迁移前决定以下策略：

| 策略 | 适用场景 | 复杂度 | 风险 |
|------|----------|--------|------|
| **直接切换** | 简单迁移（数据库 / WebDAV 服务商升级） | 低 | 高（无回退缓冲） |
| **双写 + 灰度** | 服务商切换（Vercel Postgres → Supabase） | 中 | 低 |
| **只读副本 → 切换** | 大数据量 / 高 RPS 站点 | 高 | 低 |

**本 Runbook 默认按"直接切换"撰写**；如果选择"双写"或"灰度"，需在 §1.3 通知后额外维护一份临时兼容代码（不进入主分支），迁移完成后删除。

### 1.3 通知与窗口

- 在迁移窗口前 48 小时通过站内公告（`/admin` 配置的 `announcement` 字段，如果有）通知用户。
- 建议在用户活跃低峰期（一般 03:00–06:00 UTC）执行。
- 准备好应急联系渠道：1Password 中"Site Owner"和"Database Admin"两个条目。

### 1.4 验证脚本

迁移前后应能跑同一份校验脚本并对比结果。示例 `scripts/verify-migration.sh`（按需扩展）：

```bash
#!/usr/bin/env bash
set -euo pipefail
log() { echo "[$(date +%H:%M:%S)] $*"; }

log "🔍 校验 PostgreSQL 行数..."
psql "$DATABASE_URL" <<SQL
SELECT
  (SELECT COUNT(*) FROM users)          AS users,
  (SELECT COUNT(*) FROM user_groups)    AS user_groups,
  (SELECT COUNT(*) FROM diaries)        AS diaries,
  (SELECT COUNT(*) FROM originium_kv)   AS kv,
  (SELECT COUNT(*) FROM requests)       AS requests,
  (SELECT COUNT(*) FROM storage_folders) AS storage_folders;
SQL

log "🔍 校验 WebDAV 顶层文件夹..."
# 调用 /api/storage/folders 或直接 webdav LIST

log "🔍 校验 GitHub 仓库 commit..."
git fetch origin main
git rev-parse origin/main

log "🔍 校验 config.yaml 关键字段..."
grep -E "^(site|appearance|access|auth):" config.yaml
```

---

## 2. 数据库迁移

> 典型场景：Vercel Postgres → Supabase / Neon / 自建 PG；同服务商跨 Region；PG 版本升级。

### 2.1 前置：确认目标兼容

- **PostgreSQL 版本**：Vercel Postgres 当前是 PG 15/16，目标必须 ≥ 源版本（不支持降级）。
- **扩展**：项目当前未启用 `pgvector` / `postgis` 等扩展（schema 中无 `Unsupported` 类型字段），如目标服务商有差异可忽略。
- **Prisma 版本**：`prisma@6.19.2` 兼容 PG 12+，目标版本 ≥ 12 即可。

### 2.2 迁移步骤

#### 步骤 1：在源数据库上导出

```bash
# 全量逻辑备份（plain SQL）
pg_dump "$OLD_DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --file="originium-migration-$(date +%Y%m%d).sql"

# 或自定义格式（更紧凑，支持 pg_restore 灵活控制）
pg_dump "$OLD_DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --file="originium-migration-$(date +%Y%m%d).dump"

# 备份后校验大小（应与源数据库总占用近似）
ls -lh originium-migration-*
```

#### 步骤 2：在目标数据库上恢复

```bash
# 创建目标数据库
psql "$NEW_DATABASE_URL" -c "CREATE DATABASE originium;"

# 恢复（plain SQL 格式）
psql "$NEW_DATABASE_URL" -d originium -f originium-migration-$(date +%Y%m%d).sql

# 恢复（custom 格式）
pg_restore \
  --dbname="$NEW_DATABASE_URL/originium" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  originium-migration-$(date +%Y%m%d).dump
```

#### 步骤 3：执行 Prisma 迁移

```bash
# 在本地运行 migrate deploy，确保 schema 与代码一致
DATABASE_URL="$NEW_DATABASE_URL" npx prisma migrate deploy

# 重新生成 Prisma Client
npx prisma generate
```

> **注意**：`migrate deploy` 会跳过已经应用过的迁移，并应用新增的迁移文件。如果 `prisma/migrations/` 目录与目标数据库状态不匹配，会报错。此时需要 `prisma migrate resolve` 手动标记（**慎用**，会污染迁移历史）。

#### 步骤 4：更新环境变量

在 Vercel Project Settings → Environment Variables 中：

| 旧值 | 新值 |
|------|------|
| `DATABASE_URL` | 旧值 | `NEW_DATABASE_URL`（Supabase / Neon 连接串） |
| `POSTGRES_URL` | 旧值 | （可保持，但建议同步更新） |
| `POSTGRES_PRISMA_URL` | 旧值 | （可保持） |
| `POSTGRES_URL_NON_POOLING` | 旧值 | （可保持） |

> **优先级说明**（来自 `lib/env.ts → hasDatabase`）：只要 `DATABASE_URL` / `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` 之一存在，即认为数据库已配置。建议**只更新 `DATABASE_URL`**，保留其余三个作为备选。

#### 步骤 5：触发重新部署

```bash
# 重新部署到 Vercel
vercel --prod

# 或在 Vercel Dashboard 触发 Redeploy
```

#### 步骤 6：业务验证

- [ ] 访问 `/`，确认首页加载
- [ ] 登录管理员账号，进入 `/admin` 看到所有菜单
- [ ] 访问 `/diary`，确认恢复出所有日记
- [ ] 调用 `/api/storage/folders` 确认 `StorageFolder` 元数据可读
- [ ] 编辑一篇 diaries / posts / faces，确认 CRUD 正常
- [ ] 调用 `prisma studio`（本地）打开目标数据库，对比行数

### 2.3 跨服务商特殊处理

#### 2.3.1 Vercel Postgres → Supabase

- Supabase 默认开启 RLS（Row Level Security），需在迁移前**关闭**或迁移 `storage_folders` / `users` 等表的相关策略。
  ```sql
  ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE user_groups DISABLE ROW LEVEL SECURITY;
  ALTER TABLE diaries DISABLE ROW LEVEL SECURITY;
  ALTER TABLE originium_kv DISABLE ROW LEVEL SECURITY;
  ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
  ALTER TABLE storage_folders DISABLE ROW LEVEL SECURITY;
  ```
- Supabase 连接串格式：`postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres`，注意端口 5432 直接连接（**不要**用 6543 pooling 端口，Prisma 兼容性更好）。

#### 2.3.2 Vercel Postgres → Neon

- Neon 强制开启 branching：迁移前可在 `main` branch 上还原，验证通过后切到 `production` branch。
- Neon 推荐使用 `?sslmode=require` 参数；Vercel Postgres 默认 SSL，所以连接串差异不大。

#### 2.3.3 自建 PG

- 必须确保 `pg_hba.conf` 允许 Vercel 出口 IP 访问（Vercel 出口 IP 列表见其官方文档）。
- `max_connections` 至少 100（Prisma 客户端连接池默认会用到 10–20 个连接）。

### 2.4 回滚

详见 [§8.1 数据库回滚](#81-数据库回滚)。

---

## 3. WebDAV 迁移

> 典型场景：Nextcloud → 群晖 / 坚果云 / 自建 SeaFile；同服务商跨账号 / 跨服务器。

### 3.1 前置：确认目标兼容

- 目标必须支持 **WebDAV 1.0 / 2.0** 协议
- 用户名 / 密码：建议用**专用服务账号**，不要用管理员账号
- 确认目标有足够磁盘空间（迁移源 = 源 WebDAV 占用 × 1.2，留余量）
- 目标服务必须支持 **rclone** 兼容的 `webdav` 协议 + `vendor` 类型（`nextcloud` / `synology` / `owncloud` / `sharepoint` / `other`）

### 3.2 迁移步骤

#### 步骤 1：注册 rclone remote

```bash
# 源 remote（如果尚未注册）
rclone config create webdav-source webdav \
  url="$WEBDAV_URL" \
  user="$WEBDAV_USER" \
  pass="$(rclone obscure $WEBDAV_PASS)" \
  vendor=nextcloud

# 目标 remote
rclone config create webdav-target webdav \
  url="$NEW_WEBDAV_URL" \
  user="$NEW_WEBDAV_USER" \
  pass="$(rclone obscure $NEW_WEBDAV_PASS)" \
  vendor=synology    # 根据实际改：nextcloud / synology / owncloud
```

#### 步骤 2：首次同步

```bash
# 复制所有文件（带路径），保留目录结构
rclone copy webdav-source: webdav-target: \
  --transfers=4 \
  --checkers=8 \
  --contimeout=60s \
  --timeout=600s \
  --retries=5 \
  --low-level-retries=10 \
  --stats=30s \
  --log-file="webdav-migration-$(date +%Y%m%d).log"

# 校验：列出目标根目录
rclone lsf webdav-target: --dirs-only
```

> **提示**：`rclone copy` 与 `rclone sync` 的区别：copy 不会删除目标端多余文件（更安全）；sync 会**完全镜像**。迁移期建议用 `copy`，确认无误后再 `sync` 一次。

#### 步骤 3：核对文件数

```bash
# 对比文件总数
SRC_COUNT=$(rclone ls webdav-source: | wc -l)
TGT_COUNT=$(rclone lsf webdav-target: -R | wc -l)
echo "源: $SRC_COUNT, 目标: $TGT_COUNT"
```

#### 步骤 4：更新环境变量

在 Vercel 中：

| 旧值 | 新值 |
|------|------|
| `WEBDAV_URL` | 旧值 | `NEW_WEBDAV_URL`（如 `https://nas.example.com:5006/dav`） |
| `WEBDAV_USER` | 旧值 | `NEW_WEBDAV_USER` |
| `WEBDAV_PASS` | 旧值 | `NEW_WEBDAV_PASS` |

#### 步骤 5：触发重新部署

```bash
vercel --prod
```

#### 步骤 6：业务验证

- [ ] 调用 `/api/storage/config`（admin），确认返回 `configured: true`
- [ ] 调用 `/api/storage/folders`，确认 `StorageFolder` 元数据**未变**（文件本身未动）
- [ ] 抽查 3 个文件：**下载**（通过 `/files/[...path]` 公开代理），确认内容一致
- [ ] 上传一个新文件，确认能写

### 3.3 路径一致性

`StorageFolder.path` 字段直接对应 WebDAV 远端的相对路径。**WebDAV 远端的目录结构**与**数据库中的 `StorageFolder.path`** 是 1:1 映射关系：

- WebDAV 顶层目录 = `StorageFolder.path = ""`（空字符串，参见 `prisma/schema.prisma` 注释）
- WebDAV 子目录 `covers/2024` = `StorageFolder.path = "covers/2024"`

如果迁移过程中**没有修改目录结构**（推荐），那么 `StorageFolder.path` 一行都不用改，**只需要改 WebDAV 远端 URL**。

如果目标服务的目录结构与源不同（如群晖默认挂载在 `/volume1/web/...` 下，路径前缀变了），需要更新所有 `StorageFolder.path` 记录，详见 [§6 Storage Folder 重新映射](#6-storage-folder-重新映射)。

### 3.4 凭据轮换

只换密码不换服务器：直接更新 `WEBDAV_PASS` + Redeploy，不需要数据迁移。

### 3.5 回滚

详见 [§8.2 WebDAV 回滚](#82-webdav-回滚)。

---

## 4. GitHub 仓库迁移

> 典型场景：换 GitHub 账号 / 换组织 / 仓库类型从 public → private。

### 4.1 方式 A：换 Remote URL（推荐，最简单）

适用于**仓库所有者**变更为另一个 GitHub 账号 / 组织的情况。

```bash
# 1. 在新账号下创建空仓库
gh repo create NEW_USER/NEW_REPO --private --description "Originium Kernel content"

# 2. 推送到新仓库（保留所有 branch / tag）
git remote add new-origin git@github.com:NEW_USER/NEW_REPO.git
git push new-origin --mirror

# 3. 验证
git fetch new-origin
git rev-list --count new-origin/main
```

**然后更新环境变量**：

| 旧值 | 新值 |
|------|------|
| `GITHUB_REPO` | `OLD_USER/OLD_REPO` | `NEW_USER/NEW_REPO` |
| `GITHUB_TOKEN` | 旧值 | **必须重新签发**（新仓库权限单独授权） |

在 Vercel 中更新后，触发 Redeploy。

### 4.2 方式 B：保留仓库、改所有权

如果只是想**把仓库转给另一个 GitHub 用户 / 组织**：

1. 旧 owner 进入 GitHub → Settings → Danger Zone → Transfer ownership
2. 输入新 owner 的用户名 / 组织名
3. 旧 owner 的 Personal Access Token 失效，**必须**：
   - 在新 owner 下重新签发 Token
   - 把新 Token 写入 Vercel 的 `GITHUB_TOKEN` 环境变量
4. 触发 Redeploy

> **注意**：转让后**所有 Issues / PRs / Releases 一起转移**。如果需要保留 PR 历史但又不想改 owner，建议用方式 A。

### 4.3 方式 C：仓库类型 public ↔ private

GitHub 仓库的可见性变更**不要求**改 `GITHUB_REPO` / `GITHUB_TOKEN`，但有以下影响：

| 变更 | 影响 | 操作 |
|------|------|------|
| public → private | 旧 Token 可能仍有效，但建议轮换；`/api/github` 不受影响 | 仓库 → Settings → Change repository visibility |
| private → public | **不推荐**（所有 posts / faces 内容会公开）；如有 giscus 评论绑定（`NEXT_PUBLIC_GISCUS_REPO`）需同步 | 同上 |

> **安全建议**：每次可见性变更后，**轮换一次 `GITHUB_TOKEN`**，写入 Vercel，然后 Redeploy。

### 4.4 业务验证

- [ ] 触发一次 `/api/github/sync`（管理员），确认能拉到 `config.yaml`
- [ ] 触发一次反向同步（管理员面板 → "同步配置到 GitHub"），确认能推回
- [ ] 访问一篇 posts / faces，确认页面能正常渲染（说明能从新仓库拉到内容）
- [ ] 校验 `git log --oneline -5` 与新仓库 commit 一致

### 4.5 回滚

详见 [§8.3 GitHub 仓库回滚](#83-github-仓库回滚)。

---

## 5. Clerk 项目迁移

> 典型场景：换 Clerk 账号 / 项目 / 区域；自建 Auth 替换 Clerk；Clerk 服务降级。

### 5.1 前置：导出与备份

#### 步骤 1：导出 Clerk 用户

1. 登录 [Clerk Dashboard](https://dashboard.clerk.com/)
2. 进入旧项目 → Users → 右上角 "Export users"
3. 导出格式：CSV
4. 加密保存到 1Password 共享保险库

#### 步骤 2：记录 Clerk 项目配置

- API Keys（`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`）保存到 1Password
- Webhook 配置（URL + 签名密钥 `CLERK_WEBHOOK_SECRET`，如果有）保存到 1Password
- 第三方登录（OAuth Providers）、Organization、Roles 配置截图归档

### 5.2 迁移方式 A：换 Clerk 项目（保留功能）

1. 在 Clerk Dashboard 创建新项目
2. 配置相同的 OAuth providers、email templates、session settings
3. 创建 Webhook：
   - URL：`https://$APP_URL/api/webhooks/clerk`
   - 事件：`user.created`, `user.updated`, `user.deleted`（按需扩展）
   - 复制 Signing Secret → 写入 Vercel 环境变量
4. 更新 Vercel 环境变量：

| 旧值 | 新值 |
|------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | 旧值 | `pk_test_NEW...`（新项目公钥） |
| `CLERK_SECRET_KEY` | 旧值 | `sk_test_NEW...`（新项目私钥） |
| `CLERK_WEBHOOK_SECRET` | 旧值 | `whsec_NEW...`（新 Webhook 签名密钥） |

5. 处理 `users.clerkId` 重映射：
   - 用户**重新登录**时，`/api/auth/clerk-check` 会创建新的 `clerkId` 记录
   - 旧账号关联的 `clerkId` 失效，但 `users` 表中其他字段（`username` / `name` / `role` / `password`）保留
   - 如需强制重新关联，可执行：
     ```sql
     UPDATE users SET clerk_id = NULL, clerk_linked_at = NULL;
     ```
     提示所有用户重新绑定 Clerk 账号

6. 触发 Redeploy

#### 步骤 3：业务验证

- [ ] 访问 `/clerk/sign-in`，确认能跳转到 Clerk 新项目登录页
- [ ] 登录后访问 `/clerk/after-auth`，确认能绑定到现有账号
- [ ] 触发一次 Webhook 模拟（Clerk Dashboard → Webhooks → Send test event）
- [ ] 检查 `users` 表中 `clerkId` 字段是否正确写入

### 5.3 迁移方式 B：从 Clerk 迁移到自建 Auth

> **重要**：本项目**没有完整支持自建 Auth 替换 Clerk 的代码路径**。Auth 完全由 Clerk 处理（包括 session、OAuth、JWT 签发）。如要切换到自建 Auth，需要：
>
> - 改写 `lib/auth.ts` 中的 session / token 逻辑
> - 改写 `components/ClerkAuthProvider.tsx` / `components/ClerkLoginSection.tsx`
> - 重写 `/api/webhooks/clerk` 为可选的内部管理接口
> - 调整所有 `useAuth()` 调用的返回结构
>
> **本 Runbook 不展开此方案**——建议保留 Clerk。

如果必须切换，按以下高层步骤：

1. 备份当前 Clerk 用户（§5.1 步骤 1）
2. 实现自建 Auth 库（推荐 Lucia / Auth.js / 自研 JWT）
3. 实现用户迁移工具：Clerk → 自建用户表（密码 hash 转换：Clerk 用 bcrypt，迁移时直接使用）
4. 灰度切换：保留 Clerk 登录作为过渡期入口，3 个月后下线
5. 清理 Vercel 环境变量中的 `CLERK_*` 与 `NEXT_PUBLIC_CLERK_*`

### 5.4 回滚

详见 [§8.4 Clerk 项目回滚](#84-clerk-项目回滚)。

---

## 6. Storage Folder 重新映射

> 典型场景：WebDAV 远端目录结构变化（合并、拆分、改名）；批量设置/修改 `public` / `password` 字段。

### 6.1 路径映射原理

`StorageFolder.path` 字段（`prisma/schema.prisma` 中定义）有以下约束：

- 物理表：`storage_folders`
- 主键：`path`
- 格式：相对路径，**无前导斜杠，无尾斜杠**
  - 根目录：空字符串 `""`
  - 一级子目录：`covers`
  - 二级子目录：`covers/2024`
- 约束：路径必须与 WebDAV 远端实际目录**完全匹配**

### 6.2 重新映射场景

#### 6.2.1 顶层目录改名（如 `covers` → `gallery`）

```sql
-- 1. 更新元数据
UPDATE storage_folders
SET path = 'gallery', updated_at = NOW()
WHERE path = 'covers';

-- 2. WebDAV 远端执行重命名
rclone moveto webdav-target:covers webdav-target:gallery

-- 3. 验证：调用 /api/storage/folder/gallery 应返回元数据
-- 4. 调用 /api/storage/folder/covers 应返回 404
```

#### 6.2.2 批量设置 `public = true`

```sql
UPDATE storage_folders
SET is_public = true, updated_at = NOW()
WHERE path IN ('covers', 'covers/2024', 'public-art');
```

#### 6.2.3 批量设置目录密码

> **警告**：`password` 字段是**明文存储**（参见 schema 注释："MVP 决策，可升级为 bcrypt"）。批量设置前请确认你了解安全影响。

```sql
-- 1. 临时密码（24 小时后过期）
UPDATE storage_folders
SET password = 'temp-pass-2026', updated_at = NOW()
WHERE path = 'private-archive';

-- 2. 提醒管理员在 24 小时内通过 /admin/storage 改成正式密码
```

#### 6.2.4 路径前缀批量调整（如所有 `covers/*` → `artwork/*`）

```sql
-- 1. 先备份
CREATE TABLE storage_folders_backup_20260607 AS
SELECT * FROM storage_folders;

-- 2. 更新所有匹配路径
UPDATE storage_folders
SET path = REPLACE(path, 'covers/', 'artwork/'),
    updated_at = NOW()
WHERE path LIKE 'covers/%';

UPDATE storage_folders
SET path = 'artwork', updated_at = NOW()
WHERE path = 'covers';

-- 3. WebDAV 远端执行对应重命名
rclone moveto webdav-target:covers webdav-target:artwork

-- 4. 验证后清理备份表（如 30 天后）
-- DROP TABLE storage_folders_backup_20260607;
```

### 6.3 路径合法性校验

`lib/storage/path.ts → isValidPath`（参见 `lib/storage/path.ts`）定义了合法路径的判定规则。批量更新后应**强制**校验：

```bash
# 列出所有 StorageFolder
npx prisma studio

# 或通过 API
curl -H "Cookie: $ADMIN_COOKIE" https://$APP_URL/api/storage/folders | jq '.[].path'
```

### 6.4 与 WebDAV 迁移的协同

| 步骤 | 操作 | 顺序 |
|------|------|------|
| 1 | 备份 `storage_folders` 表 | 必须最先 |
| 2 | WebDAV 远端数据迁移（rclone copy） | 先于 3 |
| 3 | 更新 `WEBDAV_URL` / `USER` / `PASS` + Redeploy | - |
| 4 | 如果路径变了：执行 §6.2 SQL 批量更新 | 3 之后 |
| 5 | 验证：`/api/storage/folder/[...path]` 各路径都能返回 | 最后 |

---

## 7. 配置文件 Schema 演进

> 典型场景：新增配置字段；废弃旧字段；重命名字段；修改字段类型。

### 7.1 Schema 当前位置

`AppConfig` 的定义分布在**两个文件**中：

1. **`lib/config-schema.ts`** — Zod schema + TypeScript 类型（`z.infer` 推导）
   - 通过 `import { zAppConfig, zSiteConfig, ... } from '@/lib/config-schema'` 引入
   - 提供 **运行时校验**（`zAppConfig.parse(yamlObj)`），解析失败会立即抛错
   - 根级启用 `.strict()`，**拒绝未知 key**（防止 `_testField` 等历史遗留字段被静默吞掉）
   - 字段大量使用 `.default(...)` 兜底，YAML 缺字段不会崩溃
2. **`next.config.ts`** — 旧版 TypeScript `interface` 定义（`export interface AppConfig`），已被 `lib/config-schema.ts` 中的 Zod 类型取代
   - `lib/config.ts` 仍从 `@/next.config` 导入类型（`import type { ... } from '@/next.config'`），通过 re-export 兼容
   - 加载管线 `loadConfigFromYaml` 已迁移到 `zAppConfig.parse`

YAML 解析由 `js-yaml` 完成（参见 `lib/config.ts → loadConfigFromYaml`），解析结果再交给 `zAppConfig.parse` 做二次校验。

### 7.2 演进原则

#### 原则 1：新增字段必须用 Zod `.default()` 兜底

```ts
// ❌ 错误：会破坏旧 config.yaml
const zNewConfig = z.object({
  enableNew: z.boolean(),       // 旧 YAML 缺此字段，zod 抛错
  newSetting: z.string(),
});

// ✅ 正确：Zod 字段全部带 .default()，YAML 缺字段时使用默认值
const zNewConfig = z.object({
  enableNew: z.boolean().default(false),   // 旧 YAML 缺此字段 → 默认 false
  newSetting: z.string().default(''),
});
```

读取侧应使用 `??` 兜底（项目已有大量 `appConfig.xxx?.yyy ?? defaultValue` 写法，可参考 `app/posts/[...slug]/_lib/post-page-config.ts`）。由于 Zod 已在解析阶段注入默认值，多数情况下无需再写 `??`，但作为类型安全的最后一层仍建议保留。

#### 原则 2：禁止删除字段，必须标注 `@deprecated`

```ts
export interface AppConfig {
  /**
   * @deprecated 自 2026-07 起废弃。改用 `appearance.background.url`。
   * 读取侧已迁移：见 `lib/config.ts → getBackgroundUrl()`。
   * 保留到 2027-01 删除。
   */
  legacyBackgroundUrl?: string;

  appearance: AppearanceConfig;  // 新位置
}
```

#### 原则 3：字段类型变窄必须做迁移函数

```ts
// 旧：z.string()
authorName: z.string();

// 新：z.union / z.enum
authorName: z.enum(['alice', 'bob', 'custom']);
```

**不允许**直接把 schema 收紧。必须：

1. 在 `lib/config-schema.ts` 中加迁移分支（在 `zAppConfig.parse` 之前完成）：

   ```ts
   function migrateConfig(raw: unknown): unknown {
     const obj = raw as any;
     if (typeof obj?.authorName === 'string' && !['alice', 'bob', 'custom'].includes(obj.authorName)) {
       obj.authorName = 'custom';  // 兜底为合法值
     }
     return obj;
   }
   ```

2. 在 `loadConfigFromYaml` 中按"迁移 → Zod 解析"两步走：

   ```ts
   function loadConfigFromYaml(): AppConfig {
     const configPath = path.join(process.cwd(), 'config.yaml');
     const fileContent = fs.readFileSync(configPath, 'utf-8');
     const parsed = yaml.load(fileContent) as any;
     const migrated = migrateConfig(parsed);
     return zAppConfig.parse(migrated) as AppConfig;
   }
   ```

3. 在 README 的"配置"章节同步说明。

#### 原则 4：新增字段必须同步

- 在 `config.yaml`（仓库根）中添加注释示例
- 在 `/admin/config` 面板的对应分组（`AppearanceConfig` / `AccessConfig` 等）中添加 UI 控件
- 在 `i18n/zh-CN.json` 与 `i18n/en.json` 添加翻译 key
- 在 README 的"站点配置"章节补充示例

### 7.3 演进流程

```bash
# 1. 在新分支上开发
git checkout -b config/add-new-field

# 2. 修改 lib/config-schema.ts（添加 zod 字段 + .default()）
# 3. 修改 lib/config.ts 读取侧（如有默认值需要更新）
# 4. 修改 config.yaml 补充示例
# 5. 修改 /admin/config 面板 UI
# 6. 补充 i18n 翻译
# 7. 补充单元测试（如有边界处理逻辑）
# 8. 更新 README
# 9. 测试：
npm run type-check
npm run lint
npm run test
npm run build

# 10. 提交并推送到 PR
git add lib/config-schema.ts lib/config.ts config.yaml ...
git commit -m "feat(config): add appearance.newField with default fallback"
git push origin config/add-new-field
```

### 7.4 向后兼容清单

迁移前检查：

- [ ] 新字段在 Zod schema 中带 `.default(...)` 兜底
- [ ] 读取侧使用 `?? defaultValue` 兜底
- [ ] 废弃字段标 `@deprecated` + 保留期
- [ ] 类型收窄有迁移函数（在 `zAppConfig.parse` 之前完成）
- [ ] `/admin/config` UI 与 schema 一致
- [ ] i18n 翻译完整
- [ ] 旧 `config.yaml` 文件在不改的前提下能正常加载
- [ ] 根级 `zAppConfig` 仍启用 `.strict()`（如需新增顶层 key，先更新 schema）

---

## 8. 回滚策略

> **核心原则**：迁移期间**始终保留旧资源**，直到新资源验证通过后再释放。所有回滚都应能在 30 分钟内完成。

### 8.1 数据库回滚

#### 触发条件

- 目标数据库行数与源不一致（抽样 5% 行数对比）
- 业务验证发现功能异常
- 目标服务商出现故障

#### 回滚步骤

```bash
# 1. 停止 Vercel 部署
vercel rm originium --yes  # 或在 Dashboard Pause

# 2. 把 Vercel 环境变量改回旧值
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production  # 粘贴旧值

# 3. 触发 Redeploy
vercel --prod

# 4. 验证
# 访问 /, /api/auth/me, /api/storage/folders 等
```

#### 预防

- 迁移前**禁止**删除源数据库（保留 7 天）
- 迁移期间使用 `read-only` 模式锁定源（如果支持），防止数据漂移
- 双写方案：源 + 目标同时写入 24 小时，验证一致后再切换

### 8.2 WebDAV 回滚

#### 触发条件

- 新 WebDAV 服务商性能问题
- 路径映射错误导致 `StorageFolder` 不可访问
- 凭据配置错误

#### 回滚步骤

```bash
# 1. 把 WebDAV 环境变量改回旧值
vercel env rm WEBDAV_URL production
vercel env add WEBDAV_URL production  # 旧值
# 同理 WEBDAV_USER / WEBDAV_PASS

# 2. Redeploy
vercel --prod

# 3. 如果是路径映射错误：回滚 storage_folders 备份表
# 假设之前做过备份
psql "$DATABASE_URL" <<SQL
DELETE FROM storage_folders;
INSERT INTO storage_folders SELECT * FROM storage_folders_backup_20260607;
SQL
```

#### 预防

- WebDAV 迁移**不修改** `StorageFolder.path`，只改 URL
- 新旧两套 WebDAV 并存 7 天，确认无问题后再停用源

### 8.3 GitHub 仓库回滚

#### 触发条件

- 新仓库缺少历史（`git push --mirror` 失败）
- 新仓库权限配置错误
- Webhook 触发异常

#### 回滚步骤

```bash
# 1. 把 GITHUB_REPO / GITHUB_TOKEN 改回旧值
vercel env rm GITHUB_REPO production
vercel env add GITHUB_REPO production  # 旧值
# 同理 GITHUB_TOKEN

# 2. Redeploy
vercel --prod

# 3. 验证 /api/github/sync
```

#### 预防

- 迁移前**禁止**删除旧仓库，保留 7 天
- 推送用 `--mirror` 包含所有 branch / tag，保留完整历史

### 8.4 Clerk 项目回滚

#### 触发条件

- 新 Clerk 项目配置错误（OAuth / Webhook 失败）
- 用户登录失败率激增
- 旧 `clerkId` 无法迁移

#### 回滚步骤

```bash
# 1. 改回旧 Clerk 项目的 API Keys
vercel env rm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production  # 旧值
vercel env rm CLERK_SECRET_KEY production
vercel env add CLERK_SECRET_KEY production  # 旧值
vercel env rm CLERK_WEBHOOK_SECRET production
vercel env add CLERK_WEBHOOK_SECRET production  # 旧值

# 2. Redeploy
vercel --prod

# 3. 通知用户可能需要重新登录（JWT 签名密钥变了）
```

#### 预防

- 旧 Clerk 项目保留 7 天
- 提前导出用户 CSV，存到 1Password

### 8.5 config.yaml Schema 演进回滚

#### 触发条件

- 新字段在某些边界场景下导致崩溃
- 默认值兜底不够，旧 `config.yaml` 加载失败

#### 回滚步骤

```bash
# 1. git revert
git revert <commit-sha>
git push origin main

# 2. Redeploy
vercel --prod

# 3. 如果用户的 config.yaml 已经被错误地"修正"过：
#    提示管理员通过 /admin/config 手动恢复
```

#### 预防

- 演进前**先在 staging 环境用真实 `config.yaml` 副本测试**
- 演进 PR 必须有 `/admin/config` 的截图证据

### 8.6 通用回滚脚本

```bash
#!/usr/bin/env bash
# scripts/rollback.sh
# 用法：./scripts/rollback.sh <environment> <component>
# 示例：./scripts/rollback.sh production database

set -euo pipefail
ENV="${1:?Usage: rollback.sh <env> <component>}"
COMP="${2:?Usage: rollback.sh <env> <component>}"

case "$COMP" in
  database)
    vercel env rm DATABASE_URL "$ENV" --yes
    vercel env add DATABASE_URL "$ENV"  # 手动粘贴旧值
    ;;
  webdav)
    vercel env rm WEBDAV_URL "$ENV" --yes
    vercel env add WEBDAV_URL "$ENV"
    vercel env rm WEBDAV_USER "$ENV" --yes
    vercel env add WEBDAV_USER "$ENV"
    vercel env rm WEBDAV_PASS "$ENV" --yes
    vercel env add WEBDAV_PASS "$ENV"
    ;;
  github)
    vercel env rm GITHUB_REPO "$ENV" --yes
    vercel env add GITHUB_REPO "$ENV"
    vercel env rm GITHUB_TOKEN "$ENV" --yes
    vercel env add GITHUB_TOKEN "$ENV"
    ;;
  clerk)
    vercel env rm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$ENV" --yes
    vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$ENV"
    vercel env rm CLERK_SECRET_KEY "$ENV" --yes
    vercel env add CLERK_SECRET_KEY "$ENV"
    vercel env rm CLERK_WEBHOOK_SECRET "$ENV" --yes
    vercel env add CLERK_WEBHOOK_SECRET "$ENV"
    ;;
  *)
    echo "Unknown component: $COMP" >&2
    exit 1
    ;;
esac

vercel --prod
echo "✅ $COMP rolled back on $ENV"
```

---

## 9. 迁移检查清单

> 每完成一类迁移，**逐项**勾选。未勾选项必须说明阻塞原因或放弃原因。

### 9.1 通用

- [ ] 迁移前完整备份已生成（`scripts/backup.sh`）
- [ ] 迁移前状态记录已归档（行数 / commit SHA / config.yaml 副本）
- [ ] 迁移窗口已通知（公告 + 内部沟通）
- [ ] 应急联系渠道已就位（1Password 中确认）

### 9.2 数据库

- [ ] `pg_dump` / `pg_restore` 验证通过
- [ ] `prisma migrate deploy` 无错误
- [ ] 行数与源一致（6 张表全部）
- [ ] 所有 API 路由业务验证通过
- [ ] 旧数据库保留 7 天

### 9.3 WebDAV

- [ ] 文件数与源一致
- [ ] `StorageFolder.path` 与 WebDAV 目录结构 1:1 对应
- [ ] `/api/storage/config` 返回 `configured: true`
- [ ] 抽查 3 个文件能下载
- [ ] 上传 / 删除功能正常
- [ ] 旧 WebDAV 服务保留 7 天

### 9.4 GitHub 仓库

- [ ] 新仓库有完整历史（`git log` 与旧仓库一致）
- [ ] `GITHUB_TOKEN` 已轮换 + 写入 Vercel
- [ ] `/api/github/sync` 双向验证通过
- [ ] 旧仓库保留 7 天

### 9.5 Clerk 项目

- [ ] 用户 CSV 已导出 + 加密归档
- [ ] 新项目 Webhook 配置验证通过
- [ ] 测试用户登录 + 绑定流程
- [ ] `users.clerkId` 重映射策略已确定（重置 / 强制重新绑定）
- [ ] 旧 Clerk 项目保留 7 天

### 9.6 Storage Folder

- [ ] 路径映射 SQL 已执行（如有）
- [ ] WebDAV 远端目录与 `storage_folders.path` 一致
- [ ] `password` 字段值验证（明文，注意保密）
- [ ] `/api/storage/folder/[...path]` 各路径返回 200

### 9.7 config.yaml Schema

- [ ] 新字段全部 `?` 标注
- [ ] 读取侧 `?? defaultValue` 兜底
- [ ] 旧 `config.yaml` 不修改能正常加载
- [ ] `/admin/config` UI 与 schema 一致
- [ ] i18n 翻译完整

---

## 附录 A：快速参考命令

```bash
# 数据库导出
pg_dump "$OLD_DATABASE_URL" --no-owner --no-privileges --clean --if-exists -f dump.sql

# 数据库导入
psql "$NEW_DATABASE_URL" -d originium -f dump.sql
DATABASE_URL="$NEW_DATABASE_URL" npx prisma migrate deploy

# WebDAV 迁移
rclone copy webdav-source: webdav-target: --transfers=4 --retries=5

# GitHub 仓库迁移
git clone --bare git@github.com:OLD/REPO.git
cd REPO.git
git push --mirror git@github.com:NEW/REPO.git

# Clerk 用户导出
# Clerk Dashboard → Users → Export users (CSV)

# 触发 Redeploy
vercel --prod
```

## 附录 B：相关文件路径

- 数据库 schema：`prisma/schema.prisma`
- 环境变量清单：`.env.example`
- 配置加载：`lib/config.ts`
- 配置类型 / Zod schema：`lib/config-schema.ts`（Zod schema + `z.infer` 推导类型）；旧版接口：`next.config.ts`
- WebDAV 客户端：`lib/webdav.ts`
- 存储池 ACL：`lib/storage/acl.ts`
- 路径工具：`lib/storage/path.ts`
- 历史 KV 迁移工具：`lib/storage/migration-from-kv.ts`
- 备份 Runbook：[BACKUP.md](./BACKUP.md)

---

> **维护说明**：本文档与项目同步更新。任何迁移策略变更（新组件、风险变化、流程调整）必须同步提交 PR；不接受"先改代码再补文档"的提交顺序。
