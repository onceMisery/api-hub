alter table test_execution
    add column execution_source varchar(16) not null default 'manual' after status,
    add column trigger_id bigint null after execution_source,
    add column schedule_id bigint null after trigger_id;

create index idx_test_execution_source_executed
    on test_execution (execution_source, executed_at desc, id desc);
