# Project AI Assistant RAG Design

> Date: 2026-04-15
> Scope: project-level AI assistant page, endpoint-document indexing, and cited answers built from existing endpoint docs and DocPush-imported content only

## Goal

Add a project-level AI assistant that can answer questions about the current project's API documentation using indexed endpoint content and return source references with each answer.

This should make the AI layer feel useful immediately without introducing a full cross-project search engine or a separate vector database dependency.

## Current State

The AI stack already supports:

- project-level provider/model settings
- endpoint description generation
- mock generation
- code snippet generation
- test case suggestion generation
- impact analysis generation

What is still missing is a retrieval layer. Answers are generated only from the selected endpoint context, so the product has no reusable project-level knowledge base for questions like:

- "Which endpoints accept a token header?"
- "What fields are required for order creation?"
- "Show the related response schema for this interface"

## Approaches Considered

### 1. Prompt-only assistant

Pros:

- fastest to ship
- no new persistence or indexing model

Cons:

- answers are limited to a single endpoint context
- cannot answer project-wide questions reliably
- no stable citations

### 2. Lightweight project RAG with indexed endpoint chunks

Pros:

- covers the exact need: project-level API Q&A
- can reuse current database and service layer
- supports citations and incremental reindexing
- no external vector store required for the first version

Cons:

- retrieval quality is weaker than embedding-based semantic search
- ranking must be implemented carefully

### 3. Full vector-based knowledge base

Pros:

- best retrieval quality and future scalability

Cons:

- much larger scope
- requires additional embedding, storage, and lifecycle management decisions

## Recommendation

Use approach 2.

Build a lightweight project RAG layer that indexes endpoint documentation into chunk rows, scores chunks with lexical overlap, and sends the top matches to the existing AI gateway for answer synthesis. This keeps the feature practical, debuggable, and aligned with the current codebase.

## UX Design

### 1. AI assistant page

Add a dedicated project console page named `AI助手`.

Layout:

- left: question composer and optional scope hints
- center: answer card with generated response
- right: source references and matched endpoints

Visual direction:

- premium but restrained console look
- strong typographic hierarchy
- soft glass cards and neutral surfaces
- no oversized hero treatment
- no fake consumer-app styling

### 2. Interaction flow

The assistant page should support:

- asking a question in natural language
- selecting optional scope hints such as endpoint, module, or "current project"
- generating an answer with source citations
- opening referenced endpoints directly from the result panel

### 3. Result presentation

Each answer should include:

- a concise answer
- a confidence or coverage hint when the context is sparse
- a list of cited chunks/endpoints
- a "not enough context" message when the project index does not contain enough material

## Architecture

### Backend knowledge index

Create a small project-scoped knowledge table for document chunks.

Each chunk should store:

- `id`
- `project_id`
- `endpoint_id`
- `source_type`
- `source_ref`
- `chunk_order`
- `title`
- `content`
- timestamps

Do not add MySQL foreign keys. Keep the table self-contained and rely on application-level cleanup.

Index sources:

- endpoint metadata
- parameters
- responses
- imported documentation payloads that already map to endpoints

### Retrieval flow

1. Receive a user question for a project.
2. Tokenize the question and score indexed chunks by lexical overlap.
3. Load the top matches and build a compact context bundle.
4. Call the existing AI gateway with a retrieval-aware prompt.
5. Return:
   - answer text
   - cited references
   - matched endpoint metadata

### Reindexing flow

Reindex chunks whenever endpoint documentation changes through the existing write paths:

- create endpoint
- update endpoint
- replace parameters
- replace responses
- delete endpoint
- import endpoint docs

The indexing layer should be service-based so the project service and import service can call it directly without duplicating logic.

## Data Model

The assistant response should carry:

- question
- answer
- references
- matched endpoint ids
- a `hasContext` flag for empty or weak matches

Reference items should include:

- endpoint name
- HTTP method
- path
- source title
- source snippet

## Error Handling

- If AI settings are missing or disabled, return a clear project-level configuration error.
- If the question is empty, return `400`.
- If retrieval finds no useful chunks, return a normal response that says the project knowledge base did not contain enough relevant context.
- If the model fails, surface a `502` with a provider error summary.

## Testing Strategy

1. add backend coverage for chunk indexing and project-question retrieval
2. add backend coverage for reindexing after endpoint and import writes
3. add frontend coverage for the assistant page loading and submitting
4. run backend compile and frontend build

## Non-Goals

- cross-project global search
- embedding generation or external vector storage
- document editing inside the assistant page
- chat history persistence
- multi-turn conversation memory

