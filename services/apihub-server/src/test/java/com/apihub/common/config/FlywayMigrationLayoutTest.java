package com.apihub.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class FlywayMigrationLayoutTest {

    private static final Pattern BCRYPT_HASH_PATTERN = Pattern.compile("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}");
    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

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

    @Test
    void shouldProvideSeedNormalizationMigrationWithoutDatabaseDirectives() throws Exception {
        String migration = readClasspathResource("db/migration/V4__normalize_seed_accounts.sql");

        assertFalse(migration.contains("CREATE DATABASE"), "seed normalization migration must not create databases");
        assertFalse(migration.contains("USE apihub"), "seed normalization migration must not switch databases");
    }

    @Test
    void shouldProvideSeedPasswordRepairMigrationWithoutDatabaseDirectives() throws Exception {
        String migration = readClasspathResource("db/migration/V5__repair_seed_password_hashes.sql");

        assertFalse(migration.contains("CREATE DATABASE"), "seed password repair migration must not create databases");
        assertFalse(migration.contains("USE apihub"), "seed password repair migration must not switch databases");
    }

    @Test
    void shouldProvideProjectShareAndMockAccessMigrationWithoutDatabaseDirectives() throws Exception {
        String migration = readClasspathResource("db/migration/V6__project_share_and_mock_access.sql");

        assertFalse(migration.contains("CREATE DATABASE"), "project share migration must not create databases");
        assertFalse(migration.contains("USE apihub"), "project share migration must not switch databases");
    }

    @Test
    void shouldUseSeedPasswordHashesThatMatchDefaultPassword() throws Exception {
        assertMigrationUsesDefaultSeedPassword("db/migration/V5__repair_seed_password_hashes.sql");
    }

    private void assertMigrationUsesDefaultSeedPassword(String path) throws IOException {
        String migration = readClasspathResource(path);
        Matcher matcher = BCRYPT_HASH_PATTERN.matcher(migration);
        boolean foundHash = false;

        while (matcher.find()) {
            foundHash = true;
            assertTrue(
                    PASSWORD_ENCODER.matches("123456", matcher.group()),
                    () -> "seed password hash in " + path + " must match 123456"
            );
        }

        assertTrue(foundHash, () -> "expected at least one bcrypt seed hash in " + path);
    }

    private String readClasspathResource(String path) throws IOException {
        try (InputStream inputStream = Thread.currentThread().getContextClassLoader().getResourceAsStream(path)) {
            assertNotNull(inputStream, () -> "missing classpath resource: " + path);
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
