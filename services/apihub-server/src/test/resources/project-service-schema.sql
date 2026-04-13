DROP ALL OBJECTS;

CREATE TABLE sys_user (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  email VARCHAR(128) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  token_version INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
);

CREATE TABLE space (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  space_key VARCHAR(64) NOT NULL,
  owner_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
);

CREATE TABLE space_member (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  space_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role_code VARCHAR(32) NOT NULL,
  member_status VARCHAR(16) NOT NULL DEFAULT 'active'
);

CREATE TABLE project (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  space_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  project_key VARCHAR(64) NOT NULL,
  description TEXT,
  debug_allowed_hosts_json CLOB NOT NULL,
  mock_access_mode VARCHAR(16) NOT NULL DEFAULT 'private',
  mock_access_token VARCHAR(96) NOT NULL,
  owner_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
);

CREATE TABLE project_member (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role_code VARCHAR(32) NOT NULL,
  member_status VARCHAR(16) NOT NULL DEFAULT 'active'
);

CREATE TABLE environment (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  base_url VARCHAR(512) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  variables_json CLOB NOT NULL,
  default_headers_json CLOB NOT NULL,
  default_query_json CLOB NOT NULL,
  auth_mode VARCHAR(32) NOT NULL DEFAULT 'none',
  auth_key VARCHAR(128) NOT NULL DEFAULT '',
  auth_value VARCHAR(512) NOT NULL DEFAULT '',
  debug_host_mode VARCHAR(16) NOT NULL DEFAULT 'inherit',
  debug_allowed_hosts_json CLOB NOT NULL,
  created_by BIGINT NOT NULL
);

CREATE TABLE module (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  module_key VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT NOT NULL
);

CREATE TABLE api_group (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  module_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  group_key VARCHAR(128) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT NOT NULL
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
  mock_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  released_version_id BIGINT NULL,
  released_at TIMESTAMP NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL
);

CREATE TABLE api_parameter (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  parent_id BIGINT NULL,
  section_type VARCHAR(16) NOT NULL,
  node_path VARCHAR(512) NOT NULL,
  name VARCHAR(128) NOT NULL,
  data_type VARCHAR(64) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  example_value TEXT,
  sort_order INT NOT NULL DEFAULT 0
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
  required BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  example_value TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE api_version (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  revision_no INT NOT NULL,
  version_label VARCHAR(64),
  snapshot_json CLOB NOT NULL,
  change_summary TEXT,
  created_by BIGINT NOT NULL
);

CREATE TABLE mock_rule (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  rule_name VARCHAR(128) NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  query_conditions_json CLOB NOT NULL,
  header_conditions_json CLOB NOT NULL,
  body_conditions_json CLOB NOT NULL,
  status_code INT NOT NULL DEFAULT 200,
  media_type VARCHAR(128) NOT NULL DEFAULT 'application/json',
  body_json CLOB NOT NULL,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL
);

CREATE INDEX idx_mock_rule_endpoint_priority ON mock_rule (endpoint_id, priority DESC, id ASC);
CREATE INDEX idx_mock_rule_created_by ON mock_rule (created_by);
CREATE INDEX idx_mock_rule_updated_by ON mock_rule (updated_by);

CREATE TABLE mock_release (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  release_no INT NOT NULL,
  response_snapshot_json CLOB NOT NULL,
  rules_snapshot_json CLOB NOT NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (endpoint_id, release_no)
);

CREATE INDEX idx_mock_release_endpoint_created ON mock_release (endpoint_id, created_at DESC, id DESC);
CREATE INDEX idx_mock_release_created_by ON mock_release (created_by);

CREATE TABLE project_share_link (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  share_code VARCHAR(96) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMP NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_project_share_link_share_code ON project_share_link (share_code);
CREATE INDEX idx_project_share_link_project_created ON project_share_link (project_id, created_at DESC, id DESC);

CREATE TABLE debug_history (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  environment_id BIGINT NOT NULL,
  endpoint_id BIGINT NOT NULL,
  http_method VARCHAR(16) NOT NULL,
  final_url VARCHAR(1024) NOT NULL,
  request_headers_json CLOB NOT NULL,
  request_body CLOB,
  response_status_code INT NOT NULL,
  response_headers_json CLOB NOT NULL,
  response_body CLOB,
  duration_ms BIGINT NOT NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_debug_history_project_created ON debug_history (project_id, created_at DESC);
CREATE INDEX idx_debug_history_environment_created ON debug_history (environment_id, created_at DESC);
CREATE INDEX idx_debug_history_endpoint_created ON debug_history (endpoint_id, created_at DESC);
CREATE INDEX idx_debug_history_created_by_created ON debug_history (created_by, created_at DESC);

CREATE TABLE test_suite (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_suite_project_updated ON test_suite (project_id, updated_at DESC, id DESC);

CREATE TABLE test_step (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  suite_id BIGINT NOT NULL,
  endpoint_id BIGINT NOT NULL,
  environment_id BIGINT NOT NULL,
  step_order INT NOT NULL DEFAULT 0,
  name VARCHAR(128) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  query_string CLOB,
  request_headers_json CLOB NOT NULL,
  request_body CLOB,
  assertions_json CLOB NOT NULL,
  extractors_json CLOB NOT NULL,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_step_suite_order ON test_step (suite_id, step_order, id);

CREATE TABLE test_execution (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  suite_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  execution_source VARCHAR(16) NOT NULL DEFAULT 'manual',
  trigger_id BIGINT NULL,
  schedule_id BIGINT NULL,
  total_steps INT NOT NULL DEFAULT 0,
  passed_steps INT NOT NULL DEFAULT 0,
  failed_steps INT NOT NULL DEFAULT 0,
  duration_ms BIGINT NOT NULL DEFAULT 0,
  report_json CLOB NOT NULL,
  executed_by BIGINT NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_execution_suite_executed ON test_execution (suite_id, executed_at DESC, id DESC);
CREATE INDEX idx_test_execution_source_executed ON test_execution (execution_source, executed_at DESC, id DESC);

CREATE TABLE test_suite_trigger (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  suite_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  token_prefix VARCHAR(16) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at TIMESTAMP NULL,
  last_execution_id BIGINT NULL
);

CREATE UNIQUE INDEX uk_test_suite_trigger_token_hash ON test_suite_trigger (token_hash);
CREATE INDEX idx_test_suite_trigger_suite_created ON test_suite_trigger (suite_id, created_at DESC, id DESC);

CREATE TABLE test_suite_schedule (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  suite_id BIGINT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  interval_minutes INT NOT NULL DEFAULT 60,
  next_run_at TIMESTAMP NULL,
  last_run_at TIMESTAMP NULL,
  last_execution_id BIGINT NULL,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_test_suite_schedule_suite_id ON test_suite_schedule (suite_id);
CREATE INDEX idx_test_suite_schedule_next_run ON test_suite_schedule (enabled, next_run_at, id);
