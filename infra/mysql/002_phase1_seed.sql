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
