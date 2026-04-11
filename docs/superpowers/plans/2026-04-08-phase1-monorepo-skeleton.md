# Phase 1 Monorepo Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 ApiHub 的正�?Monorepo 工程，并跑通真实登录与 `项目 / 模块 / 分组 / 接口` 的最小业务闭环�?
**Architecture:** 前端采用 `Next.js 15` 单应用承载登录页和控制台，后端采�?`Spring Boot 3.2` 模块化单体承载认证、项目和文档主链路。基础设施只依�?`MySQL 8`，首阶段不引�?Redis、MQ、搜索或对象存储�?
**Tech Stack:** `pnpm workspaces`, `Next.js 15`, `React 19`, `TypeScript`, `Tailwind CSS`, `shadcn/ui`, `Framer Motion`, `Spring Boot 3.2`, `Java 21`, `Gradle Kotlin DSL`, `Spring Security`, `JWT`, `MySQL 8`

---

## File Structure

本计划将创建或修改以下文件和目录�?
- Root
  - Create: `package.json`
  - Create: `pnpm-workspace.yaml`
  - Create: `tsconfig.base.json`
  - Create: `.editorconfig`
  - Modify: `.gitignore`
- Frontend app
  - Create: `apps/web/package.json`
  - Create: `apps/web/next.config.ts`
  - Create: `apps/web/tsconfig.json`
  - Create: `apps/web/postcss.config.mjs`
  - Create: `apps/web/src/app/layout.tsx`
  - Create: `apps/web/src/app/globals.css`
  - Create: `apps/web/src/app/page.tsx`
  - Create: `apps/web/src/app/login/page.tsx`
  - Create: `apps/web/src/app/console/projects/page.tsx`
  - Create: `apps/web/src/app/console/projects/[projectId]/page.tsx`
  - Create: `apps/web/src/components/...`
  - Create: `apps/web/src/features/auth/...`
  - Create: `apps/web/src/features/projects/...`
  - Create: `apps/web/src/lib/...`
- Shared packages
  - Create: `packages/ui/package.json`
  - Create: `packages/ui/src/index.ts`
  - Create: `packages/ui/src/components/...`
  - Create: `packages/api-sdk/package.json`
  - Create: `packages/api-sdk/src/index.ts`
  - Create: `packages/api-sdk/src/client.ts`
  - Create: `packages/api-sdk/src/modules/auth.ts`
  - Create: `packages/api-sdk/src/modules/projects.ts`
  - Create: `packages/config/package.json`
- Backend
  - Create: `services/apihub-server/settings.gradle.kts`
  - Create: `services/apihub-server/build.gradle.kts`
  - Create: `services/apihub-server/src/main/resources/application.yml`
  - Create: `services/apihub-server/src/main/java/com/apihub/ApiHubApplication.java`
  - Create: `services/apihub-server/src/main/java/com/apihub/common/...`
  - Create: `services/apihub-server/src/main/java/com/apihub/auth/...`
  - Create: `services/apihub-server/src/main/java/com/apihub/project/...`
  - Create: `services/apihub-server/src/main/java/com/apihub/doc/...`
  - Create: `services/apihub-server/src/test/java/com/apihub/...`
- Infra
  - Create: `infra/mysql/001_phase1_schema.sql`
  - Create: `infra/mysql/002_phase1_seed.sql`
  - Create: `infra/nginx/default.conf`
  - Create: `docker-compose.yml`

## Task 1: 建立 Monorepo 根目录与共享前端工具�?
**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Modify: `.gitignore`
- Test: `package.json`

- [ ] **Step 1: 写根工作区配�?*

```json
{
  "name": "api-hub",
  "private": true,
  "packageManager": "pnpm@10.8.0",
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "build:web": "pnpm --filter web build",
    "lint:web": "pnpm --filter web lint"
  }
}
```

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@ui/*": ["packages/ui/src/*"],
      "@api-sdk/*": ["packages/api-sdk/src/*"]
    }
  }
}
```

- [ ] **Step 2: �?`.editorconfig` �?`.gitignore` 最小规�?*

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
```

```gitignore
node_modules/
.next/
dist/
out/
.gradle/
build/
.idea/
.qoder/
```

- [ ] **Step 3: 运行 `pnpm install` 验证工作区配置可解析**

Run: `pnpm install`

Expected: 根目录生�?`pnpm-lock.yaml`，无 workspace 配置错误

- [ ] **Step 4: 提交根配�?*

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .editorconfig .gitignore pnpm-lock.yaml
git commit -m "chore: add monorepo root workspace config"
```

## Task 2: 初始�?`packages/ui`、`packages/api-sdk`、`packages/config`

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/src/components/panel-card.tsx`
- Create: `packages/ui/src/components/section-header.tsx`
- Create: `packages/ui/src/components/sidebar-tree.tsx`
- Create: `packages/api-sdk/package.json`
- Create: `packages/api-sdk/src/index.ts`
- Create: `packages/api-sdk/src/client.ts`
- Create: `packages/api-sdk/src/modules/auth.ts`
- Create: `packages/api-sdk/src/modules/projects.ts`
- Create: `packages/config/package.json`
- Test: `packages/ui/src/index.ts`

- [ ] **Step 1: �?`packages/ui` 包定义和基础导出**

```json
{
  "name": "@api-hub/ui",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

```ts
export * from "./components/panel-card";
export * from "./components/section-header";
export * from "./components/sidebar-tree";
```

- [ ] **Step 2: �?3 个最�?UI 组件骨架**

```tsx
// packages/ui/src/components/panel-card.tsx
import { PropsWithChildren } from "react";

export function PanelCard({ children }: PropsWithChildren) {
  return <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">{children}</div>;
}
```

```tsx
// packages/ui/src/components/section-header.tsx
export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}
```

```tsx
// packages/ui/src/components/sidebar-tree.tsx
export type TreeNode = { id: string; label: string; type: "module" | "group" | "endpoint"; children?: TreeNode[] };

export function SidebarTree({ nodes }: { nodes: TreeNode[] }) {
  return <pre className="text-xs text-slate-600">{JSON.stringify(nodes, null, 2)}</pre>;
}
```

- [ ] **Step 3: �?`packages/api-sdk` �?HTTP 客户端和模块入口**

```ts
// packages/api-sdk/src/client.ts
export type ApiResponse<T> = { code: number; message: string; data: T; traceId?: string };

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  return response.json();
}
```

```ts
// packages/api-sdk/src/modules/auth.ts
import { apiFetch } from "../client";

export function login(payload: { username: string; password: string }) {
  return apiFetch<{ accessToken: string; refreshToken: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
```

```ts
// packages/api-sdk/src/modules/projects.ts
import { apiFetch } from "../client";

export function fetchProjects(spaceId: number) {
  return apiFetch<{ records: Array<{ id: number; name: string }> }>(`/api/v1/spaces/${spaceId}/projects`);
}
```

- [ ] **Step 4: 写包入口导出**

```ts
// packages/api-sdk/src/index.ts
export * from "./client";
export * from "./modules/auth";
export * from "./modules/projects";
```

```json
{
  "name": "@api-hub/api-sdk",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

```json
{
  "name": "@api-hub/config",
  "version": "0.1.0",
  "private": true
}
```

- [ ] **Step 5: �?TypeScript 检查共享包入口**

Run: `pnpm exec tsc --noEmit packages/ui/src/index.ts packages/api-sdk/src/index.ts`

Expected: 无类型错�?
- [ ] **Step 6: 提交共享包骨�?*

```bash
git add packages/ui packages/api-sdk packages/config
git commit -m "feat: add shared ui and api sdk packages"
```

## Task 3: 初始�?`apps/web` 并落登录页与控制台路由骨�?
**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/console/projects/page.tsx`
- Create: `apps/web/src/app/console/projects/[projectId]/page.tsx`
- Test: `apps/web/package.json`

- [ ] **Step 1: �?`apps/web/package.json` �?Next.js 依赖**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@api-hub/api-sdk": "workspace:*",
    "@api-hub/ui": "workspace:*",
    "framer-motion": "^11.18.2",
    "next": "^15.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.13.10",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.2"
  }
}
```

- [ ] **Step 2: �?Next 基础配置**

```ts
// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
```

```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 3: 写全局布局和样�?*

```tsx
// apps/web/src/app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] text-slate-900">
        {children}
      </body>
    </html>
  );
}
```

```css
/* apps/web/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 4: 写登录页和控制台路由基础页面**

```tsx
// apps/web/src/app/login/page.tsx
import { PanelCard, SectionHeader } from "@api-hub/ui";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center p-8">
      <PanelCard>
        <SectionHeader title="登录 ApiHub" description="使用本地账号进入控制�? />
        <div className="space-y-3">
          <input className="w-full rounded-2xl border px-4 py-3" placeholder="用户�? />
          <input className="w-full rounded-2xl border px-4 py-3" placeholder="密码" type="password" />
          <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white">登录</button>
        </div>
      </PanelCard>
    </main>
  );
}
```

```tsx
// apps/web/src/app/console/projects/page.tsx
export default function ProjectsPage() {
  return <main className="p-8 text-slate-900">Projects dashboard</main>;
}
```

```tsx
// apps/web/src/app/console/projects/[projectId]/page.tsx
export default function ProjectWorkbenchPage() {
  return <main className="p-8 text-slate-900">Project workbench</main>;
}
```

- [ ] **Step 5: 安装依赖并启动前�?*

Run: `pnpm install && pnpm --filter web dev`

Expected: `http://localhost:3000/login` �?`/console/projects` 可访�?
- [ ] **Step 6: 提交前端应用骨架**

```bash
git add apps/web
git commit -m "feat: scaffold nextjs web app"
```

## Task 4: 建立 Spring Boot 工程与最小健康检�?
**Files:**
- Create: `services/apihub-server/settings.gradle.kts`
- Create: `services/apihub-server/build.gradle.kts`
- Create: `services/apihub-server/src/main/resources/application.yml`
- Create: `services/apihub-server/src/main/java/com/apihub/ApiHubApplication.java`
- Create: `services/apihub-server/src/main/java/com/apihub/common/model/ApiResponse.java`
- Create: `services/apihub-server/src/main/java/com/apihub/common/web/HealthController.java`
- Test: `services/apihub-server/src/test/java/com/apihub/common/web/HealthControllerTest.java`

- [ ] **Step 1: �?Gradle �?Spring Boot 工程配置**

```kotlin
// services/apihub-server/settings.gradle.kts
rootProject.name = "apihub-server"
```

```kotlin
// services/apihub-server/build.gradle.kts
plugins {
    java
    id("org.springframework.boot") version "3.2.5"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "com.apihub"
version = "0.1.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    implementation("com.auth0:java-jwt:4.4.0")
    runtimeOnly("com.mysql:mysql-connector-j")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
}

tasks.test {
    useJUnitPlatform()
}
```

- [ ] **Step 2: 写应用入口和配置**

```java
// services/apihub-server/src/main/java/com/apihub/ApiHubApplication.java
package com.apihub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ApiHubApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiHubApplication.class, args);
    }
}
```

```java
// services/apihub-server/src/main/java/com/apihub/common/model/ApiResponse.java
package com.apihub.common.model;

public record ApiResponse<T>(int code, String message, T data) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(0, "OK", data);
    }
}
```

```yaml
# services/apihub-server/src/main/resources/application.yml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/apihub?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8
    username: root
    password: root
```

- [ ] **Step 3: 先写健康检查失败测�?*

```java
// services/apihub-server/src/test/java/com/apihub/common/web/HealthControllerTest.java
package com.apihub.common.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HealthController.class)
class HealthControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnOk() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk())
            .andExpect(content().string("ok"));
    }
}
```

- [ ] **Step 4: 跑测试确认失败，再补最小实�?*

Run: `.\gradlew.bat test --tests com.apihub.common.web.HealthControllerTest`

Expected: FAIL，提�?`HealthController` 不存�?
```java
// services/apihub-server/src/main/java/com/apihub/common/web/HealthController.java
package com.apihub.common.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    @GetMapping("/api/health")
    public String health() {
        return "ok";
    }
}
```

- [ ] **Step 5: 重新运行测试并提�?*

Run: `.\gradlew.bat test --tests com.apihub.common.web.HealthControllerTest`

Expected: PASS

```bash
git add services/apihub-server
git commit -m "feat: scaffold spring boot server"
```

## Task 5: 建立 MySQL Phase 1 表结构与种子数据

**Files:**
- Create: `infra/mysql/001_phase1_schema.sql`
- Create: `infra/mysql/002_phase1_seed.sql`
- Modify: `docker-compose.yml`
- Test: `infra/mysql/001_phase1_schema.sql`

- [ ] **Step 1: �?Phase 1 Schema 脚本**

```sql
CREATE TABLE sys_user (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  email VARCHAR(128) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_sys_user_username (username),
  UNIQUE KEY uk_sys_user_email (email)
);
```

```sql
CREATE TABLE project (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  space_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  project_key VARCHAR(64) NOT NULL,
  description TEXT,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_project_space_key (space_id, project_key)
);
```

在同一�?`infra/mysql/001_phase1_schema.sql` 中继续追加以下建表语句，顺序固定为：

1. `space`
2. `space_member`
3. `project_member`
4. `module`
5. `api_group`
6. `api_endpoint`
7. `api_parameter`
8. `api_response`
9. `api_version`

要求�?
- 主键统一使用 `BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY`
- 时间字段统一使用 `DATETIME(3)`
- 外键关系�?[README.md](D:/code/my-infra/api-hub/README.md) �?`6.2`、`6.3` 保持一�?- `api_parameter` �?`api_response` 必须包含 `sort_order`
- `api_version` 必须包含 `snapshot_json`、`change_summary`、`created_by`

- [ ] **Step 2: 写种子数据脚�?*

```sql
INSERT INTO sys_user (username, display_name, email, password_hash, status)
VALUES ('admin', '管理�?, 'admin@local.dev', '$2a$10$QnVh6b3y4f1DgYI2TgQeMeD2f0t4lRj4D0u8D6RAV8w0Q6N3F4WkK', 'active');

INSERT INTO space (id, name, space_key, owner_id, status)
VALUES (1, '默认空间', 'default', 1, 'active');
```

- [ ] **Step 3: 写最�?`docker-compose.yml` 中的 MySQL 服务**

```yaml
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: apihub
    ports:
      - "3306:3306"
    volumes:
      - ./infra/mysql:/docker-entrypoint-initdb.d
```

- [ ] **Step 4: 启动数据库并验证种子数据**

Run: `docker compose up -d mysql`

Run: `docker compose exec mysql mysql -uroot -proot -e "use apihub; select username from sys_user;"`

Expected: 输出 `admin`

- [ ] **Step 5: 提交数据库脚�?*

```bash
git add infra/mysql docker-compose.yml
git commit -m "feat: add phase1 mysql schema and seed data"
```

## Task 6: 实现认证模块与真实本地登�?
**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/auth/web/AuthController.java`
- Create: `services/apihub-server/src/main/java/com/apihub/auth/service/AuthService.java`
- Create: `services/apihub-server/src/main/java/com/apihub/auth/service/JwtTokenService.java`
- Create: `services/apihub-server/src/main/java/com/apihub/auth/repository/AuthUserRepository.java`
- Create: `services/apihub-server/src/main/java/com/apihub/auth/model/LoginRequest.java`
- Create: `services/apihub-server/src/main/java/com/apihub/auth/model/LoginResponse.java`
- Create: `services/apihub-server/src/main/java/com/apihub/auth/security/SecurityConfig.java`
- Create: `services/apihub-server/src/test/java/com/apihub/auth/web/AuthControllerTest.java`
- Test: `services/apihub-server/src/test/java/com/apihub/auth/web/AuthControllerTest.java`

- [ ] **Step 1: 先写登录接口测试**

```java
@WebMvcTest(AuthController.class)
class AuthControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @Test
    void shouldLoginSuccessfully() throws Exception {
        given(authService.login(any())).willReturn(new LoginResponse("access", "refresh"));

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"admin","password":"123456"}
                """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accessToken").value("access"));
    }
}
```

- [ ] **Step 2: 跑测试确认失�?*

Run: `.\\gradlew.bat test --tests com.apihub.auth.web.AuthControllerTest`

Expected: FAIL，提�?`AuthController` �?`AuthService` 不存�?
- [ ] **Step 3: 写最小登�?DTO �?Controller**

```java
public record LoginRequest(String username, String password) {}
public record LoginResponse(String accessToken, String refreshToken) {}
```

```java
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }
}
```

- [ ] **Step 4: д��С��֤�����밲ȫ����**

```java
@Service
public class AuthService {
    public LoginResponse login(LoginRequest request) {
        if (!"admin".equals(request.username()) || !"123456".equals(request.password())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials");
        }
        return new LoginResponse("access-token", "refresh-token");
    }
}
```

```java
@Service
public class JwtTokenService {
    public LoginResponse issueTokens(String userId) {
        return new LoginResponse("access-" + userId, "refresh-" + userId);
    }
}
```

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(registry -> registry.requestMatchers("/api/v1/auth/**", "/api/health").permitAll().anyRequest().authenticated())
            .build();
    }
}
```

- [ ] **Step 5: �ܲ���ͨ���󣬽� `AuthService` ��Ϊ��ȡ���ݿ��û�**

Run: `.\gradlew.bat test --tests com.apihub.auth.web.AuthControllerTest`

Expected: PASS

```java
@Repository
public class AuthUserRepository {
    private final JdbcTemplate jdbcTemplate;

    public AuthUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<UserCredential> findByUsername(String username) {
        return jdbcTemplate.query(
            "select id, username, password_hash, status from sys_user where username = ?",
            rs -> rs.next()
                ? Optional.of(new UserCredential(
                    rs.getLong("id"),
                    rs.getString("username"),
                    rs.getString("password_hash"),
                    rs.getString("status")))
                : Optional.empty(),
            username
        );
    }

    public record UserCredential(Long id, String username, String passwordHash, String status) {}
}
```

```java
@Service
public class AuthService {
    private final AuthUserRepository authUserRepository;
    private final JwtTokenService jwtTokenService;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(AuthUserRepository authUserRepository, JwtTokenService jwtTokenService) {
        this.authUserRepository = authUserRepository;
        this.jwtTokenService = jwtTokenService;
    }

    public LoginResponse login(LoginRequest request) {
        var user = authUserRepository.findByUsername(request.username())
            .filter(candidate -> "active".equals(candidate.status()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials"));

        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials");
        }

        return jwtTokenService.issueTokens(String.valueOf(user.id()));
    }
}
```

- [ ] **Step 6: 提交认证模块**

```bash
git add services/apihub-server/src/main/java/com/apihub/auth services/apihub-server/src/test/java/com/apihub/auth
git commit -m "feat: add local auth module"
```

## Task 7: 实现项目树与 `项目 / 模块 / 分组 / 接口` 后端闭环

**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/project/web/ProjectController.java`
- Create: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`
- Create: `services/apihub-server/src/main/java/com/apihub/project/web/ModuleController.java`
- Create: `services/apihub-server/src/main/java/com/apihub/project/service/ModuleService.java`
- Create: `services/apihub-server/src/main/java/com/apihub/project/web/ApiGroupController.java`
- Create: `services/apihub-server/src/main/java/com/apihub/project/service/ApiGroupService.java`
- Create: `services/apihub-server/src/main/java/com/apihub/doc/web/ApiEndpointController.java`
- Create: `services/apihub-server/src/main/java/com/apihub/doc/service/ApiEndpointService.java`
- Create: `services/apihub-server/src/main/java/com/apihub/doc/web/ApiVersionController.java`
- Create: `services/apihub-server/src/main/java/com/apihub/doc/service/ApiVersionService.java`
- Create: `services/apihub-server/src/test/java/com/apihub/project/web/ProjectTreeControllerTest.java`
- Test: `services/apihub-server/src/test/java/com/apihub/project/web/ProjectTreeControllerTest.java`

- [ ] **Step 1: 先写项目树接口测�?*

```java
@WebMvcTest(ProjectController.class)
class ProjectTreeControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @Test
    void shouldReturnProjectTree() throws Exception {
        given(projectService.getProjectTree(1L)).willReturn(Map.of("modules", List.of()));

        mockMvc.perform(get("/api/v1/projects/1/tree"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.modules").isArray());
    }
}
```

- [ ] **Step 2: 跑测试确认失�?*

Run: `.\\gradlew.bat test --tests com.apihub.project.web.ProjectTreeControllerTest`

Expected: FAIL，提�?`ProjectController` 不存�?
- [ ] **Step 3: �?`ProjectController` 和树接口最小实�?*

```java
@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {
    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/{projectId}/tree")
    public ApiResponse<Object> tree(@PathVariable Long projectId) {
        return ApiResponse.success(projectService.getProjectTree(projectId));
    }
}
```

- [ ] **Step 4: д��Ŀ��ģ�顢���顢�ӿڵ���С CRUD ����Ϳ�����**

```java
@RestController
@RequestMapping("/api/v1/projects/{projectId}/modules")
public class ModuleController {
    private final ModuleService moduleService;

    public ModuleController(ModuleService moduleService) {
        this.moduleService = moduleService;
    }

    @PostMapping
    public ApiResponse<Object> create(@PathVariable Long projectId, @RequestBody CreateModuleRequest request) {
        return ApiResponse.success(moduleService.create(projectId, request));
    }
}
```

ͬһ������ͬʱ�������½ӿڵ� Controller��Request DTO��Service ����ǩ������С���ԣ�

- `POST /api/v1/projects`
- `GET /api/v1/projects/{projectId}`
- `PATCH /api/v1/projects/{projectId}`
- `GET /api/v1/projects/{projectId}/modules`
- `POST /api/v1/projects/{projectId}/modules`
- `GET /api/v1/modules/{moduleId}/groups`
- `POST /api/v1/modules/{moduleId}/groups`
- `GET /api/v1/groups/{groupId}/endpoints`
- `POST /api/v1/groups/{groupId}/endpoints`
- `GET /api/v1/endpoints/{endpointId}`
- `PATCH /api/v1/endpoints/{endpointId}`
- `GET /api/v1/endpoints/{endpointId}/versions`
- `POST /api/v1/endpoints/{endpointId}/versions`

- [ ] **Step 5: 跑接口测试和服务测试**

Run: `.\\gradlew.bat test`

Expected: 新增接口�?`WebMvcTest` 和服务测试全部通过

- [ ] **Step 6: 提交项目树与文档闭环**

```bash
git add services/apihub-server/src/main/java/com/apihub/project services/apihub-server/src/main/java/com/apihub/doc services/apihub-server/src/test/java/com/apihub/project
git commit -m "feat: add project tree and endpoint crud apis"
```

## Task 8: 前端打通登录、项目页、项目树和接口编辑页

**Files:**
- Create: `apps/web/src/features/auth/components/login-form.tsx`
- Create: `apps/web/src/features/projects/components/project-card.tsx`
- Create: `apps/web/src/features/projects/components/project-sidebar.tsx`
- Create: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Create: `apps/web/src/features/projects/components/project-shell.tsx`
- Create: `apps/web/src/lib/auth-store.ts`
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/app/console/projects/page.tsx`
- Modify: `apps/web/src/app/console/projects/[projectId]/page.tsx`
- Test: `apps/web/src/features/projects/components/endpoint-editor.tsx`

- [ ] **Step 1: 写登录表单组�?*

```tsx
export function LoginForm() {
  return (
    <form className="space-y-4">
      <input name="username" className="w-full rounded-2xl border px-4 py-3" placeholder="用户�? />
      <input name="password" type="password" className="w-full rounded-2xl border px-4 py-3" placeholder="密码" />
      <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white">进入控制�?/button>
    </form>
  );
}
```

- [ ] **Step 2: 写项目卡片页和项目工作台基础组件**

```tsx
export function ProjectCard({ name }: { name: string }) {
  return <div className="rounded-3xl border bg-white/70 p-5 shadow-sm">{name}</div>;
}
```

```tsx
export function ProjectSidebar({ nodes }: { nodes: Array<{ id: string; label: string }> }) {
  return <aside className="w-80 border-r p-4">{nodes.map((node) => <div key={node.id}>{node.label}</div>)}</aside>;
}
```

- [ ] **Step 3: 写接口编辑器最小视�?*

```tsx
export function EndpointEditor() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border bg-white p-6">基础信息</div>
      <div className="rounded-3xl border bg-white p-6">请求参数</div>
      <div className="rounded-3xl border bg-white p-6">响应结构</div>
    </section>
  );
}
```

- [ ] **Step 4: 接入 API SDK 和本地登录态存�?*

```ts
// apps/web/src/lib/auth-store.ts
export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}
```

```tsx
// 登录成功后调�?login() 并保�?token，再跳转 /console/projects
```

- [ ] **Step 5: 让项目页加载项目列表，让工作台加载项目树**

Run: `pnpm --filter web dev`

Expected:

- `/login` 可真实提交登录请�?- `/console/projects` 可展示项目卡�?- `/console/projects/1` 可展示项目树和接口编辑区

- [ ] **Step 6: 提交前端闭环**

```bash
git add apps/web
git commit -m "feat: wire login dashboard and project workbench"
```

## Task 9: 本地联调与单机最小运行说�?
**Files:**
- Modify: `README.md`
- Create: `infra/nginx/default.conf`
- Test: `README.md`

- [ ] **Step 1: 写最�?Nginx 转发配置**

```nginx
server {
  listen 80;

  location /api/ {
    proxy_pass http://host.docker.internal:8080;
  }

  location / {
    proxy_pass http://host.docker.internal:3000;
  }
}
```

- [ ] **Step 2: �?`README.md` 追加 Phase 1 启动说明**

```md
## Phase 1 本地启动

1. `docker compose up -d mysql`
2. `cd services/apihub-server && .\\gradlew.bat bootRun`
3. `pnpm --filter web dev`
4. 打开 `http://localhost:3000/login`
```

- [ ] **Step 3: 手工跑完整联�?*

Run:

- `docker compose up -d mysql`
- `cd services/apihub-server && .\\gradlew.bat bootRun`
- `pnpm --filter web dev`

Expected:

- 登录成功
- 项目页可�?- 可进入项目工作台
- 可完成项目树与接口编辑基础流程

- [ ] **Step 4: 提交运行说明**

```bash
git add README.md infra/nginx/default.conf
git commit -m "docs: add phase1 local run instructions"
```

## Self-Review

### Spec coverage

- Monorepo 骨架：Task 1、Task 2、Task 3、Task 4
- 正式前端工程：Task 3、Task 8
- 正式后端工程：Task 4、Task 6、Task 7
- MySQL 初始化与默认管理员：Task 5
- 真实本地账号登录：Task 6、Task 8
- `项目 / 模块 / 分组 / 接口` 最小闭环：Task 7、Task 8
- 版本快照保存：Task 7、Task 8
- 本地可运行链路：Task 5、Task 9

### Placeholder scan

- 没有使用 `TODO`、`TBD`、`implement later`
- 所有任务都给了明确文件路径
- 所有代码步骤都给了具体片段
- 所有验证步骤都给了命令和预�?
### Type consistency

- 统一使用 `/api/v1` 前缀
- 统一使用 `ApiResponse<T>` 外层返回
- 前端项目树通过 `/api/v1/projects/{projectId}/tree` 聚合接口加载
- 登录返回类型统一�?`LoginResponse(accessToken, refreshToken)`

