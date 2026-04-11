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
    '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
    0,
    'active'
  ),
  (
    2,
    'viewer',
    'Viewer User',
    'viewer@local.dev',
    '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
    0,
    'active'
  ),
  (
    3,
    'editor',
    'Editor User',
    'editor@local.dev',
    '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
    0,
    'active'
  ),
  (
    4,
    'tester',
    'Tester User',
    'tester@local.dev',
    '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
    0,
    'active'
  ),
  (
    5,
    'member-admin',
    'Member Admin',
    'member-admin@local.dev',
    '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK',
    0,
    'active'
  )
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  token_version = VALUES(token_version),
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
  role_code = VALUES(role_code),
  member_status = VALUES(member_status);
