# MySQL Bootstrap

主库 schema 和 seed 已迁移到 Flyway。

当前生效入口：

- `services/apihub-server/src/main/resources/db/migration/V1__baseline.sql`
- `services/apihub-server/src/main/resources/db/migration/V2__phase1_seed.sql`

`docker-compose.yml` 现在只负责启动空 MySQL 实例，不再通过 `docker-entrypoint-initdb.d` 执行初始化 SQL。

本目录保留为 MySQL 基础设施说明入口，避免后续再次把初始化脚本散落回 `infra/mysql`。
