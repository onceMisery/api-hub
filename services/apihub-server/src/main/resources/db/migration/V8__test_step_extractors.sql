alter table test_step
    add column extractors_json json not null after assertions_json;
