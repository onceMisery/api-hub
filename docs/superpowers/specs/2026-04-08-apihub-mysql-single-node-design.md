# ApiHub MySQL 单机优先方案设计

> 日期：2026-04-08
> 范围：ApiHub 平台主方案重构，覆盖 MySQL 技术栈、前端体验、服务拆分、目录结构、核心职责、消息流、缓存策略、迭代排期

## 1. 目标

本方案用于替换当前 `README.md` 中技术栈与实现层级不一致的问题，形成一份可直接指导研发落地的总方案文档。

本次设计确认以下硬约束：

- 数据库采用 MySQL 8，且是唯一必选基础设施
- Redis、RabbitMQ、OpenSearch、MinIO 均为可选增强组件，不得成为首版主链路依赖
- 首版默认部署形态为单机部署
- 前端采用主流技术栈：Next.js 15 + React 19 + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- 前端 UI 目标为高完成度卡片风体验，视觉参考 Raycast，但控制台必须兼顾信息密度和编辑效率
- MVP 保留 Mock，AI 与测试编排只做二期预留，不进入首版主交付范围

## 2. 推荐架构

推荐采用“前端体验优先的 Monorepo + 后端模块化单体”方案。

### 2.1 运行时形态

首版仅保留两个主进程：

- `apihub-web`：Next.js 应用，承载官网、分享页、文档浏览页、控制台
- `apihub-server`：Spring Boot 单体，内部按领域模块拆分

配套基础设施：

- `MySQL 8`
- `Nginx`

可选增强组件：

- `Redis`：多实例缓存和热点数据增强
- `MinIO`：导出文件、附件、对象化快照存储
- `OpenSearch`：全文搜索增强
- `独立 runner/mock`：后续流量和执行压力增大时拆分

### 2.2 选择理由

该方案满足以下目标：

- 单机即可运行，不依赖额外中间件
- 前端可以使用统一设计系统，实现官网、浏览端、控制台一致体验
- 后端虽然单进程运行，但内部模块边界清晰，后续可平滑拆为服务
- 首版避免过度工程化，二期仍保留扩展空间

## 3. 前端方案

### 3.1 技术栈

- `Next.js 15`
- `React 19`
- `TypeScript 5`
- `Tailwind CSS`
- `shadcn/ui`
- `Radix UI`
- `Framer Motion`
- `TanStack Query`
- `Zustand`
- `Monaco Editor`

### 3.2 产品分层

前端分为三个逻辑层：

- 官网与产品介绍页
- 文档浏览与分享页
- 管理控制台

三者共用设计系统，但交互重点不同：

- 官网和浏览端强调品牌感、卡片层次、留白、渐变背景和轻动效
- 控制台强调高信息密度、快速编辑、稳定导航和工作台面板布局

### 3.3 UI 设计原则

- 使用卡片式信息组织，而不是传统后台大表单堆叠
- 使用柔和阴影、分层渐变、圆角和轻动效提升质感
- 避免将营销页风格原样复制到高密度编辑场景
- 编辑器、调试面板、版本视图、Mock 规则面板应使用统一卡片容器和吸附式工具栏
- 官网、浏览页、控制台共享配色、字体、按钮和卡片规范

## 4. 后端方案

### 4.1 技术栈

- `Spring Boot 3.2`
- `Java 21`
- `Spring Security`
- `MyBatis-Plus` 或 `MyBatis`
- `MySQL 8`
- `Caffeine` 作为首版默认缓存方案

### 4.2 模块化单体边界

后端只拆到领域模块，不拆成独立微服务：

- `auth`：认证、令牌、权限
- `space`：空间与空间成员
- `project`：项目、模块、接口分组
- `doc`：接口、参数、响应、版本、发布、Diff、DocForge 推送接收
- `dict`：数据字典
- `env`：环境、变量、密钥
- `debug`：调试执行、请求回放
- `mock`：Mock 规则、Mock 发布、运行时匹配

二期预留模块：

- `ai`
- `test`
- `search`

### 4.3 边界原则

- 首版所有主链路必须在没有 Redis、MQ 的情况下成立
- 所有领域变更以 MySQL 为真相源
- 异步行为只能是增强，不得成为核心链路依赖
- Mock 首版作为 `apihub-server` 内嵌模块实现

## 5. 代码目录建议

```text
apps/
  web/
    app/
      (marketing)/
      share/[token]/
      docs/[spaceKey]/[projectKey]/
      console/
    components/
    features/
    lib/
packages/
  ui/
    src/components/
    src/patterns/
    src/tokens/
    src/motion/
  api-sdk/
  config/
services/
  apihub-server/
    src/main/java/com/apihub/
      common/
      auth/
      space/
      project/
      doc/
      dict/
      env/
      debug/
      mock/
    src/main/resources/
```

目录拆分原则：

- 前端按应用与共享包拆分
- 后端按领域模块拆分
- 不在首版引入过细的共享层或复杂 DDD 目录
- 控制通用层体量，避免 `common` 成为杂物区

## 6. 核心类职责

### 6.1 auth

- `AuthController`：登录、刷新令牌、当前用户
- `AuthService`：认证流程、令牌签发、登出
- `PermissionService`：资源权限判断
- `CurrentUserResolver`：统一解析登录用户上下文

### 6.2 project

- `ProjectController` / `ModuleController` / `ApiGroupController`
- `ProjectService`：项目、模块、分组增删改查
- `ProjectMemberService`：成员授权与继承覆盖逻辑

### 6.3 doc

- `ApiEndpointController`
- `ApiSchemaController`
- `ApiVersionController`
- `ApiEndpointService`：接口主信息维护
- `ApiSchemaService`：参数树、响应树处理
- `ApiVersionService`：快照生成、发布、回滚
- `ApiDiffService`：版本对比
- `DocPushService`：接收 DocForge 推送并入库

### 6.4 dict / env / debug / mock

- `DictController` / `DictService`
- `EnvironmentController` / `EnvironmentService` / `EnvironmentSecretService`
- `DebugController` / `DebugService` / `RequestTemplateResolver` / `DebugHistoryService`
- `MockRuleController` / `MockPublishController` / `MockRuleService` / `MockRuntimeService`

### 6.5 通用基础抽象

仅保留必要公共抽象：

- `BaseEntity`
- `ApiResponse<T>`
- `BusinessException`
- `PageQuery` / `PageResult<T>`
- `AuditLogService`
- `OperationContext`

避免首版引入过多 application/domain/facade/assembler 层，降低维护复杂度。

## 7. 数据流与消息流

首版不依赖消息队列，因此采用“同步主链路 + 数据库记录 + 轻量异步补偿”的方式。

### 7.1 人工维护接口链路

1. 前端保存接口
2. `ApiEndpointService` 更新基础信息
3. `ApiSchemaService` 保存参数与响应结构
4. `ApiVersionService` 生成草稿快照
5. `AuditLogService` 记录变更
6. 返回最新接口详情

### 7.2 DocForge 推送链路

1. DocForge 调用 Push API
2. `DocPushService` 完成验签与幂等校验
3. 定位项目与模块
4. Upsert `api_endpoint`
5. 刷新参数与响应结构
6. 生成 `api_version`
7. 更新 `current_revision_id`
8. 记录 `doc_push_record` 与 `audit_log`

### 7.3 接口发布链路

1. 控制台发起发布
2. `ApiVersionService` 固化快照
3. 更新 `published_revision_id`
4. 如为模块发布则写入 `module_version_tag`
5. 浏览端仅读取已发布版本

### 7.4 调试执行链路

1. 前端提交调试请求
2. `RequestTemplateResolver` 合并环境变量与请求模板
3. `DebugService` 发起真实 HTTP 请求
4. 保存 `debug_history`
5. 返回响应结果给前端

### 7.5 Mock 命中链路

1. 调用方访问 Mock 地址
2. `MockRuntimeService` 根据 `method + path` 定位接口
3. 加载已发布规则
4. 按优先级匹配条件
5. 返回 Mock 响应

## 8. 缓存策略

### 8.1 默认方案

首版默认采用进程内缓存 `Caffeine`。

缓存对象：

- 项目/模块树
- 已发布接口详情
- 权限判断结果
- Mock 发布快照

### 8.2 失效策略

- 文档编辑后清理接口详情和项目树缓存
- 发布后清理已发布文档缓存与 Mock 缓存
- 权限变更后清理对应用户权限缓存

### 8.3 可选增强

当系统进入多实例部署或出现明显热点读场景时，可引入 Redis 作为二级缓存。

Redis 只做增强，不改变首版缓存接口和业务主流程。

## 9. 部署方案

### 9.1 单机部署拓扑

- `Nginx`
- `Next.js`
- `Spring Boot`
- `MySQL 8`

### 9.2 单机部署原则

- API 与页面统一通过 Nginx 反向代理
- 所有业务主数据落入 MySQL
- 不依赖外部缓存、队列、对象存储即可运行
- 后续可平滑增加 Redis、对象存储和全文搜索能力

### 9.3 部署目录建议

```text
deploy/
  docker-compose.yml
  nginx/
    nginx.conf
  mysql/
    init/
  scripts/
    start.sh
    backup.sh
```

## 10. 迭代排期

### Phase 1：MVP 基础闭环（4-6 周）

目标：

- 用户认证与权限
- 空间 / 项目 / 模块 / 接口 CRUD
- 双模式 UI
- 文档版本快照
- DocForge Push 接收
- 环境管理
- 接口调试基础版

验收标准：

- 可以从零创建项目并维护接口
- 可以接收 DocForge 推送
- 可以查看已发布文档
- 可以完成接口调试

### Phase 2：Mock 与发布增强（3-4 周）

目标：

- Mock 规则管理
- Mock 发布
- 模块版本标签
- 接口 Diff
- 分享页
- 审计日志

验收标准：

- Mock 地址可供联调直接使用
- 接口版本差异可视化
- 模块可生成分享链接

### Phase 3：体验与性能增强（3 周）

目标：

- 官网和浏览端视觉完善
- 控制台卡片化工作台
- Caffeine 缓存接入
- 关键查询优化
- 单机部署脚本完善

验收标准：

- 前端整体体验达到统一设计语言
- 单机环境稳定运行
- 核心页面响应明显优化

### Phase 4：二期预留能力（2-3 周）

目标：

- 预留 AI 任务中心模型
- 预留测试编排模型
- 预留 Redis / OpenSearch / runner 拆分点
- 输出后续拆分文档

验收标准：

- AI 与测试编排不进入 MVP 交付
- 但扩展模型与服务边界已经准备完毕

## 11. README 改造要求

最终 `README.md` 应完成以下修正：

- 全部 PostgreSQL 专属语法切换为 MySQL 8 兼容写法
- 全文技术基线统一为 MySQL 单机优先
- 增补前端方案与 UI 设计系统说明
- 增补服务拆分、代码目录、核心类职责、消息流、缓存策略、迭代排期
- 明确“仅 MySQL 为必选基础设施，其余均为可选增强组件”

## 12. 风险与约束

- 当前 `README.md` 已被修改为部分 MySQL 文案，但正文仍混有 PostgreSQL 语法，属于必须修正的不一致状态
- 单机优先方案对首版很合适，但需要在代码边界上保持自律，否则后续拆分成本会上升
- 前端如果只关注视觉而忽视编辑场景效率，会导致控制台可用性下降，因此设计系统必须同时满足品牌感和工作密度
