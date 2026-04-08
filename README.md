# api-hub

api-hub 是一个面向 API 设计、文档浏览、调试、Mock 和版本管理的单机优先平台。

## 1. 技术基线

当前实现基线是 **MySQL-first、single-node-first**：

- **MySQL 8 是唯一必选基础设施**
- **Redis、RabbitMQ、OpenSearch、MinIO 都是可选增强组件**
- 默认部署形态为 **Nginx + Next.js + Spring Boot + MySQL**
- 首版所有核心链路必须在不依赖可选组件的情况下独立运行
- AI 与测试编排为二期预留，不进入首版主交付范围

## 2. 前端实现方向

前端统一采用：

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `Framer Motion`

前端设计锚点是 **高完成度卡片风**：有明确的卡片层次、柔和分层、轻动效和更高的视觉精致度，但控制台不能为了风格而牺牲效率。

## 3. prototype 与最终产品

`prototype/` 只提供页面职责和交互方向参考，不是页面结构和视觉的一比一复刻。

最终产品需要在视觉精美程度、信息组织和完成度上明显高于当前 prototype，同时保留其职责划分思路：

- `LandingPage`：官网落地页，负责品牌展示、核心卖点、CTA 引导
- `DocBrowserPage`：浏览端文档页，负责接口树浏览、只读文档查看、分享访问
- `ConsoleDashboard`：控制台首页，负责项目概览、最近更新、快捷入口和工作区入口
- `ApiEditorPage`：接口编辑页，负责接口基本信息、请求参数、响应结构、版本编辑
- `DebugPage`：调试页，负责请求构造、调试执行、响应检查和错误定位
- `EnvironmentPage`：环境页，负责环境变量、密钥、环境切换和运行参数管理
- `VersionPage`：版本页，负责版本列表、Diff、发布、回滚和历史追踪
- `MockPage`：Mock 页，负责 Mock 规则管理、发布和运行时行为配置

## 4. 控制台要求

控制台不是 prototype 的静态复刻，正式版本必须补齐 prototype 中缺失的能力，并且保持高效率操作体验：

- 分组管理
- 模块组织
- 接口树导航
- 接口搜索与快速定位
- 页面内编辑 / 预览切换
- 版本、调试、Mock、环境之间的联动跳转

## 5. 交付约束

- 默认部署不依赖 Redis、RabbitMQ、OpenSearch、MinIO 也能完成主流程
- MySQL 8 承担所有核心数据持久化
- Nginx 负责统一入口和反向代理
- 浏览端、控制台和官网共用同一套设计语言，但交互密度与布局策略要按场景区分

## 6. 数据库 DDL

### 6.1 设计说明

- 采用 MySQL 8 方言
- 业务主键统一使用 `BIGINT NOT NULL AUTO_INCREMENT`
- 时间统一使用 `DATETIME(3)`
- 快照、规则、报告等非强结构化内容使用 `JSON`
- 核心建模方式为“当前实体 + 历史快照”

### 6.2 基础用户、空间、项目、模块与字典模型

```sql
CREATE TABLE sys_user (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username            VARCHAR(64) NOT NULL,
    display_name        VARCHAR(128) NOT NULL,
    email               VARCHAR(128) NOT NULL,
    mobile              VARCHAR(32),
    avatar_url          VARCHAR(512),
    password_hash       VARCHAR(255),
    status              VARCHAR(16) NOT NULL DEFAULT 'active',
    source_type         VARCHAR(16) NOT NULL DEFAULT 'local',
    last_login_at       DATETIME(3),
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_sys_user_username (username),
    UNIQUE KEY uk_sys_user_email (email),
    CONSTRAINT ck_sys_user_status CHECK (status IN ('active', 'disabled', 'locked')),
    CONSTRAINT ck_sys_user_source_type CHECK (source_type IN ('local', 'ldap', 'oidc')),
    KEY idx_sys_user_status (status),
    KEY idx_sys_user_last_login_at (last_login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sys_auth_identity (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    provider            VARCHAR(32) NOT NULL,
    provider_uid        VARCHAR(128) NOT NULL,
    credential_meta     JSON NOT NULL DEFAULT (JSON_OBJECT()),
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_sys_auth_identity_user FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE,
    UNIQUE KEY uk_sys_auth_identity_provider_uid (provider, provider_uid),
    KEY idx_sys_auth_identity_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE space (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(128) NOT NULL,
    space_key           VARCHAR(64) NOT NULL,
    description         TEXT,
    avatar_url          VARCHAR(512),
    visibility          VARCHAR(16) NOT NULL DEFAULT 'private',
    owner_id            BIGINT NOT NULL,
    status              VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_space_owner FOREIGN KEY (owner_id) REFERENCES sys_user (id),
    UNIQUE KEY uk_space_key (space_key),
    CONSTRAINT ck_space_visibility CHECK (visibility IN ('private', 'internal', 'public')),
    CONSTRAINT ck_space_status CHECK (status IN ('active', 'archived')),
    KEY idx_space_owner_id (owner_id),
    KEY idx_space_visibility (visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE space_member (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    space_id            BIGINT NOT NULL,
    user_id             BIGINT NOT NULL,
    role_code           VARCHAR(32) NOT NULL,
    member_status       VARCHAR(16) NOT NULL DEFAULT 'active',
    joined_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    invited_by          BIGINT,
    CONSTRAINT fk_space_member_space FOREIGN KEY (space_id) REFERENCES space (id) ON DELETE CASCADE,
    CONSTRAINT fk_space_member_user FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE,
    CONSTRAINT fk_space_member_invited_by FOREIGN KEY (invited_by) REFERENCES sys_user (id),
    UNIQUE KEY uk_space_member (space_id, user_id),
    CONSTRAINT ck_space_member_role CHECK (role_code IN ('space_admin', 'project_admin', 'editor', 'tester', 'viewer')),
    CONSTRAINT ck_space_member_status CHECK (member_status IN ('active', 'inactive')),
    KEY idx_space_member_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE project (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    space_id            BIGINT NOT NULL,
    name                VARCHAR(128) NOT NULL,
    project_key         VARCHAR(64) NOT NULL,
    description         TEXT,
    protocol_type       VARCHAR(16) NOT NULL DEFAULT 'http',
    visibility          VARCHAR(16) NOT NULL DEFAULT 'private',
    owner_id            BIGINT NOT NULL,
    status              VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_project_space FOREIGN KEY (space_id) REFERENCES space (id) ON DELETE CASCADE,
    CONSTRAINT fk_project_owner FOREIGN KEY (owner_id) REFERENCES sys_user (id),
    UNIQUE KEY uk_project_space_key (space_id, project_key),
    CONSTRAINT ck_project_protocol_type CHECK (protocol_type IN ('http', 'grpc', 'dubbo', 'websocket')),
    CONSTRAINT ck_project_visibility CHECK (visibility IN ('private', 'internal', 'public')),
    CONSTRAINT ck_project_status CHECK (status IN ('active', 'archived')),
    KEY idx_project_space_id (space_id),
    KEY idx_project_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE project_member (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    user_id             BIGINT NOT NULL,
    role_code           VARCHAR(32) NOT NULL,
    member_status       VARCHAR(16) NOT NULL DEFAULT 'active',
    granted_by          BIGINT,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_project_member_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_project_member_user FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE,
    CONSTRAINT fk_project_member_granted_by FOREIGN KEY (granted_by) REFERENCES sys_user (id),
    UNIQUE KEY uk_project_member (project_id, user_id),
    CONSTRAINT ck_project_member_role CHECK (role_code IN ('project_admin', 'editor', 'tester', 'viewer')),
    CONSTRAINT ck_project_member_status CHECK (member_status IN ('active', 'inactive')),
    KEY idx_project_member_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE module (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    name                VARCHAR(128) NOT NULL,
    module_key          VARCHAR(64) NOT NULL,
    description         TEXT,
    sort_order          INT NOT NULL DEFAULT 0,
    is_locked           TINYINT(1) NOT NULL DEFAULT 0,
    push_token          VARCHAR(128) NOT NULL,
    status              VARCHAR(16) NOT NULL DEFAULT 'active',
    created_by          BIGINT NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_module_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_module_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    UNIQUE KEY uk_module_project_key (project_id, module_key),
    UNIQUE KEY uk_module_push_token (push_token),
    CONSTRAINT ck_module_status CHECK (status IN ('active', 'archived')),
    KEY idx_module_project_sort_order (project_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE api_group (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    module_id           BIGINT NOT NULL,
    name                VARCHAR(256) NOT NULL,
    group_key           VARCHAR(128) NOT NULL,
    description         TEXT,
    author_name         VARCHAR(64),
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_api_group_module FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE,
    UNIQUE KEY uk_api_group_module_key (module_id, group_key),
    KEY idx_api_group_module_sort_order (module_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dict_group (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    group_code          VARCHAR(64) NOT NULL,
    name                VARCHAR(128) NOT NULL,
    description         TEXT,
    sort_order          INT NOT NULL DEFAULT 0,
    created_by          BIGINT NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_dict_group_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_dict_group_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    UNIQUE KEY uk_dict_group_code (project_id, group_code),
    KEY idx_dict_group_project_sort_order (project_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dict_item (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    group_id            BIGINT NOT NULL,
    item_code           VARCHAR(128) NOT NULL,
    item_value          VARCHAR(256) NOT NULL,
    label               VARCHAR(256) NOT NULL,
    description         TEXT,
    sort_order          INT NOT NULL DEFAULT 0,
    is_default          TINYINT(1) NOT NULL DEFAULT 0,
    ext_data            JSON NOT NULL DEFAULT (JSON_OBJECT()),
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_dict_item_group FOREIGN KEY (group_id) REFERENCES dict_group (id) ON DELETE CASCADE,
    UNIQUE KEY uk_dict_item_code (group_id, item_code),
    KEY idx_dict_item_group_sort_order (group_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

### 6.3 接口文档核心模型

```sql
CREATE TABLE api_endpoint (
    id                      BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id              BIGINT NOT NULL,
    module_id               BIGINT NOT NULL,
    group_id                BIGINT,
    name                    VARCHAR(256) NOT NULL,
    summary                 VARCHAR(512),
    description             TEXT,
    route_key               VARCHAR(640) NOT NULL,
    http_method             VARCHAR(16) NOT NULL,
    path                    VARCHAR(512) NOT NULL,
    content_type            VARCHAR(128),
    status                  VARCHAR(16) NOT NULL DEFAULT 'draft',
    deprecated              TINYINT(1) NOT NULL DEFAULT 0,
    source_type             VARCHAR(16) NOT NULL DEFAULT 'manual',
    version_label           VARCHAR(32),
    sort_order              INT NOT NULL DEFAULT 0,
    is_locked               TINYINT(1) NOT NULL DEFAULT 0,
    locked_by               BIGINT,
    current_revision_id     BIGINT,
    published_revision_id   BIGINT,
    created_by              BIGINT NOT NULL,
    updated_by              BIGINT NOT NULL,
    created_at              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_api_endpoint_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_api_endpoint_module FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE,
    CONSTRAINT fk_api_endpoint_group FOREIGN KEY (group_id) REFERENCES api_group (id) ON DELETE SET NULL,
    CONSTRAINT fk_api_endpoint_locked_by FOREIGN KEY (locked_by) REFERENCES sys_user (id),
    CONSTRAINT fk_api_endpoint_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    CONSTRAINT fk_api_endpoint_updated_by FOREIGN KEY (updated_by) REFERENCES sys_user (id),
    UNIQUE KEY uk_api_endpoint_route (project_id, route_key),
    CONSTRAINT ck_api_endpoint_http_method CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
    CONSTRAINT ck_api_endpoint_status CHECK (status IN ('draft', 'review', 'released', 'deprecated', 'archived')),
    CONSTRAINT ck_api_endpoint_source_type CHECK (source_type IN ('manual', 'docforge', 'import')),
    KEY idx_api_endpoint_module_sort_order (module_id, sort_order),
    KEY idx_api_endpoint_status_updated_at (status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE api_parameter (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    endpoint_id         BIGINT NOT NULL,
    parent_id           BIGINT,
    section_type        VARCHAR(16) NOT NULL,
    node_path           VARCHAR(512) NOT NULL,
    name                VARCHAR(128) NOT NULL,
    data_type           VARCHAR(64) NOT NULL,
    format_hint         VARCHAR(64),
    required            TINYINT(1) NOT NULL DEFAULT 0,
    array_item_type     VARCHAR(64),
    description         TEXT,
    example_value       TEXT,
    default_value       TEXT,
    enum_group_id       BIGINT,
    max_length          INT,
    precision_value     INT,
    scale_value         INT,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_api_parameter_endpoint FOREIGN KEY (endpoint_id) REFERENCES api_endpoint (id) ON DELETE CASCADE,
    CONSTRAINT fk_api_parameter_parent FOREIGN KEY (parent_id) REFERENCES api_parameter (id) ON DELETE CASCADE,
    CONSTRAINT fk_api_parameter_enum_group FOREIGN KEY (enum_group_id) REFERENCES dict_group (id) ON DELETE SET NULL,
    CONSTRAINT ck_api_parameter_section_type CHECK (section_type IN ('path', 'query', 'header', 'cookie', 'body')),
    UNIQUE KEY uk_api_parameter_node (endpoint_id, section_type, node_path),
    KEY idx_api_parameter_endpoint_section_sort (endpoint_id, section_type, sort_order),
    KEY idx_api_parameter_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE api_response (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    endpoint_id         BIGINT NOT NULL,
    parent_id           BIGINT,
    http_status_code    INT NOT NULL DEFAULT 200,
    media_type          VARCHAR(128) NOT NULL DEFAULT 'application/json',
    node_path           VARCHAR(512) NOT NULL,
    name                VARCHAR(128),
    data_type           VARCHAR(64) NOT NULL,
    format_hint         VARCHAR(64),
    required            TINYINT(1) NOT NULL DEFAULT 0,
    description         TEXT,
    example_value       TEXT,
    enum_group_id       BIGINT,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_api_response_endpoint FOREIGN KEY (endpoint_id) REFERENCES api_endpoint (id) ON DELETE CASCADE,
    CONSTRAINT fk_api_response_parent FOREIGN KEY (parent_id) REFERENCES api_response (id) ON DELETE CASCADE,
    CONSTRAINT fk_api_response_enum_group FOREIGN KEY (enum_group_id) REFERENCES dict_group (id) ON DELETE SET NULL,
    UNIQUE KEY uk_api_response_node (endpoint_id, http_status_code, media_type, node_path),
    KEY idx_api_response_endpoint_status_sort (endpoint_id, http_status_code, sort_order),
    KEY idx_api_response_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE api_version (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    endpoint_id         BIGINT NOT NULL,
    revision_no         INT NOT NULL,
    version_label       VARCHAR(64),
    snapshot_data       JSON NOT NULL,
    revision_hash       VARCHAR(64) NOT NULL,
    change_summary      TEXT,
    source_commit_id    VARCHAR(64),
    source_branch       VARCHAR(128),
    source_type         VARCHAR(16) NOT NULL DEFAULT 'manual',
    is_published        TINYINT(1) NOT NULL DEFAULT 0,
    operator_id         BIGINT NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_api_version_endpoint FOREIGN KEY (endpoint_id) REFERENCES api_endpoint (id) ON DELETE CASCADE,
    CONSTRAINT fk_api_version_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id),
    UNIQUE KEY uk_api_version_endpoint_revision (endpoint_id, revision_no),
    UNIQUE KEY uk_api_version_endpoint_hash (endpoint_id, revision_hash),
    CONSTRAINT ck_api_version_source_type CHECK (source_type IN ('manual', 'docforge', 'import')),
    KEY idx_api_version_endpoint_created_at (endpoint_id, created_at),
    KEY idx_api_version_published (endpoint_id, is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE module_version_tag (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    module_id           BIGINT NOT NULL,
    tag_name            VARCHAR(64) NOT NULL,
    description         TEXT,
    snapshot_data       JSON NOT NULL,
    release_notes       TEXT,
    source_commit_id    VARCHAR(64),
    created_by          BIGINT NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_module_version_tag_module FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE,
    CONSTRAINT fk_module_version_tag_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    UNIQUE KEY uk_module_version_tag (module_id, tag_name),
    KEY idx_module_version_tag_module_created_at (module_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE environment (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    name                VARCHAR(64) NOT NULL,
    env_code            VARCHAR(32) NOT NULL,
    base_url            VARCHAR(512) NOT NULL,
    global_headers      JSON NOT NULL DEFAULT (JSON_OBJECT()),
    global_params       JSON NOT NULL DEFAULT (JSON_OBJECT()),
    variables           JSON NOT NULL DEFAULT (JSON_OBJECT()),
    is_default          TINYINT(1) NOT NULL DEFAULT 0,
    sort_order          INT NOT NULL DEFAULT 0,
    created_by          BIGINT NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_environment_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_environment_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    UNIQUE KEY uk_environment_name (project_id, name),
    UNIQUE KEY uk_environment_code (project_id, env_code),
    KEY idx_environment_project_default (project_id, is_default),
    KEY idx_environment_project_sort_order (project_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE environment_secret (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    environment_id      BIGINT NOT NULL,
    key_name            VARCHAR(128) NOT NULL,
    secret_ciphertext   TEXT NOT NULL,
    key_version         VARCHAR(32) NOT NULL DEFAULT 'v1',
    created_by          BIGINT NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_environment_secret_environment FOREIGN KEY (environment_id) REFERENCES environment (id) ON DELETE CASCADE,
    CONSTRAINT fk_environment_secret_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    UNIQUE KEY uk_environment_secret_key (environment_id, key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

### 6.4 首版主交付与增强路径（Mock、调试、审计、文档推送与分享）

以下表属于首版主交付或首版增强路径：

- `mock_rule`
- `mock_publish_snapshot`
- `debug_history`
- `doc_push_record`
- `share_link`
- `audit_log`

```sql
CREATE TABLE mock_rule (
    id                      BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    endpoint_id             BIGINT NOT NULL,
    rule_name               VARCHAR(128) NOT NULL,
    match_condition         JSON NOT NULL DEFAULT (JSON_OBJECT()),
    response_status_code    INT NOT NULL DEFAULT 200,
    response_headers        JSON NOT NULL DEFAULT (JSON_OBJECT()),
    response_body           TEXT NOT NULL,
    delay_ms                INT NOT NULL DEFAULT 0,
    weight_value            INT NOT NULL DEFAULT 1,
    priority_value          INT NOT NULL DEFAULT 100,
    scenario_code           VARCHAR(64),
    is_enabled              TINYINT(1) NOT NULL DEFAULT 1,
    created_by              BIGINT NOT NULL,
    created_at              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_mock_rule_endpoint FOREIGN KEY (endpoint_id) REFERENCES api_endpoint (id) ON DELETE CASCADE,
    CONSTRAINT fk_mock_rule_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    CONSTRAINT ck_mock_rule_delay_ms CHECK (delay_ms >= 0),
    CONSTRAINT ck_mock_rule_weight_value CHECK (weight_value > 0),
    KEY idx_mock_rule_endpoint_enabled_priority (endpoint_id, is_enabled, priority_value, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE mock_publish_snapshot (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    module_id           BIGINT,
    version_tag         VARCHAR(64) NOT NULL,
    snapshot_data       JSON NOT NULL,
    published_by        BIGINT NOT NULL,
    published_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_mock_publish_snapshot_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_mock_publish_snapshot_module FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE,
    CONSTRAINT fk_mock_publish_snapshot_published_by FOREIGN KEY (published_by) REFERENCES sys_user (id),
    KEY idx_mock_publish_snapshot_project_published_at (project_id, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE debug_history (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    endpoint_id         BIGINT,
    environment_id      BIGINT,
    executed_by         BIGINT NOT NULL,
    request_snapshot    JSON NOT NULL DEFAULT (JSON_OBJECT()),
    response_snapshot   JSON NOT NULL DEFAULT (JSON_OBJECT()),
    status_code         INT,
    duration_ms         BIGINT NOT NULL DEFAULT 0,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_debug_history_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_debug_history_endpoint FOREIGN KEY (endpoint_id) REFERENCES api_endpoint (id) ON DELETE SET NULL,
    CONSTRAINT fk_debug_history_environment FOREIGN KEY (environment_id) REFERENCES environment (id) ON DELETE SET NULL,
    CONSTRAINT fk_debug_history_executed_by FOREIGN KEY (executed_by) REFERENCES sys_user (id),
    KEY idx_debug_history_project_created_at (project_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE doc_push_record (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    module_id           BIGINT,
    request_id          VARCHAR(64) NOT NULL,
    payload_hash        VARCHAR(64) NOT NULL,
    source_commit_id    VARCHAR(64),
    source_branch       VARCHAR(128),
    source_tool         VARCHAR(32) NOT NULL DEFAULT 'docforge',
    push_status         VARCHAR(16) NOT NULL DEFAULT 'received',
    error_message       TEXT,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_doc_push_record_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_push_record_module FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE SET NULL,
    UNIQUE KEY uk_doc_push_record_request_id (request_id),
    CONSTRAINT ck_doc_push_record_status CHECK (push_status IN ('received', 'processing', 'success', 'failed')),
    KEY idx_doc_push_record_project_created_at (project_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE share_link (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    resource_type       VARCHAR(16) NOT NULL,
    resource_id         BIGINT NOT NULL,
    token               VARCHAR(128) NOT NULL,
    access_scope        VARCHAR(16) NOT NULL DEFAULT 'read',
    password_hash       VARCHAR(255),
    expire_at           DATETIME(3),
    status              VARCHAR(16) NOT NULL DEFAULT 'active',
    created_by          BIGINT NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_share_link_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    UNIQUE KEY uk_share_link_token (token),
    CONSTRAINT ck_share_link_resource_type CHECK (resource_type IN ('project', 'module', 'endpoint')),
    CONSTRAINT ck_share_link_scope CHECK (access_scope IN ('read')),
    CONSTRAINT ck_share_link_status CHECK (status IN ('active', 'expired', 'revoked')),
    KEY idx_share_link_expire_at (expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_log (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT,
    user_id             BIGINT,
    action_code         VARCHAR(64) NOT NULL,
    resource_type       VARCHAR(32) NOT NULL,
    resource_id         BIGINT,
    ip_address          VARCHAR(64),
    detail_data         JSON NOT NULL DEFAULT (JSON_OBJECT()),
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_audit_log_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE SET NULL,
    KEY idx_audit_log_project_created_at (project_id, created_at),
    KEY idx_audit_log_user_created_at (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

```

### 6.5 二期预留能力模型（测试与 AI）

以下表保留给二期能力，不属于首版主交付范围：

- `test_suite`
- `test_case`
- `test_step`
- `test_execution`
- `test_step_result`
- `ai_task`

```sql
CREATE TABLE test_suite (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    env_id              BIGINT,
    name                VARCHAR(128) NOT NULL,
    description         TEXT,
    run_mode            VARCHAR(16) NOT NULL DEFAULT 'manual',
    cron_expr           VARCHAR(64),
    status              VARCHAR(16) NOT NULL DEFAULT 'active',
    created_by          BIGINT NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_test_suite_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_test_suite_env FOREIGN KEY (env_id) REFERENCES environment (id) ON DELETE SET NULL,
    CONSTRAINT fk_test_suite_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    CONSTRAINT ck_test_suite_run_mode CHECK (run_mode IN ('manual', 'schedule', 'webhook', 'ci')),
    CONSTRAINT ck_test_suite_status CHECK (status IN ('active', 'disabled')),
    KEY idx_test_suite_project_status (project_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE test_case (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    suite_id            BIGINT NOT NULL,
    name                VARCHAR(128) NOT NULL,
    description         TEXT,
    sort_order          INT NOT NULL DEFAULT 0,
    stop_on_failure     TINYINT(1) NOT NULL DEFAULT 1,
    enabled             TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_test_case_suite FOREIGN KEY (suite_id) REFERENCES test_suite (id) ON DELETE CASCADE,
    KEY idx_test_case_suite_sort_order (suite_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE test_step (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    case_id             BIGINT NOT NULL,
    endpoint_id         BIGINT,
    step_no             INT NOT NULL,
    name                VARCHAR(128) NOT NULL,
    method              VARCHAR(16) NOT NULL,
    url                 VARCHAR(512) NOT NULL,
    request_headers     JSON NOT NULL DEFAULT (JSON_OBJECT()),
    request_query       JSON NOT NULL DEFAULT (JSON_OBJECT()),
    request_body        TEXT,
    pre_script          TEXT,
    post_script         TEXT,
    assertions          JSON NOT NULL DEFAULT (JSON_ARRAY()),
    extractors          JSON NOT NULL DEFAULT (JSON_ARRAY()),
    timeout_ms          INT NOT NULL DEFAULT 10000,
    enabled             TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_test_step_case FOREIGN KEY (case_id) REFERENCES test_case (id) ON DELETE CASCADE,
    CONSTRAINT fk_test_step_endpoint FOREIGN KEY (endpoint_id) REFERENCES api_endpoint (id) ON DELETE SET NULL,
    UNIQUE KEY uk_test_step_case_step_no (case_id, step_no),
    CONSTRAINT ck_test_step_method CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
    KEY idx_test_step_endpoint_id (endpoint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE test_execution (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    suite_id            BIGINT NOT NULL,
    trigger_type        VARCHAR(16) NOT NULL DEFAULT 'manual',
    status              VARCHAR(16) NOT NULL,
    total_cases         INT NOT NULL DEFAULT 0,
    passed_cases        INT NOT NULL DEFAULT 0,
    failed_cases        INT NOT NULL DEFAULT 0,
    duration_ms         BIGINT NOT NULL DEFAULT 0,
    report_data         JSON NOT NULL DEFAULT (JSON_OBJECT()),
    triggered_by        BIGINT,
    started_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    finished_at         DATETIME(3),
    CONSTRAINT fk_test_execution_suite FOREIGN KEY (suite_id) REFERENCES test_suite (id) ON DELETE CASCADE,
    CONSTRAINT fk_test_execution_triggered_by FOREIGN KEY (triggered_by) REFERENCES sys_user (id),
    CONSTRAINT ck_test_execution_trigger_type CHECK (trigger_type IN ('manual', 'schedule', 'webhook', 'ci')),
    CONSTRAINT ck_test_execution_status CHECK (status IN ('queued', 'running', 'passed', 'failed', 'error', 'cancelled')),
    KEY idx_test_execution_suite_started_at (suite_id, started_at),
    KEY idx_test_execution_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE test_step_result (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    execution_id        BIGINT NOT NULL,
    case_id             BIGINT NOT NULL,
    step_id             BIGINT NOT NULL,
    status              VARCHAR(16) NOT NULL,
    duration_ms         BIGINT NOT NULL DEFAULT 0,
    request_snapshot    JSON NOT NULL DEFAULT (JSON_OBJECT()),
    response_snapshot   JSON NOT NULL DEFAULT (JSON_OBJECT()),
    assertion_result    JSON NOT NULL DEFAULT (JSON_ARRAY()),
    error_message       TEXT,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_test_step_result_execution FOREIGN KEY (execution_id) REFERENCES test_execution (id) ON DELETE CASCADE,
    CONSTRAINT fk_test_step_result_case FOREIGN KEY (case_id) REFERENCES test_case (id) ON DELETE CASCADE,
    CONSTRAINT fk_test_step_result_step FOREIGN KEY (step_id) REFERENCES test_step (id) ON DELETE CASCADE,
    CONSTRAINT ck_test_step_result_status CHECK (status IN ('passed', 'failed', 'error', 'skipped')),
    KEY idx_test_step_result_execution_case_step (execution_id, case_id, step_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ai_task (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    endpoint_id         BIGINT,
    task_type           VARCHAR(32) NOT NULL,
    provider_name       VARCHAR(32) NOT NULL,
    model_name          VARCHAR(64) NOT NULL,
    task_status         VARCHAR(16) NOT NULL DEFAULT 'queued',
    input_payload       JSON NOT NULL DEFAULT (JSON_OBJECT()),
    output_payload      JSON NOT NULL DEFAULT (JSON_OBJECT()),
    token_usage         INT NOT NULL DEFAULT 0,
    cost_amount         DECIMAL(18,6) NOT NULL DEFAULT 0,
    created_by          BIGINT NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_ai_task_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_task_endpoint FOREIGN KEY (endpoint_id) REFERENCES api_endpoint (id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_task_created_by FOREIGN KEY (created_by) REFERENCES sys_user (id),
    CONSTRAINT ck_ai_task_type CHECK (task_type IN ('description', 'mock_data', 'test_case', 'impact_analysis', 'rag_qa', 'code_example')),
    CONSTRAINT ck_ai_task_status CHECK (task_status IN ('queued', 'running', 'success', 'failed', 'cancelled')),
    KEY idx_ai_task_project_type_created_at (project_id, task_type, created_at),
    KEY idx_ai_task_status (task_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

```

说明：首版仅依赖 MySQL 8。下面的示例 DDL 依赖 MySQL 8.0.16+ 的 `CHECK` 约束与表达式默认值能力；全文搜索默认使用 MySQL 基础检索能力，OpenSearch 是可选增强。

## 7. 核心 RESTful API 清单

接口统一遵循以下约定：

- 基础前缀：`/api/v1`
- 统一响应体：成功 / 失败都返回同一外层结构
- 分页约定：请求使用 `page` / `pageSize`，响应使用 `PageResult<T>`
- 幂等约定：对创建、发布、推送等写操作支持幂等键
- 鉴权方式：`Bearer + Refresh` 用于浏览端 / 控制台，`DocForge HMAC` 用于推送，`share token` 用于公开访问

统一响应体示例：

```json
{
  "code": 0,
  "message": "OK",
  "data": {},
  "traceId": "f2f6c1..."
}
```

错误响应可简写为：

```json
{ "code": 40001, "message": "Business error" }
```

### 7.1 认证 auth

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/auth/login` | POST | `username`、`password` | `ApiResponse<LoginResult>` | 控制台登录 |
| `/api/v1/auth/refresh` | POST | `refreshToken` | `ApiResponse<TokenPair>` | 刷新访问令牌 |
| `/api/v1/auth/logout` | POST | `refreshToken` | `ApiResponse<Void>` | 注销会话 |
| `/api/v1/auth/me` | GET | Bearer Token | `ApiResponse<CurrentUser>` | 获取当前用户 |

### 7.2 空间 / 项目 spaces/projects

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/spaces` | GET | `page`、`pageSize`、`keyword` | `PageResult<SpaceVO>` | 空间列表 |
| `/api/v1/spaces` | POST | `name`、`spaceKey`、`visibility` | `ApiResponse<SpaceVO>` | 新建空间 |
| `/api/v1/spaces/{spaceId}/projects` | GET | `page`、`pageSize`、`keyword` | `PageResult<ProjectVO>` | 空间下项目列表 |
| `/api/v1/projects` | POST | `spaceId`、`name`、`projectKey` | `ApiResponse<ProjectVO>` | 新建项目 |
| `/api/v1/projects/{projectId}` | GET | `projectId` | `ApiResponse<ProjectDetailVO>` | 项目详情 |
| `/api/v1/projects/{projectId}` | PATCH | `name`、`description`、`visibility` | `ApiResponse<ProjectVO>` | 更新项目 |
| `/api/v1/projects/{projectId}/members` | GET | `page`、`pageSize` | `PageResult<ProjectMemberVO>` | 项目成员 |

### 7.3 模块 / 分组 / 接口 modules/groups/endpoints

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/projects/{projectId}/modules` | GET | `page`、`pageSize`、`keyword` | `PageResult<ModuleVO>` | 模块列表 |
| `/api/v1/projects/{projectId}/modules` | POST | `name`、`moduleKey`、`sortOrder` | `ApiResponse<ModuleVO>` | 新建模块 |
| `/api/v1/modules/{moduleId}/groups` | GET | `page`、`pageSize` | `PageResult<ApiGroupVO>` | 分组列表 |
| `/api/v1/modules/{moduleId}/groups` | POST | `name`、`groupKey`、`sortOrder` | `ApiResponse<ApiGroupVO>` | 新建分组 |
| `/api/v1/groups/{groupId}/endpoints` | GET | `page`、`pageSize`、`keyword` | `PageResult<ApiEndpointVO>` | 接口列表 |
| `/api/v1/groups/{groupId}/endpoints` | POST | `name`、`path`、`method`、`summary` | `ApiResponse<ApiEndpointVO>` | 新建接口 |
| `/api/v1/endpoints/{endpointId}` | GET | `endpointId` | `ApiResponse<ApiEndpointDetailVO>` | 接口详情 |
| `/api/v1/endpoints/{endpointId}` | PATCH | `name`、`summary`、`description`、`status` | `ApiResponse<ApiEndpointVO>` | 更新接口 |

### 7.4 版本与发布 versions / module-version-tags / diff

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/endpoints/{endpointId}/versions` | GET | `page`、`pageSize` | `PageResult<ApiVersionVO>` | 接口版本列表 |
| `/api/v1/endpoints/{endpointId}/versions` | POST | `changeSummary`、`snapshot`、`idempotencyKey` | `ApiResponse<ApiVersionVO>` | 保存版本快照 |
| `/api/v1/endpoints/{endpointId}/versions/{versionId}` | GET | `endpointId`、`versionId` | `ApiResponse<ApiVersionVO>` | 版本详情 |
| `/api/v1/endpoints/{endpointId}/diff` | GET | `fromVersionId`、`toVersionId` | `ApiResponse<ApiDiffVO>` | 版本差异 |
| `/api/v1/projects/{projectId}/module-version-tags` | GET | `page`、`pageSize` | `PageResult<ModuleVersionTagVO>` | 模块发布标签 |
| `/api/v1/projects/{projectId}/module-version-tags` | POST | `moduleId`、`versionLabel`、`snapshot` | `ApiResponse<ModuleVersionTagVO>` | 创建模块版本标签 |
| `/api/v1/module-version-tags/{tagId}/publish` | POST | `tagId`、`idempotencyKey` | `ApiResponse<PublishResult>` | 发布模块版本 |

### 7.5 字典 dict-groups / dict-items

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/projects/{projectId}/dict-groups` | GET | `page`、`pageSize`、`keyword` | `PageResult<DictGroupVO>` | 字典组列表 |
| `/api/v1/projects/{projectId}/dict-groups` | POST | `groupCode`、`name`、`sortOrder` | `ApiResponse<DictGroupVO>` | 新建字典组 |
| `/api/v1/dict-groups/{groupId}/items` | GET | `page`、`pageSize` | `PageResult<DictItemVO>` | 字典项列表 |
| `/api/v1/dict-groups/{groupId}/items` | POST | `itemCode`、`itemValue`、`label` | `ApiResponse<DictItemVO>` | 新建字典项 |

### 7.6 环境 environments

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/projects/{projectId}/environments` | GET | `page`、`pageSize` | `PageResult<EnvironmentVO>` | 环境列表 |
| `/api/v1/projects/{projectId}/environments` | POST | `name`、`envKey`、`baseUrl` | `ApiResponse<EnvironmentVO>` | 新建环境 |
| `/api/v1/environments/{envId}` | PATCH | `name`、`baseUrl`、`description` | `ApiResponse<EnvironmentVO>` | 更新环境 |
| `/api/v1/environments/{envId}/secrets` | PUT | `secretKey`、`secretValue` | `ApiResponse<Void>` | 保存环境密钥 |

### 7.7 调试 debug

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/debug/preview` | POST | `endpointId`、`environmentId`、`overrides` | `ApiResponse<DebugPreviewVO>` | 预览调试请求 |
| `/api/v1/debug/execute` | POST | `endpointId`、`environmentId`、`requestOverride` | `ApiResponse<DebugResultVO>` | 执行调试 |
| `/api/v1/debug/history` | GET | `page`、`pageSize`、`endpointId` | `PageResult<DebugHistoryVO>` | 调试历史 |
| `/api/v1/debug/history/{historyId}` | GET | `historyId` | `ApiResponse<DebugHistoryVO>` | 历史详情 |

### 7.8 Mock mock

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/mock/rules` | GET | `page`、`pageSize`、`endpointId` | `PageResult<MockRuleVO>` | 规则列表 |
| `/api/v1/mock/rules` | POST | `endpointId`、`ruleName`、`matchCondition` | `ApiResponse<MockRuleVO>` | 新建规则 |
| `/api/v1/mock/rules/{ruleId}` | PATCH | `ruleName`、`matchCondition`、`isEnabled` | `ApiResponse<MockRuleVO>` | 更新规则 |
| `/api/v1/mock/publish` | POST | `projectId`、`moduleId`、`idempotencyKey` | `ApiResponse<PublishResult>` | 发布 Mock |
| `/api/v1/mock/runtime/{token}` | ALL | `token` | 原始 HTTP 响应 | 运行时命中入口 |

### 7.9 分享 share-links / public / share/{token}

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/share-links` | POST | `resourceType`、`resourceId`、`expireAt` | `ApiResponse<ShareLinkVO>` | 创建分享链接 |
| `/api/v1/share-links/{linkId}` | DELETE | `linkId` | `ApiResponse<Void>` | 撤销分享链接 |
| `/public/share/{token}` | GET | `token`、`password` | `HTML / JSON` | 浏览端公开访问 |
| `/api/v1/public/share/{token}` | GET | `token` | `ApiResponse<ShareTargetVO>` | 分享目标信息 |

### 7.10 DocForge 集成 integrations/docforge/push

| 接口路径 | 方法 | 关键参数 | 响应 | 说明 |
| --- | --- | --- | --- | --- |
| `/api/v1/integrations/docforge/push` | POST | `HMAC Header`、`Idempotency-Key`、`payload` | `ApiResponse<PushResult>` | 接收 DocForge 推送 |
| `/api/v1/integrations/docforge/push/{requestId}` | GET | `requestId` | `ApiResponse<DocPushRecordVO>` | 查询推送记录 |

## 8. DocForge / ApiHub 服务边界

DocForge 是源码分析与变更识别侧，ApiHub 是文档协作与运行时交付侧。前者负责“发现变化”，后者负责“承载变化”。

### 8.1 职责对照

| 能力 | DocForge | ApiHub | 说明 |
| --- | --- | --- | --- |
| 多语言源码分析 | 负责 | 不负责 | DocForge 识别源码与注解、ApiHub 不解析源码真相源 |
| API 提取 | 负责 | 不负责 | DocForge 从代码生成待推送的 API 结构 |
| 变更检测 | 负责 | 不负责 | DocForge 识别新增、删除、修改与兼容性变化 |
| 推送引擎 | 负责 | 不负责 | DocForge 负责签名推送、重试和投递 |
| 文档存储 | 不负责 | 负责 | ApiHub 持久化 endpoint、schema、version、diff |
| 协作管理 | 不负责 | 负责 | ApiHub 负责空间、项目、权限和成员协作 |
| 版本快照 | 不负责 | 负责 | ApiHub 负责生成、查询与回滚版本快照 |
| 浏览端 | 不负责 | 负责 | ApiHub 负责分享访问和只读浏览 UI |
| 调试 | 不负责 | 负责 | ApiHub 负责请求构造、执行和历史记录 |
| Mock | 不负责 | 负责 | ApiHub 负责规则、发布和运行时命中 |
| 权限 | 不负责 | 负责 | ApiHub 负责登录、成员和资源权限 |
| 长期存储 | 不负责 | 负责 | DocForge 不承载长期业务事实存储 |

### 8.2 交互协议

- 推送地址：`POST /api/v1/integrations/docforge/push`
- 请求 Header：
  - `X-DocForge-App`
  - `X-DocForge-Timestamp`
  - `X-DocForge-Signature`
  - `Idempotency-Key`
- 签名方式：`HMAC-SHA256`
- 重放保护：时间戳窗口校验 + 幂等键去重
- 响应语义：
  - `200`：接收成功或已幂等接受
  - `4xx`：鉴权失败、签名失败、参数错误、时间戳过期
  - `5xx`：服务端处理失败，DocForge 可按策略重试

推送 JSON 示例：

```json
{
  "projectKey": "payments",
  "moduleKey": "gateway",
  "sourceCommit": "a1b2c3d4",
  "sourceBranch": "main",
  "sourceLanguage": "java",
  "apis": [
    {
      "method": "GET",
      "path": "/api/v1/orders/{id}",
      "name": "订单详情",
      "group": "order",
      "schema": {
        "request": {
          "path": [
            { "name": "id", "type": "string", "required": true }
          ]
        },
        "response": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "status": { "type": "string" }
          }
        }
      },
      "versionHint": "1.2.0"
    }
  ]
}
```

### 8.3 处理时序

1. DocForge 完成源码扫描、API 提取和变更检测
2. DocForge 生成推送载荷并签名
3. DocForge 推送到 ApiHub
4. ApiHub 验签、做时间戳窗口检查和幂等校验
5. ApiHub 入库 endpoint、schema、version、diff 和推送记录
6. ApiHub 触发审计、缓存失效和提交后本地回调
7. ApiHub 返回接收结果，DocForge 记录投递状态

### 8.4 边界原则

- DocForge 不负责长期存储和浏览 UI
- DocForge 不负责把推送结果当作最终业务事实源
- ApiHub 不负责源码解析的真相源
- ApiHub 以接收到的推送载荷和自身持久化记录为交付事实
- 若源码与推送内容冲突，以 DocForge 的推送载荷和 ApiHub 的版本快照为准，不回溯到浏览 UI

## 9. 实施方案

首版交付标准是本节的验收中心，其他小节只保留必要摘要，避免重复。

### 9.0 首版交付标准

首版最终产品必须满足以下可验收条目：

- 控制台必须支持 `项目 -> 模块 -> 分组 -> 接口 -> 版本` 的树形导航
- 支持接口搜索、快速定位、定位后联动展开树节点
- 接口详情页必须具备编辑 / 预览双态切换，且版本视图可只读
- 模块、分组、接口三层都能排序和组织
- 官网 / 浏览端 / 控制台统一设计语言，视觉完成度明确高于当前 prototype
- `prototype/` 只是参考起点，不是交付上限
- 项目首页必须提供项目概览、最近更新、工作区入口和快捷导航
- 接口编辑页必须支持基础信息、请求参数、响应结构、版本切换与保存
- 调试页必须支持请求构造、环境切换、执行结果和历史回看
- Mock 页必须支持规则管理、启停、排序、发布与命中查看
- 文档浏览页必须支持分享访问、接口树浏览和只读内容查看

下文统一使用以下术语：

- **最终产品**：api-hub 的完整交付形态
- **浏览端**：面向查看和分享的只读访问形态
- **控制台**：面向登录用户的管理与编辑工作台

### 9.1 服务拆分方案

首版采用“前后端分离 + 模块化单体”结构，先把运行时收敛到最小可交付闭环，再为二期扩展预留边界。

- `apihub-web`：Next.js 应用，承载官网、分享页、文档浏览页、控制台
- `apihub-server`：Spring Boot 模块化单体，统一承载认证、项目、接口、环境、调试、Mock、审计等后端能力
- 可选增强：独立 `mock` / `runner` / `ai-worker` / `indexer-worker`
- 首版运行时只启用 `web + server + mysql + nginx`

拆分原则：

- 浏览端和控制台共享同一套 Web 运行时与设计系统，避免重复实现
- 后端按领域模块拆分代码，不先拆分部署单元，确保首版部署简单
- Mock、Runner、AI、Indexer 先以独立能力边界存在，首版默认不要求独立进程
- 任何可选组件都只能增强能力，不能成为主流程的硬依赖

### 9.2 代码目录

推荐目录骨架如下：

```text
apps/
  web/
    app/
    components/
    features/
    lib/
    styles/
packages/
  ui/
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
```

目录职责如下：

- `apps/web`：承载最终产品的前端应用，包含官网、分享页、文档浏览页和控制台
- `apps/web/app`：路由入口，按场景拆分页面与布局
- `apps/web/components`：页面级和复用型组件
- `apps/web/features`：按业务场景组织控制台能力，例如分组管理、模块组织、接口树导航、调试面板、环境面板
- `apps/web/lib`：前端通用工具、数据适配、请求封装
- `apps/web/styles`：全局样式、主题变量、布局和动效约束
- `packages/ui`：设计系统与基础 UI 组件，控制最终产品的统一视觉语言
- `packages/api-sdk`：面向前端的类型安全 API SDK，封装请求、响应、错误和 DTO 映射
- `packages/config`：共享配置、lint、tsconfig、环境常量和构建约定
- `services/apihub-server/src/main/java/com/apihub/common`：通用基础设施、返回体、异常、审计、工具方法和公共约束
- `services/apihub-server/src/main/java/com/apihub/auth`：认证、会话、权限与登录态相关代码
- `services/apihub-server/src/main/java/com/apihub/space`：空间与成员管理
- `services/apihub-server/src/main/java/com/apihub/project`：项目、模块、分组等组织层元数据与结构管理
- `services/apihub-server/src/main/java/com/apihub/doc`：endpoint 内容、schema、version、diff、push integration、发布后的浏览读模型
- `services/apihub-server/src/main/java/com/apihub/dict`：字典组、字典项与运行时可配置枚举
- `services/apihub-server/src/main/java/com/apihub/env`：环境、密钥、变量模板与环境选择
- `services/apihub-server/src/main/java/com/apihub/debug`：调试请求构建、执行与结果记录
- `services/apihub-server/src/main/java/com/apihub/mock`：Mock 规则、Mock 运行时和发布快照

控制台的信息架构以 `7.0` 首版交付标准为准，重点围绕分组管理、模块组织和接口树导航展开。

### 9.3 核心类职责

核心类按“控制器负责入口，服务负责业务规则，运行时服务负责执行”划分。每个类都只做自己那层该做的事。

| 类 / 服务 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| `AuthController` | 登录、登出、刷新会话、获取当前用户信息 | 不负责密码校验细节、权限判定、审计落库 |
| `AuthService` | 认证流程编排、会话签发、登录态解析 | 不负责 HTTP 参数绑定、页面跳转、权限资源树构建 |
| `CurrentUserResolver` | 从会话、Token 或请求上下文中解析当前用户与基础身份信息 | 不负责登录流程发起、权限计算、用户资料写库 |
| `PermissionService` | 计算用户在空间、项目、模块、接口上的权限 | 不负责登录、用户资料维护、前端菜单渲染 |
| `ProjectController` | 项目 CRUD、项目概览、项目级入口 | 不负责权限算法、接口 Diff、Mock 执行 |
| `ProjectService` | 项目创建、更新、查询、归档、项目树与项目聚合 | 不负责直接解析请求身份、模块级权限、接口 Schema 校验 |
| `ProjectMemberService` | 项目成员增删改查、角色分配、成员状态维护 | 不负责空间成员管理、登录认证、项目内容编辑 |
| `ModuleService` | 模块元数据、排序、锁定、模块层组织聚合 | 不负责项目级权限、接口内容编辑、版本发布 |
| `ApiGroupService` | 分组元数据、排序、分组树组织与聚合 | 不负责接口 Schema 校验、版本 Diff、浏览端渲染 |
| `ModuleController` | 模块 CRUD、模块排序、模块锁定状态管理 | 不负责接口请求执行、版本合并、环境密钥 |
| `ApiGroupController` | 接口分组 CRUD、排序、分组树维护 | 不负责版本发布、请求调试、文档推送 |
| `ApiEndpointController` | 接口定义 CRUD、接口树节点维护、接口基础信息维护 | 不负责 JSON Schema 推导、Diff 计算、运行时 Mock 命中 |
| `ApiSchemaController` | 请求 / 响应 Schema 的保存、读取、校验 | 不负责接口列表编排、发布流程、调试执行 |
| `ApiVersionController` | 版本列表、版本详情、版本发布入口、版本回滚入口 | 不负责生成差异本身、解析请求模板、运行 Mock |
| `DictController` | 字典组、字典项的 CRUD、排序、启停与查询 | 不负责接口发布、调试执行、环境密钥管理 |
| `DictService` | 字典数据聚合、默认项管理、运行时枚举查询 | 不负责页面渲染、权限判定、Mock 规则匹配 |
| `EnvironmentController` | 环境 CRUD、环境变量入口、环境密钥入口、环境切换入口 | 不负责密钥明文处理、请求执行、版本发布 |
| `ApiEndpointService` | 接口实体聚合、树结构维护、基础校验、变更编排 | 不负责直接操作 HTTP 响应、也不直接处理缓存失效策略 |
| `ApiSchemaService` | Schema 规范化、校验、快照读写、结构兼容性基础检查 | 不负责 UI 展示、权限判定、版本发布按钮行为 |
| `ApiVersionService` | 版本快照生成、版本落库、版本查询 | 不负责手写 Diff 算法、请求执行、Mock 命中 |
| `ApiDiffService` | 计算接口版本差异、生成可读变更摘要 | 不负责版本发布落库、权限校验、调试执行 |
| `DocPushService` | 接收 DocForge 推送、解析推送载荷、写入推送记录、触发接口更新 | 不负责浏览端渲染、人工编辑 UI、版本最终发布决策 |
| `DocReadModelService` | 生成发布后的浏览读模型、按版本汇总 endpoint 内容、schema 与 diff | 不负责接口编辑、权限计算、调试执行 |
| `EnvironmentService` | 环境 CRUD、环境切换、环境变量编排 | 不负责密钥明文输出、调试执行细节、接口树导航 |
| `EnvironmentSecretService` | 环境密钥保存、加密、脱敏、读取授权控制 | 不负责环境切换、接口定义、Mock 规则匹配 |
| `DebugController` | 调试页入口、调试请求提交、结果查询、历史查看入口 | 不负责模板解析、请求执行、调试历史持久化 |
| `DebugService` | 调试请求编排、变量替换、请求执行、结果记录 | 不负责接口设计、版本发布、浏览端分享链接 |
| `DebugHistoryService` | 调试历史分页查询、详情查询、结果归档 | 不负责请求执行、模板生成、环境变量合并 |
| `RequestTemplateResolver` | 解析请求模板、合并环境变量、路径参数、Header 和 Body 占位符 | 不负责网络调用、UI 交互、权限计算 |
| `MockRuleController` | Mock 规则入口、规则 CRUD、规则启停与排序控制 | 不负责规则匹配执行、请求回包组装、发布快照生成 |
| `MockRuleService` | Mock 规则 CRUD、优先级、权重、启停管理 | 不负责实际请求执行、文档浏览、版本差异计算 |
| `MockRuntimeService` | Mock 命中匹配、响应组装、延迟注入、运行时回包 | 不负责规则编辑、发布入口、页面展示 |
| `MockPublishController` | Mock 发布入口、发布确认、发布记录查询 | 不负责规则匹配、响应执行、浏览端文档渲染 |
| `AuditLogService` | 记录关键操作、资源变更、调试和发布行为 | 不负责业务决策、页面渲染、权限授予 |
| `BaseEntity` | 提供通用主键、创建时间、更新时间、软删除或审计字段基类能力 | 不负责业务字段建模、查询拼装、权限逻辑 |
| `ApiResponse<T>` | 统一接口返回包装、成功失败标记、数据载体与错误信息格式 | 不负责业务规则、分页计算、异常判定本身 |
| `BusinessException` | 表达可预期的业务失败、承载错误码与提示信息 | 不负责日志采集、HTTP 路由、重试策略 |
| `PageQuery` / `PageResult<T>` | 封装分页入参与分页出参、页码、页大小、总数和列表结果 | 不负责具体查询实现、排序规则、权限过滤 |
| `OperationContext` | 携带当前操作的用户、空间、项目、请求来源和追踪信息 | 不负责认证签发、业务持久化、页面状态管理 |

### 9.4 消息流

首版所有触发都采用“同步事务 + 提交后本地应用事件 / 本地回调”完成，不依赖 MQ。消息流先按这个单机边界设计，确保没有 RabbitMQ 也能完整运行。

#### 9.4.0 单机事件边界

| 动作 | 首版实现方式 | 未来可升级点 |
| --- | --- | --- |
| DocForge 推送状态流转 | 事务内写入 `doc_push_record` 和相关内容变更，提交后本地更新处理结果 | 可升级为消息队列驱动的异步流水线 |
| 发布后浏览端切换 | 事务内落库发布快照，提交后本地刷新浏览读模型 | 可升级为事件总线或异步读模型构建 |
| Mock 生效 | 事务内保存规则和发布记录，提交后本地刷新运行时缓存 | 可升级为独立 Mock worker 和分布式缓存同步 |
| 缓存失效 | 事务提交后本地逐项失效 Caffeine 缓存 | 可升级为 Redis 通知或分布式失效广播 |
| 审计落库 | 事务内或提交后本地写入审计记录，保持与主操作同源 | 可升级为统一审计事件流 |

#### 9.4.1 人工维护接口

1. 控制台提交接口创建或编辑请求
2. `ApiEndpointController` 接收参数并做基础校验
3. `ApiEndpointService` 写入接口、分组、Schema 快照相关数据
4. 触发 `AuditLogService` 记录变更
5. 失效项目、模块、接口树缓存
6. 控制台刷新接口树与详情

#### 9.4.2 DocForge 推送

1. DocForge 以推送接口提交接口定义
2. `DocPushService` 校验请求幂等性、来源和载荷哈希
3. 解析出模块、分组、接口与 Schema 变更
4. 进入“接收中/处理中/成功/失败”的推送记录
5. 同步更新接口定义和文档组织结构
6. 记录审计日志并更新浏览端可见内容

#### 9.4.3 接口发布

1. 控制台选择接口版本或模块版本
2. `ApiVersionService` 生成发布快照
3. `ApiDiffService` 展示变更摘要，供用户确认
4. 发布快照写入数据库
5. 触发 Mock 运行时和浏览端文档视图切换到新版本
6. 记录发布审计和回滚点

#### 9.4.4 调试执行

1. 控制台发起调试请求
2. `DebugService` 读取接口定义、环境变量、密钥和请求模板
3. `RequestTemplateResolver` 生成最终请求
4. 执行真实请求或预定义执行器
5. 保存调试历史、响应快照和耗时
6. 返回可复用的调试结果

#### 9.4.5 Mock 命中

1. 请求进入 Mock 入口
2. `MockRuntimeService` 按接口、场景、优先级和权重匹配规则
3. 命中后组装响应体、响应头和延迟
4. 返回 Mock 响应并记录命中轨迹
5. 未命中时返回明确的未匹配结果，便于排查规则

### 9.5 缓存策略

首版缓存策略必须满足“单机可运行、无 Redis 可用、可逐步增强”。

- 首版默认使用 `Caffeine`
- 没有 `Redis` 也必须能跑，所有主流程不能依赖分布式缓存
- `Redis` 仅作为二级缓存增强，不是首版硬依赖
- 本地缓存优先覆盖高频、低变更数据，例如权限树、项目树、接口树、环境模板和字典
- 写操作完成后立即做本地缓存失效，避免浏览端和控制台看到旧数据
- 版本发布、接口修改、环境更新、Mock 规则变更都要显式触发缓存失效
- 如果后续引入 Redis，优先做跨节点一致性增强，而不是把首版逻辑改成强依赖 Redis

推荐缓存分层：

- **L1**：进程内 `Caffeine`，承担首版主缓存
- **L2**：可选 `Redis`，只做增强，不参与首版正确性兜底
- **源数据**：MySQL，永远是最终事实来源

### 9.6 迭代排期

#### Phase 1：MVP 基础闭环

目标：

- 打通最终产品最小闭环
- 实现登录、空间、项目、模块、接口、文档浏览、调试、环境、审计的基础流程
- 浏览端可读，控制台可编辑，主流程不依赖 Redis / RabbitMQ / OpenSearch / MinIO
- 前端质量高于当前 prototype，并补齐分组管理与更完整的控制台信息架构
- 完成 `项目 -> 模块 -> 分组 -> 接口 -> 版本` 的树形导航、搜索与联动展开
- 完成接口详情页编辑 / 预览双态切换，版本视图只读
- 完成模块、分组、接口三层排序和组织
- 项目首页、接口编辑页、调试页、Mock 页、文档浏览页达到可交付状态

验收标准：

- `web + server + mysql + nginx` 可独立启动
- 控制台可完成项目、模块、分组、接口、版本的树形导航和联动定位
- 控制台可对项目、模块、分组、接口进行搜索、展开和快速定位
- 接口详情页支持编辑 / 预览双态切换，版本视图仅只读
- 模块、分组、接口三层均支持排序和组织
- 官网 / 浏览端 / 控制台统一设计语言，视觉完成度明确高于当前 prototype
- 项目首页、接口编辑页、调试页、Mock 页、文档浏览页均有明确的交付口径
- 浏览端能按分享链接查看文档
- 调试页能执行真实请求并保存历史
- DDL 和首版数据模型可以支撑主流程

#### Phase 2：Mock 与发布增强

目标：

- 强化接口版本发布与回滚体验
- 建立 Mock 规则管理、发布和运行时命中闭环
- 完善 DocForge 推送接入与幂等处理

验收标准：

- Mock 规则可配置优先级、权重、启停和场景
- 发布后能生成稳定快照并影响浏览端和 Mock 行为
- DocForge 推送能驱动接口更新并留下完整记录

#### Phase 3：体验与性能增强

目标：

- 让浏览端与控制台的体验明显高于当前 prototype
- 继续补强分组管理、模块组织、接口树导航与快速定位
- 优化首屏、树加载、详情切换和调试链路性能
- 让信息架构更完整，减少用户在项目内的查找成本

验收标准：

- 控制台信息架构清晰，接口树、分组、模块之间的跳转流畅
- 常用列表和树结构具备稳定缓存和增量刷新能力
- 页面交互、动效、排版、响应式表现明显优于当前 prototype
- 调试、发布、Mock、环境切换的联动路径清晰且可用

#### Phase 4：二期预留能力

目标：

- 为测试编排、AI 能力、独立 runner、独立 indexer 预留清晰边界
- 让后续能力可以按独立模块或独立服务演进
- 不破坏首版单机优先和模块化单体的部署假设

验收标准：

- 预留表、预留接口和预留服务边界已写清楚
- 二期能力的接入点不影响首版主流程
- 未来拆分 worker 或独立服务时，控制面和数据面边界明确


