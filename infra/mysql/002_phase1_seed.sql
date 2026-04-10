USE apihub;

INSERT INTO sys_user (
  id,
  username,
  display_name,
  email,
  password_hash,
  status
) VALUES (
  1,
  'admin',
  'Administrator',
  'admin@local.dev',
  '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
  'active'
);

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
);

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
);

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
);

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
);

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
);

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
);

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
);
