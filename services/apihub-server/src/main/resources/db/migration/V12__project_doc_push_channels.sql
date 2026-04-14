alter table project
    add column doc_push_enabled tinyint(1) not null default 1,
    add column doc_push_token varchar(96) not null default '';

update project
set doc_push_token = replace(uuid(), '-', '')
where doc_push_token = '';
