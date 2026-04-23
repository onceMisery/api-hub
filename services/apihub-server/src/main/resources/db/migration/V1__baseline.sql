CREATE TABLE sys_user (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  email VARCHAR(128) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  token_version INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_sys_user_username (username),
  UNIQUE KEY uk_sys_user_email (email),
  CONSTRAINT ck_sys_user_status CHECK (status IN ('active', 'disabled', 'locked'))
);

CREATE TABLE space (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  space_key VARCHAR(64) NOT NULL,
  owner_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_space_space_key (space_key),
  CONSTRAINT ck_space_status CHECK (status IN ('active', 'archived'))
);

CREATE TABLE space_member (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  space_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role_code VARCHAR(32) NOT NULL,
  member_status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_space_member_space_user (space_id, user_id),
  CONSTRAINT ck_space_member_role CHECK (role_code IN ('space_admin', 'project_admin', 'editor', 'tester', 'viewer')),
  CONSTRAINT ck_space_member_status CHECK (member_status IN ('active', 'inactive'))
);

CREATE TABLE project (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  space_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  project_key VARCHAR(64) NOT NULL,
  description TEXT,
  debug_allowed_hosts_json JSON NOT NULL,
  owner_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_project_space_key (space_id, project_key),
  CONSTRAINT ck_project_status CHECK (status IN ('active', 'archived'))
);

CREATE TABLE project_member (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role_code VARCHAR(32) NOT NULL,
  member_status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_project_member_project_user (project_id, user_id),
  CONSTRAINT ck_project_member_role CHECK (role_code IN ('project_admin', 'editor', 'tester', 'viewer')),
  CONSTRAINT ck_project_member_status CHECK (member_status IN ('active', 'inactive'))
);

CREATE TABLE environment (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  base_url VARCHAR(512) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  variables_json JSON NOT NULL,
  default_headers_json JSON NOT NULL,
  default_query_json JSON NOT NULL,
  auth_mode VARCHAR(32) NOT NULL DEFAULT 'none',
  auth_key VARCHAR(128) NOT NULL DEFAULT '',
  auth_value VARCHAR(512) NOT NULL DEFAULT '',
  debug_host_mode VARCHAR(16) NOT NULL DEFAULT 'inherit',
  debug_allowed_hosts_json JSON NOT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_environment_project_name (project_id, name)
);

CREATE TABLE module (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  module_key VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_module_project_key (project_id, module_key)
);

CREATE TABLE api_group (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  module_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  group_key VARCHAR(128) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_api_group_module_key (module_id, group_key)
);

CREATE TABLE api_endpoint (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  module_id BIGINT NOT NULL,
  group_id BIGINT NULL,
  name VARCHAR(256) NOT NULL,
  description TEXT,
  route_key VARCHAR(640) NOT NULL,
  http_method VARCHAR(16) NOT NULL,
  path VARCHAR(512) NOT NULL,
  mock_enabled TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_api_endpoint_route (project_id, route_key),
  CONSTRAINT ck_api_endpoint_http_method CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
  CONSTRAINT ck_api_endpoint_status CHECK (status IN ('draft', 'review', 'released', 'deprecated', 'archived'))
);

CREATE TABLE api_parameter (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  parent_id BIGINT NULL,
  section_type VARCHAR(16) NOT NULL,
  node_path VARCHAR(512) NOT NULL,
  name VARCHAR(128) NOT NULL,
  data_type VARCHAR(64) NOT NULL,
  required TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT,
  example_value TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_api_parameter_node (endpoint_id, section_type, node_path),
  CONSTRAINT ck_api_parameter_section_type CHECK (section_type IN ('path', 'query', 'header', 'cookie', 'body'))
);

CREATE TABLE api_response (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  parent_id BIGINT NULL,
  http_status_code INT NOT NULL DEFAULT 200,
  media_type VARCHAR(128) NOT NULL DEFAULT 'application/json',
  node_path VARCHAR(512) NOT NULL,
  name VARCHAR(128),
  data_type VARCHAR(64) NOT NULL,
  required TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT,
  example_value TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_api_response_node (endpoint_id, http_status_code, media_type, node_path)
);

CREATE TABLE api_version (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  revision_no INT NOT NULL,
  version_label VARCHAR(64),
  snapshot_json JSON NOT NULL,
  change_summary TEXT,
  created_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_api_version_endpoint_revision (endpoint_id, revision_no)
);

CREATE TABLE mock_rule (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  rule_name VARCHAR(128) NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  query_conditions_json JSON NOT NULL,
  header_conditions_json JSON NOT NULL,
  body_conditions_json JSON NOT NULL,
  status_code INT NOT NULL DEFAULT 200,
  media_type VARCHAR(128) NOT NULL DEFAULT 'application/json',
  body_json LONGTEXT NOT NULL,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_mock_rule_endpoint_priority (endpoint_id, priority DESC, id ASC),
  KEY idx_mock_rule_created_by (created_by),
  KEY idx_mock_rule_updated_by (updated_by)
);

CREATE TABLE mock_release (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  release_no INT NOT NULL,
  response_snapshot_json JSON NOT NULL,
  rules_snapshot_json JSON NOT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_mock_release_endpoint_release_no (endpoint_id, release_no),
  KEY idx_mock_release_endpoint_created (endpoint_id, created_at DESC, id DESC),
  KEY idx_mock_release_created_by (created_by)
);

CREATE TABLE debug_history (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  environment_id BIGINT NOT NULL,
  endpoint_id BIGINT NOT NULL,
  http_method VARCHAR(16) NOT NULL,
  final_url VARCHAR(1024) NOT NULL,
  request_headers_json JSON NOT NULL,
  request_body LONGTEXT,
  response_status_code INT NOT NULL,
  response_headers_json JSON NOT NULL,
  response_body LONGTEXT,
  duration_ms BIGINT NOT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_debug_history_project_created (project_id, created_at DESC),
  KEY idx_debug_history_endpoint_created (endpoint_id, created_at DESC),
  KEY idx_debug_history_environment_created (environment_id, created_at DESC),
  KEY idx_debug_history_created_by_created (created_by, created_at DESC)
);

INSERT INTO sys_user (
  id,
  username,
  display_name,
  email,
  password_hash,
  token_version,
  status
) VALUES
  (
    1,
    'admin',
    'Administrator',
    'admin@local.dev',
    '$2a$10$BLC1/e86okc.PIgoGzqZve3f8Jb.CgJLuViQp38UaEkjenuh9VUYO',
    0,
    'active'
  ),
  (
    2,
    'viewer',
    'Viewer User',
    'viewer@local.dev',
    '$2a$10$BLC1/e86okc.PIgoGzqZve3f8Jb.CgJLuViQp38UaEkjenuh9VUYO',
    0,
    'active'
  ),
  (
    3,
    'editor',
    'Editor User',
    'editor@local.dev',
    '$2a$10$BLC1/e86okc.PIgoGzqZve3f8Jb.CgJLuViQp38UaEkjenuh9VUYO',
    0,
    'active'
  ),
  (
    4,
    'tester',
    'Tester User',
    'tester@local.dev',
    '$2a$10$BLC1/e86okc.PIgoGzqZve3f8Jb.CgJLuViQp38UaEkjenuh9VUYO',
    0,
    'active'
  ),
  (
    5,
    'member-admin',
    'Member Admin',
    'member-admin@local.dev',
    '$2a$10$BLC1/e86okc.PIgoGzqZve3f8Jb.CgJLuViQp38UaEkjenuh9VUYO',
    0,
    'active'
  )
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  token_version = VALUES(token_version),
  status = VALUES(status);

INSERT INTO space (
  id,
  name,
  space_key,
  owner_id,
  status
) VALUES (
  1,
  'Default Space',
  'default',
  1,
  'active'
) ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  owner_id = VALUES(owner_id),
  status = VALUES(status);

INSERT INTO space_member (
  id,
  space_id,
  user_id,
  role_code,
  member_status
) VALUES (
  1,
  1,
  1,
  'space_admin',
  'active'
) ON DUPLICATE KEY UPDATE
  space_id = VALUES(space_id),
  user_id = VALUES(user_id),
  role_code = VALUES(role_code),
  member_status = VALUES(member_status);

INSERT INTO project (
  id,
  space_id,
  name,
  project_key,
  description,
  debug_allowed_hosts_json,
  owner_id,
  status
) VALUES (
  1,
  1,
  'Default Project',
  'default',
  'Seed project for phase 1 workbench',
  JSON_ARRAY(),
  1,
  'active'
) ON DUPLICATE KEY UPDATE
  space_id = VALUES(space_id),
  name = VALUES(name),
  description = VALUES(description),
  debug_allowed_hosts_json = VALUES(debug_allowed_hosts_json),
  owner_id = VALUES(owner_id),
  status = VALUES(status);

INSERT INTO project_member (
  id,
  project_id,
  user_id,
  role_code,
  member_status
) VALUES
  (
    1,
    1,
    1,
    'project_admin',
    'active'
  ),
  (
    2,
    1,
    2,
    'viewer',
    'active'
  ),
  (
    3,
    1,
    3,
    'editor',
    'active'
  ),
  (
    4,
    1,
    4,
    'tester',
    'active'
  )
ON DUPLICATE KEY UPDATE
  project_id = VALUES(project_id),
  user_id = VALUES(user_id),
  role_code = VALUES(role_code),
  member_status = VALUES(member_status);

INSERT INTO environment (
  id,
  project_id,
  name,
  base_url,
  is_default,
  variables_json,
  default_headers_json,
  default_query_json,
  auth_mode,
  auth_key,
  auth_value,
  debug_host_mode,
  debug_allowed_hosts_json,
  created_by
) VALUES (
  1,
  1,
  'Local',
  'https://local.dev',
  1,
  JSON_ARRAY(),
  JSON_ARRAY(),
  JSON_ARRAY(),
  'none',
  '',
  '',
  'inherit',
  JSON_ARRAY(),
  1
) ON DUPLICATE KEY UPDATE
  project_id = VALUES(project_id),
  name = VALUES(name),
  base_url = VALUES(base_url),
  is_default = VALUES(is_default),
  variables_json = VALUES(variables_json),
  default_headers_json = VALUES(default_headers_json),
  default_query_json = VALUES(default_query_json),
  auth_mode = VALUES(auth_mode),
  auth_key = VALUES(auth_key),
  auth_value = VALUES(auth_value),
  debug_host_mode = VALUES(debug_host_mode),
  debug_allowed_hosts_json = VALUES(debug_allowed_hosts_json),
  created_by = VALUES(created_by);

INSERT INTO module (
  id,
  project_id,
  name,
  module_key,
  sort_order,
  created_by
) VALUES (
  1,
  1,
  'Core',
  'core-1',
  0,
  1
) ON DUPLICATE KEY UPDATE
  project_id = VALUES(project_id),
  name = VALUES(name),
  sort_order = VALUES(sort_order),
  created_by = VALUES(created_by);

INSERT INTO api_group (
  id,
  module_id,
  name,
  group_key,
  sort_order,
  created_by
) VALUES (
  1,
  1,
  'User APIs',
  'user-apis-1',
  0,
  1
) ON DUPLICATE KEY UPDATE
  module_id = VALUES(module_id),
  name = VALUES(name),
  sort_order = VALUES(sort_order),
  created_by = VALUES(created_by);

INSERT INTO api_endpoint (
  id,
  project_id,
  module_id,
  group_id,
  name,
  description,
  route_key,
  http_method,
  path,
  mock_enabled,
  status,
  sort_order,
  created_by,
  updated_by
) VALUES (
  1,
  1,
  1,
  1,
  'Get User',
  'Seed endpoint for project workbench',
  'GET:/users/{id}',
  'GET',
  '/users/{id}',
  1,
  'draft',
  0,
  1,
  1
) ON DUPLICATE KEY UPDATE
  project_id = VALUES(project_id),
  module_id = VALUES(module_id),
  group_id = VALUES(group_id),
  name = VALUES(name),
  description = VALUES(description),
  route_key = VALUES(route_key),
  http_method = VALUES(http_method),
  path = VALUES(path),
  mock_enabled = VALUES(mock_enabled),
  status = VALUES(status),
  sort_order = VALUES(sort_order),
  created_by = VALUES(created_by),
  updated_by = VALUES(updated_by);

INSERT INTO api_version (
  id,
  endpoint_id,
  revision_no,
  version_label,
  snapshot_json,
  change_summary,
  created_by
) VALUES (
  1,
  1,
  1,
  'v1',
  JSON_OBJECT('path', '/users/{id}', 'method', 'GET'),
  'Initial seed version',
  1
) ON DUPLICATE KEY UPDATE
  endpoint_id = VALUES(endpoint_id),
  version_label = VALUES(version_label),
  snapshot_json = VALUES(snapshot_json),
  change_summary = VALUES(change_summary),
  created_by = VALUES(created_by);

ALTER TABLE api_endpoint
    ADD COLUMN released_version_id BIGINT NULL,
    ADD COLUMN released_at DATETIME(3) NULL;

ALTER TABLE project
    ADD COLUMN mock_access_mode VARCHAR(16) NOT NULL DEFAULT 'private',
    ADD COLUMN mock_access_token VARCHAR(96) NOT NULL DEFAULT '';

UPDATE project
SET mock_access_token = REPLACE(UUID(), '-', '')
WHERE mock_access_token = '';

CREATE TABLE project_share_link (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    share_code VARCHAR(96) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    expires_at DATETIME(3) NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_project_share_link_share_code (share_code),
    KEY idx_project_share_link_project_created (project_id, created_at DESC, id DESC)
);

CREATE TABLE test_suite (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    KEY idx_test_suite_project_updated (project_id, updated_at DESC, id DESC)
);

CREATE TABLE test_step (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    suite_id BIGINT NOT NULL,
    endpoint_id BIGINT NOT NULL,
    environment_id BIGINT NOT NULL,
    step_order INT NOT NULL DEFAULT 0,
    name VARCHAR(128) NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    query_string TEXT NULL,
    request_headers_json JSON NOT NULL,
    request_body LONGTEXT NULL,
    assertions_json JSON NOT NULL,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    KEY idx_test_step_suite_order (suite_id, step_order, id)
);

CREATE TABLE test_execution (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    suite_id BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL,
    total_steps INT NOT NULL DEFAULT 0,
    passed_steps INT NOT NULL DEFAULT 0,
    failed_steps INT NOT NULL DEFAULT 0,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    report_json JSON NOT NULL,
    executed_by BIGINT NOT NULL,
    executed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_test_execution_suite_executed (suite_id, executed_at DESC, id DESC),
    CONSTRAINT ck_test_execution_status CHECK (status IN ('passed', 'failed', 'error'))
);

ALTER TABLE test_step
    ADD COLUMN extractors_json JSON NOT NULL AFTER assertions_json;

CREATE TABLE test_suite_trigger (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    suite_id BIGINT NOT NULL,
    name VARCHAR(128) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    token_prefix VARCHAR(16) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_triggered_at DATETIME(3) NULL,
    last_execution_id BIGINT NULL,
    UNIQUE KEY uk_test_suite_trigger_token_hash (token_hash),
    KEY idx_test_suite_trigger_suite_created (suite_id, created_at DESC, id DESC)
);

CREATE TABLE test_suite_schedule (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    suite_id BIGINT NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    interval_minutes INT NOT NULL DEFAULT 60,
    next_run_at DATETIME(3) NULL,
    last_run_at DATETIME(3) NULL,
    last_execution_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_test_suite_schedule_suite_id (suite_id),
    KEY idx_test_suite_schedule_next_run (enabled, next_run_at, id)
);

ALTER TABLE test_execution
    ADD COLUMN execution_source VARCHAR(16) NOT NULL DEFAULT 'manual' AFTER status,
    ADD COLUMN trigger_id BIGINT NULL AFTER execution_source,
    ADD COLUMN schedule_id BIGINT NULL AFTER trigger_id;

CREATE INDEX idx_test_execution_source_executed
    ON test_execution (execution_source, executed_at DESC, id DESC);

ALTER TABLE project
    ADD COLUMN doc_push_enabled TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN doc_push_token VARCHAR(96) NOT NULL DEFAULT '';

UPDATE project
SET doc_push_token = REPLACE(UUID(), '-', '')
WHERE doc_push_token = '';

ALTER TABLE mock_rule
    ADD COLUMN delay_ms INT NOT NULL DEFAULT 0 AFTER body_json,
    ADD COLUMN template_mode VARCHAR(16) NOT NULL DEFAULT 'plain' AFTER delay_ms;

CREATE TABLE module_version_tag (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    module_id BIGINT NOT NULL,
    tag_name VARCHAR(64) NOT NULL,
    description TEXT,
    snapshot_json JSON NOT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_module_version_tag_module_name (module_id, tag_name),
    KEY idx_module_version_tag_module_created (module_id, created_at DESC, id DESC)
);

CREATE TABLE dict_group (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

CREATE TABLE dict_item (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT NOT NULL,
    code VARCHAR(128) NOT NULL,
    item_value VARCHAR(256) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

CREATE TABLE error_code (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    code VARCHAR(128) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    solution TEXT,
    http_status INT NULL,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

ALTER TABLE test_step
    ADD COLUMN pre_script LONGTEXT NULL AFTER request_body,
    ADD COLUMN post_script LONGTEXT NULL AFTER pre_script;

CREATE TABLE audit_log (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id BIGINT NULL,
    resource_name VARCHAR(255) NULL,
    detail_json JSON NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_audit_log_project_created (project_id, created_at DESC, id DESC),
    KEY idx_audit_log_resource (resource_type, resource_id, created_at DESC)
);

CREATE TABLE project_webhook (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  target_url VARCHAR(1024) NOT NULL,
  secret_token VARCHAR(255) NOT NULL DEFAULT '',
  event_types_json JSON NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_project_webhook_project_enabled (project_id, enabled, id),
  KEY idx_project_webhook_created_by (created_by),
  KEY idx_project_webhook_updated_by (updated_by)
);

CREATE TABLE webhook_delivery (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  webhook_id BIGINT NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  target_url VARCHAR(1024) NOT NULL,
  delivery_status VARCHAR(16) NOT NULL,
  response_status INT NULL,
  duration_ms BIGINT NOT NULL DEFAULT 0,
  payload_json LONGTEXT NOT NULL,
  response_body LONGTEXT NULL,
  error_message VARCHAR(1024) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_webhook_delivery_project_created (project_id, created_at DESC, id DESC),
  KEY idx_webhook_delivery_webhook_created (webhook_id, created_at DESC, id DESC),
  CONSTRAINT ck_webhook_delivery_status CHECK (delivery_status IN ('success', 'failed'))
);

CREATE TABLE ai_setting (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    provider_type VARCHAR(64) NOT NULL DEFAULT 'openai_compatible',
    base_url VARCHAR(255) NOT NULL,
    api_key VARCHAR(512) NOT NULL,
    default_model VARCHAR(128) NOT NULL,
    description_model VARCHAR(128) NOT NULL DEFAULT '',
    mock_model VARCHAR(128) NOT NULL DEFAULT '',
    code_model VARCHAR(128) NOT NULL DEFAULT '',
    timeout_ms INT NOT NULL DEFAULT 30000,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ai_setting_project (project_id)
);

CREATE TABLE ai_knowledge_chunk (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    endpoint_id BIGINT NULL,
    source_type VARCHAR(32) NOT NULL,
    source_ref VARCHAR(128) NOT NULL,
    chunk_order INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ai_knowledge_chunk_project (project_id),
    INDEX idx_ai_knowledge_chunk_endpoint (endpoint_id),
    INDEX idx_ai_knowledge_chunk_source (source_type, source_ref)
);

CREATE TABLE project_resource_permission (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    resource_type VARCHAR(16) NOT NULL,
    resource_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    permission_level VARCHAR(16) NOT NULL,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_project_resource_permission_scope_user (project_id, resource_type, resource_id, user_id),
    KEY idx_project_resource_permission_project (project_id),
    KEY idx_project_resource_permission_user (user_id),
    KEY idx_project_resource_permission_scope (resource_type, resource_id)
);
