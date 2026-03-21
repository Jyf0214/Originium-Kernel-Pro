# Originium Kernel - 开发任务清单

> 项目目标：构建一个现代内容发布平台，基于 Node/Edge Function 架构，实现 GitHub 自动同步与多平台部署。

---

## 📋 项目概述

- **UID**: 用户唯一标识符
- **user**: 普通用户
- **sudo/admin**: 管理员
- **架构**: 纯 Node/Edge Function，无传统后端
- **配置源**: GitHub 仓库中的 `config.yaml` 为唯一生效源

---

## 🎯 任务清单

### 一、用户体系与权限架构

- [ ] **1.1** 实现 UID 用户标识系统
  - [ ] 创建用户 ID 生成逻辑
  - [ ] 实现用户身份验证中间件
  - [ ] 区分 user (普通用户) 与 sudo (管理员)

- [ ] **1.2** 实现普通用户注册流程
  - [ ] 注册页面 UI (LobeUI + AntD)
  - [ ] 注册 API (Edge Function)
  - [ ] 注册 IP 和 User-Agent 记录
  - [ ] 用户上限控制逻辑

- [ ] **1.3** 实现用户组管理
  - [ ] 用户组 CRUD (仅 sudo)
  - [ ] 用户登录提示："当前 {user} 属于 {usergroup}"
  - [ ] 用户组权限配置

- [ ] **1.4** 实现用户管理后台 (仅 sudo)
  - [ ] 注册信息后台查询
  - [ ] 用户上限调整界面
  - [ ] 注册 IP/User-Agent 查看

- [ ] **1.5** 实现账号注销机制
  - [ ] 注销申请流程
  - [ ] 30 天缓冲期确认
  - [ ] Admin 确认/拒绝逻辑
  - [ ] 必要时开通工单处理

---

### 二、文章发布系统

- [ ] **2.1** 内容格式支持
  - [ ] 标准 Markdown 渲染
  - [ ] 静态博客格式 (Front Matter) 解析
  - [ ] 代码高亮支持

- [ ] **2.2** GitHub 自动推送 (Node Runtime Function)
  - [ ] GitHub API 集成
  - [ ] 环境变量配置 (GITHUB_TOKEN, GITHUB_REPO)
  - [ ] 文章自动推送逻辑
  - [ ] 推送状态反馈

- [ ] **2.3** 文章删除机制
  - [ ] 删除申请流程
  - [ ] 30 天 Admin 确认期 (过期自动进入回收站)
  - [ ] 回收站逻辑
  - [ ] 自动清理定时任务

---

### 三、配置与数据存储管理

- [ ] **3.1** 环境变量系统
  - [ ] GITHUB_REPO 配置
  - [ ] GITHUB_TOKEN 配置
  - [ ] AUTH_SECRET 生成与管理
  - [ ] DATABASE_URL 配置 (支持 Redis / MySQL / PostgreSQL)

- [ ] **3.2** 配置优先级系统
  - [ ] GitHub `config.yaml` 同步与覆盖逻辑
  - [ ] Redis 索引点文件与 Base64 存储实现
  - [ ] 数据库备份逻辑
  - [ ] 优先级：GitHub `config.yaml` > Redis > 数据库

---

### 四、前端架构

- [ ] **4.1** Next.js 16.1.16 升级与优化
  - [ ] 更新 package.json
  - [ ] 兼容性测试
  - [ ] 构建配置调整

- [ ] **4.2** UI 组件库集成
  - [ ] LobeUI 集成与配置
  - [ ] AntD 集成与配置
  - [ ] 主题定制 (仿 LobeChat)

- [ ] **4.3** 首页逻辑
  - [ ] 未登录默认首页
  - [ ] 登录后个人自定义首页
  - [ ] Admin 全局首页自定义配置

- [ ] **4.4** URL 结构实现
  - [ ] `/{user}/{article}` 路由实现
  - [ ] 用户专属页面
  - [ ] 文章 permalink 配置

---

### 五、Node/Edge Function 架构

- [ ] **5.1** Edge Function 基础架构
  - [ ] Edge Runtime 配置
  - [ ] 函数目录结构
  - [ ] 错误处理统一

- [ ] **5.2** 核心功能函数
  - [ ] 注册函数 (register.ts)
  - [ ] 登录函数 (login.ts) - Cookie/Session 验证
  - [ ] GitHub 配置同步函数 (`config.yaml` 更新)
  - [ ] 用户管理函数

---

### 六、测试与部署

- [ ] **6.1** 测试
  - [ ] 单元测试
  - [ ] 集成测试
  - [ ] E2E 测试

- [ ] **6.2** 部署配置
  - [ ] Google Firebase 自动构建部署
  - [ ] Tencent EdgeOne 自动构建部署
  - [ ] Vercel 自动构建部署
  - [ ] CI/CD 全流程验证

---

## 📝 开发优先级

### P0 - 核心功能 (必须完成)
1. Next.js 16.1.16 升级
2. 用户认证系统 (UID/sudo 区分)
3. 基础文章发布与 GitHub API 集成
4. `config.yaml` 唯一配置源实现

### P1 - 重要功能
1. Redis 索引与存储
2. 用户组管理
3. 文章删除/注销 30 天确认逻辑
4. 管理后台基础功能

### P2 - 增强功能
1. 自定义首页配置
2. 多数据库驱动支持
3. 多平台部署自动触发

---

## 🔧 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.1.16 |
| UI | LobeUI + AntD |
| 存储 | Redis / MySQL / PostgreSQL (via DATABASE_URL) |
| 部署 | Firebase / EdgeOne / Vercel |
| 运行时 | Node/Edge Function |

---

## 📅 开发日志

<!-- 开发过程中记录重要决策和进度 -->
