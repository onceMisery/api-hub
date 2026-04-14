create table test_suite_trigger (
    id bigint not null auto_increment primary key,
    suite_id bigint not null,
    name varchar(128) not null,
    token_hash varchar(64) not null,
    token_prefix varchar(16) not null,
    active tinyint(1) not null default 1,
    created_by bigint not null,
    created_at datetime(3) not null default current_timestamp(3),
    last_triggered_at datetime(3) null,
    last_execution_id bigint null,
    unique key uk_test_suite_trigger_token_hash (token_hash),
    key idx_test_suite_trigger_suite_created (suite_id, created_at desc, id desc)
);
