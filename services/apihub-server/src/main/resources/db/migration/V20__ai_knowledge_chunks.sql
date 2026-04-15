create table ai_knowledge_chunk (
    id bigint primary key auto_increment,
    project_id bigint not null,
    endpoint_id bigint null,
    source_type varchar(32) not null,
    source_ref varchar(128) not null,
    chunk_order int not null,
    title varchar(255) not null,
    content text not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp on update current_timestamp,
    index idx_ai_knowledge_chunk_project (project_id),
    index idx_ai_knowledge_chunk_endpoint (endpoint_id),
    index idx_ai_knowledge_chunk_source (source_type, source_ref)
);
