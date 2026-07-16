# 数据备份 Runbook

> 本文件描述 Originium Kernel 项目的**全量备份方案**，覆盖 PostgreSQL、WebDAV 存储池、GitHub 仓库、`config.yaml` 与运行环境变量的所有数据载体。
>
> 适用对象：运维 / 站点所有者 / 应急响应人员。
> 最后更新：2026-06-07。
> 与之配套的迁移文档：[MIGRATION.md](./MIGRATION.md)（跨平台搬迁、版本升级、架构调整的迁移步骤）。

---

## 目录

1. [数据存储拓扑](#1-数据存储拓扑)
2. [备份策略总览](#2-备份策略总览)
3. [各组件详细策略](#3-各组件详细策略)
4. [月度备份脚本](#4-月度备份脚本)
5. [季度恢复演练](#5-季度恢复演练)
6. [关键风险与缓解](#6-关键风险与缓解)
7. [联系人与审计](#7-联系人与审计)

---

## 1. 数据存储拓扑

项目的数据分散在**四个物理/逻辑层**。任何一份数据如果丢失，都会导致业务不可用或用户体验降级，因此备份必须**横向覆盖**所有四层。

### 1.1 概览

| 层级 | 介质 | 关键文件 / 表 | 写入入口 | 是否含敏感凭据 |
|------|------|---------------|----------|----------------|
| 配置文件 | 本地 + GitHub | `config.yaml` | `/admin/config`（写入本地），`/api/github/sync`（推送到 GitHub） | 否（不含 token / 密码） |
| 数据库 | PostgreSQL | `users`, `user_groups`, `diaries`, `originium_kv`, `requests`, `storage_folders` | `/api/*` 中所有持久化路由 | 是（`User.password` 哈希、`StorageFolder.password` 明文） |
| 内容仓库 | GitHub 仓库 | `posts/`, `faces/` 子目录（Markdown + 资源） | `/api/github/sync`、`/api/github` | 否 |
| 文件池 | WebDAV 远端 | 任意目录与文件（用户上传文件等） | `/api/storage/upload/[...path]`、`/api/storage/folder/*` | 否（凭据在环境变量） |

### 1.2 配置文件（`config.yaml`）

- **本地副本**：项目根目录下的 `config.yaml`，由 `lib/config.ts` 的 `loadConfigFromYaml()` 在运行时同步加载。
- **GitHub 副本**：管理员面板触发 `/api/github/sync` 后，会通过 Octokit 将 `config.yaml` 推送到 `GITHUB_REPO` 指定仓库（由 `GITHUB_TOKEN` 鉴权）。
- **同步方向**：默认**双向**（本地 → GitHub，GitHub → 本地），通过 `useGitHubConfigSync` Hook 协调。
- **包含字段**：`site`, `appearance`, `access`, `auth`, `nav`, `mourn`, `highlight`, `copy`, `social`, `authorStatus`, `cover`, `errorImg`, `postMeta`, `wordcount`, `toc`, `copyright`, `reward`, `postEdit`, `share`, `mainTone`, `footer`, `clerk`, `users` 等顶层结构（类型定义见 `next.config.ts` 中的 `AppConfig` 接口）。
- **绝对不能丢**：访问控制规则 `access.{posts,faces,diary}.{public,private}`、Clerk 配置（`clerk.enable`）、管理员邮箱 `auth.admin` —— 这些字段缺失将直接导致登录/授权异常。

### 1.3 PostgreSQL 表清单

来自 `prisma/schema.prisma`，共 6 张表：

| Prisma 模型 | 物理表名 | 关键字段 | 备份要点 |
|-------------|----------|----------|----------|
| `User` | `users` | `uid`, `email`, `username`, `name`, `password`（哈希）, `role`, `userGroup`, `status`, `clerkId`, `clerkLinkedAt` | `password` 为哈希；`clerkId` 与 Clerk 项目绑定，迁移 Clerk 项目时需重映射 |
| `UserGroup` | `user_groups` | `id`, `name`, `description`, `permissions` (`String[]`) | 行数极少，但 `permissions` 决定 RBAC，丢错一组就出现功能级回退 |
| `Diary` | `diaries` | `id`, `title`, `content`, `tags` (`String[]`), `group`, `references` (Json), `date`, `pinned` | 唯一**完全在数据库**的业务内容，丢失等同于内容事故 |
| `OriginiumKV` | `originium_kv` | `key` (id), `value`, `expiry`, `createdAt` | 草稿、计数器、临时缓存；`expiry` 是 BigInt 时间戳；导出后建议在恢复时按当前时间筛选 `expiry > now()` |
| `Request` | `requests` | `id`, `userId`, `userName`, `postSlug`, `postTitle`, `reason`, `status` | 业务流水，恢复时建议保持原 `id` 以便追溯 |
| `StorageFolder` | `storage_folders` | `path` (id), `public` (`is_public`), `description`, `password` | **注意**：`password` 字段是**明文**（项目当前决策，未来可升级为 bcrypt），属于敏感数据，备份必须加密落盘 |

### 1.4 GitHub 仓库（内容层）

- 由 `GITHUB_REPO`（格式 `用户名/仓库名`）决定仓库位置。
- 仓库内目录结构约定：
  - `posts/<slug>.md` — 文章正文（仅 slug 路由对应的 Posts）
  - `faces/<slug>.md` — 人脸画廊条目
  - 其他资源文件（图片、附件）
- 读取：`/api/github`（GET）通过 Octokit 拉取单文件；构建期通过 `lib/content.ts` 全量拉取。
- 写入：`/api/github/sync`（POST）将 `config.yaml` 推回仓库；Posts / Faces 的具体内容由仓库直接托管（`git push` / GitHub Web 端编辑）。
- **风险点**：仓库一旦被设为 `private`，`GITHUB_TOKEN` 需要重新签发；仓库被删除则全量内容丢失，且没有离线副本。

### 1.5 WebDAV 远端存储池

- 由 `WEBDAV_URL` / `WEBDAV_USER` / `WEBDAV_PASS` 三个环境变量联合启用（参见 `lib/webdav.ts → isWebDavConfigured`）。
- 客户端封装：`lib/webdav.ts → getWebDavClient()`（基于 `webdav` npm 包），单例缓存避免每次请求都重建连接。
- 数据用途：
  - 用户上传文件（`/admin/storage` 上传，单文件 ≤ 50 MB）
  - 任何第三方应用场景（Nextcloud / 群晖 / 坚果云 / 任意兼容 WebDAV 1.0/2.0 的服务）
- 元数据层：`StorageFolder` 表只存文件夹级 ACL（`public`、`description`、`password`），**不存文件清单也不存文件内容**——所有文件实体都仅在 WebDAV 远端。
- **风险点**：远端服务不可用时，**存储池降级为不可用**（README 中已说明），但数据库仍可独立工作。

### 1.6 平台隐式资源

除上述四层外，还存在以下**配置型资源**（不会因用户操作而变化，但环境变更时需纳入备份）：

- Vercel Project 环境变量（DATABASE_URL / AUTH_SECRET / WEBDAV_* / GITHUB_TOKEN / SMTP_* / CLERK_* 等）
- Clerk 项目 Webhook 配置（`/api/webhooks/clerk`）
- DNS 记录（`APP_URL` 对应域名）
- Vercel 部署的 Vercel Postgres / Neon / Supabase 实例

---

## 2. 备份策略总览

### 2.1 频率与保留期

| 组件 | 备份频率 | 保留期 | 备份窗口 | 增量 / 全量 |
|------|----------|--------|----------|-------------|
| PostgreSQL（`users` / `user_groups` / `diaries` / `originium_kv` / `requests` / `storage_folders`） | **每日 03:00 UTC** | 30 天 | 离线时段（与时区结合） | 全量（`pg_dump`，可与 `pg_dump -Fc` 增量配合，详见 §3.1） |
| WebDAV 远端 | **每周日 04:00 UTC** | 12 周 | 离线时段 | 增量同步（`rclone sync`） |
| GitHub 仓库 | **实时**（push 即备份）+ 每周日镜像 | 永久 | N/A | 拉取到本地再 `git push backup main` |
| `config.yaml`（本地 + GitHub） | **每次管理员修改后**（同步写入本地 + 推送） + 每周一次本地归档 | 永久（GitHub）+ 30 天（本地归档） | 立即 | 全量复制（`cp`） |
| 环境变量（Vercel） | **每次修改后**手动导出到 1Password / 加密磁盘 | 永久 | 立即 | 全量（手动） |
| Clerk Webhook / 密钥 | **每次轮换后** | 永久 | 立即 | 全量（手动） |

### 2.2 备份目标（存储目的地）

| 优先级 | 目标 | 用途 |
|--------|------|------|
| P0 | 本地 NAS（站点同机房，1 GbE 直连） | 最近 7 天热备份，恢复时 RTO < 30 分钟 |
| P1 | 云对象存储（S3 / R2 / OSS 之一，启用版本控制 + 跨区复制） | 最近 30 天温备份，恢复时 RTO < 4 小时 |
| P2 | 离线加密硬盘（季度脱机归档） | 长期冷备份，RPO = 0（数据永不丢） |

**异地要求**：P1 与本地 NAS 必须位于不同的可用区 / 地理位置；P2 必须物理异地保管。

**加密要求**：所有 P0 / P1 / P2 备份文件**必须**使用 AES-256-GCM 加密（`gpg --symmetric --cipher-algo AES256` 或 `rclone crypt` 远程）；加密密钥单独保管，**不得**与备份文件放在同一介质。

### 2.3 备份验证原则

- **校验和**：每次备份结束生成 SHA-256 清单（`sha256sum > MANIFEST.txt`），下次备份前先校验上一份清单。
- **抽样恢复**：每月从至少 1 份备份中随机抽取一个表 / 一个文件，恢复到 staging 数据库并对比行数。
- **季度演练**：详见 §5。
- **失败告警**：备份脚本非零退出时，必须触发邮件告警（SMTP 配置由 `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` 提供），不得静默失败。

---

## 3. 各组件详细策略

### 3.1 PostgreSQL

#### 3.1.1 备份命令

```bash
# 全量逻辑备份（推荐，配合 cron 每日执行）
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --file="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql"

# 或使用自定义格式（支持 pg_restore 的精细控制）
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).dump"
```

> **说明**：`DATABASE_URL` 可来自 Vercel Postgres / Neon / Supabase 等任一来源；环境变量未设置时 `prisma/schema.prisma` 加载会失败，但备份脚本本身仍可运行（不依赖 Prisma 客户端）。

#### 3.1.2 恢复步骤

```bash
# 1. 准备目标数据库
psql "$NEW_DATABASE_URL" -c "CREATE DATABASE originium;"

# 2. 恢复（plain SQL 格式）
psql "$NEW_DATABASE_URL" -f "$BACKUP_DIR/db-20260607-030000.sql"

# 3. 或恢复（custom 格式）
pg_restore \
  --dbname="$NEW_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$BACKUP_DIR/db-20260607-030000.dump"

# 4. 在目标环境重新执行 Prisma 迁移（确保 schema 状态与代码版本一致）
DATABASE_URL="$NEW_DATABASE_URL" npx prisma migrate deploy
```

#### 3.1.3 恢复时序

| 阶段 | 操作 | 目标 RTO |
|------|------|----------|
| T+0 | 检测数据库不可用 | - |
| T+5min | 从最近一份本地 NAS 备份恢复 | 5 min |
| T+15min | 校验行数 + 抽样比对 | 10 min |
| T+30min | 重新部署应用 + 触发 `/api/diary/draft` 等 KV 类接口自检 | 15 min |
| T+45min | 通知用户 + 关闭告警 | 15 min |

### 3.2 WebDAV 远端

#### 3.2.1 备份命令（rclone）

```bash
# 一次性配置：把 WebDAV 远端注册为 rclone remote
rclone config create webdav-originium webdav \
  url="$WEBDAV_URL" \
  user="$WEBDAV_USER" \
  pass="$WEBDAV_PASS" \
  vendor=nextcloud

# 同步到本地
rclone sync webdav-originium: "$BACKUP_DIR/webdav/" \
  --transfers=4 \
  --checkers=8 \
  --contimeout=60s \
  --timeout=300s \
  --retries=3 \
  --low-level-retries=10 \
  --stats=60s \
  --log-file="$BACKUP_DIR/webdav-sync.log"
```

#### 3.2.2 恢复步骤

```bash
# 反向同步：从本地备份恢复到 WebDAV 远端
rclone sync "$BACKUP_DIR/webdav/" webdav-originium: \
  --transfers=2 \
  --retries=5 \
  --log-file="$RESTORE_DIR/restore.log"

# 恢复后必须：
# 1. 调用 /api/storage/folders 列出 StorageFolder 元数据，验证路径仍可访问
# 2. 抽查至少 3 个文件夹，确认文件数量一致
# 3. 触发 /admin/storage 页面 UI 自检
```

#### 3.2.3 元数据一致性

`StorageFolder` 表与 WebDAV 远端是**正交关系**：

- 远端：物理文件存在性
- 数据库：文件夹元数据 + ACL

恢复 WebDAV 远端后，如果元数据表（`storage_folders`）也需要恢复，必须**先恢复 WebDAV 远端，再恢复数据库**（因为元数据引用了远端路径）。如果顺序颠倒，会出现"元数据存在但远端文件缺失"的孤儿 ACL。

### 3.3 GitHub 仓库

#### 3.3.1 实时备份

`/api/github/sync` 的工作流本身就**已经**是实时备份（`config.yaml` 推送到 GitHub）。但**真正的内容**（`posts/`、`faces/`）是直接通过 `git push` 提交到仓库的，所以 GitHub 本身就是主存储。

#### 3.3.2 镜像仓库

为了防止 GitHub 仓库被删除 / 设为私有 / 仓库所有者失联，必须配置镜像：

```bash
# 1. 在 GitHub 创建一个空仓库 originium-backup（设为 private）
# 2. 添加为本地 remote
git remote add backup git@github.com:USER/originium-backup.git

# 3. 全量镜像
git push backup --mirror

# 4. 增量同步（cron 每周日执行）
git push backup main
```

#### 3.3.3 恢复步骤

```bash
# 方式 A：从镜像仓库恢复
git clone git@github.com:USER/originium-backup.git /tmp/originium-restore
cd /tmp/originium-restore
# 校验 posts/ faces/ 与 config.yaml 完整性
find . -name "*.md" | xargs wc -l > MANIFEST.txt

# 方式 B：换到新仓库
git remote set-url origin git@github.com:NEW_USER/NEW_REPO.git
git push origin --mirror
# 然后更新 Vercel 环境变量 GITHUB_REPO=NEW_USER/NEW_REPO
```

### 3.4 config.yaml

#### 3.4.1 备份命令

```bash
# 归档到带时间戳的目录
cp config.yaml "$BACKUP_DIR/config-$(date +%Y%m%d-%H%M%S).yaml"

# 同时校验关键字段存在
grep -q "^site:" "$BACKUP_DIR/config-$(date +%Y%m%d-%H%M%S).yaml" || {
  echo "ERROR: config.yaml 缺少 site 字段" >&2
  exit 1
}
```

#### 3.4.2 恢复步骤

```bash
# 直接覆盖（注意先备份当前版本）
cp "$RESTORE_FILE" /home/user/PrivateJournal/config.yaml

# 触发应用重启（Vercel 部署无需操作，下次请求会重读）
# 本地开发：pm2 restart originium 或 npm run dev 重启

# 验证：访问 /api/site-config，确认返回的 site.title 与备份一致
```

### 3.5 环境变量

环境变量不属于文件系统，但**等同于生产密钥**，必须按以下流程管理：

1. 任何环境变量的修改（Vercel / GitHub Actions / 本地 `.env.local`）必须同步更新到 **1Password 共享保险库**。
2. 修改时执行 `vercel env pull .env.local`（仅限主账号）下载当前环境变量，校验后再手动 `diff`。
3. 季度审计：使用 `app/api/env-status`（admin 路由）检查线上环境变量是否齐全，**该路由只返回状态而不返回明文**，是安全的自检入口。
4. **严禁**把 `.env.local` 提交到 Git；`.gitignore` 已经包含 `.env.local`，但需要定期 `git log --all -p -- .env.local` 抽查（理论上不应有结果）。

### 3.6 Clerk 项目

- Clerk 数据（用户、会话、组织）由 Clerk 全托管，不在本项目数据库中。
- 本项目只存储 `users.clerkId`（外键引用）。
- 备份方式：
  1. 在 Clerk Dashboard → Users 页面使用 "Export" 功能导出全量用户（CSV 格式）。
  2. 季度执行一次。
  3. 导出文件加密后归档到 P1 存储。
- Webhook 密钥（`CLERK_WEBHOOK_SECRET`，如果有）单独记录到 1Password。

---

## 4. 月度备份脚本

> 路径：`scripts/backup.sh`（建议在新建仓库时一并加入，并赋可执行权限 `chmod +x`）。
> 执行方式：通过 cron 或 systemd-timer 每日 / 每周触发；手动执行可传入 `--full` 强制全量。

### 4.1 主脚本

```bash
#!/usr/bin/env bash
# ============================================================
# Originium Kernel 月度 / 每日备份脚本
# ------------------------------------------------------------
# 覆盖范围：
#   1. PostgreSQL 全量逻辑备份
#   2. WebDAV 存储池增量同步
#   3. config.yaml 本地归档
#   4. GitHub 仓库镜像
#
# 依赖工具：pg_dump / psql / rclone / git / sha256sum / gpg
# 必备环境变量：DATABASE_URL / WEBDAV_URL / WEBDAV_USER / WEBDAV_PASS
# 可选环境变量：BACKUP_DEST / ENCRYPT_PASSPHRASE
# ============================================================

set -euo pipefail

# ---------- 0. 路径与日期 ----------
BACKUP_ROOT="${BACKUP_DEST:-$HOME/backups}"
APP_NAME="originium-kernel"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DATE_ONLY="$(date +%Y%m%d)"
BACKUP_DIR="$BACKUP_ROOT/${APP_NAME}-${DATE_ONLY}"
LOG_FILE="$BACKUP_DIR/backup.log"
MANIFEST="$BACKUP_DIR/MANIFEST.txt"

mkdir -p "$BACKUP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date +%H:%M:%S)] $*"; }
trap 'log "❌ 备份失败（line $LINENO，exit $?）"; exit 1' ERR

log "🚀 Originium 备份开始 -> $BACKUP_DIR"

# ---------- 1. PostgreSQL ----------
if [[ -n "${DATABASE_URL:-}" ]]; then
  log "📦 [1/4] 备份 PostgreSQL..."
  DB_FILE="$BACKUP_DIR/db-${TIMESTAMP}.sql"
  pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --file="$DB_FILE"
  gzip "$DB_FILE"
  log "   ✓ 数据库备份完成：$(basename ${DB_FILE}.gz)"
else
  log "⚠️  [1/4] DATABASE_URL 未设置，跳过数据库备份（限制运行模式）"
fi

# ---------- 2. WebDAV ----------
if [[ -n "${WEBDAV_URL:-}" && -n "${WEBDAV_USER:-}" && -n "${WEBDAV_PASS:-}" ]]; then
  log "📦 [2/4] 同步 WebDAV 存储池..."
  rclone sync ":webdav:${WEBDAV_URL##*/}" "$BACKUP_DIR/webdav/" \
    --webdav-url="$WEBDAV_URL" \
    --webdav-user="$WEBDAV_USER" \
    --webdav-pass="$WEBDAV_PASS" \
    --transfers=4 \
    --checkers=8 \
    --contimeout=60s \
    --timeout=300s \
    --retries=3 \
    --low-level-retries=10 \
    --stats=60s \
    --log-file="$BACKUP_DIR/webdav-sync.log"
  log "   ✓ WebDAV 同步完成"
else
  log "⚠️  [2/4] WEBDAV_URL/USER/PASS 未设置，跳过 WebDAV 备份"
fi

# ---------- 3. config.yaml ----------
if [[ -f "config.yaml" ]]; then
  log "📦 [3/4] 归档 config.yaml..."
  cp config.yaml "$BACKUP_DIR/config-${TIMESTAMP}.yaml"
  log "   ✓ config.yaml 归档完成"
else
  log "⚠️  [3/4] config.yaml 不存在，跳过"
fi

# ---------- 4. GitHub 镜像 ----------
log "📦 [4/4] 推送 GitHub 镜像仓库..."
if git remote get-url backup >/dev/null 2>&1; then
  git push backup main 2>&1 | tail -5 || {
    log "⚠️  GitHub 镜像推送失败，请检查 backup remote 配置"
  }
else
  log "   ℹ️  backup remote 未配置，跳过（如需镜像请运行："
  log "       git remote add backup git@github.com:USER/originium-backup.git"
  log "       git push backup --mirror)"
fi

# ---------- 5. 加密（可选） ----------
if [[ -n "${ENCRYPT_PASSPHRASE:-}" ]]; then
  log "🔐 加密备份..."
  tar -czf "$BACKUP_DIR.tar.gz.tmp" -C "$BACKUP_ROOT" "$(basename $BACKUP_DIR)"
  gpg --batch --yes --symmetric \
    --cipher-algo AES256 \
    --passphrase "$ENCRYPT_PASSPHRASE" \
    --output "$BACKUP_DIR.tar.gz.gpg" \
    "$BACKUP_DIR.tar.gz.tmp"
  rm "$BACKUP_DIR.tar.gz.tmp"
  log "   ✓ 加密归档：$(basename $BACKUP_DIR.tar.gz.gpg)"
fi

# ---------- 6. 校验和清单 ----------
log "🔍 生成 SHA-256 清单..."
(cd "$BACKUP_DIR" && find . -type f -not -name "MANIFEST.txt" -print0 \
  | xargs -0 sha256sum > MANIFEST.txt)
log "   ✓ MANIFEST.txt 已生成"

# ---------- 7. 清理过期备份 ----------
log "🧹 清理 30 天前的备份..."
find "$BACKUP_ROOT" -maxdepth 1 -type d -name "${APP_NAME}-*" -mtime +30 -exec rm -rf {} +
find "$BACKUP_ROOT" -maxdepth 1 -type f -name "${APP_NAME}-*.tar.gz.gpg" -mtime +30 -delete 2>/dev/null || true

log "✅ 备份完成！"
log "   目录：$BACKUP_DIR"
log "   清单：$MANIFEST"
```

### 4.2 配套的 rclone 配置（`~/.config/rclone/rclone.conf`）

```ini
[webdav-originium]
type = webdav
url = https://dav.example.com/remote.php/dav/files/USERNAME
vendor = nextcloud
user = USERNAME
pass = ENCRYPTED_PASSWORD_OR_USE_ASK_PASSWORD
```

### 4.3 cron 配置示例

```cron
# 每日 03:00 触发完整备份
0 3 * * * /home/deploy/originium-kernel/scripts/backup.sh >> /var/log/originium-backup.log 2>&1

# 每周日 04:00 触发 WebDAV 全量同步
0 4 * * 0 WEBDAV_FULL=1 /home/deploy/originium-kernel/scripts/backup.sh
```

### 4.4 告警邮件（可选，追加到脚本末尾）

```bash
if [[ -n "${ALERT_EMAIL:-}" && -n "${SMTP_HOST:-}" ]]; then
  if grep -q "❌" "$LOG_FILE"; then
    mail -s "[Originium Backup] 备份失败" "$ALERT_EMAIL" < "$LOG_FILE"
  fi
fi
```

---

## 5. 季度恢复演练

> 频率：每季度（建议 1/4/7/10 月初）执行一次。
> 目标：验证 RTO / RPO 在 SLA 范围内，并培训新成员熟悉恢复流程。

### 5.1 演练环境

- **生产镜像**：在 Vercel 创建独立的 Preview Environment，绑定独立的 DATABASE_URL（指向**复制的数据库**）。
- **数据准备**：从最近 7 天的备份中**随机抽取 1 份**，用于本次演练。
- **影响隔离**：演练环境不暴露公网，仅在 VPN 内访问；不与生产共用 Clerk 项目。

### 5.2 演练步骤

1. **数据准备**
   - `mkdir -p /tmp/restore-drill && cd /tmp/restore-drill`
   - 选择备份：`$BACKUP_ROOT/originium-kernel-20260401/`
   - 校验：`sha256sum -c MANIFEST.txt`（必须全部 OK）

2. **恢复 PostgreSQL**
   - 创建临时数据库：`psql "$DRILL_DATABASE_URL" -c "CREATE DATABASE originium_drill;"`
   - 恢复：`pg_restore --dbname="$DRILL_DATABASE_URL/originium_drill" --clean --if-exists --no-owner --no-privileges db-20260401-030000.dump`
   - 校验行数：
     ```sql
     SELECT 'users' AS tbl, COUNT(*) FROM users
     UNION ALL SELECT 'diaries', COUNT(*) FROM diaries
     UNION ALL SELECT 'storage_folders', COUNT(*) FROM storage_folders
     UNION ALL SELECT 'originium_kv', COUNT(*) FROM originium_kv;
     ```
   - 对比生产数据库行数（`app/api/env-status` 不返回行数，可通过 `npx prisma studio` 手动比对）

3. **恢复 WebDAV 远端**
   - 在新 WebDAV 账号上创建空目录
   - `rclone sync "$BACKUP_DIR/webdav/" :webdav:$DRILL_DEST/`
   - 抽查 5 个文件夹的文件数

4. **恢复 config.yaml**
   - `cp config-20260401-030000.yaml /home/deploy/originium-drill/config.yaml`
   - 重启应用：`pm2 restart originium-drill`

5. **业务验证清单**
   - [ ] `/` 首页能正常加载（含背景图、字体）
   - [ ] 至少访问 1 篇公开 posts、1 个 faces 条目
   - [ ] 登录管理员账号，进入 `/admin` 看到所有菜单
   - [ ] 访问 `/diary`，确认恢复出所有日记
   - [ ] 进入 `/admin/storage`，确认 WebDAV 文件夹元数据可读
   - [ ] 测试一次文章编辑 → 保存 → GitHub 同步
   - [ ] 测试一次文件上传（需 WebDAV 远端就绪）

6. **记录与归档**
   - 填写 `docs/drills/2026Q2-restore-drill.md`，记录：
     - 实际耗时（与目标 RTO 对比）
     - 发现的脚本 / 文档 / 配置问题
     - 改进项与负责人
   - 将演练报告归档到 P1 存储

### 5.3 演练不通过的处理

- RTO 超时：检查备份脚本并行度、网络瓶颈、加密开销
- 数据缺失：升级备份频率 / 增加副本 / 引入 WAL 归档
- WebDAV 不一致：检查 `StorageFolder` 表与远端的对应关系，考虑在备份脚本中增加对账步骤

---

## 6. 关键风险与缓解

| # | 风险 | 触发条件 | 影响 | 缓解措施 |
|---|------|----------|------|----------|
| 1 | **GitHub 仓库被设为 private** | `GITHUB_REPO` 指向的仓库可见性变更 | `GITHUB_TOKEN` 权限失效；`/api/github` 全部 401；`/api/github/sync` 同步失败 | 启用 GitHub 镜像仓库（`originium-backup`）作为冗余；Token 单独管理；设置 GitHub 仓库 visibility 变更告警（`webhook` → Slack） |
| 2 | **WebDAV 凭据过期 / 服务下线** | WebDAV 服务商修改密码策略 / 主动下线 | 存储池不可用；`/admin/storage` 显示 NOT_CONFIGURED | 凭据到期前 14 天日历提醒；服务下线时切换到备用 WebDAV（详见 MIGRATION.md §2）；配置二级 WebDAV 镜像（远期） |
| 3 | **数据库服务商单点故障**（Vercel Postgres 区域故障） | 区域级不可用 | 整站 502 | 跨区主从或读写分离；季度验证只读副本可用；准备 Neon / Supabase 作为热切换目标（迁移步骤见 MIGRATION.md §1） |
| 4 | **`config.yaml` GitHub 同步冲突** | 多人同时编辑 / 离线编辑后 push | 本地配置被覆盖 / 推送失败 | `useGitHubConfigSync` Hook 已实现冲突检测；定期从 GitHub 拉取到本地；如果冲突，参考 UI 提示手动合并 |
| 5 | **`AUTH_SECRET` 泄漏 / 轮换** | 密钥日志泄漏 / 主动轮换 | 现有 JWT 全部失效，所有用户需重新登录；管理员密码 reset token 失效 | 轮换后立即部署；保留旧密钥 24h 用于验证迁移；监控异常登录告警（`app/api/auth/login` 失败次数） |
| 6 | **Clerk 项目迁移 / 关闭** | Clerk 项目所有者变更 / 服务降级 | `users.clerkId` 全部失效；`/api/webhooks/clerk` 全部 401 | Clerk 项目所有变更前先导出用户 CSV；准备迁移到自建 Auth（迁移步骤见 MIGRATION.md §4） |
| 7 | **`StorageFolder.password` 明文泄漏** | 数据库备份文件泄漏 | 私有页面的目录密码被公开获取 | 备份文件**必须**加密（详见 §2.2）；将 `password` 字段升级为 bcrypt（中期任务） |
| 8 | **磁盘耗尽** | 备份目录未及时清理；WebDAV 同步异常累积 | 备份脚本失败；磁盘占满影响运行时 | `backup.sh` 内置 30 天清理；监控磁盘使用率 > 80% 告警；定期 `du -sh $BACKUP_ROOT` 巡检 |

---

## 7. 联系人与审计

- **主要负责人**：仓库所有者（参见 `package.json` 的 `repository` 字段 / 1Password 中"Site Owner"条目）
- **应急响应邮箱**：`SMTP_FROM` 关联邮箱，配置在 PagerDuty / OpsGenie
- **GitHub 镜像**：`https://github.com/<USER>/originium-backup`（实际地址由部署者维护）
- **审计日志**：
  - 备份成功 / 失败日志：`$BACKUP_ROOT/originium-kernel-YYYYMMDD/backup.log`
  - 演练报告：`docs/drills/YYYYQN-restore-drill.md`
  - 环境变量变更：通过 Vercel Audit Log 查询
- **变更记录**：任何备份策略调整（频率、保留期、目标）必须更新本文档，并在 git commit message 中明确说明。

---

## 附录 A：快速恢复命令速查

```bash
# 完整恢复（灾难级：从零搭建）
./scripts/backup.sh                       # 1. 先恢复备份
psql "$NEW_DATABASE_URL" -f db-*.sql      # 2. 恢复数据库
rclone sync webdav-originium: /srv/webdav # 3. 恢复 WebDAV
cp config-*.yaml config.yaml              # 4. 恢复配置
git clone git@github.com:USER/repo posts  # 5. 恢复内容
DATABASE_URL=... npx prisma migrate deploy # 6. 执行迁移
npm run build && npm run start            # 7. 启动服务

# 单组件恢复（按需）
# 仅恢复数据库：见 §3.1.2
# 仅恢复 WebDAV：见 §3.2.2
# 仅恢复 config：见 §3.4.2
# 仅恢复 GitHub 仓库：见 §3.3.3
```

## 附录 B：相关文件路径

- 备份脚本：`scripts/backup.sh`（本 Runbook §4）
- 数据库 schema：`prisma/schema.prisma`
- 环境变量清单：`.env.example`
- WebDAV 客户端封装：`lib/webdav.ts`
- 配置文件加载：`lib/config.ts`、`next.config.ts`（类型定义）
- 存储池 API：`app/api/storage/*`
- 数据库初始化：`scripts/db-init.mjs`
- 迁移 Runbook：[MIGRATION.md](./MIGRATION.md)

---

> **维护说明**：本文档与项目同步更新。任何备份策略变更（频率、保留期、新增组件）必须同步提交 PR；不接受"先改脚本再补文档"的提交顺序。
