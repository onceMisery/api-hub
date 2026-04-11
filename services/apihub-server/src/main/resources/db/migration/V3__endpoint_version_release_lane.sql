ALTER TABLE api_endpoint
    ADD COLUMN released_version_id BIGINT NULL,
    ADD COLUMN released_at DATETIME(3) NULL;
