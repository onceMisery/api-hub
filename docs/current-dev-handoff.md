# ApiHub 当前开发交接文档

最后更新：2026-04-09
当前分支：`main`
仓库路径：`D:\code\my-infra\api-hub`

## 1. 文档目的

这份文档用于快速接手当前 `ApiHub` 开发工作，重点说明：

- 现在已经做到了什么
- 代码和数据落在哪些位置
- 哪些能力还没做完
- 接下来应该按什么顺序继续做
- 哪些地方只是 MVP 实现，后续必须重构或补强

当前项目不是从零开始，已经具备“登录 -> 项目树 -> 接口编辑 -> 版本快照 -> 环境管理 -> 调试 -> Mock”这一条可运行主链路。

## 2. 当前整体状态

当前实现形态：

- 前端：`Next.js 15 + React 19 + TypeScript`
- 后端：`Spring Boot 3.2 + Java 21 + JDBC`
- 数据库：`MySQL 8`
- 部署基线：单机，`web + server + mysql`

当前实现策略不是微服务，而是：

- 前端单应用
- 后端模块化单体
- MySQL 为唯一必选基础设施
- Redis / MQ / OpenSearch / MinIO 均未进入主链路

当前系统已经不是静态原型，已经有真实后端接口、真实数据库读写和可用页面。

## 3. 已实现功能总览

### 3.1 认证与基础运行

已实现：

- 登录接口：`POST /api/v1/auth/login`
- Bearer 鉴权过滤器
- 健康检查：`GET /api/health`
- 前端登录页已接真实登录
- 未登录访问控制台会跳回 `/login`

当前限制：

- 只有登录，没有 `refresh`、`logout`、`/me`
- `JwtTokenService` 目前是简化实现，不是真正 JWT
- token 规则目前是字符串拼接形式：`access-{userId}` / `refresh-{userId}`
- 前端 token 目前放在本地存储，不是正式 cookie 会话方案

### 3.2 项目工作台

已实现：

- 项目列表页
- 项目工作台页
- 左侧树结构：`模块 -> 分组 -> 接口`
- 左侧树搜索过滤
- 模块创建、重命名、删除
- 分组创建、重命名、删除
- 接口创建、重命名、删除
- 创建成功后自动刷新并定位新节点

### 3.3 接口编辑

已实现：

- 接口基础信息编辑
  - 名称
  - 方法
  - 路径
  - 描述
  - `mockEnabled`
- 请求参数平铺编辑
- 响应结构平铺编辑
- 接口删除
- 版本快照保存
- 基础版本 Diff 摘要

当前限制：

- 参数和响应编辑是平铺模型，不是树形 Schema 编辑器
- 还没有嵌套对象、数组子节点、拖拽排序、引用字典等高级能力
- Diff 目前只是摘要，不是结构化字段级比对

### 3.4 环境管理

已实现：

- 项目级环境 CRUD
- 支持字段：
  - `baseUrl`
  - `isDefault`
  - `variables`
  - `defaultHeaders`
  - `defaultQuery`
  - `authMode`
  - `authKey`
  - `authValue`
- 前端环境面板已支持编辑和切换活动环境

已支持的鉴权快捷注入：

- `none`
- `bearer`
- `api_key_header`

当前限制：

- 还没有密钥加密
- 还没有环境变量分组、导入导出、批量编辑
- 还没有 `query api key`、`basic auth`、签名类鉴权

### 3.5 调试链路

已实现：

- 调试执行接口：`POST /api/v1/debug/execute`
- 服务端代发请求
- 支持：
  - 当前环境 `baseUrl`
  - endpoint 的 `method/path`
  - 自定义 query / headers / body
  - 环境变量替换 `{{var}}`
  - 环境默认 `query/header`
  - 简化鉴权注入
- 调试历史表和历史查询接口
- 历史 Replay
- 历史 Run again

当前限制：

- 没有 pre-script / post-script
- 没有变量提取
- 没有断言
- 没有 cURL 导入导出
- 没有请求白名单/黑名单、SSRF 防护等正式安全边界
- 没有异步执行、超时治理、熔断治理

### 3.6 Mock

已实现：

- 公开 Mock 路由：`/mock/{projectId}/**`
- 按 `projectId + method + path` 匹配接口
- 支持模板路径，例如 `/users/{id}`
- 默认 Mock 来源：
  - 优先最新版本快照
  - 没有快照则回退到 `api_response`
- 已支持条件规则版 Mock
  - 规则接口：
    - `GET /api/v1/endpoints/{endpointId}/mock-rules`
    - `PUT /api/v1/endpoints/{endpointId}/mock-rules`
  - 条件类型：
    - `query`
    - `header`
  - 条件匹配方式：精确匹配
  - 规则优先级：`priority desc, id asc`
  - 未命中规则则回退到默认 Mock

前端已实现：

- `Enable mock`
- Mock URL 展示
- Mock Preview
- 多状态码预览切换
- 预览源切换
  - `Current draft`
  - `Latest saved version`
- Mock Rule 编辑
- Match summary
- Rule response preview
- Preview source details

当前限制：

- 规则还不支持 `body/jsonpath`
- 没有命中模拟器
- 没有规则发布态 / 草稿态边界
- Mock 运行时仍然偏“当前编辑模型驱动”，还不是完整发布中心
- 没有场景管理、延迟注入、概率返回、异常注入

## 4. 当前页面与入口

前端页面入口：

- 首页：`apps/web/src/app/page.tsx`
- 登录页：`apps/web/src/app/login/page.tsx`
- 项目列表：`apps/web/src/app/console/projects/page.tsx`
- 项目工作台：`apps/web/src/app/console/projects/[projectId]/page.tsx`

前端核心组件：

- `apps/web/src/features/auth/components/login-form.tsx`
- `apps/web/src/features/projects/components/project-shell.tsx`
- `apps/web/src/features/projects/components/project-sidebar.tsx`
- `apps/web/src/features/projects/components/endpoint-editor.tsx`
- `apps/web/src/features/projects/components/environment-panel.tsx`
- `apps/web/src/features/projects/components/debug-console.tsx`

当前页面组织方式：

- `ProjectShell` 是主协调组件
- `ProjectSidebar` 负责树、搜索、节点维护动作
- `EnvironmentPanel` 负责环境 CRUD 和当前环境切换
- `DebugConsole` 负责调试发送、结果展示、历史 replay/rerun
- `EndpointEditor` 负责接口基础信息、参数、响应、版本和 Mock 配置

## 5. 后端代码结构

后端主工程：

- `services/apihub-server`

主模块：

- `services/apihub-server/src/main/java/com/apihub/auth`
- `services/apihub-server/src/main/java/com/apihub/common`
- `services/apihub-server/src/main/java/com/apihub/project`
- `services/apihub-server/src/main/java/com/apihub/doc`
- `services/apihub-server/src/main/java/com/apihub/debug`
- `services/apihub-server/src/main/java/com/apihub/mock`

核心控制器：

- `auth/web/AuthController.java`
- `common/web/HealthController.java`
- `project/web/ProjectController.java`
- `project/web/ModuleController.java`
- `project/web/ModuleMutationController.java`
- `project/web/ApiGroupController.java`
- `project/web/ApiGroupMutationController.java`
- `project/web/ProjectEnvironmentController.java`
- `project/web/EnvironmentMutationController.java`
- `doc/web/ApiEndpointController.java`
- `doc/web/ApiSchemaController.java`
- `doc/web/ApiVersionController.java`
- `debug/web/DebugController.java`
- `debug/web/DebugHistoryController.java`
- `mock/web/ApiMockRuleController.java`
- `mock/web/MockController.java`

关键服务 / 仓储：

- `auth/service/AuthService.java`
- `auth/service/JwtTokenService.java`
- `project/service/ProjectService.java`
- `project/repository/ProjectRepository.java`
- `doc/repository/EndpointRepository.java`
- `debug/service/DebugService.java`
- `debug/service/DebugHistoryRepository.java`
- `mock/service/MockService.java`

## 6. 当前数据库现状

主 schema 文件：

- `infra/mysql/001_phase1_schema.sql`

主 seed 文件：

- `infra/mysql/002_phase1_seed.sql`

已落地关键表：

- `sys_user`
- `space`
- `space_member`
- `project`
- `project_member`
- `environment`
- `module`
- `api_group`
- `api_endpoint`
- `api_parameter`
- `api_response`
- `api_version`
- `mock_rule`
- `debug_history`

当前表设计特点：

- `api_endpoint` 保存基础信息和 `mock_enabled`
- `api_parameter` / `api_response` 采用平铺模型
- `api_version.snapshot_json` 保存快照
- `mock_rule` 独立存条件规则
- `debug_history` 持久化请求/响应快照

当前缺失表：

- 真正的发布中心相关表
- 调试会话、调试收藏表
- 审计日志表
- 分享链接表
- 测试编排表
- AI 任务表
- DocForge 推送记录表

## 7. 当前 API 清单

### 7.1 认证

- `POST /api/v1/auth/login`
- `GET /api/health`

### 7.2 项目 / 模块 / 分组

- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/{projectId}`
- `PATCH /api/v1/projects/{projectId}`
- `GET /api/v1/projects/{projectId}/tree`
- `GET /api/v1/projects/{projectId}/modules`
- `POST /api/v1/projects/{projectId}/modules`
- `PATCH /api/v1/modules/{moduleId}`
- `DELETE /api/v1/modules/{moduleId}`
- `GET /api/v1/modules/{moduleId}/groups`
- `POST /api/v1/modules/{moduleId}/groups`
- `PATCH /api/v1/groups/{groupId}`
- `DELETE /api/v1/groups/{groupId}`

### 7.3 接口 / 参数 / 响应 / 版本

- `GET /api/v1/groups/{groupId}/endpoints`
- `POST /api/v1/groups/{groupId}/endpoints`
- `GET /api/v1/endpoints/{endpointId}`
- `PATCH /api/v1/endpoints/{endpointId}`
- `DELETE /api/v1/endpoints/{endpointId}`
- `GET /api/v1/endpoints/{endpointId}/parameters`
- `PUT /api/v1/endpoints/{endpointId}/parameters`
- `GET /api/v1/endpoints/{endpointId}/responses`
- `PUT /api/v1/endpoints/{endpointId}/responses`
- `GET /api/v1/endpoints/{endpointId}/versions`
- `POST /api/v1/endpoints/{endpointId}/versions`

### 7.4 环境

- `GET /api/v1/projects/{projectId}/environments`
- `POST /api/v1/projects/{projectId}/environments`
- `PATCH /api/v1/environments/{environmentId}`
- `DELETE /api/v1/environments/{environmentId}`

### 7.5 调试

- `POST /api/v1/debug/execute`
- `GET /api/v1/projects/{projectId}/debug-history`

### 7.6 Mock

- `GET /api/v1/endpoints/{endpointId}/mock-rules`
- `PUT /api/v1/endpoints/{endpointId}/mock-rules`
- `GET/POST/PUT/PATCH/DELETE /mock/{projectId}/**`

## 8. 已知实现限制和技术债

这部分最重要。当前代码已经可用，但有明显 MVP 痕迹，建议不要误判成“可直接生产化”。

### 8.1 认证层

- `JwtTokenService` 不是正式 JWT 实现
- 没有 refresh 流程和过期控制
- 没有角色权限判定，只做了“是否登录”的基础校验
- `/mock/**` 完全公开，没有项目级签名或访问控制

### 8.2 数据层

- JDBC 已经落地，但还没有统一 migration 方案，仍是 SQL 初始化脚本驱动
- 没有 Flyway / Liquibase
- 部分表缺审计字段和软删除策略
- 版本系统还没有 “发布版本” 与 “草稿版本” 的正式边界

### 8.3 接口编辑模型

- 参数和响应都是平铺行，不是树结构
- `snapshot_json` 当前结构是为前端当前编辑器服务，不是最终稳定契约
- Diff 逻辑在前端本地计算，后端没有统一 Diff 服务

### 8.4 调试执行

- 还没有 SSRF 防护和目标域白名单
- 还没有超时、重试、限流、审计
- 没有历史筛选、清理、收藏
- 没有 cURL 导入导出

### 8.5 Mock

- 还没有正式“已发布 Mock 快照”机制
- 规则条件只支持 query/header 精确匹配
- 还没有 body/jsonpath 条件
- 还没有规则命中模拟器
- 还没有规则分组、场景、权重、延迟、异常注入

### 8.6 前端

- 当前视觉已经比原型完整，但还没达到最终高完成度
- `ProjectShell` 仍偏重，未来要拆成更明确的状态层和容器层
- 还没有全局通知系统、统一错误处理、统一 loading 策略
- 还没有真正的 design system 文档和组件约束

## 9. 当前最值得优先继续的开发顺序

建议按下面顺序继续，不建议同时四处铺开。

### P0：把 Mock 和调试链路做扎实

目标：

- 把现在最接近“可联调”的链路补到真正可持续使用

建议任务：

1. Mock 规则命中模拟器
   - 在编辑器里输入 query/header 样例
   - 直接计算会命中哪条规则
   - 需要和主 `Mock Preview` 联动
2. Mock 运行态和草稿态边界
   - 引入 “当前草稿预览” 与 “实际运行 Mock 来源” 的明确区分
   - 最好增加独立发布快照
3. 调试历史筛选与清理
   - 按 endpoint / environment / status / 时间过滤
   - 支持清理历史
4. 调试安全加固
   - baseUrl 白名单
   - 私有网段限制
   - 超时和请求大小限制

验收标准：

- 用户能明确知道一条 Mock 规则为什么命中
- Mock 运行结果和编辑器预览结果的来源关系清晰
- 调试历史可以查、复用、清理

### P1：升级接口模型和版本能力

目标：

- 让接口定义开始具备更稳定的数据模型

建议任务：

1. 响应 / 参数升级为树结构模型
2. 字段级结构化 Diff
3. 版本发布态
4. 版本回滚
5. 模块级版本标签

验收标准：

- 一个复杂接口可以表达嵌套结构
- Diff 不再只是摘要，而是结构化字段对比
- 版本概念从“保存快照”升级到“可发布 / 可回滚”

### P2：把协作和平台能力补上

目标：

- 从“个人工作台”升级到“团队平台”

建议任务：

1. 用户与角色权限
2. 审计日志
3. 分享页 / 浏览页
4. 搜索与快速定位增强
5. 文档浏览模式完善

### P3：接回 README 里规划的完整平台能力

目标：

- 开始向完整 ApiHub 靠拢

建议任务：

1. DocForge 推送接入
2. Mock 发布中心
3. 测试编排
4. AI 能力预留和任务中心
5. 组件化设计系统抽离

## 10. 针对每个模块的继续实现建议

### 10.1 认证

建议直接替换当前简化方案：

- 使用真正 JWT
- 加 `refresh`、`/me`、登出
- 前端改 HttpOnly Cookie 或至少统一 token 存储策略
- 增加最小 RBAC

### 10.2 项目树

当前能力已经够用，下一步不该继续堆基础 CRUD，而是：

- 增加排序能力
- 增加拖拽重排
- 增加最近访问和固定入口

### 10.3 接口编辑器

建议下一次重构时拆开：

- `EndpointBasicsCard`
- `ParameterEditor`
- `ResponseEditor`
- `MockEditor`
- `VersionPanel`

当前 `endpoint-editor.tsx` 功能密度已经偏高，继续堆会难维护。

### 10.4 调试台

建议下一步做：

- 请求模板保存
- 历史筛选
- cURL 导入导出
- 鉴权模板扩展
- 安全边界治理

### 10.5 Mock

建议演进路径：

1. 命中模拟器
2. body/jsonpath 条件
3. 已发布快照
4. 场景化规则
5. 独立 Mock 管理页

不要直接跳到高级规则引擎，否则当前数据模型会先失控。

## 11. 本地启动方式

### 11.1 MySQL

在仓库根目录执行：

```powershell
docker compose up -d
```

当前 Compose 只包含 MySQL：

- 端口：`3306`
- 数据库：`apihub`
- root 密码：`root`

初始化脚本位置：

- `infra/mysql/001_phase1_schema.sql`
- `infra/mysql/002_phase1_seed.sql`

### 11.2 后端

进入：

```powershell
cd services/apihub-server
.\gradlew.bat bootRun
```

### 11.3 前端

进入：

```powershell
cd apps/web
pnpm dev
```

### 11.4 Nginx

当前有最小反向代理配置：

- `infra/nginx/default.conf`

当前规则：

- `/api/* -> 8080`
- `/ -> 3000`

## 12. 当前验证命令

前端：

```powershell
pnpm --filter web test
pnpm --filter web build
```

后端：

```powershell
cd services/apihub-server
.\gradlew.bat test --no-daemon
```

最近确认过的事实：

- 前端全量测试通过
- 前端生产构建通过
- 后端全量测试在最近后端改动阶段通过
- 最近两轮主要是前端 Mock 编辑体验增强，没有再改后端主逻辑

## 13. 当前默认测试账号

当前前端登录表单默认填充：

- 用户名：`admin`
- 密码：`123456`

对应文件：

- `apps/web/src/features/auth/components/login-form.tsx`

数据库 seed 中默认用户：

- `sys_user.id = 1`
- `username = admin`

如果你要继续保留这个本地体验，建议补一条明确说明到最终 README，避免后面忘掉。

## 14. 建议立即建立的工程纪律

如果接下来由你自己继续开发，建议先做这几件事，否则很快会乱：

1. 引入 migration 工具
   - 推荐 Flyway
2. 把 token 方案从假 JWT 替换成正式实现
3. 把 `endpoint-editor.tsx` 和 `project-shell.tsx` 继续拆组件
4. 为 Mock 和调试增加更明确的“草稿态 / 运行态 / 发布态”边界
5. 开始补文档化测试用例，而不是只依赖组件测试

## 15. 接手建议

如果只给一个建议，就是：

- 不要继续横向扩展功能
- 先把现有“接口编辑 / 调试 / Mock”三条链路做深、做稳、做清楚边界

目前最合理的下一阶段主线是：

1. Mock 命中模拟器
2. Mock 发布快照
3. 调试安全边界
4. 字段级 Diff
5. 正式 JWT + 权限

这五项做完，系统才会从“能演示的 MVP”变成“能持续开发的平台基线”。
