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
