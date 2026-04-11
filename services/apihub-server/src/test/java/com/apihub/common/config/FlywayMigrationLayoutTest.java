package com.apihub.common.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class FlywayMigrationLayoutTest {

    @Test
    void shouldProvideBaselineMigrationWithoutDatabaseDirectives() throws Exception {
        String migration = readClasspathResource("db/migration/V1__baseline.sql");

        assertFalse(migration.contains("CREATE DATABASE"), "baseline migration must not create databases");
        assertFalse(migration.contains("USE apihub"), "baseline migration must not switch databases");
    }

    @Test
    void shouldProvideSeedMigrationWithoutDatabaseDirectives() throws Exception {
        String migration = readClasspathResource("db/migration/V2__phase1_seed.sql");

        assertFalse(migration.contains("CREATE DATABASE"), "seed migration must not create databases");
        assertFalse(migration.contains("USE apihub"), "seed migration must not switch databases");
    }

    private String readClasspathResource(String path) throws IOException {
        try (InputStream inputStream = Thread.currentThread().getContextClassLoader().getResourceAsStream(path)) {
            assertNotNull(inputStream, () -> "missing classpath resource: " + path);
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
