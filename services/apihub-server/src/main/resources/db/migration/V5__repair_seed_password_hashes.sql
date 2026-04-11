UPDATE sys_user
SET password_hash = '$2a$10$BLC1/e86okc.PIgoGzqZve3f8Jb.CgJLuViQp38UaEkjenuh9VUYO'
WHERE username IN ('admin', 'viewer', 'editor', 'tester', 'member-admin');
