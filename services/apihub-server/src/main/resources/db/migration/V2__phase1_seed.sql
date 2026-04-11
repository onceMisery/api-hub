INSERT INTO sys_user (
  id,
  username,
  display_name,
  email,
  password_hash,
  token_version,
  status
) VALUES (
  1,
  'admin',
  'Administrator',
  'admin@local.dev',
  '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
  0,
  'active'
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  token_version = VALUES(token_version),
  status = VALUES(status);

INSERT INTO sys_user (
  id,
  username,
  display_name,
  email,
  password_hash,
  token_version,
  status
) VALUES (
  2,
  'viewer',
  'Viewer User',
  'viewer@local.dev',
  '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
  0,
  'active'
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  token_version = VALUES(token_version),
  status = VALUES(status);

INSERT INTO sys_user (
  id,
  username,
  display_name,
  email,
  password_hash,
  token_version,
  status
) VALUES (
  3,
  'editor',
  'Editor User',
  'editor@local.dev',
  '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
  0,
  'active'
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  token_version = VALUES(token_version),
  status = VALUES(status);

INSERT INTO sys_user (
  id,
  username,
  display_name,
  email,
  password_hash,
  token_version,
  status
) VALUES (
  4,
  'tester',
  'Tester User',
  'tester@local.dev',
  '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
  0,
  'active'
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  token_version = VALUES(token_version),
  status = VALUES(status);

INSERT INTO sys_user (
  id,
  username,
  display_name,
  email,
  password_hash,
  token_version,
  status
) VALUES (
  5,
  'member-admin',
  'Member Admin',
  'member-admin@local.dev',
  '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
  0,
  'active'
) ON DUPLICATE KEY UPDATE
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
) VALUES (
  1,
  1,
  1,
  'project_admin',
  'active'
) ON DUPLICATE KEY UPDATE
  project_id = VALUES(project_id),
  user_id = VALUES(user_id),
  role_code = VALUES(role_code),
  member_status = VALUES(member_status);

INSERT INTO project_member (
  id,
  project_id,
  user_id,
  role_code,
  member_status
) VALUES (
  2,
  1,
  2,
  'viewer',
  'active'
) ON DUPLICATE KEY UPDATE
  project_id = VALUES(project_id),
  user_id = VALUES(user_id),
  role_code = VALUES(role_code),
  member_status = VALUES(member_status);

INSERT INTO project_member (
  id,
  project_id,
  user_id,
  role_code,
  member_status
) VALUES (
  3,
  1,
  3,
  'editor',
  'active'
) ON DUPLICATE KEY UPDATE
  project_id = VALUES(project_id),
  user_id = VALUES(user_id),
  role_code = VALUES(role_code),
  member_status = VALUES(member_status);

INSERT INTO project_member (
  id,
  project_id,
  user_id,
  role_code,
  member_status
) VALUES (
  4,
  1,
  4,
  'tester',
  'active'
) ON DUPLICATE KEY UPDATE
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
