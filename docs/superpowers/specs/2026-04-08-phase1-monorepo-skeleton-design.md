# Phase 1 Monorepo Skeleton Design

> 日期：2026-04-08
> 范围：ApiHub 第一阶段正式工程骨架与最小业务闭环

## 1. 目标

第一阶段只做一件事：在 `README.md` 已确认的技术路线下，建立可以持续演进的正式工程骨架，并跑通最小业务闭环。

本阶段硬目标如下：

- 建立正式 Monorepo
- 建立 `web + server + mysql` 的本地可运行链路
- 实现真实本地账号登录
- 实现 `项目 / 模块 / 分组 / 接口` 的最小闭环
- 前端直接采用正式技术栈与正式视觉语言，不做临时壳子

## 2. 已确认约束

- 数据库采用 `MySQL 8`
- `MySQL` 是唯一必选基础设施
- 默认部署形态为单机：`Nginx + Next.js + Spring Boot + MySQL`
- 前端采用：
  - `Next.js 15`
  - `React 19`
  - `TypeScript`
  - `Tailwind CSS`
  - `shadcn/ui`
  - `Framer Motion`
- 后端采用：
  - `Spring Boot 3.2`
  - `Java 21`
  - `Spring Security`
  - `JWT / Refresh Token`
- `prototype/` 只作为页面职责参考，不作为最终交付上限
- `Mock`、`调试`、`AI`、`测试编排`、`DocForge Push` 不进入本阶段交付

## 3. 交付范围

### 3.1 本阶段交付

- Monorepo 基础目录与共享配置
- `apps/web` 正式前端工程
- `services/apihub-server` 正式后端工程
- `packages/ui`、`packages/api-sdk`、`packages/config` 基础共享层
- MySQL 初始化脚本与本地运行说明
- 登录页
- 控制台项目页
- 项目工作台页
- `项目 -> 模块 -> 分组 -> 接口` 树形导航
- 项目、模块、分组、接口的最小 CRUD
- 接口详情编辑
- 请求参数与响应结构的基础表单编辑
- 接口版本快照的保存与列表查看

### 3.2 本阶段明确不做

- Mock 规则、发布与运行时
- 调试执行与调试历史
- 环境变量与密钥
- 分享页与公开访问
- Diff 计算
- DocForge 推送接收
- AI
- 测试编排
- Redis / MQ / OpenSearch / MinIO 集成

## 4. 实现路线选择

本阶段采用“正式栈一次到位”的方案，而不是先搭临时工程再迁移。

原因：

- 目标技术栈已经明确，没有必要再走过渡架构
- 登录要求是真实可用，而不是开发期假登录
- 控制台 UI 已要求明显高于 prototype，临时前端会导致二次重写
- 后续阶段要在这一骨架上继续扩展 Mock、调试和版本能力，正式骨架更稳

## 5. 工程结构

```text
api-hub/
  apps/
    web/
  packages/
    ui/
    api-sdk/
    config/
  services/
    apihub-server/
  infra/
    mysql/
    nginx/
  docs/
```

### 5.1 目录职责

- `apps/web`
  - Next.js App Router 应用
  - 承载登录页与控制台
- `packages/ui`
  - 设计系统基础组件
  - 统一卡片、表单、面板、树导航、页面框架风格
- `packages/api-sdk`
  - 前端 API 封装
  - 统一请求、鉴权头、错误处理、DTO 类型
- `packages/config`
  - 共享 TypeScript、Tailwind、lint、常量配置
- `services/apihub-server`
  - Spring Boot 模块化单体
- `infra/mysql`
  - 初始化表结构、种子数据
- `infra/nginx`
  - 本地与单机部署示例配置

## 6. 前端设计

### 6.1 页面范围

本阶段只实现 3 类页面：

1. 登录页
2. 控制台首页 `/console/projects`
3. 项目工作台 `/console/projects/[projectId]`

### 6.2 UI 设计原则

- 使用正式卡片化工作台风格
- 登录页、控制台首页、项目工作台共用统一设计语言
- 视觉完成度必须高于 `prototype/`
- 控制台优先保证信息密度和操作效率，不直接照搬营销页风格

### 6.3 页面职责

#### 登录页

- 用户名密码登录
- 左右分区或中心卡片布局
- 品牌说明与登录表单统一在正式视觉体系内

#### 控制台首页

- 项目卡片列表
- 最近访问区块
- 新建项目入口
- 统一顶部导航与用户菜单

#### 项目工作台

- 左侧树：`项目 -> 模块 -> 分组 -> 接口`
- 顶部工具区：搜索、快速新建、当前项目信息
- 主内容区：
  - 默认显示项目概览
  - 点击接口后显示接口详情编辑页

### 6.4 接口详情编辑页

首阶段支持：

- 基础信息编辑
- 请求参数表格编辑
- 响应结构表格编辑
- 版本快照保存
- 编辑 / 预览双态切换

首阶段不支持：

- Diff 可视化
- Mock 联动
- 调试执行
- 多版本并排比较

## 7. 后端设计

### 7.1 模块范围

本阶段只落 4 个模块：

- `common`
- `auth`
- `project`
- `doc`

### 7.2 模块职责

#### `common`

- 统一返回体
- 全局异常处理
- JWT 工具
- 分页对象
- 审计基础字段

#### `auth`

- 本地账号登录
- Access Token 签发
- Refresh Token 刷新
- 当前用户获取

#### `project`

- 项目 CRUD
- 模块 CRUD
- 分组 CRUD
- 项目树查询

#### `doc`

- 接口 CRUD
- 请求参数保存
- 响应结构保存
- 版本快照保存
- 版本列表查询

### 7.3 核心类

- `AuthController` / `AuthService`
- `ProjectController` / `ProjectService`
- `ModuleController` / `ModuleService`
- `ApiGroupController` / `ApiGroupService`
- `ApiEndpointController` / `ApiEndpointService`
- `ApiSchemaController` / `ApiSchemaService`
- `ApiVersionController` / `ApiVersionService`
- `JwtTokenService`
- `GlobalExceptionHandler`

## 8. 数据库范围

本阶段只落闭环必需表：

- `sys_user`
- `sys_auth_identity`
- `space`
- `space_member`
- `project`
- `project_member`
- `module`
- `api_group`
- `api_endpoint`
- `api_parameter`
- `api_response`
- `api_version`

### 8.1 建表原则

- 优先使用 `README.md` 已确认的 MySQL DDL 语义
- 不提前实现本阶段不用的 Mock、调试、AI、测试表
- 保留后续扩展兼容性，不做破坏性简化

### 8.2 种子数据

初始化脚本至少包含：

- 一个默认管理员用户
- 一个默认空间

这样可以在首阶段完成最小链路验证，不需要先做完整租户初始化流程。

## 9. API 范围

本阶段只实现最小闭环 API：

### 9.1 认证

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

### 9.2 项目

- `GET /api/v1/spaces`
- `GET /api/v1/spaces/{spaceId}/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/{projectId}`
- `PATCH /api/v1/projects/{projectId}`

### 9.3 模块与分组

- `GET /api/v1/projects/{projectId}/modules`
- `POST /api/v1/projects/{projectId}/modules`
- `GET /api/v1/modules/{moduleId}/groups`
- `POST /api/v1/modules/{moduleId}/groups`

### 9.4 接口与版本

- `GET /api/v1/groups/{groupId}/endpoints`
- `POST /api/v1/groups/{groupId}/endpoints`
- `GET /api/v1/endpoints/{endpointId}`
- `PATCH /api/v1/endpoints/{endpointId}`
- `GET /api/v1/endpoints/{endpointId}/versions`
- `POST /api/v1/endpoints/{endpointId}/versions`

### 9.5 聚合接口

- `GET /api/v1/projects/{projectId}/tree`

说明：

- 首阶段增加树聚合接口，降低前端联调复杂度
- 后续若需要细拆查询，可在不破坏前端主流程的前提下逐步分解

## 10. 关键数据流

### 10.1 登录

1. 前端提交用户名和密码
2. 后端校验用户状态与密码
3. 签发 Access Token 和 Refresh Token
4. 前端保存登录态并跳转控制台

### 10.2 项目树加载

1. 前端进入项目工作台
2. 调用项目详情与项目树接口
3. 后端聚合模块、分组、接口树
4. 前端渲染左侧树与默认主面板

### 10.3 新建接口

1. 前端在分组下发起新建接口
2. 后端写入 `api_endpoint`
3. 前端刷新树节点并定位到新接口

### 10.4 编辑接口

1. 前端保存接口基础信息、参数、响应
2. 后端更新接口与结构数据
3. 如用户选择保存版本，则写入 `api_version`

## 11. 错误处理

### 11.1 前端

- 未登录统一跳转登录页
- 业务错误显示在表单或页面级提示区
- 保存失败不清空当前编辑内容

### 11.2 后端

- 登录失败返回明确错误码
- 资源不存在返回 404 语义错误
- 参数校验失败返回统一校验错误结构
- 未授权请求返回 401 / 403

## 12. 测试与验证

本阶段至少覆盖以下验证：

- 后端：
  - 登录成功 / 失败
  - 项目 CRUD
  - 模块 CRUD
  - 分组 CRUD
  - 接口 CRUD
  - 版本快照保存
- 前端：
  - 登录流程
  - 项目树渲染
  - 接口详情加载与保存
  - 编辑 / 预览切换

测试策略：

- 后端优先做 Service + Controller 基础测试
- 前端优先做关键页面渲染与主流程交互验证
- 首阶段不追求完整 E2E，但要保证主闭环可验证

## 13. 验收标准

本阶段完成时必须满足：

- `apps/web` 可独立启动
- `services/apihub-server` 可独立启动
- MySQL 初始化后可以用默认管理员登录
- 控制台可以创建项目、模块、分组、接口
- 左侧树可以按 `项目 -> 模块 -> 分组 -> 接口` 浏览和定位
- 接口详情页可以编辑基础信息、参数、响应
- 可以保存接口版本快照
- UI 已形成正式卡片化控制台基础风格，明显高于当前 `prototype/`

## 14. 实现顺序

1. 建立 Monorepo 目录和共享配置
2. 建立 `apps/web` 与 `services/apihub-server` 基础工程
3. 建立 MySQL 初始化脚本与默认管理员
4. 打通登录与登录态
5. 打通项目树后端接口
6. 打通控制台项目页与树导航
7. 打通接口详情编辑与版本快照保存
8. 完成最小验证
