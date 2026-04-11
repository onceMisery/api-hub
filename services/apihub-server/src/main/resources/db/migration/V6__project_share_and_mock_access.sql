alter table project
    add column mock_access_mode varchar(16) not null default 'private',
    add column mock_access_token varchar(96) not null default '';

update project
set mock_access_token = replace(uuid(), '-', '')
where mock_access_token = '';

create table project_share_link (
    id bigint not null auto_increment primary key,
    project_id bigint not null,
    share_code varchar(96) not null,
    name varchar(128) not null,
    description text null,
    enabled tinyint(1) not null default 1,
    expires_at datetime(3) null,
    created_by bigint not null,
    created_at datetime(3) not null default current_timestamp(3),
    updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
    unique key uk_project_share_link_share_code (share_code),
    key idx_project_share_link_project_created (project_id, created_at desc, id desc)
);
