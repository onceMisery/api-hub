create table audit_log (
    id bigint not null auto_increment primary key,
    project_id bigint not null,
    actor_user_id bigint not null,
    action_type varchar(64) not null,
    resource_type varchar(64) not null,
    resource_id bigint null,
    resource_name varchar(255) null,
    detail_json json not null,
    created_at datetime(3) not null default current_timestamp(3),
    key idx_audit_log_project_created (project_id, created_at desc, id desc),
    key idx_audit_log_resource (resource_type, resource_id, created_at desc)
);
