# ApiHub 调试执行安全加固设计

> 日期：2026-04-10
> 范围：`POST /api/v1/debug/execute` 调试执行链路的目标访问控制、私网约束、全局超时与响应体限制、前端阻断反馈、项目与环境配置模型

## 1. 目标

本设计用于补齐当前调试执行链路缺失的访问控制边界，避免调试功能直接成为任意出站请求代理。

本次设计确认以下约束：

- 只校验用户请求中的目标 host，不做 DNS 解析后二次判定
- 允许全局白名单、项目白名单、环境级覆盖三层共同生效
- 环境级覆盖模式必须显式配置，而不是隐式拼接
- 白名单匹配粒度为 host/domain，支持 `*.example.com` 通配
- 私网目标默认拒绝，只有命中的白名单规则显式声明 `allowPrivate=true` 才允许
- 配置错误和无效输入返回 `400`
- 安全策略阻断返回 `403`
- 前端必须显示用户可读原因和短规则码
- 超时和响应体大小限制只从全局配置读取，不做项目级或环境级自定义

## 2. 现状

当前 `DebugService` 直接从环境 `baseUrl`、endpoint `path`、query/header/body 拼接目标请求，再交给 `JdkDebugHttpExecutor` 发起真实 HTTP 调用。当前链路只有基础的 URL 格式校验，没有以下能力：

- 没有 host allowlist
- 没有私网目标识别与显式放行
- 没有结构化策略错误返回
- 没有全局可配置的 connect/read timeout
- 没有响应体字节上限
- 项目和环境模型中没有任何调试安全配置字段
- 前端 `DebugConsole` 只能展示普通错误文本，无法区分是网络故障还是策略阻断

这意味着当前实现天然具备 SSRF 风险，而且用户在被阻断时拿不到足够清晰的原因。

## 3. 方案比较

### 3.1 方案 A：独立调试策略表 + 独立策略 API

做法：

- 新增 `project_debug_policy`、`environment_debug_policy` 等独立表
- 新增专门的调试安全控制器和前端编辑入口

优点：

- 领域边界最清晰
- 后续扩展规则类型时更自然

缺点：

- 对当前阶段明显过重
- 需要额外 controller/service/repository 流程
- 前端要引入一套新的加载和保存状态

### 3.2 方案 B：沿用项目/环境现有 CRUD，白名单配置存 JSON 列，调试执行前增加独立策略解析层

做法：

- 在 `project` 和 `environment` 表补充 JSON/枚举字段
- 沿用现有 `ProjectController`、`ProjectEnvironmentController`、`EnvironmentMutationController`
- 在 `debug` 模块新增独立的策略解析与校验组件

优点：

- 和当前代码风格一致
- 变更范围集中，最适合当前 MVP
- 前端可以在现有环境面板基础上补充配置，不必新开工作台

缺点：

- `ProjectDtos` 会继续扩张
- 项目级和环境级调试配置会依附于通用 CRUD DTO，而不是独立资源

### 3.3 方案 C：只做全局配置，不落项目/环境持久化

做法：

- 所有白名单都写在 `application.yml`

优点：

- 实现最快

缺点：

- 不满足已确认需求
- 无法表达项目默认策略和环境覆盖
- 产品不可用

### 3.4 推荐

推荐采用方案 B。

原因很直接：

- 当前仓库已经广泛使用 JSON 列承载环境配置
- 项目和环境 CRUD 已经是稳定入口
- 安全核心风险在执行前校验，而不是在配置持久化层做复杂抽象
- 当前阶段应优先把边界补齐，而不是额外引入一套“更优雅但更重”的资源模型

## 4. 推荐设计

### 4.1 全局配置

新增 `apihub.debug.security` 配置段：

```yaml
apihub:
  debug:
    security:
      connect-timeout-ms: 5000
      read-timeout-ms: 10000
      max-response-body-bytes: 262144
      global-allowlist:
        - pattern: "api.example.com"
          allow-private: false
        - pattern: "*.corp.example.com"
          allow-private: false
        - pattern: "127.0.0.1"
          allow-private: true
```

配置约束：

- `pattern` 只允许 host/IP 模式，不允许带 scheme、path、query、port
- 通配只允许 `*.` 前缀
- `allow-private` 只在命中私网目标时产生额外授权作用

落地类：

- `DebugSecurityProperties`
- `DebugSecurityProperties.AllowRule`

### 4.2 数据模型

#### 项目级默认策略

在 `project` 表新增：

- `debug_allowed_hosts_json JSON NOT NULL`

在 H2 测试 schema 中使用 `CLOB`。

JSON 结构：

```json
[
  { "pattern": "api.partner.com", "allowPrivate": false },
  { "pattern": "*.svc.cluster.local", "allowPrivate": true }
]
```

项目 DTO 新增：

- `DebugTargetRuleEntry(String pattern, boolean allowPrivate)`
- `ProjectDetail.debugAllowedHosts`
- `UpdateProjectRequest.debugAllowedHosts`
- `CreateProjectRequest.debugAllowedHosts`

#### 环境级覆盖策略

在 `environment` 表新增：

- `debug_host_mode VARCHAR(16) NOT NULL`
- `debug_allowed_hosts_json JSON NOT NULL`

`debug_host_mode` 可选值：

- `inherit`
- `append`
- `override`

语义：

- `inherit`：生效规则 = 全局 + 项目
- `append`：生效规则 = 全局 + 项目 + 环境
- `override`：生效规则 = 全局 + 环境

环境 DTO 新增：

- `EnvironmentDetail.debugHostMode`
- `EnvironmentDetail.debugAllowedHosts`
- `CreateEnvironmentRequest.debugHostMode`
- `CreateEnvironmentRequest.debugAllowedHosts`
- `UpdateEnvironmentRequest.debugHostMode`
- `UpdateEnvironmentRequest.debugAllowedHosts`

默认值：

- 项目 `debugAllowedHosts = []`
- 环境 `debugHostMode = inherit`
- 环境 `debugAllowedHosts = []`

### 4.3 Host 规则匹配语义

匹配统一按小写处理。

支持两种规则：

- 精确匹配：`api.example.com`、`10.10.1.5`
- 后缀通配：`*.example.com`

规则语义：

- `*.example.com` 匹配 `a.example.com` 和 `b.c.example.com`
- `*.example.com` 不匹配 `example.com`
- IP 字面量只能精确匹配，不支持通配
- host 带尾部点时先做规范化，再参与匹配

### 4.4 私网目标判定

由于本次明确不做 DNS 解析后二次校验，私网判定仅覆盖以下“可从请求字面量直接判断”的目标：

- `localhost`
- `127.0.0.0/8`
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`
- `169.254.0.0/16`
- `::1`
- `fc00::/7`
- `fe80::/10`

结论：

- 请求 host 是普通域名时，不尝试解析其真实 IP
- 这不是遗漏，而是本次明确接受的边界

### 4.5 执行前校验顺序

调试执行链路调整为：

1. 查询环境和 endpoint，并校验两者属于同一项目
2. 解析变量，组装最终 URL
3. 校验 `baseUrl` 和最终 URL 必须为 `http/https`
4. 从最终 URL 提取规范化 host
5. 解析项目与环境的目标规则，并与全局规则合并出 effective allowlist
6. 校验 host 是否命中 allowlist
7. 如果 host 是私网目标，则进一步要求命中的规则中至少一个 `allowPrivate=true`
8. 通过后才调用 `DebugHttpExecutor`
9. 执行成功时写入 `debug_history`
10. 在 400/403 阶段被拒绝时不写 `debug_history`

阻断结果：

- 未命中规则：`403 DEBUG_TARGET_NOT_ALLOWED`
- 命中规则但私网未被显式允许：`403 DEBUG_PRIVATE_TARGET_NOT_ALLOWED`
- base URL、规则配置、host 模式等输入非法：`400` 对应调试配置错误码

### 4.6 后端组件拆分

为避免继续把逻辑堆进 `DebugService`，新增以下职责单元：

- `DebugSecurityProperties`
  - 绑定全局超时、响应体上限、全局规则
- `DebugTargetRuleValidator`
  - 校验保存到项目/环境中的规则是否合法
- `DebugTargetPolicyResolver`
  - 计算 effective allowlist
- `DebugTargetMatcher`
  - 处理精确匹配、通配匹配、私网字面量识别
- `DebugSecurityException`
  - 承载 HTTP status、短规则码、用户可读消息
- `DebugControllerAdvice`
  - 将调试相关异常转成统一错误响应

`DebugService` 只保留编排职责，不再内嵌所有策略细节。

### 4.7 执行器限制

`JdkDebugHttpExecutor` 改为读取 `DebugSecurityProperties`：

- connect timeout
- read timeout
- max response body bytes

执行器行为：

- 超时仍视为上游执行失败，返回 `502`
- 响应体超限时中断读取并返回 `502`
- 这两类错误不归类为 `400/403`，因为它们不是用户配置错误，也不是策略阻断

### 4.8 错误响应

成功响应保持不变。

新增调试专用错误响应体，仍沿用现有 `ApiResponse` 包装：

```json
{
  "code": 40301,
  "message": "目标主机 10.0.0.12 被调试安全策略阻止",
  "data": {
    "errorCode": "DEBUG_PRIVATE_TARGET_NOT_ALLOWED",
    "host": "10.0.0.12",
    "matchedPatterns": ["10.0.0.12"]
  }
}
```

最少落地的错误码：

- `DEBUG_TARGET_NOT_ALLOWED`
- `DEBUG_PRIVATE_TARGET_NOT_ALLOWED`
- `DEBUG_BASE_URL_INVALID`
- `DEBUG_TARGET_URL_INVALID`
- `DEBUG_RULE_PATTERN_INVALID`
- `DEBUG_ENVIRONMENT_MODE_INVALID`

### 4.9 前端交互

前端做两类变化。

#### 项目级策略编辑

在现有环境面板顶部新增 “Debug target policy” 卡片，编辑项目默认 allowlist。

交互形式采用显式列表编辑器，而不是多行 DSL 文本：

- 每行一个 rule
- 字段：`pattern`
- 开关：`Allow private`
- 支持新增、删除、保存

理由：

- 当前规则模型含布尔位，继续用 textarea 会让输入格式变成隐式语法，容易出错
- 这类配置频次不高，但必须可读、可校验、可解释

#### 环境级覆盖编辑

在每个 environment card 内新增：

- `Debug host mode` 下拉框：`inherit` / `append` / `override`
- 环境级 allowlist 编辑器
- 当 mode=`inherit` 时，环境规则编辑器禁用并显示“仅继承项目默认策略”

#### 调试阻断提示

`DebugConsole` 对调试错误分两类展示：

- 普通错误：沿用现有红色错误条
- 策略阻断：显示专用阻断提示卡

阻断提示卡展示：

- 用户可读消息
- `errorCode`
- 可选 host 信息

不要求首版展示完整规则命中轨迹，只展示最小必要信息。

### 4.10 API 与 SDK 变更

后端接口不新增独立策略资源，直接扩充现有接口：

- `GET /api/v1/projects/{projectId}`
- `PATCH /api/v1/projects/{projectId}`
- `GET /api/v1/projects/{projectId}/environments`
- `POST /api/v1/projects/{projectId}/environments`
- `PATCH /api/v1/environments/{environmentId}`

`packages/api-sdk` 需要新增或扩展：

- `fetchProject`
- `updateProject`
- `ProjectDetail.debugAllowedHosts`
- `EnvironmentDetail.debugHostMode`
- `EnvironmentDetail.debugAllowedHosts`
- `CreateEnvironmentPayload.debugHostMode`
- `CreateEnvironmentPayload.debugAllowedHosts`
- `UpdateEnvironmentPayload.debugHostMode`
- `UpdateEnvironmentPayload.debugAllowedHosts`
- `ApiRequestError.errorCode`
- `ApiRequestError.data`

`ProjectShell` 需要额外加载项目详情，作为项目级策略编辑的数据源。

## 5. 测试设计

后端至少覆盖以下测试：

- `ProjectServiceTest`
  - 项目级规则保存/读取
  - 环境模式与规则保存/读取
  - 非法规则模式和非法 pattern 返回 `400`
- `DebugServiceTest`
  - 公网目标命中 allowlist 可执行
  - 未命中 allowlist 返回 `403 DEBUG_TARGET_NOT_ALLOWED`
  - 私网字面量命中规则但未显式允许返回 `403 DEBUG_PRIVATE_TARGET_NOT_ALLOWED`
  - `override` 模式不再继承项目规则
  - `append` 模式会附加项目规则
- `JdkDebugHttpExecutorTest`
  - 读取全局 timeout 配置
  - 响应体超限时失败
- `DebugControllerAdviceTest` 或 `ApiMockMvc` 级测试
  - `400/403` 错误体包含 `message` 和 `data.errorCode`

前端至少覆盖以下测试：

- `environment-panel.test.tsx`
  - 项目级规则编辑器保存 payload 正确
  - 环境 `debugHostMode` 切换后 payload 正确
- `project-shell.test.tsx`
  - 加载项目详情
  - 项目策略保存后刷新项目状态
  - 调试被阻断时展示 message + `errorCode`
- `debug-console.test.tsx`
  - 普通错误与策略阻断展示分流

## 6. 非目标

本次不做：

- DNS 解析后二次校验
- 端口级白名单
- 路径级白名单
- 黑名单模型
- 审计日志表
- 阻断事件持久化
- 复杂企业级策略表达式

## 7. 实施结论

本次实现按“项目/环境配置扩展 + 调试执行前策略校验 + 前端显式阻断反馈”的最小闭环推进。

这条路径满足当前已确认需求，并且不会把现有代码库强行重构成一套超出阶段需求的策略系统。
