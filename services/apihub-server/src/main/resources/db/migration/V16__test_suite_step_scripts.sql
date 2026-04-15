alter table test_step
    add column pre_script longtext null after request_body,
    add column post_script longtext null after pre_script;
