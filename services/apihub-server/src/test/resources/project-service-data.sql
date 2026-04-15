INSERT INTO sys_user (id, username, display_name, email, password_hash, token_version, status)
VALUES (1, 'admin', 'Administrator', 'admin@local.dev', 'hash', 0, 'active');

INSERT INTO sys_user (id, username, display_name, email, password_hash, token_version, status)
VALUES (2, 'viewer', 'Viewer User', 'viewer@local.dev', 'hash', 0, 'active');

INSERT INTO sys_user (id, username, display_name, email, password_hash, token_version, status)
VALUES (3, 'editor', 'Editor User', 'editor@local.dev', 'hash', 0, 'active');

INSERT INTO sys_user (id, username, display_name, email, password_hash, token_version, status)
VALUES (4, 'tester', 'Tester User', 'tester@local.dev', 'hash', 0, 'active');

INSERT INTO sys_user (id, username, display_name, email, password_hash, token_version, status)
VALUES (5, 'member-admin', 'Member Admin', 'member-admin@local.dev', 'hash', 0, 'active');

INSERT INTO space (id, name, space_key, owner_id, status)
VALUES (1, 'Default Space', 'default', 1, 'active');

INSERT INTO space_member (id, space_id, user_id, role_code, member_status)
VALUES (1, 1, 1, 'space_admin', 'active');

INSERT INTO project (id, space_id, name, project_key, description, debug_allowed_hosts_json, mock_access_mode, mock_access_token, owner_id, status)
VALUES (1, 1, 'Default Project', 'default', 'Seed project', '[]', 'private', 'seed-private-token', 1, 'active');

INSERT INTO project_member (id, project_id, user_id, role_code, member_status)
VALUES (1, 1, 1, 'project_admin', 'active');

INSERT INTO project_member (id, project_id, user_id, role_code, member_status)
VALUES (2, 1, 2, 'viewer', 'active');

INSERT INTO project_member (id, project_id, user_id, role_code, member_status)
VALUES (3, 1, 3, 'editor', 'active');

INSERT INTO project_member (id, project_id, user_id, role_code, member_status)
VALUES (4, 1, 4, 'tester', 'active');

ALTER TABLE project ALTER COLUMN id RESTART WITH 2;
ALTER TABLE space_member ALTER COLUMN id RESTART WITH 2;
ALTER TABLE project_member ALTER COLUMN id RESTART WITH 5;

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

INSERT INTO project_share_link (id, project_id, share_code, name, description, enabled, expires_at, created_by, created_at, updated_at)
VALUES (1, 1, 'active-share-code', 'Public Docs', 'Seed active share', TRUE, TIMESTAMP '2099-01-01 00:00:00', 1, TIMESTAMP '2026-04-11 10:00:00', TIMESTAMP '2026-04-11 10:00:00');

INSERT INTO project_share_link (id, project_id, share_code, name, description, enabled, expires_at, created_by, created_at, updated_at)
VALUES (2, 1, 'disabled-share-code', 'Disabled Docs', 'Seed disabled share', FALSE, TIMESTAMP '2099-01-01 00:00:00', 1, TIMESTAMP '2026-04-11 10:05:00', TIMESTAMP '2026-04-11 10:05:00');

INSERT INTO project_share_link (id, project_id, share_code, name, description, enabled, expires_at, created_by, created_at, updated_at)
VALUES (3, 1, 'expired-share-code', 'Expired Docs', 'Seed expired share', TRUE, TIMESTAMP '2020-01-01 00:00:00', 1, TIMESTAMP '2026-04-11 10:10:00', TIMESTAMP '2026-04-11 10:10:00');

ALTER TABLE environment ALTER COLUMN id RESTART WITH 2;

INSERT INTO dict_group (id, project_id, name, description, created_by, updated_by)
VALUES (1, 1, 'UserStatus', '用户状态字典', 1, 1);

INSERT INTO dict_item (id, group_id, code, item_value, description, sort_order, created_by, updated_by)
VALUES (1, 1, 'ACTIVE', '激活', '正常启用', 0, 1, 1);

INSERT INTO error_code (id, project_id, code, name, description, solution, http_status, created_by, updated_by)
VALUES (1, 1, 'USER_NOT_FOUND', '用户不存在', '指定用户不存在', '检查用户 ID 是否正确', 404, 1, 1);

ALTER TABLE dict_group ALTER COLUMN id RESTART WITH 2;
ALTER TABLE dict_item ALTER COLUMN id RESTART WITH 2;
ALTER TABLE error_code ALTER COLUMN id RESTART WITH 2;

ALTER TABLE module ALTER COLUMN id RESTART WITH 2;
ALTER TABLE api_group ALTER COLUMN id RESTART WITH 2;
ALTER TABLE api_endpoint ALTER COLUMN id RESTART WITH 2;
ALTER TABLE api_version ALTER COLUMN id RESTART WITH 2;
ALTER TABLE project_share_link ALTER COLUMN id RESTART WITH 4;

INSERT INTO test_suite (id, project_id, name, description, created_by, created_at, updated_at)
VALUES (1, 1, 'Smoke Suite', 'Seed smoke suite', 1, TIMESTAMP '2026-04-12 10:00:00', TIMESTAMP '2026-04-12 10:00:00');

INSERT INTO test_step (id, suite_id, endpoint_id, environment_id, step_order, name, enabled, query_string, request_headers_json, request_body, assertions_json, extractors_json, created_by, updated_by, created_at, updated_at)
VALUES (1, 1, 1, 1, 0, 'Get user smoke', TRUE, 'id=1001', '[]', '{}', '[{"type":"status_equals","expectedValue":"200"}]', '[]', 1, 1, TIMESTAMP '2026-04-12 10:00:00', TIMESTAMP '2026-04-12 10:00:00');

INSERT INTO test_execution (id, suite_id, status, execution_source, trigger_id, schedule_id, total_steps, passed_steps, failed_steps, duration_ms, report_json, executed_by, executed_at)
VALUES (1, 1, 'passed', 'manual', NULL, NULL, 1, 1, 0, 42, '{"steps":[{"stepOrder":0,"stepName":"Get user smoke","endpointId":1,"endpointName":"Get User","method":"GET","path":"/users/{id}","environmentId":1,"environmentName":"Local","finalUrl":"https://local.dev/users/1001","status":"passed","responseStatusCode":200,"durationMs":42,"responseBody":"{\"ok\":true}","responseHeaders":[],"assertions":[{"type":"status_equals","expectedValue":"200","passed":true,"actualValue":"200","message":"HTTP status matched"}],"errorMessage":null}]}' , 1, TIMESTAMP '2026-04-12 10:05:00');

INSERT INTO test_suite_trigger (id, suite_id, name, token_hash, token_prefix, active, created_by, created_at, last_triggered_at, last_execution_id)
VALUES (1, 1, 'CI Smoke', 'seed-trigger-hash', 'ats_seed', TRUE, 1, TIMESTAMP '2026-04-12 10:01:00', TIMESTAMP '2026-04-12 10:05:00', 1);

INSERT INTO test_suite_schedule (id, suite_id, enabled, interval_minutes, next_run_at, last_run_at, last_execution_id, created_by, updated_by, created_at, updated_at)
VALUES (1, 1, TRUE, 60, TIMESTAMP '2026-04-13 11:00:00', TIMESTAMP '2026-04-13 10:00:00', 1, 1, 1, TIMESTAMP '2026-04-12 10:02:00', TIMESTAMP '2026-04-12 10:02:00');

ALTER TABLE test_suite ALTER COLUMN id RESTART WITH 2;
ALTER TABLE test_step ALTER COLUMN id RESTART WITH 2;
ALTER TABLE test_execution ALTER COLUMN id RESTART WITH 2;
ALTER TABLE test_suite_trigger ALTER COLUMN id RESTART WITH 2;
ALTER TABLE test_suite_schedule ALTER COLUMN id RESTART WITH 2;
