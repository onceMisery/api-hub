# api-hub

api-hub ��һ������ API ��ơ��ĵ���������ԡ�Mock �Ͱ汾����ĵ�������ƽ̨��

## 1. ��������

��ǰʵ�ֻ����� **MySQL-first��single-node-first**��

- **MySQL 8 ��Ψһ��ѡ������ʩ**
- **Redis��RabbitMQ��OpenSearch��MinIO ���ǿ�ѡ��ǿ���**
- Ĭ�ϲ�����̬Ϊ **Nginx + Next.js + Spring Boot + MySQL**
- �װ����к�����·�����ڲ�������ѡ���������¶�������
- AI ����Ա���Ϊ����Ԥ����������װ���������Χ

## 2. ǰ��ʵ�ַ���

ǰ��ͳһ���ã�

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `Framer Motion`

ǰ�����ê���� **����ɶȿ�Ƭ��**������ȷ�Ŀ�Ƭ��Ρ���ͷֲ㡢�ᶯЧ�͸��ߵ��Ӿ����¶ȣ�������̨����Ϊ�˷�������Ч�ʡ�

## 3. prototype �����ղ�Ʒ

`prototype/` ֻ�ṩҳ��ְ��ͽ�������ο�������ҳ��ṹ���Ӿ���һ��һ���̡�

���ղ�Ʒ��Ҫ���Ӿ������̶ȡ���Ϣ��֯����ɶ������Ը��ڵ�ǰ prototype��ͬʱ������ְ�𻮷�˼·��

- `LandingPage`���������ҳ������Ʒ��չʾ��������㡢CTA ����
- `DocBrowserPage`��������ĵ�ҳ������ӿ��������ֻ���ĵ��鿴���������
- `ConsoleDashboard`������̨��ҳ��������Ŀ������������¡������ں͹��������
- `ApiEditorPage`���ӿڱ༭ҳ������ӿڻ�����Ϣ�������������Ӧ�ṹ���汾�༭
- `DebugPage`������ҳ�����������졢����ִ�С���Ӧ���ʹ���λ
- `EnvironmentPage`������ҳ�����𻷾���������Կ�������л������в�������
- `VersionPage`���汾ҳ������汾�б��Diff���������ع�����ʷ׷��
- `MockPage`��Mock ҳ������ Mock ������������������ʱ��Ϊ����

## 4. ����̨Ҫ��

����̨���� prototype �ľ�̬���̣���ʽ�汾���벹�� prototype ��ȱʧ�����������ұ��ָ�Ч�ʲ������飺

- �������
- ģ����֯
- �ӿ�������
- �ӿ���������ٶ�λ
- ҳ���ڱ༭ / Ԥ���л�
- �汾�����ԡ�Mock������֮���������ת

## 5. ����Լ��

- Ĭ�ϲ������� Redis��RabbitMQ��OpenSearch��MinIO Ҳ�����������
- MySQL 8 �е����к������ݳ־û�
- Nginx ����ͳһ��ںͷ������
- ����ˡ�����̨�͹�������ͬһ��������ԣ��������ܶ��벼�ֲ���Ҫ����������

## 6. ���ݿ� DDL

### 6.1 ���˵��

- ���� MySQL 8 ����
- ҵ������ͳһʹ�� `BIGINT NOT NULL AUTO_INCREMENT`
- ʱ��ͳһʹ�� `DATETIME(3)`
- ���ա����򡢱���ȷ�ǿ�ṹ������ʹ�� `JSON`
- ���Ľ�ģ��ʽΪ����ǰʵ�� + ��ʷ���ա�

### 6.2 �����û����ռ䡢��Ŀ��ģ�����ֵ�ģ��

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
    UNIQUE KEY uk_space_member (space_id, user_id),
    CONSTRAINT ck_space_member_role CHECK (role_code IN ('space_admin', 'project_admin', 'editor', 'tester', 'viewer')),
    CONSTRAINT ck_space_member_status CHECK (member_status IN ('active', 'inactive')),
    KEY idx_space_member_user_id (user_id),
    KEY idx_space_member_invited_by (invited_by)
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
    UNIQUE KEY uk_project_space_key (space_id, project_key),
    CONSTRAINT ck_project_protocol_type CHECK (protocol_type IN ('http', 'grpc', 'dubbo', 'websocket')),
    CONSTRAINT ck_project_visibility CHECK (visibility IN ('private', 'internal', 'public')),
    CONSTRAINT ck_project_status CHECK (status IN ('active', 'archived')),
    KEY idx_project_space_id (space_id),
    KEY idx_project_status (status),
    KEY idx_project_owner_id (owner_id)
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
    UNIQUE KEY uk_project_member (project_id, user_id),
    CONSTRAINT ck_project_member_role CHECK (role_code IN ('project_admin', 'editor', 'tester', 'viewer')),
    CONSTRAINT ck_project_member_status CHECK (member_status IN ('active', 'inactive')),
    KEY idx_project_member_user_id (user_id),
    KEY idx_project_member_granted_by (granted_by)
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
    UNIQUE KEY uk_module_project_key (project_id, module_key),
    UNIQUE KEY uk_module_push_token (push_token),
    CONSTRAINT ck_module_status CHECK (status IN ('active', 'archived')),
    KEY idx_module_project_sort_order (project_id, sort_order),
    KEY idx_module_created_by (created_by)
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
    UNIQUE KEY uk_dict_group_code (project_id, group_code),
    KEY idx_dict_group_project_sort_order (project_id, sort_order),
    KEY idx_dict_group_created_by (created_by)
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
    UNIQUE KEY uk_dict_item_code (group_id, item_code),
    KEY idx_dict_item_group_sort_order (group_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

### 6.3 �ӿ��ĵ�����ģ��

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
    UNIQUE KEY uk_api_endpoint_route (project_id, route_key),
    CONSTRAINT ck_api_endpoint_http_method CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
    CONSTRAINT ck_api_endpoint_status CHECK (status IN ('draft', 'review', 'released', 'deprecated', 'archived')),
    CONSTRAINT ck_api_endpoint_source_type CHECK (source_type IN ('manual', 'docforge', 'import')),
    KEY idx_api_endpoint_module_sort_order (module_id, sort_order),
    KEY idx_api_endpoint_status_updated_at (status, updated_at),
    KEY idx_api_endpoint_group_id (group_id),
    KEY idx_api_endpoint_locked_by (locked_by),
    KEY idx_api_endpoint_created_by (created_by),
    KEY idx_api_endpoint_updated_by (updated_by)
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
    CONSTRAINT ck_api_parameter_section_type CHECK (section_type IN ('path', 'query', 'header', 'cookie', 'body')),
    UNIQUE KEY uk_api_parameter_node (endpoint_id, section_type, node_path),
    KEY idx_api_parameter_endpoint_section_sort (endpoint_id, section_type, sort_order),
    KEY idx_api_parameter_parent_id (parent_id),
    KEY idx_api_parameter_enum_group_id (enum_group_id)
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
    UNIQUE KEY uk_api_response_node (endpoint_id, http_status_code, media_type, node_path),
    KEY idx_api_response_endpoint_status_sort (endpoint_id, http_status_code, sort_order),
    KEY idx_api_response_parent_id (parent_id),
    KEY idx_api_response_enum_group_id (enum_group_id)
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
    UNIQUE KEY uk_api_version_endpoint_revision (endpoint_id, revision_no),
    UNIQUE KEY uk_api_version_endpoint_hash (endpoint_id, revision_hash),
    CONSTRAINT ck_api_version_source_type CHECK (source_type IN ('manual', 'docforge', 'import')),
    KEY idx_api_version_endpoint_created_at (endpoint_id, created_at),
    KEY idx_api_version_published (endpoint_id, is_published),
    KEY idx_api_version_operator_id (operator_id)
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
    UNIQUE KEY uk_module_version_tag (module_id, tag_name),
    KEY idx_module_version_tag_module_created_at (module_id, created_at),
    KEY idx_module_version_tag_created_by (created_by)
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
    UNIQUE KEY uk_environment_name (project_id, name),
    UNIQUE KEY uk_environment_code (project_id, env_code),
    KEY idx_environment_project_default (project_id, is_default),
    KEY idx_environment_project_sort_order (project_id, sort_order),
    KEY idx_environment_created_by (created_by)
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
    UNIQUE KEY uk_environment_secret_key (environment_id, key_name),
    KEY idx_environment_secret_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

### 6.4 �װ�����������ǿ·����Mock�����ԡ���ơ��ĵ�����������

���±������װ����������װ���ǿ·����

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
    CONSTRAINT ck_mock_rule_delay_ms CHECK (delay_ms >= 0),
    CONSTRAINT ck_mock_rule_weight_value CHECK (weight_value > 0),
    KEY idx_mock_rule_endpoint_enabled_priority (endpoint_id, is_enabled, priority_value, created_at),
    KEY idx_mock_rule_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE mock_publish_snapshot (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    module_id           BIGINT,
    version_tag         VARCHAR(64) NOT NULL,
    snapshot_data       JSON NOT NULL,
    published_by        BIGINT NOT NULL,
    published_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_mock_publish_snapshot_project_published_at (project_id, published_at),
    KEY idx_mock_publish_snapshot_module_id (module_id),
    KEY idx_mock_publish_snapshot_published_by (published_by)
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
    KEY idx_debug_history_project_created_at (project_id, created_at),
    KEY idx_debug_history_endpoint_id (endpoint_id),
    KEY idx_debug_history_environment_id (environment_id),
    KEY idx_debug_history_executed_by (executed_by)
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
    UNIQUE KEY uk_doc_push_record_request_id (request_id),
    CONSTRAINT ck_doc_push_record_status CHECK (push_status IN ('received', 'processing', 'success', 'failed')),
    KEY idx_doc_push_record_project_created_at (project_id, created_at),
    KEY idx_doc_push_record_module_id (module_id)
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
    UNIQUE KEY uk_share_link_token (token),
    CONSTRAINT ck_share_link_resource_type CHECK (resource_type IN ('project', 'module', 'endpoint')),
    CONSTRAINT ck_share_link_scope CHECK (access_scope IN ('read')),
    CONSTRAINT ck_share_link_status CHECK (status IN ('active', 'expired', 'revoked')),
    KEY idx_share_link_expire_at (expire_at),
    KEY idx_share_link_created_by (created_by)
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
    KEY idx_audit_log_project_created_at (project_id, created_at),
    KEY idx_audit_log_user_created_at (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

```

### 6.5 ����Ԥ������ģ�ͣ������� AI��

���±����������������������װ���������Χ��

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
    CONSTRAINT ck_test_suite_run_mode CHECK (run_mode IN ('manual', 'schedule', 'webhook', 'ci')),
    CONSTRAINT ck_test_suite_status CHECK (status IN ('active', 'disabled')),
    KEY idx_test_suite_project_status (project_id, status),
    KEY idx_test_suite_env_id (env_id),
    KEY idx_test_suite_created_by (created_by)
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
    CONSTRAINT ck_test_execution_trigger_type CHECK (trigger_type IN ('manual', 'schedule', 'webhook', 'ci')),
    CONSTRAINT ck_test_execution_status CHECK (status IN ('queued', 'running', 'passed', 'failed', 'error', 'cancelled')),
    KEY idx_test_execution_suite_started_at (suite_id, started_at),
    KEY idx_test_execution_status (status),
    KEY idx_test_execution_triggered_by (triggered_by)
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
    CONSTRAINT ck_test_step_result_status CHECK (status IN ('passed', 'failed', 'error', 'skipped')),
    KEY idx_test_step_result_execution_case_step (execution_id, case_id, step_id),
    KEY idx_test_step_result_case_id (case_id),
    KEY idx_test_step_result_step_id (step_id)
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
    CONSTRAINT ck_ai_task_type CHECK (task_type IN ('description', 'mock_data', 'test_case', 'impact_analysis', 'rag_qa', 'code_example')),
    CONSTRAINT ck_ai_task_status CHECK (task_status IN ('queued', 'running', 'success', 'failed', 'cancelled')),
    KEY idx_ai_task_project_type_created_at (project_id, task_type, created_at),
    KEY idx_ai_task_status (task_status),
    KEY idx_ai_task_endpoint_id (endpoint_id),
    KEY idx_ai_task_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

```

˵�����װ������ MySQL 8�������ʾ�� DDL ���� MySQL 8.0.16+ �� `CHECK` Լ������ʽĬ��ֵ������ȫ������Ĭ��ʹ�� MySQL ��������������OpenSearch �ǿ�ѡ��ǿ��

## 7. ���� RESTful API �嵥

�ӿ�ͳһ��ѭ����Լ����

- ����ǰ׺��`/api/v1`
- ͳһ��Ӧ�壺�ɹ� / ʧ�ܶ�����ͬһ���ṹ
- ��ҳԼ��������ʹ�� `page` / `pageSize`����Ӧʹ�� `PageResult<T>`
- �ݵ�Լ�����Դ��������������͵�д����֧���ݵȼ�
- ��Ȩ��ʽ��`Bearer + Refresh` ��������� / ����̨��`DocForge HMAC` �������ͣ�`share token` ���ڹ�������

ͳһ��Ӧ��ʾ����

```json
{
  "code": 0,
  "message": "OK",
  "data": {},
  "traceId": "f2f6c1..."
}
```

������Ӧ�ɼ�дΪ��

```json
{ "code": 40001, "message": "Business error" }
```

### 7.1 ��֤ auth

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/auth/login` | POST | `username`��`password` | `ApiResponse<LoginResult>` | ����̨��¼ |
| `/api/v1/auth/refresh` | POST | `refreshToken` | `ApiResponse<TokenPair>` | ˢ�·������� |
| `/api/v1/auth/logout` | POST | `refreshToken` | `ApiResponse<Void>` | ע���Ự |
| `/api/v1/auth/me` | GET | Bearer Token | `ApiResponse<CurrentUser>` | ��ȡ��ǰ�û� |

### 7.2 �ռ� / ��Ŀ spaces/projects

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/spaces` | GET | `page`��`pageSize`��`keyword` | `PageResult<SpaceVO>` | �ռ��б� |
| `/api/v1/spaces` | POST | `name`��`spaceKey`��`visibility` | `ApiResponse<SpaceVO>` | �½��ռ� |
| `/api/v1/spaces/{spaceId}/projects` | GET | `page`��`pageSize`��`keyword` | `PageResult<ProjectVO>` | �ռ�����Ŀ�б� |
| `/api/v1/projects` | POST | `spaceId`��`name`��`projectKey` | `ApiResponse<ProjectVO>` | �½���Ŀ |
| `/api/v1/projects/{projectId}` | GET | `projectId` | `ApiResponse<ProjectDetailVO>` | ��Ŀ���� |
| `/api/v1/projects/{projectId}` | PATCH | `name`��`description`��`visibility` | `ApiResponse<ProjectVO>` | ������Ŀ |
| `/api/v1/projects/{projectId}/members` | GET | `page`��`pageSize` | `PageResult<ProjectMemberVO>` | ��Ŀ��Ա |

### 7.3 ģ�� / ���� / �ӿ� modules/groups/endpoints

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/projects/{projectId}/modules` | GET | `page`��`pageSize`��`keyword` | `PageResult<ModuleVO>` | ģ���б� |
| `/api/v1/projects/{projectId}/modules` | POST | `name`��`moduleKey`��`sortOrder` | `ApiResponse<ModuleVO>` | �½�ģ�� |
| `/api/v1/modules/{moduleId}/groups` | GET | `page`��`pageSize` | `PageResult<ApiGroupVO>` | �����б� |
| `/api/v1/modules/{moduleId}/groups` | POST | `name`��`groupKey`��`sortOrder` | `ApiResponse<ApiGroupVO>` | �½����� |
| `/api/v1/groups/{groupId}/endpoints` | GET | `page`��`pageSize`��`keyword` | `PageResult<ApiEndpointVO>` | �ӿ��б� |
| `/api/v1/groups/{groupId}/endpoints` | POST | `name`��`path`��`method`��`summary` | `ApiResponse<ApiEndpointVO>` | �½��ӿ� |
| `/api/v1/endpoints/{endpointId}` | GET | `endpointId` | `ApiResponse<ApiEndpointDetailVO>` | �ӿ����� |
| `/api/v1/endpoints/{endpointId}` | PATCH | `name`��`summary`��`description`��`status` | `ApiResponse<ApiEndpointVO>` | ���½ӿ� |

### 7.4 �汾�뷢�� versions / module-version-tags / diff

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/endpoints/{endpointId}/versions` | GET | `page`��`pageSize` | `PageResult<ApiVersionVO>` | �ӿڰ汾�б� |
| `/api/v1/endpoints/{endpointId}/versions` | POST | `changeSummary`��`snapshot`��`idempotencyKey` | `ApiResponse<ApiVersionVO>` | ����汾���� |
| `/api/v1/endpoints/{endpointId}/versions/{versionId}` | GET | `endpointId`��`versionId` | `ApiResponse<ApiVersionVO>` | �汾���� |
| `/api/v1/endpoints/{endpointId}/diff` | GET | `fromVersionId`��`toVersionId` | `ApiResponse<ApiDiffVO>` | �汾���� |
| `/api/v1/projects/{projectId}/module-version-tags` | GET | `page`��`pageSize` | `PageResult<ModuleVersionTagVO>` | ģ�鷢����ǩ |
| `/api/v1/projects/{projectId}/module-version-tags` | POST | `moduleId`��`versionLabel`��`snapshot` | `ApiResponse<ModuleVersionTagVO>` | ����ģ��汾��ǩ |
| `/api/v1/module-version-tags/{tagId}/publish` | POST | `tagId`��`idempotencyKey` | `ApiResponse<PublishResult>` | ����ģ��汾 |

### 7.5 �ֵ� dict-groups / dict-items

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/projects/{projectId}/dict-groups` | GET | `page`��`pageSize`��`keyword` | `PageResult<DictGroupVO>` | �ֵ����б� |
| `/api/v1/projects/{projectId}/dict-groups` | POST | `groupCode`��`name`��`sortOrder` | `ApiResponse<DictGroupVO>` | �½��ֵ��� |
| `/api/v1/dict-groups/{groupId}/items` | GET | `page`��`pageSize` | `PageResult<DictItemVO>` | �ֵ����б� |
| `/api/v1/dict-groups/{groupId}/items` | POST | `itemCode`��`itemValue`��`label` | `ApiResponse<DictItemVO>` | �½��ֵ��� |

### 7.6 ���� environments

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/projects/{projectId}/environments` | GET | `page`��`pageSize` | `PageResult<EnvironmentVO>` | �����б� |
| `/api/v1/projects/{projectId}/environments` | POST | `name`��`envKey`��`baseUrl` | `ApiResponse<EnvironmentVO>` | �½����� |
| `/api/v1/environments/{envId}` | PATCH | `name`��`baseUrl`��`description` | `ApiResponse<EnvironmentVO>` | ���»��� |
| `/api/v1/environments/{envId}/secrets` | PUT | `secretKey`��`secretValue` | `ApiResponse<Void>` | ���滷����Կ |

### 7.7 ���� debug

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/debug/preview` | POST | `endpointId`��`environmentId`��`overrides` | `ApiResponse<DebugPreviewVO>` | Ԥ���������� |
| `/api/v1/debug/execute` | POST | `endpointId`��`environmentId`��`requestOverride` | `ApiResponse<DebugResultVO>` | ִ�е��� |
| `/api/v1/debug/history` | GET | `page`��`pageSize`��`endpointId` | `PageResult<DebugHistoryVO>` | ������ʷ |
| `/api/v1/debug/history/{historyId}` | GET | `historyId` | `ApiResponse<DebugHistoryVO>` | ��ʷ���� |

### 7.8 Mock mock

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/mock/rules` | GET | `page`��`pageSize`��`endpointId` | `PageResult<MockRuleVO>` | �����б� |
| `/api/v1/mock/rules` | POST | `endpointId`��`ruleName`��`matchCondition` | `ApiResponse<MockRuleVO>` | �½����� |
| `/api/v1/mock/rules/{ruleId}` | PATCH | `ruleName`��`matchCondition`��`isEnabled` | `ApiResponse<MockRuleVO>` | ���¹��� |
| `/api/v1/mock/publish` | POST | `projectId`��`moduleId`��`idempotencyKey` | `ApiResponse<PublishResult>` | ���� Mock |
| `/api/v1/mock/runtime/{token}` | ALL | `token` | ԭʼ HTTP ��Ӧ | ����ʱ������� |

### 7.9 ���� share-links / public / share/{token}

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/share-links` | POST | `resourceType`��`resourceId`��`expireAt` | `ApiResponse<ShareLinkVO>` | ������������ |
| `/api/v1/share-links/{linkId}` | DELETE | `linkId` | `ApiResponse<Void>` | ������������ |
| `/public/share/{token}` | GET | `token`��`password` | `HTML / JSON` | ����˹������� |
| `/api/v1/public/share/{token}` | GET | `token` | `ApiResponse<ShareTargetVO>` | ����Ŀ����Ϣ |

### 7.10 DocForge ���� integrations/docforge/push

| �ӿ�·�� | ���� | �ؼ����� | ��Ӧ | ˵�� |
| --- | --- | --- | --- | --- |
| `/api/v1/integrations/docforge/push` | POST | `HMAC Header`��`Idempotency-Key`��`payload` | `ApiResponse<PushResult>` | ���� DocForge ���� |
| `/api/v1/integrations/docforge/push/{requestId}` | GET | `requestId` | `ApiResponse<DocPushRecordVO>` | ��ѯ���ͼ�¼ |

## 8. DocForge / ApiHub ����߽�

DocForge ��Դ���������ʶ��࣬ApiHub ���ĵ�Э��������ʱ�����ࡣǰ�߸��𡰷��ֱ仯�������߸��𡰳��ر仯����

### 8.1 ְ�����

| ���� | DocForge | ApiHub | ˵�� |
| --- | --- | --- | --- |
| ������Դ����� | ���� | ������ | DocForge ʶ��Դ����ע�⡢ApiHub ������Դ������Դ |
| API ��ȡ | ���� | ������ | DocForge �Ӵ������ɴ����͵� API �ṹ |
| ������ | ���� | ������ | DocForge ʶ��������ɾ�����޸�������Ա仯 |
| �������� | ���� | ������ | DocForge ����ǩ�����͡����Ժ�Ͷ�� |
| �ĵ��洢 | ������ | ���� | ApiHub �־û� endpoint��schema��version��diff |
| Э������ | ������ | ���� | ApiHub ����ռ䡢��Ŀ��Ȩ�޺ͳ�ԱЭ�� |
| �汾���� | ������ | ���� | ApiHub �������ɡ���ѯ��ع��汾���� |
| ����� | ������ | ���� | ApiHub ���������ʺ�ֻ����� UI |
| ���� | ������ | ���� | ApiHub ���������졢ִ�к���ʷ��¼ |
| Mock | ������ | ���� | ApiHub ������򡢷���������ʱ���� |
| Ȩ�� | ������ | ���� | ApiHub �����¼����Ա����ԴȨ�� |
| ���ڴ洢 | ������ | ���� | DocForge �����س���ҵ����ʵ�洢 |

### 8.2 ����Э��

- ���͵�ַ��`POST /api/v1/integrations/docforge/push`
- ���� Header��
  - `X-DocForge-App`
  - `X-DocForge-Timestamp`
  - `X-DocForge-Signature`
  - `Idempotency-Key`
- ǩ����ʽ��`HMAC-SHA256`
- �طű�����ʱ�������У�� + �ݵȼ�ȥ��
- ��Ӧ���壺
  - `200`�����ճɹ������ݵȽ���
  - `4xx`����Ȩʧ�ܡ�ǩ��ʧ�ܡ���������ʱ�������
  - `5xx`������˴���ʧ�ܣ�DocForge �ɰ���������

���� JSON ʾ����

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
      "name": "��������",
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

### 8.3 ����ʱ��

1. DocForge ���Դ��ɨ�衢API ��ȡ�ͱ�����
2. DocForge ���������غɲ�ǩ��
3. DocForge ���͵� ApiHub
4. ApiHub ��ǩ����ʱ������ڼ����ݵ�У��
5. ApiHub ��� endpoint��schema��version��diff �����ͼ�¼
6. ApiHub ������ơ�����ʧЧ���ύ�󱾵ػص�
7. ApiHub ���ؽ��ս����DocForge ��¼Ͷ��״̬

### 8.4 �߽�ԭ��

- DocForge �������ڴ洢����� UI
- DocForge ����������ͽ����������ҵ����ʵԴ
- ApiHub ������Դ�����������Դ
- ApiHub �Խ��յ��������غɺ�����־û���¼Ϊ������ʵ
- ��Դ�����������ݳ�ͻ���� DocForge �������غɺ� ApiHub �İ汾����Ϊ׼�������ݵ���� UI

## 9. ʵʩ����

�װ潻����׼�Ǳ��ڵ��������ģ�����С��ֻ�����ҪժҪ�������ظ���

### 9.0 �װ潻����׼

�װ����ղ�Ʒ�����������¿�������Ŀ��

- ����̨����֧�� `��Ŀ -> ģ�� -> ���� -> �ӿ� -> �汾` �����ε���
- ֧�ֽӿ����������ٶ�λ����λ������չ�����ڵ�
- �ӿ�����ҳ����߱��༭ / Ԥ��˫̬�л����Ұ汾��ͼ��ֻ��
- ģ�顢���顢�ӿ����㶼���������֯
- ���� / ����� / ����̨ͳһ������ԣ��Ӿ���ɶ���ȷ���ڵ�ǰ prototype
- `prototype/` ֻ�ǲο���㣬���ǽ�������
- ��Ŀ��ҳ�����ṩ��Ŀ������������¡���������ںͿ�ݵ���
- �ӿڱ༭ҳ����֧�ֻ�����Ϣ�������������Ӧ�ṹ���汾�л��뱣��
- ����ҳ����֧�������졢�����л���ִ�н������ʷ�ؿ�
- Mock ҳ����֧�ֹ���������ͣ�����򡢷��������в鿴
- �ĵ����ҳ����֧�ַ�����ʡ��ӿ��������ֻ�����ݲ鿴

����ͳһʹ���������

- **���ղ�Ʒ**��api-hub ������������̬
- **�����**������鿴�ͷ����ֻ��������̬
- **����̨**�������¼�û��Ĺ�����༭����̨

### 9.1 �����ַ���

�װ���á�ǰ��˷��� + ģ�黯���塱�ṹ���Ȱ�����ʱ��������С�ɽ����ջ�����Ϊ������չԤ��߽硣

- `apihub-web`��Next.js Ӧ�ã����ع���������ҳ���ĵ����ҳ������̨
- `apihub-server`��Spring Boot ģ�黯���壬ͳһ������֤����Ŀ���ӿڡ����������ԡ�Mock����ƵȺ������
- ��ѡ��ǿ������ `mock` / `runner` / `ai-worker` / `indexer-worker`
- �װ�����ʱֻ���� `web + server + mysql + nginx`

���ԭ��

- ����˺Ϳ���̨����ͬһ�� Web ����ʱ�����ϵͳ�������ظ�ʵ��
- ��˰�����ģ���ִ��룬���Ȳ�ֲ���Ԫ��ȷ���װ沿���
- Mock��Runner��AI��Indexer ���Զ��������߽���ڣ��װ�Ĭ�ϲ�Ҫ���������
- �κο�ѡ�����ֻ����ǿ���������ܳ�Ϊ�����̵�Ӳ����

### 9.2 ����Ŀ¼

�Ƽ�Ŀ¼�Ǽ����£�

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

Ŀ¼ְ�����£�

- `apps/web`���������ղ�Ʒ��ǰ��Ӧ�ã���������������ҳ���ĵ����ҳ�Ϳ���̨
- `apps/web/app`��·����ڣ����������ҳ���벼��
- `apps/web/components`��ҳ�漶�͸��������
- `apps/web/features`����ҵ�񳡾���֯����̨�����������������ģ����֯���ӿ���������������塢�������
- `apps/web/lib`��ǰ��ͨ�ù��ߡ��������䡢�����װ
- `apps/web/styles`��ȫ����ʽ��������������ֺͶ�ЧԼ��
- `packages/ui`�����ϵͳ����� UI ������������ղ�Ʒ��ͳһ�Ӿ�����
- `packages/api-sdk`������ǰ�˵����Ͱ�ȫ API SDK����װ������Ӧ������� DTO ӳ��
- `packages/config`���������á�lint��tsconfig�����������͹���Լ��
- `services/apihub-server/src/main/java/com/apihub/common`��ͨ�û�����ʩ�������塢�쳣����ơ����߷����͹���Լ��
- `services/apihub-server/src/main/java/com/apihub/auth`����֤���Ự��Ȩ�����¼̬��ش���
- `services/apihub-server/src/main/java/com/apihub/space`���ռ����Ա����
- `services/apihub-server/src/main/java/com/apihub/project`����Ŀ��ģ�顢�������֯��Ԫ������ṹ����
- `services/apihub-server/src/main/java/com/apihub/doc`��endpoint ���ݡ�schema��version��diff��push integration��������������ģ��
- `services/apihub-server/src/main/java/com/apihub/dict`���ֵ��顢�ֵ���������ʱ������ö��
- `services/apihub-server/src/main/java/com/apihub/env`����������Կ������ģ���뻷��ѡ��
- `services/apihub-server/src/main/java/com/apihub/debug`���������󹹽���ִ��������¼
- `services/apihub-server/src/main/java/com/apihub/mock`��Mock ����Mock ����ʱ�ͷ�������

����̨����Ϣ�ܹ��� `7.0` �װ潻����׼Ϊ׼���ص�Χ�Ʒ�������ģ����֯�ͽӿ�������չ����

### 9.3 ������ְ��

�����ఴ��������������ڣ�������ҵ���������ʱ������ִ�С����֡�ÿ���඼ֻ���Լ��ǲ�������¡�

| �� / ���� | ����ʲô | ������ʲô |
| --- | --- | --- |
| `AuthController` | ��¼���ǳ���ˢ�»Ự����ȡ��ǰ�û���Ϣ | ����������У��ϸ�ڡ�Ȩ���ж��������� |
| `AuthService` | ��֤���̱��š��Ựǩ������¼̬���� | ������ HTTP �����󶨡�ҳ����ת��Ȩ����Դ������ |
| `CurrentUserResolver` | �ӻỰ��Token �������������н�����ǰ�û�����������Ϣ | �������¼���̷���Ȩ�޼��㡢�û�����д�� |
| `PermissionService` | �����û��ڿռ䡢��Ŀ��ģ�顢�ӿ��ϵ�Ȩ�� | �������¼���û�����ά����ǰ�˲˵���Ⱦ |
| `ProjectController` | ��Ŀ CRUD����Ŀ��������Ŀ����� | ������Ȩ���㷨���ӿ� Diff��Mock ִ�� |
| `ProjectService` | ��Ŀ���������¡���ѯ���鵵����Ŀ������Ŀ�ۺ� | ������ֱ�ӽ���������ݡ�ģ�鼶Ȩ�ޡ��ӿ� Schema У�� |
| `ProjectMemberService` | ��Ŀ��Ա��ɾ�Ĳ顢��ɫ���䡢��Ա״̬ά�� | ������ռ��Ա�������¼��֤����Ŀ���ݱ༭ |
| `ModuleService` | ģ��Ԫ���ݡ�����������ģ�����֯�ۺ� | ��������Ŀ��Ȩ�ޡ��ӿ����ݱ༭���汾���� |
| `ApiGroupService` | ����Ԫ���ݡ����򡢷�������֯��ۺ� | ������ӿ� Schema У�顢�汾 Diff���������Ⱦ |
| `ModuleController` | ģ�� CRUD��ģ������ģ������״̬���� | ������ӿ�����ִ�С��汾�ϲ���������Կ |
| `ApiGroupController` | �ӿڷ��� CRUD�����򡢷�����ά�� | ������汾������������ԡ��ĵ����� |
| `ApiEndpointController` | �ӿڶ��� CRUD���ӿ����ڵ�ά�����ӿڻ�����Ϣά�� | ������ JSON Schema �Ƶ���Diff ���㡢����ʱ Mock ���� |
| `ApiSchemaController` | ���� / ��Ӧ Schema �ı��桢��ȡ��У�� | ������ӿ��б���š��������̡�����ִ�� |
| `ApiVersionController` | �汾�б���汾���顢�汾������ڡ��汾�ع���� | ���������ɲ��챾�����������ģ�塢���� Mock |
| `DictController` | �ֵ��顢�ֵ���� CRUD��������ͣ���ѯ | ������ӿڷ���������ִ�С�������Կ���� |
| `DictService` | �ֵ����ݾۺϡ�Ĭ������������ʱö�ٲ�ѯ | ������ҳ����Ⱦ��Ȩ���ж���Mock ����ƥ�� |
| `EnvironmentController` | ���� CRUD������������ڡ�������Կ��ڡ������л���� | ��������Կ���Ĵ��������ִ�С��汾���� |
| `ApiEndpointService` | �ӿ�ʵ��ۺϡ����ṹά��������У�顢������� | ������ֱ�Ӳ��� HTTP ��Ӧ��Ҳ��ֱ�Ӵ������ʧЧ���� |
| `ApiSchemaService` | Schema �淶����У�顢���ն�д���ṹ�����Ի������ | ������ UI չʾ��Ȩ���ж����汾������ť��Ϊ |
| `ApiVersionService` | �汾�������ɡ��汾��⡢�汾��ѯ | ��������д Diff �㷨������ִ�С�Mock ���� |
| `ApiDiffService` | ����ӿڰ汾���졢���ɿɶ����ժҪ | ������汾������⡢Ȩ��У�顢����ִ�� |
| `DocPushService` | ���� DocForge ���͡����������غɡ�д�����ͼ�¼�������ӿڸ��� | �������������Ⱦ���˹��༭ UI���汾���շ������� |
| `DocReadModelService` | ���ɷ�����������ģ�͡����汾���� endpoint ���ݡ�schema �� diff | ������ӿڱ༭��Ȩ�޼��㡢����ִ�� |
| `EnvironmentService` | ���� CRUD�������л��������������� | ��������Կ�������������ִ��ϸ�ڡ��ӿ������� |
| `EnvironmentSecretService` | ������Կ���桢���ܡ��������ȡ��Ȩ���� | �����𻷾��л����ӿڶ��塢Mock ����ƥ�� |
| `DebugController` | ����ҳ��ڡ����������ύ�������ѯ����ʷ�鿴��� | ������ģ�����������ִ�С�������ʷ�־û� |
| `DebugService` | ����������š������滻������ִ�С������¼ | ������ӿ���ơ��汾����������˷������� |
| `DebugHistoryService` | ������ʷ��ҳ��ѯ�������ѯ������鵵 | ����������ִ�С�ģ�����ɡ����������ϲ� |
| `RequestTemplateResolver` | ��������ģ�塢�ϲ�����������·��������Header �� Body ռλ�� | ������������á�UI ������Ȩ�޼��� |
| `MockRuleController` | Mock ������ڡ����� CRUD��������ͣ��������� | ���������ƥ��ִ�С�����ذ���װ�������������� |
| `MockRuleService` | Mock ���� CRUD�����ȼ���Ȩ�ء���ͣ���� | ������ʵ������ִ�С��ĵ�������汾������� |
| `MockRuntimeService` | Mock ����ƥ�䡢��Ӧ��װ���ӳ�ע�롢����ʱ�ذ� | ���������༭��������ڡ�ҳ��չʾ |
| `MockPublishController` | Mock ������ڡ�����ȷ�ϡ�������¼��ѯ | ���������ƥ�䡢��Ӧִ�С�������ĵ���Ⱦ |
| `AuditLogService` | ��¼�ؼ���������Դ��������Ժͷ�����Ϊ | ������ҵ����ߡ�ҳ����Ⱦ��Ȩ������ |
| `BaseEntity` | �ṩͨ������������ʱ�䡢����ʱ�䡢��ɾ��������ֶλ������� | ������ҵ���ֶν�ģ����ѯƴװ��Ȩ���߼� |
| `ApiResponse<T>` | ͳһ�ӿڷ��ذ�װ���ɹ�ʧ�ܱ�ǡ����������������Ϣ��ʽ | ������ҵ����򡢷�ҳ���㡢�쳣�ж����� |
| `BusinessException` | ����Ԥ�ڵ�ҵ��ʧ�ܡ����ش���������ʾ��Ϣ | ��������־�ɼ���HTTP ·�ɡ����Բ��� |
| `PageQuery` / `PageResult<T>` | ��װ��ҳ������ҳ���Ρ�ҳ�롢ҳ��С���������б��� | ����������ѯʵ�֡��������Ȩ�޹��� |
| `OperationContext` | Я����ǰ�������û����ռ䡢��Ŀ��������Դ��׷����Ϣ | ��������֤ǩ����ҵ��־û���ҳ��״̬���� |

### 9.4 ��Ϣ��

�װ����д��������á�ͬ������ + �ύ�󱾵�Ӧ���¼� / ���ػص�����ɣ������� MQ����Ϣ���Ȱ���������߽���ƣ�ȷ��û�� RabbitMQ Ҳ���������С�

#### 9.4.0 �����¼��߽�

| ���� | �װ�ʵ�ַ�ʽ | δ���������� |
| --- | --- | --- |
| DocForge ����״̬��ת | ������д�� `doc_push_record` ��������ݱ�����ύ�󱾵ظ��´����� | ������Ϊ��Ϣ�����������첽��ˮ�� |
| ������������л� | ��������ⷢ�����գ��ύ�󱾵�ˢ�������ģ�� | ������Ϊ�¼����߻��첽��ģ�͹��� |
| Mock ��Ч | �����ڱ������ͷ�����¼���ύ�󱾵�ˢ������ʱ���� | ������Ϊ���� Mock worker �ͷֲ�ʽ����ͬ�� |
| ����ʧЧ | �����ύ�󱾵�����ʧЧ Caffeine ���� | ������Ϊ Redis ֪ͨ��ֲ�ʽʧЧ�㲥 |
| ������ | �����ڻ��ύ�󱾵�д����Ƽ�¼��������������ͬԴ | ������Ϊͳһ����¼��� |

#### 9.4.1 �˹�ά���ӿ�

1. ����̨�ύ�ӿڴ�����༭����
2. `ApiEndpointController` ���ղ�����������У��
3. `ApiEndpointService` д��ӿڡ����顢Schema �����������
4. ���� `AuditLogService` ��¼���
5. ʧЧ��Ŀ��ģ�顢�ӿ�������
6. ����̨ˢ�½ӿ���������

#### 9.4.2 DocForge ����

1. DocForge �����ͽӿ��ύ�ӿڶ���
2. `DocPushService` У�������ݵ��ԡ���Դ���غɹ�ϣ
3. ������ģ�顢���顢�ӿ��� Schema ���
4. ���롰������/������/�ɹ�/ʧ�ܡ������ͼ�¼
5. ͬ�����½ӿڶ�����ĵ���֯�ṹ
6. ��¼�����־����������˿ɼ�����

#### 9.4.3 �ӿڷ���

1. ����̨ѡ��ӿڰ汾��ģ��汾
2. `ApiVersionService` ���ɷ�������
3. `ApiDiffService` չʾ���ժҪ�����û�ȷ��
4. ��������д�����ݿ�
5. ���� Mock ����ʱ��������ĵ���ͼ�л����°汾
6. ��¼������ƺͻع���

#### 9.4.4 ����ִ��

1. ����̨�����������
2. `DebugService` ��ȡ�ӿڶ��塢������������Կ������ģ��
3. `RequestTemplateResolver` ������������
4. ִ����ʵ�����Ԥ����ִ����
5. ���������ʷ����Ӧ���պͺ�ʱ
6. ���ؿɸ��õĵ��Խ��

#### 9.4.5 Mock ����

1. ������� Mock ���
2. `MockRuntimeService` ���ӿڡ����������ȼ���Ȩ��ƥ�����
3. ���к���װ��Ӧ�塢��Ӧͷ���ӳ�
4. ���� Mock ��Ӧ����¼���й켣
5. δ����ʱ������ȷ��δƥ�����������Ų����

### 9.5 �������

�װ滺����Ա������㡰���������С��� Redis ���á�������ǿ����

- �װ�Ĭ��ʹ�� `Caffeine`
- û�� `Redis` Ҳ�������ܣ����������̲��������ֲ�ʽ����
- `Redis` ����Ϊ����������ǿ�������װ�Ӳ����
- ���ػ������ȸ��Ǹ�Ƶ���ͱ�����ݣ�����Ȩ��������Ŀ�����ӿ���������ģ����ֵ�
- д������ɺ����������ػ���ʧЧ����������˺Ϳ���̨����������
- �汾�������ӿ��޸ġ��������¡�Mock ��������Ҫ��ʽ��������ʧЧ
- ����������� Redis����������ڵ�һ������ǿ�������ǰ��װ��߼��ĳ�ǿ���� Redis

�Ƽ�����ֲ㣺

- **L1**�������� `Caffeine`���е��װ�������
- **L2**����ѡ `Redis`��ֻ����ǿ���������װ���ȷ�Զ���
- **Դ����**��MySQL����Զ��������ʵ��Դ

### 9.6 ��������

#### Phase 1��MVP �����ջ�

Ŀ�꣺

- ��ͨ���ղ�Ʒ��С�ջ�
- ʵ�ֵ�¼���ռ䡢��Ŀ��ģ�顢�ӿڡ��ĵ���������ԡ���������ƵĻ�������
- ����˿ɶ�������̨�ɱ༭�������̲����� Redis / RabbitMQ / OpenSearch / MinIO
- ǰ���������ڵ�ǰ prototype����������������������Ŀ���̨��Ϣ�ܹ�
- ��� `��Ŀ -> ģ�� -> ���� -> �ӿ� -> �汾` �����ε���������������չ��
- ��ɽӿ�����ҳ�༭ / Ԥ��˫̬�л����汾��ͼֻ��
- ���ģ�顢���顢�ӿ������������֯
- ��Ŀ��ҳ���ӿڱ༭ҳ������ҳ��Mock ҳ���ĵ����ҳ�ﵽ�ɽ���״̬

���ձ�׼��

- `web + server + mysql + nginx` �ɶ������
- ����̨�������Ŀ��ģ�顢���顢�ӿڡ��汾�����ε�����������λ
- ����̨�ɶ���Ŀ��ģ�顢���顢�ӿڽ���������չ���Ϳ��ٶ�λ
- �ӿ�����ҳ֧�ֱ༭ / Ԥ��˫̬�л����汾��ͼ��ֻ��
- ģ�顢���顢�ӿ������֧���������֯
- ���� / ����� / ����̨ͳһ������ԣ��Ӿ���ɶ���ȷ���ڵ�ǰ prototype
- ��Ŀ��ҳ���ӿڱ༭ҳ������ҳ��Mock ҳ���ĵ����ҳ������ȷ�Ľ����ھ�
- ������ܰ��������Ӳ鿴�ĵ�
- ����ҳ��ִ����ʵ���󲢱�����ʷ
- DDL ���װ�����ģ�Ϳ���֧��������

#### Phase 2��Mock �뷢����ǿ

Ŀ�꣺

- ǿ���ӿڰ汾������ع�����
- ���� Mock ������������������ʱ���бջ�
- ���� DocForge ���ͽ������ݵȴ���

���ձ�׼��

- Mock ������������ȼ���Ȩ�ء���ͣ�ͳ���
- �������������ȶ����ղ�Ӱ������˺� Mock ��Ϊ
- DocForge �����������ӿڸ��²�����������¼

#### Phase 3��������������ǿ

Ŀ�꣺

- ������������̨���������Ը��ڵ�ǰ prototype
- ������ǿ��������ģ����֯���ӿ�����������ٶ�λ
- �Ż������������ء������л��͵�����·����
- ����Ϣ�ܹ��������������û�����Ŀ�ڵĲ��ҳɱ�

���ձ�׼��

- ����̨��Ϣ�ܹ��������ӿ��������顢ģ��֮�����ת����
- �����б�����ṹ�߱��ȶ����������ˢ������
- ҳ�潻������Ч���Ű桢��Ӧʽ�����������ڵ�ǰ prototype
- ���ԡ�������Mock�������л�������·�������ҿ���

#### Phase 4������Ԥ������

Ŀ�꣺

- Ϊ���Ա��š�AI ���������� runner������ indexer Ԥ�������߽�
- �ú����������԰�����ģ�����������ݽ�
- ���ƻ��װ浥�����Ⱥ�ģ�黯����Ĳ������

���ձ�׼��

- Ԥ����Ԥ��ӿں�Ԥ�����߽���д���
- ���������Ľ���㲻Ӱ���װ�������
- δ����� worker ���������ʱ���������������߽���ȷ




## 10. Phase 1 ????

???????????????????????`web + server + mysql`?

### 10.1 ??????

1. ?? MySQL

```bash
docker compose up -d mysql
```

2. ????

```bash
cd services/apihub-server
.\gradlew.bat bootRun
```

3. ????

```bash
pnpm --filter web dev
```

4. ?????

```text
http://localhost:3000/login
```

### 10.2 ????

- ????`admin`
- ???`123456`

????? `infra/mysql/002_phase1_seed.sql` ???????

### 10.3 ???????

?? Phase 1 ???????????

- ??????
- ??????
- ???????
- `?? -> ?? -> ?? -> ??` ???
- ?????????????

?????????????????????????????????????????????????????

### 10.4 Nginx ????

??????????????? `infra/nginx/default.conf`?

- `/api/*` ??? `http://host.docker.internal:8080`
- ??????? `http://host.docker.internal:3000`

?????

- ? Docker ??? Nginx ????????
- ????????????
- ?????? HTTPS??????????

???? Linux ????????`host.docker.internal` ??????????????????

### 10.5 ??????

?????

```bash
cd services/apihub-server
.\gradlew.bat clean test --tests com.apihub.auth.web.AuthControllerTest --tests com.apihub.common.web.HealthControllerTest --tests com.apihub.project.web.ProjectTreeControllerTest --tests com.apihub.common.config.ProjectSecurityTest --no-daemon
```

?????

```bash
pnpm --filter web test
pnpm --filter web build
```

???

- Gradle ?????????????? `build/test-results/test` ???????
- ???????????? `MySQL + Spring Boot + Next.js` ???
- Redis?RabbitMQ?OpenSearch?MinIO ????????????? Phase 1 ??
