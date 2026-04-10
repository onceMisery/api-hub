DROP ALL OBJECTS;

CREATE TABLE sys_user (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  email VARCHAR(128) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
);

CREATE TABLE space (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  space_key VARCHAR(64) NOT NULL,
  owner_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
);

CREATE TABLE project (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  space_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  project_key VARCHAR(64) NOT NULL,
  description TEXT,
  debug_allowed_hosts_json CLOB NOT NULL,
  owner_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
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
  status_code INT NOT NULL DEFAULT 200,
  media_type VARCHAR(128) NOT NULL DEFAULT 'application/json',
  body_json CLOB NOT NULL,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL
);

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
