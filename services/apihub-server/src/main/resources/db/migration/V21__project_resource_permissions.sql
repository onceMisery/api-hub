create table project_resource_permission (
    id bigint primary key auto_increment,
    project_id bigint not null,
    resource_type varchar(16) not null,
    resource_id bigint not null,
    user_id bigint not null,
    permission_level varchar(16) not null,
    created_by bigint not null,
    updated_by bigint not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp on update current_timestamp,
    unique key uk_project_resource_permission_scope_user (project_id, resource_type, resource_id, user_id),
    key idx_project_resource_permission_project (project_id),
    key idx_project_resource_permission_user (user_id),
    key idx_project_resource_permission_scope (resource_type, resource_id)
);
