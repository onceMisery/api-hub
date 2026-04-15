CREATE TABLE module_version_tag (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    module_id BIGINT NOT NULL,
    tag_name VARCHAR(64) NOT NULL,
    description TEXT,
    snapshot_json JSON NOT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_module_version_tag_module_name (module_id, tag_name),
    KEY idx_module_version_tag_module_created (module_id, created_at DESC, id DESC)
);
