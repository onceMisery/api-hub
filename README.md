# api-hub

api-hub 是一个面向 API 设计、文档浏览、调试、Mock 与版本管理的单机优先平台。

当前仓库已经落成一个可运行的 Phase 1 工作台：

- 前端基于 `Next.js 15`、`React 19`、`TypeScript`
- 后端基于 `Spring Boot 3.2.5`、`Java 21`、`JWT`、`Flyway`
- 默认运行形态为 `MySQL + Spring Boot + Next.js`
- `Redis`、`RabbitMQ`、`OpenSearch`、`MinIO` 不属于当前主流程必需组件

## 当前仓库包含什么

### 前端

前端位于 `apps/web`，当前已经具备以下主路径：

- `/login`：账号登录
- `/console/projects`：项目列表与创建入口
- `/console/projects/[projectId]`：项目工作台
- `/console/projects/[projectId]/browse`：项目文档浏览视图

项目工作台已经串起以下能力：

- 项目列表与项目创建
- 项目树导航：模块、分组、接口
- 接口详情编辑
- 请求参数与响应结构维护
- 环境配置管理
- 调试执行与历史回看
- Mock 规则管理、模拟与发布
- 接口版本快照、发布与回退到草稿态
- 项目成员与访问权限管理

### 后端

后端位于 `services/apihub-server`，当前是按领域拆分的模块化单体，主要领域包括：

- `auth`：登录、刷新令牌、当前用户信息
- `project`：项目、模块、分组、成员、环境与项目树
- `doc`：接口详情、参数、响应、版本
- `debug`：调试执行、调试历史、安全策略
- `mock`：Mock 规则、发布、模拟与运行时入口
- `common`：统一返回体、安全配置与基础设施

当前对外接口主要分为两类：

- `/api/v1/*`：控制台与浏览端使用的业务 API
- `/mock/{projectId}/**`：Mock 运行时入口

### 共享包

- `packages/api-sdk`：前端调用后端的类型化 SDK
- `packages/ui`：共享 UI 组件
- `packages/config`：共享配置包骨架

### 原型与文档

- `prototype/`：早期页面职责与交互参考，不是当前实现的一比一映射
- `docs/superpowers/`：设计稿与阶段性计划文档

## 仓库结构

```text
apps/
  web/                    # Next.js 前端
packages/
  api-sdk/                # 前端 API SDK
  ui/                     # 共享 UI 组件
  config/                 # 共享配置
services/
  apihub-server/          # Spring Boot 后端
infra/
  nginx/                  # Nginx 反向代理示例
prototype/                # 原型工程
```

## 技术基线

### 前端

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `Framer Motion`
- `Vitest`

### 后端

- `Spring Boot 3.2.5`
- `Java 21`
- `Spring Security`
- `JWT`
- `Flyway`
- `MySQL 8`
- `H2`（测试）
- `Maven`

## 本地启动

### 1. 启动 MySQL

```bash
docker compose up -d mysql
```

默认容器会暴露 `3306` 端口。

### 2. 启动后端

```bash
cd services/apihub-server
mvn spring-boot:run
```

默认监听：

- `http://localhost:8080`

后端默认数据库配置来自 `services/apihub-server/src/main/resources/application.yml`，未额外覆盖时使用：

- 数据库：`apihub`
- 用户名：`root`
- 密码：`123456`

应用启动时会通过 Flyway 自动初始化表结构与示例数据。

### 3. 启动前端

```bash
pnpm --filter web dev
```

默认访问地址：

- `http://localhost:3000/login`

根路径 `/` 会自动跳转到 `/login`。

## 默认账号

Flyway 示例数据会初始化几组本地账号，当前可直接用于体验不同权限角色：

- `admin`
- `viewer`
- `editor`
- `tester`
- `member-admin`

默认密码统一为：

- `123456`

## 当前交付重点

从现有代码看，这个仓库的重心已经不是单纯的原型展示，而是围绕“项目工作台”形成一条完整主链路：

1. 登录进入控制台
2. 浏览项目列表并进入项目
3. 通过模块 / 分组 / 接口树定位接口
4. 编辑接口、参数、响应与版本
5. 配置环境并发起调试
6. 配置 Mock 规则并发布运行时快照
7. 管理项目成员与访问权限

这条链路目前由前端页面、`packages/api-sdk`、后端 `/api/v1/*` 接口以及 `/mock/{projectId}/**` 运行时入口共同组成。

## 反向代理

`infra/nginx/default.conf` 提供了一个本地反向代理示例：

- `/api/*` 转发到 `http://host.docker.internal:8080`
- `/` 转发到 `http://host.docker.internal:3000`

它适合本地或容器内联调场景。如需在 Linux 环境使用，需要根据宿主机网络实际情况调整 `host.docker.internal`。

## 测试与验证

### 后端

```bash
cd services/apihub-server
mvn test -Dtest=AuthControllerTest,HealthControllerTest,ProjectTreeControllerTest,ProjectSecurityTest
mvn package
```

### 前端

```bash
pnpm --filter web test
pnpm --filter web build
```

