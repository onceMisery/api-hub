# ApiHub Backend Maven Migration Design

> 日期：2026-04-10
> 范围：将 `services/apihub-server` 从 Gradle 单工程迁移为 Maven 单模块工程，并同步更新仓库中的当前后端使用入口

## 1. 目标

本次只解决一件事：把后端工程的构建、测试、启动入口从 Gradle 切换到 Maven，同时保持现有 Spring Boot 后端代码、目录布局和运行行为不变。

迁移完成后，仓库中的后端“唯一官方入口”应为本机 Maven 环境：

- 本地启动：`mvn spring-boot:run`
- 执行测试：`mvn test`
- 打包产物：`mvn package`

## 2. 已确认约束

- 迁移对象仅限 `services/apihub-server`
- 结构采用单模块 Maven，而不是父子模块
- 需要同步更新仓库里当前有效的后端启动、测试、打包说明
- 不引入 Maven Wrapper，直接使用本机 Maven 环境
- 不改后端业务代码与包结构，除非为了 Maven 构建兼容必须做极小调整
- 历史计划文档和历史执行记录默认不做大面积回写

## 3. 当前状态

当前后端位于 `services/apihub-server`，是一个独立的 Gradle Kotlin DSL Spring Boot 工程：

- `build.gradle.kts`
- `settings.gradle.kts`
- `gradlew`
- `gradlew.bat`
- `gradle/wrapper/*`

其核心技术约束如下：

- Spring Boot `3.2.5`
- Java `21`
- `group = "com.apihub"`
- `version = "0.1.0"`

源码和测试已经采用 Maven 兼容的标准目录布局：

- `src/main/java`
- `src/main/resources`
- `src/test/java`
- `src/test/resources`

这意味着迁移重点在于“构建描述与命令入口替换”，而不是工程重构。

## 4. 方案选择

### 4.1 方案 A：直接切换为单模块 Maven

在 `services/apihub-server` 下新增 `pom.xml`，用 Maven 接管依赖、测试、打包与 Spring Boot 启动；删除 Gradle 配置与 Wrapper；更新 `README.md` 中所有当前后端使用命令。

优点：

- 迁移结果最干净
- 后端只有一套真实构建入口
- 后续维护成本最低

缺点：

- 迁移当次需要一次性调整文档与命令

### 4.2 方案 B：Gradle / Maven 并存过渡

先加入 `pom.xml`，暂时保留 Gradle 文件与命令说明，等后续再删除。

优点：

- 当次切换阻力小

缺点：

- 仓库会长期存在两套真相
- 文档和团队口径容易漂移

### 4.3 结论

采用方案 A。因为这次目标就是“把后端改成 Maven 管理”，最合理的落点是让 Maven 成为唯一官方构建方式，而不是新增第二套构建系统。

## 5. 目标结构

迁移后的后端目录仍保持：

```text
services/
  apihub-server/
    pom.xml
    src/
      main/
      test/
```

不新增父级聚合 POM，不改变 Java 包路径，不拆子模块。

## 6. Maven 设计

### 6.1 坐标与版本

`pom.xml` 将明确声明：

- `groupId`: `com.apihub`
- `artifactId`: `apihub-server`
- `version`: `0.1.0`
- `packaging`: `jar`

### 6.2 Java 与 Spring Boot

- Java 版本固定为 `21`
- Spring Boot 版本保持 `3.2.5`
- 使用标准 Spring Boot Maven 插件完成：
  - `spring-boot:run`
  - `repackage`

### 6.3 依赖映射

Gradle 中现有依赖应一一迁移到 Maven，保持语义一致：

- `org.springframework.boot:spring-boot-starter-web`
- `org.springframework.boot:spring-boot-starter-validation`
- `org.springframework.boot:spring-boot-starter-security`
- `org.springframework.boot:spring-boot-starter-jdbc`
- `com.auth0:java-jwt:4.4.0`
- `com.mysql:mysql-connector-j` 作为运行时依赖
- `com.h2database:h2` 作为测试运行时依赖
- `org.springframework.boot:spring-boot-starter-test`
- `org.springframework.security:spring-security-test`

### 6.4 测试行为

Maven 必须覆盖当前 Gradle 的测试能力：

- JUnit 5 测试可运行
- Spring Boot 测试可运行
- 指定测试类的执行方式可继续使用 Maven 参数完成

## 7. 仓库联动边界

### 7.1 本次需要更新

- `services/apihub-server/pom.xml`
- `README.md` 中当前后端启动、测试、打包相关命令
- 与后端当前使用入口直接相关的说明文本

### 7.2 本次不主动更新

- `docs/superpowers/plans/*.md` 等历史执行记录
- 仅记录“过去如何操作”的历史文档
- 不涉及当前后端命令入口的其他说明文件
- `docker-compose.yml`

说明：

`docker-compose.yml` 当前只负责 MySQL 容器初始化，不直接启动 Java 服务，因此不需要因 Maven 迁移而改动。

## 8. 命令口径

迁移后 README 中后端相关命令统一为：

```powershell
cd services/apihub-server
mvn spring-boot:run
```

```powershell
cd services/apihub-server
mvn test
```

```powershell
cd services/apihub-server
mvn package
```

如果 README 中保留了针对 Windows 的示例，应继续使用 PowerShell 语境，但命令主体以本机 `mvn` 为准，不再出现 `gradlew`、`gradlew.bat` 或 Maven Wrapper。

## 9. 文件变更范围

### 9.1 新增

- `services/apihub-server/pom.xml`
- 可能的 Maven 辅助忽略规则，仅在确有必要时增加

### 9.2 修改

- `README.md`

### 9.3 删除

- `services/apihub-server/build.gradle.kts`
- `services/apihub-server/settings.gradle.kts`
- `services/apihub-server/gradlew`
- `services/apihub-server/gradlew.bat`
- `services/apihub-server/gradle/wrapper/gradle-wrapper.jar`
- `services/apihub-server/gradle/wrapper/gradle-wrapper.properties`

## 10. 风险与控制

### 10.1 依赖解析差异

风险：Gradle 与 Maven 在依赖管理和插件默认行为上有细微差异。

控制：

- 保持 Spring Boot 版本不变
- 保持依赖集合不变
- 用 Maven 真实执行测试与打包验证

### 10.2 文档入口不一致

风险：代码已迁移，但 README 仍残留 Gradle 命令，导致使用者误用。

控制：

- 将 README 的当前命令全部切到 Maven
- 不保留双写入口

### 10.3 历史文档噪音

风险：为了“全量替换”去修改历史计划文档，会破坏历史语境。

控制：

- 只更新当前操作手册
- 历史执行记录保持原貌

## 11. 验收标准

迁移完成后，应满足以下条件：

- `services/apihub-server` 存在有效的 `pom.xml`
- 使用本机 Maven 可以在后端目录执行 `mvn test`
- 使用本机 Maven 可以在后端目录执行 `mvn package`
- 如进行启动验证，`mvn spring-boot:run` 能正常拉起应用
- `README.md` 中后端当前命令不再出现 Gradle 入口
- 后端目录中不再保留 Gradle 构建文件和 Wrapper

## 12. 实施原则

- 只迁移构建系统，不顺手重构业务代码
- 只更新当前有效入口，不重写历史记录
- 先验证 Maven 可用，再宣称迁移完成
- 后续实施按测试、构建、文档三条线一起验收
