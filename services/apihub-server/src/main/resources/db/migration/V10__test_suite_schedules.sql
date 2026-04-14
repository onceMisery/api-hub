create table test_suite_schedule (
    id bigint not null auto_increment primary key,
    suite_id bigint not null,
    enabled tinyint(1) not null default 0,
    interval_minutes int not null default 60,
    next_run_at datetime(3) null,
    last_run_at datetime(3) null,
    last_execution_id bigint null,
    created_by bigint not null,
    updated_by bigint not null,
    created_at datetime(3) not null default current_timestamp(3),
    updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
    unique key uk_test_suite_schedule_suite_id (suite_id),
    key idx_test_suite_schedule_next_run (enabled, next_run_at, id)
);
