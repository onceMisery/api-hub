CREATE TABLE project_webhook (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  target_url VARCHAR(1024) NOT NULL,
  secret_token VARCHAR(255) NOT NULL DEFAULT '',
  event_types_json JSON NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_project_webhook_project_enabled (project_id, enabled, id),
  KEY idx_project_webhook_created_by (created_by),
  KEY idx_project_webhook_updated_by (updated_by)
);

CREATE TABLE webhook_delivery (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  webhook_id BIGINT NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  target_url VARCHAR(1024) NOT NULL,
  delivery_status VARCHAR(16) NOT NULL,
  response_status INT NULL,
  duration_ms BIGINT NOT NULL DEFAULT 0,
  payload_json LONGTEXT NOT NULL,
  response_body LONGTEXT NULL,
  error_message VARCHAR(1024) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_webhook_delivery_project_created (project_id, created_at DESC, id DESC),
  KEY idx_webhook_delivery_webhook_created (webhook_id, created_at DESC, id DESC),
  CONSTRAINT ck_webhook_delivery_status CHECK (delivery_status IN ('success', 'failed'))
);
