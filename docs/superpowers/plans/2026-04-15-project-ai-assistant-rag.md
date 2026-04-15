# Project AI Assistant RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a project-level AI assistant that answers questions from indexed endpoint documentation and returns cited references.

**Architecture:** Store endpoint documentation chunks in a project-scoped index table, rank chunks with lightweight lexical scoring, and feed the top matches into the existing AI gateway for answer synthesis. Hook the indexer into endpoint write/import paths so the assistant stays current without a separate sync job.

**Tech Stack:** Spring Boot, JDBC/JdbcTemplate, Jackson, Next.js, React, TypeScript, existing `@api-hub/api-sdk`

---

### Task 1: Add knowledge chunk storage and DTOs

**Files:**
- Create: `services/apihub-server/src/main/resources/db/migration/V20__ai_knowledge_chunks.sql`
- Modify: `services/apihub-server/src/main/java/com/apihub/ai/model/AiDtos.java`

- [ ] **Step 1: Add the persistence schema**

Create a chunk table with these columns:

```sql
create table ai_knowledge_chunk (
    id bigint primary key auto_increment,
    project_id bigint not null,
    endpoint_id bigint null,
    source_type varchar(32) not null,
    source_ref varchar(128) not null,
    chunk_order int not null,
    title varchar(255) not null,
    content text not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp on update current_timestamp,
    index idx_ai_knowledge_chunk_project (project_id),
    index idx_ai_knowledge_chunk_endpoint (endpoint_id),
    index idx_ai_knowledge_chunk_source (source_type, source_ref)
);
```

- [ ] **Step 2: Extend AI DTOs**

Add request/response records for assistant Q&A:

```java
public record AskProjectQuestionRequest(String question, Long endpointId, String scopeHint) {}
public record AiReferenceItem(String title, String method, String path, String sourceType, String snippet, Long endpointId) {}
public record ProjectAiAnswerResult(String question, String answer, boolean hasContext, List<AiReferenceItem> references, List<Long> matchedEndpointIds) {}
```

- [ ] **Step 3: Verify the DTO signatures compile**

Run:

```powershell
mvn -q -DskipTests compile
```

Expected: compilation reaches the AI module without symbol errors.

### Task 2: Build the knowledge index and retrieval service

**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/ai/repository/AiKnowledgeChunkRepository.java`
- Create: `services/apihub-server/src/main/java/com/apihub/ai/service/AiRagService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/ai/service/AiGatewayService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/ai/service/AiFeatureService.java`

- [ ] **Step 1: Implement chunk persistence**

Repository responsibilities:

```java
List<KnowledgeChunkRecord> listByProject(Long projectId);
void replaceChunks(Long projectId, Long endpointId, List<KnowledgeChunkUpsertItem> chunks);
void deleteByEndpoint(Long endpointId);
```

Keep it JDBC-only and do not introduce foreign keys.

- [ ] **Step 2: Implement lexical ranking**

Create a small service that:

```java
List<KnowledgeChunkRecord> rankChunks(String question, List<KnowledgeChunkRecord> chunks, int limit);
```

Use normalized token overlap on question + chunk title + chunk content. Favor endpoint-path and field-name matches. Keep the scoring deterministic and easy to debug.

- [ ] **Step 3: Build the answer synthesis flow**

Add a method that:

```java
ProjectAiAnswerResult answerQuestion(Long userId, Long projectId, AskProjectQuestionRequest request);
```

Flow:

1. validate the project is accessible
2. load the project chunks
3. rank the top matches
4. build a compact retrieval prompt
5. call the existing AI gateway
6. parse and return the answer plus references

- [ ] **Step 4: Make the AI prompt retrieval-aware**

Add a system prompt that explicitly says:

```text
You are answering from the provided API documentation context only.
If the context is insufficient, say so instead of inventing details.
Always cite the most relevant endpoints/chunks from the context.
```

- [ ] **Step 5: Verify the service compiles**

Run:

```powershell
mvn -q -DskipTests compile
```

### Task 3: Expose the assistant API

**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/ai/web/ProjectAiAssistantController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/ai/service/AiFeatureService.java`
- Modify: `packages/api-sdk/src/modules/projects.ts`

- [ ] **Step 1: Add the controller**

Expose:

```http
POST /api/v1/projects/{projectId}/ai/ask
```

Body:

```json
{ "question": "How do I create an order?", "endpointId": 123, "scopeHint": "current project" }
```

- [ ] **Step 2: Wire the service**

Keep the controller thin. It should delegate to the new RAG service and only handle request/response mapping.

- [ ] **Step 3: Add SDK methods**

Add a typed request/response pair so the frontend can call the new endpoint without ad hoc fetch logic.

- [ ] **Step 4: Verify the API contract compiles**

Run:

```powershell
mvn -q -DskipTests compile
```

### Task 4: Reindex documentation on writes

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectImportService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/repository/EndpointRepository.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/ai/service/AiRagService.java`

- [ ] **Step 1: Hook endpoint lifecycle mutations**

After these operations, refresh the affected endpoint chunks:

```java
createEndpoint(...)
updateEndpoint(...)
replaceParameters(...)
replaceResponses(...)
deleteEndpoint(...)
```

- [ ] **Step 2: Hook imports**

After endpoint creation/update during OpenAPI/SmartDoc/Postman/HAR import, call the indexer for each imported endpoint.

- [ ] **Step 3: Remove stale chunks**

When an endpoint is deleted, delete its chunks from the index immediately so the assistant never cites removed docs.

- [ ] **Step 4: Verify no stale references remain**

Run the import and endpoint update paths once through the main tests or a small manual smoke flow, then confirm the assistant index still resolves current endpoint IDs only.

### Task 5: Build the AI assistant page

**Files:**
- Create: `apps/web/src/features/console/ai-assistant-screen.tsx`
- Create: `apps/web/src/app/console/projects/[projectId]/ai-assistant/page.tsx`
- Modify: `apps/web/src/features/console/project-console-layout.tsx`

- [ ] **Step 1: Add a project console nav entry**

Add `AI助手` beside the existing `AI配置` entry. Keep `AI配置` as the settings page and route the assistant page to a separate tab.

- [ ] **Step 2: Build the assistant UI**

Use a three-part layout:

```tsx
<QuestionComposer />
<AnswerCard />
<ReferenceList />
```

Keep the page in the current premium console language: neutral surfaces, crisp borders, compact spacing, and a strong answer block.

- [ ] **Step 3: Wire the API call**

The page should:

1. submit the question
2. show a loading state
3. render the returned answer
4. render cited references
5. show an empty-state hint when the project index is sparse

- [ ] **Step 4: Reuse existing project shell patterns**

Keep the page inside `ProjectConsoleLayout` and match the existing workbench chrome instead of introducing a new visual system.

- [ ] **Step 5: Verify the frontend build**

Run:

```powershell
pnpm.cmd --filter web build
```

### Task 6: Validate end to end

**Files:**
- Modify as needed from Tasks 1-5

- [ ] **Step 1: Run backend compile**

```powershell
mvn -q -DskipTests compile
```

- [ ] **Step 2: Run frontend build**

```powershell
pnpm.cmd --filter web build
```

- [ ] **Step 3: Smoke the assistant path**

Use the assistant page against a project with at least one imported or edited endpoint and confirm:

1. the question is accepted
2. the answer is grounded in current project docs
3. references link back to known endpoints
4. deleted endpoints no longer appear in citations

