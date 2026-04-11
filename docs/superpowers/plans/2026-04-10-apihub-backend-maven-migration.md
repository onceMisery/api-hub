# ApiHub Backend Maven Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the backend Gradle build in `services/apihub-server` with a single-module Maven build and update the repository's current backend usage docs to use local `mvn` commands only.

**Architecture:** Keep the backend codebase and source layout unchanged, and swap only the build descriptor plus the repository's active backend command references. Validate the migration in layers: first prove Maven can run one existing Spring test, then update README command blocks, then remove Gradle artifacts and run a full `mvn package` gate.

**Tech Stack:** Java 21, Spring Boot 3.2.5, Maven, PowerShell, Git

---

## File Map

- Create: `services/apihub-server/pom.xml`
  Maven single-module descriptor for dependencies, test execution, packaging, and Spring Boot startup.
- Modify: `.gitignore`
  Ignore local backend build outputs for both the old Gradle path and the new Maven path.
- Modify: `README.md`
  Replace the current backend run and test instructions with local Maven commands and add the backend package command.
- Delete: `services/apihub-server/build.gradle.kts`
  Remove the Gradle Kotlin DSL descriptor after Maven is proven working.
- Delete: `services/apihub-server/settings.gradle.kts`
  Remove the Gradle root metadata for the backend service.
- Delete: `services/apihub-server/gradlew`
  Remove the Unix Gradle wrapper entrypoint.
- Delete: `services/apihub-server/gradlew.bat`
  Remove the Windows Gradle wrapper entrypoint.
- Delete: `services/apihub-server/gradle/wrapper/gradle-wrapper.jar`
  Remove the Gradle wrapper binary.
- Delete: `services/apihub-server/gradle/wrapper/gradle-wrapper.properties`
  Remove the Gradle wrapper distribution config.
- Test: `services/apihub-server/src/test/java/com/apihub/common/web/HealthControllerTest.java`
  Minimal Spring Boot regression target to prove Maven wiring works before broader verification.

### Task 1: Add the Maven build descriptor

**Files:**
- Create: `services/apihub-server/pom.xml`
- Test: `services/apihub-server/src/test/java/com/apihub/common/web/HealthControllerTest.java`

- [ ] **Step 1: Write the failing test**

```powershell
# Use one existing Spring Boot test as the first Maven regression target.
Set-Location services/apihub-server
mvn -Dtest=HealthControllerTest test
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
Set-Location services/apihub-server
mvn -Dtest=HealthControllerTest test
```

Expected: FAIL with a Maven error explaining there is no `pom.xml` in `services/apihub-server`, such as "The goal you specified requires a project to execute but there is no POM in this directory".

- [ ] **Step 3: Write minimal implementation**

Create `services/apihub-server/pom.xml` with this exact content:

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
        <relativePath/>
    </parent>

    <groupId>com.apihub</groupId>
    <artifactId>apihub-server</artifactId>
    <version>0.1.0</version>
    <name>apihub-server</name>
    <description>ApiHub Spring Boot backend service</description>
    <packaging>jar</packaging>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jdbc</artifactId>
        </dependency>
        <dependency>
            <groupId>com.auth0</groupId>
            <artifactId>java-jwt</artifactId>
            <version>4.4.0</version>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
Set-Location services/apihub-server
mvn -Dtest=HealthControllerTest test
```

Expected: PASS with `BUILD SUCCESS`, `Tests run: 1`, `Failures: 0`, and `Errors: 0`.

- [ ] **Step 5: Commit**

```bash
git add services/apihub-server/pom.xml
git commit -m "build: add maven build for apihub-server"
```

### Task 2: Switch the active backend docs to Maven

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

```powershell
# These matches prove the active README instructions still point at Gradle.
git grep -n -E "\\.\\\\gradlew\\.bat bootRun|\\.\\\\gradlew\\.bat clean test" -- README.md
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
git grep -n -E "\\.\\\\gradlew\\.bat bootRun|\\.\\\\gradlew\\.bat clean test" -- README.md
```

Expected: FAIL the desired state by printing the current Gradle command lines in `README.md`.

- [ ] **Step 3: Write minimal implementation**

In the "启动后端" section of `README.md`, replace the existing backend code fence with this exact code fence:

````md
```bash
cd services/apihub-server
mvn spring-boot:run
```
````

In the "后端验证命令" section of `README.md`, replace the existing backend code fence with this exact code fence:

````md
```bash
cd services/apihub-server
mvn test -Dtest=AuthControllerTest,HealthControllerTest,ProjectTreeControllerTest,ProjectSecurityTest
mvn package
```
````

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
if (git grep -n -E "\\.\\\\gradlew\\.bat bootRun|\\.\\\\gradlew\\.bat clean test" -- README.md) {
    throw "README still contains Gradle backend commands"
}

git grep -n "mvn spring-boot:run" -- README.md
git grep -n "mvn test -Dtest=AuthControllerTest,HealthControllerTest,ProjectTreeControllerTest,ProjectSecurityTest" -- README.md
git grep -n "mvn package" -- README.md
```

Expected: PASS by returning no Gradle backend matches and printing the three Maven command lines from `README.md`.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: switch backend commands to maven"
```

### Task 3: Remove Gradle artifacts and verify the full Maven package flow

**Files:**
- Modify: `.gitignore`
- Delete: `services/apihub-server/build.gradle.kts`
- Delete: `services/apihub-server/settings.gradle.kts`
- Delete: `services/apihub-server/gradlew`
- Delete: `services/apihub-server/gradlew.bat`
- Delete: `services/apihub-server/gradle/wrapper/gradle-wrapper.jar`
- Delete: `services/apihub-server/gradle/wrapper/gradle-wrapper.properties`

- [ ] **Step 1: Write the failing test**

```powershell
$gradleFiles = @(
    "services/apihub-server/build.gradle.kts",
    "services/apihub-server/settings.gradle.kts",
    "services/apihub-server/gradlew",
    "services/apihub-server/gradlew.bat",
    "services/apihub-server/gradle/wrapper/gradle-wrapper.jar",
    "services/apihub-server/gradle/wrapper/gradle-wrapper.properties"
)

$remainingGradleFiles = $gradleFiles | Where-Object { Test-Path $_ }
$targetIgnored = git check-ignore services/apihub-server/target
$buildIgnored = git check-ignore services/apihub-server/build

if ($remainingGradleFiles.Count -eq 0 -and $targetIgnored -and $buildIgnored) {
    Write-Host "cleanup already complete"
} else {
    throw "Gradle files still exist or build outputs are not ignored"
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
$gradleFiles = @(
    "services/apihub-server/build.gradle.kts",
    "services/apihub-server/settings.gradle.kts",
    "services/apihub-server/gradlew",
    "services/apihub-server/gradlew.bat",
    "services/apihub-server/gradle/wrapper/gradle-wrapper.jar",
    "services/apihub-server/gradle/wrapper/gradle-wrapper.properties"
)

$remainingGradleFiles = $gradleFiles | Where-Object { Test-Path $_ }
$targetIgnored = git check-ignore services/apihub-server/target
$buildIgnored = git check-ignore services/apihub-server/build

if ($remainingGradleFiles.Count -eq 0 -and $targetIgnored -and $buildIgnored) {
    Write-Host "cleanup already complete"
} else {
    throw "Gradle files still exist or build outputs are not ignored"
}
```

Expected: FAIL because the Gradle files still exist and the current `.gitignore` does not ignore `services/apihub-server/target` or `services/apihub-server/build`.

- [ ] **Step 3: Write minimal implementation**

Replace `.gitignore` with this exact content:

```gitignore
.worktrees/
node_modules/
.next/
dist/
out/
.idea/
build/
target/
```

Then delete the Gradle backend artifacts with these exact commands:

```powershell
Remove-Item services/apihub-server/build.gradle.kts
Remove-Item services/apihub-server/settings.gradle.kts
Remove-Item services/apihub-server/gradlew
Remove-Item services/apihub-server/gradlew.bat
Remove-Item services/apihub-server/gradle/wrapper/gradle-wrapper.jar
Remove-Item services/apihub-server/gradle/wrapper/gradle-wrapper.properties
Remove-Item services/apihub-server/gradle/wrapper -Force
Remove-Item services/apihub-server/gradle -Force
```

- [ ] **Step 4: Run test to verify it passes**

Run the cleanup gate:

```powershell
$gradleFiles = @(
    "services/apihub-server/build.gradle.kts",
    "services/apihub-server/settings.gradle.kts",
    "services/apihub-server/gradlew",
    "services/apihub-server/gradlew.bat",
    "services/apihub-server/gradle/wrapper/gradle-wrapper.jar",
    "services/apihub-server/gradle/wrapper/gradle-wrapper.properties"
)

$remainingGradleFiles = $gradleFiles | Where-Object { Test-Path $_ }
$targetIgnored = git check-ignore services/apihub-server/target
$buildIgnored = git check-ignore services/apihub-server/build

if ($remainingGradleFiles.Count -eq 0 -and $targetIgnored -and $buildIgnored) {
    Write-Host "cleanup complete"
} else {
    throw "cleanup incomplete"
}
```

Then run the full backend build:

```powershell
Set-Location services/apihub-server
mvn package
```

Expected: PASS with `cleanup complete`, followed by `BUILD SUCCESS` from `mvn package`, with the backend test suite green and a packaged jar under `services/apihub-server/target/`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git rm services/apihub-server/build.gradle.kts services/apihub-server/settings.gradle.kts services/apihub-server/gradlew services/apihub-server/gradlew.bat services/apihub-server/gradle/wrapper/gradle-wrapper.jar services/apihub-server/gradle/wrapper/gradle-wrapper.properties
git commit -m "build: migrate apihub-server from gradle to maven"
```
