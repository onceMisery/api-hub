# Endpoint Editor Panel Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 拆分 `endpoint-editor.tsx` 中最重的面板区域，降低主文件复杂度，同时保持现有行为和测试结果不变。

**Architecture:** 不改接口契约和状态流，只把 `Published Runtime` 与 `Versions` 提取为独立展示组件。主编辑器继续保留状态、事件和数据计算，子组件只接收只读 props 和回调。

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: 提取共享展示组件

**Files:**
- Create: `apps/web/src/features/projects/components/endpoint-editor-shared.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`

- [ ] **Step 1: 抽出 `EditorPanel` / `Field` / `PreviewMetric` 到共享文件**

- [ ] **Step 2: 重跑编辑器测试确认无行为变化**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: PASS

### Task 2: 提取 Published Runtime 面板

**Files:**
- Create: `apps/web/src/features/projects/components/published-runtime-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`

- [ ] **Step 1: 把发布态摘要、差异、快照明细抽到独立组件**

- [ ] **Step 2: 重跑编辑器测试确认发布态相关行为不变**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: PASS

### Task 3: 提取 Versions 面板

**Files:**
- Create: `apps/web/src/features/projects/components/endpoint-version-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`

- [ ] **Step 1: 把版本对比和快照保存 UI 抽到独立组件**

- [ ] **Step 2: 跑回归测试和构建**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`
Expected: PASS

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 3: 提交拆分结果**

```bash
git add docs/superpowers/plans/2026-04-11-endpoint-editor-panel-extraction.md apps/web/src/features/projects/components/endpoint-editor*.tsx apps/web/src/features/projects/components/published-runtime-panel.tsx
git commit -m "refactor: extract endpoint editor panels"
```
