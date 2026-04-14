create table test_suite (
    id bigint not null auto_increment primary key,
    project_id bigint not null,
    name varchar(128) not null,
    description text null,
    created_by bigint not null,
    created_at datetime(3) not null default current_timestamp(3),
    updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
    key idx_test_suite_project_updated (project_id, updated_at desc, id desc)
);

create table test_step (
    id bigint not null auto_increment primary key,
    suite_id bigint not null,
    endpoint_id bigint not null,
    environment_id bigint not null,
    step_order int not null default 0,
    name varchar(128) not null,
    enabled tinyint(1) not null default 1,
    query_string text null,
    request_headers_json json not null,
    request_body longtext null,
    assertions_json json not null,
    created_by bigint not null,
    updated_by bigint not null,
    created_at datetime(3) not null default current_timestamp(3),
    updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
    key idx_test_step_suite_order (suite_id, step_order, id)
);

create table test_execution (
    id bigint not null auto_increment primary key,
    suite_id bigint not null,
    status varchar(16) not null,
    total_steps int not null default 0,
    passed_steps int not null default 0,
    failed_steps int not null default 0,
    duration_ms bigint not null default 0,
    report_json json not null,
    executed_by bigint not null,
    executed_at datetime(3) not null default current_timestamp(3),
    key idx_test_execution_suite_executed (suite_id, executed_at desc, id desc),
    constraint ck_test_execution_status check (status in ('passed', 'failed', 'error'))
);
