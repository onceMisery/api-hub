ALTER TABLE mock_rule
    ADD COLUMN delay_ms INT NOT NULL DEFAULT 0 AFTER body_json,
    ADD COLUMN template_mode VARCHAR(16) NOT NULL DEFAULT 'plain' AFTER delay_ms;
