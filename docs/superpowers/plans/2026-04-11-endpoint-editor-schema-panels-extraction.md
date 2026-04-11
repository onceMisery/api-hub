# Endpoint Editor Schema Panels Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 继续拆分 `endpoint-editor.tsx`，把请求参数和响应结构两块抽为独立组件，进一步降低主文件复杂度。

**Architecture:** 维持现有状态与保存逻辑不变，只抽离纯展示和输入区域。主编辑器继续持有 `parameterRows` / `responseRows` 及保存回调，子组件通过 props 接收数据和更新函数。

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: 提取 Request Parameters 面板

**Files:**
- Create: `apps/web/src/features/projects/components/endpoint-parameters-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`

- [ ] **Step 1: 抽取请求参数列表与保存按钮**

- [ ] **Step 2: 跑回归测试确认行为不变**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: PASS

### Task 2: 提取 Response Structure 面板

**Files:**
- Create: `apps/web/src/features/projects/components/endpoint-responses-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`

- [ ] **Step 1: 抽取响应结构列表与保存按钮**

- [ ] **Step 2: 跑回归测试和构建**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`
Expected: PASS

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 3: 提交拆分结果**

```bash
git add docs/superpowers/plans/2026-04-11-endpoint-editor-schema-panels-extraction.md apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/endpoint-parameters-panel.tsx apps/web/src/features/projects/components/endpoint-responses-panel.tsx
git commit -m "refactor: extract endpoint editor schema panels"
```
