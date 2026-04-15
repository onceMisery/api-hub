create table ai_setting (
    id bigint primary key auto_increment,
    project_id bigint not null,
    provider_type varchar(64) not null default 'openai_compatible',
    base_url varchar(255) not null,
    api_key varchar(512) not null,
    default_model varchar(128) not null,
    description_model varchar(128) not null default '',
    mock_model varchar(128) not null default '',
    code_model varchar(128) not null default '',
    timeout_ms int not null default 30000,
    enabled tinyint(1) not null default 0,
    created_by bigint not null,
    updated_by bigint not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp on update current_timestamp,
    unique key uk_ai_setting_project (project_id)
);
