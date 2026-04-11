INSERT INTO sys_user (id, username, display_name, email, password_hash, token_version, status)
VALUES (1, 'admin', 'Administrator', 'admin@local.dev', 'hash', 0, 'active');

INSERT INTO space (id, name, space_key, owner_id, status)
VALUES (1, 'Default Space', 'default', 1, 'active');

INSERT INTO project (id, space_id, name, project_key, description, debug_allowed_hosts_json, owner_id, status)
VALUES (1, 1, 'Default Project', 'default', 'Seed project', '[]', 1, 'active');

ALTER TABLE project ALTER COLUMN id RESTART WITH 2;


INSERT INTO environment (id, project_id, name, base_url, is_default, variables_json, default_headers_json, default_query_json, auth_mode, auth_key, auth_value, debug_host_mode, debug_allowed_hosts_json, created_by)
VALUES (1, 1, 'Local', 'https://local.dev', TRUE, '[]', '[]', '[]', 'none', '', '', 'inherit', '[]', 1);

INSERT INTO module (id, project_id, name, module_key, sort_order, created_by)
VALUES (1, 1, 'Core', 'core-1', 0, 1);

INSERT INTO api_group (id, module_id, name, group_key, sort_order, created_by)
VALUES (1, 1, 'User APIs', 'user-apis-1', 0, 1);

INSERT INTO api_endpoint (id, project_id, module_id, group_id, name, description, route_key, http_method, path, mock_enabled, status, sort_order, created_by, updated_by)
VALUES (1, 1, 1, 1, 'Get User', 'Seed endpoint', 'GET:/users/{id}', 'GET', '/users/{id}', TRUE, 'draft', 0, 1, 1);

INSERT INTO api_version (id, endpoint_id, revision_no, version_label, snapshot_json, change_summary, created_by)
VALUES (1, 1, 1, 'v1', '{"endpoint":{"path":"/users/{id}"},"responses":[{"httpStatusCode":200,"mediaType":"application/json","name":"userId","dataType":"string","required":true,"description":"","exampleValue":"u_1001"}]}', 'Initial seed version', 1);

ALTER TABLE environment ALTER COLUMN id RESTART WITH 2;
ALTER TABLE module ALTER COLUMN id RESTART WITH 2;
ALTER TABLE api_group ALTER COLUMN id RESTART WITH 2;
ALTER TABLE api_endpoint ALTER COLUMN id RESTART WITH 2;
ALTER TABLE api_version ALTER COLUMN id RESTART WITH 2;
