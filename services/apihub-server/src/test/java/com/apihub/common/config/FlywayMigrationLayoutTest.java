package com.apihub.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlywayMigrationLayoutTest {

    private static final Pattern BCRYPT_HASH_PATTERN = Pattern.compile("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}");
    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    @Test
    void shouldProvideSingleBaselineMigration() throws Exception {
        List<String> migrations = listMigrationFileNames();

        assertTrue(
                migrations.size() == 1 && migrations.contains("V1__baseline.sql"),
                () -> "expected only V1__baseline.sql, found: " + migrations
        );
    }

    @Test
    void shouldProvideCompleteBaselineMigrationWithoutDatabaseDirectives() throws Exception {
        String migration = readClasspathResource("db/migration/V1__baseline.sql");
        String normalizedMigration = migration.toUpperCase();

        assertFalse(normalizedMigration.contains("CREATE DATABASE"), "baseline migration must not create databases");
        assertFalse(normalizedMigration.contains("USE APIHUB"), "baseline migration must not switch databases");
        assertTrue(normalizedMigration.contains("RELEASED_VERSION_ID BIGINT NULL"), "baseline must include endpoint release columns");
        assertTrue(normalizedMigration.contains("MOCK_ACCESS_MODE VARCHAR(16) NOT NULL DEFAULT 'PRIVATE'"), "baseline must include mock access columns");
        assertTrue(normalizedMigration.contains("DOC_PUSH_ENABLED TINYINT(1) NOT NULL DEFAULT 1"), "baseline must include doc push columns");
        assertTrue(normalizedMigration.contains("EXTRACTORS_JSON JSON NOT NULL"), "baseline must include test step extractors");
        assertTrue(normalizedMigration.contains("PRE_SCRIPT LONGTEXT NULL"), "baseline must include test step scripts");
        assertTrue(normalizedMigration.contains("DELAY_MS INT NOT NULL DEFAULT 0"), "baseline must include mock rule delay");
        assertTrue(normalizedMigration.contains("CREATE TABLE PROJECT_RESOURCE_PERMISSION"), "baseline must include latest resource permissions table");
    }

    @Test
    void shouldUseSeedPasswordHashesThatMatchDefaultPassword() throws Exception {
        assertMigrationUsesDefaultSeedPassword("db/migration/V1__baseline.sql");
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

    private List<String> listMigrationFileNames() throws IOException, URISyntaxException {
        var resource = Thread.currentThread().getContextClassLoader().getResource("db/migration");
        assertNotNull(resource, "missing classpath migration directory");
        try (var stream = Files.list(Path.of(resource.toURI()))) {
            return stream
                    .filter(path -> path.getFileName().toString().endsWith(".sql"))
                    .map(path -> path.getFileName().toString())
                    .sorted()
                    .toList();
        }
    }
}
