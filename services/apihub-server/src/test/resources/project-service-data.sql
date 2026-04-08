INSERT INTO sys_user (id, username, display_name, email, password_hash, status)
VALUES (1, 'admin', 'Administrator', 'admin@local.dev', 'hash', 'active');

INSERT INTO space (id, name, space_key, owner_id, status)
VALUES (1, 'Default Space', 'default', 1, 'active');

INSERT INTO project (id, space_id, name, project_key, description, owner_id, status)
VALUES (1, 1, 'Default Project', 'default', 'Seed project', 1, 'active');

ALTER TABLE project ALTER COLUMN id RESTART WITH 2;
