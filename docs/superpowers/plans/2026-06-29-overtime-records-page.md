# 完整迁移原型 UI 的插件详情页任务计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 EHR 汇总行增加详情入口，并把 `D:\Codes\projects\overtime-records` 的完整 React 原型 UI 迁移为扩展内详情页。

**Architecture:** 使用 WXT React 页面入口承载完整详情页 UI，content script 负责 EHR 页面按钮和 staffId 缓存，background 负责打开扩展页面并继续处理统计消息。首期只把当前月真实统计接入月度总览，其余模块保留原型数据和可浏览 UI。

**Tech Stack:** WXT, TypeScript, React, Radix UI, lucide-react, Recharts, Chrome Extension Manifest V3

---

## Summary

第一版一次性迁移 `D:\Codes\projects\overtime-records` 的完整 React 原型 UI 到当前 WXT Chrome 插件中，包括月度总览、历史对比、调休管理、设置备份、成就展示等页面结构和视觉风格。业务功能分阶段接入：首期只把 EHR 当前统计数据接到“月度总览”，其余模块先保留原型 UI 和本地模拟数据/占位状态。

## Implementation Tasks

### Task 1: WXT/React 配置

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `wxt.config.ts`

- [ ] 安装 React、WXT React 模块、Radix UI、lucide-react、Recharts、原型 UI 运行时依赖。
- [ ] 在 `wxt.config.ts` 启用 `@wxt-dev/module-react`。

### Task 2: 迁移原型页面

**Files:**
- Create: `entrypoints/records/index.html`
- Create: `entrypoints/records/main.tsx`
- Create: `entrypoints/records/App.tsx`
- Create: `entrypoints/records/index.css`
- Create: `entrypoints/records/components/**`

- [ ] 将原型 `App.tsx`、`components/`、编译后的 `index.css` 复制到 `entrypoints/records`。
- [ ] 使用 React root 挂载完整原型 UI。
- [ ] 保持四个 Tab 和原型视觉结构完整可浏览。

### Task 3: 打通插件页面入口

**Files:**
- Modify: `types/index.ts`
- Modify: `entrypoints/background.ts`
- Modify: `entrypoints/ehr.content.ts`

- [ ] 扩展消息类型，新增 `openRecordsPage`。
- [ ] background 收到 `openRecordsPage` 后打开 `browser.runtime.getURL('/records.html')`。
- [ ] content script 在 EHR 汇总行右侧增加“查看详情”按钮。
- [ ] content script 读取到 `staffId` 后写入 `browser.storage.local`。

### Task 4: 当前月真实数据接入

**Files:**
- Modify: `entrypoints/records/components/MonthlyOverview.tsx`

- [ ] 页面初始化读取 `browser.storage.local.staffId`。
- [ ] 当前月份发送 `getOvertimeStats` 消息。
- [ ] 月度总览统计卡片和明细表格优先使用真实数据。
- [ ] 无 staffId、请求中、请求失败、空数据都有明确 UI 状态。

### Task 5: 验证

**Commands:**
- `pnpm test`
- `pnpm build`

- [ ] 现有单测通过。
- [ ] WXT 能构建 content script、background 和 `records.html`。
- [ ] 手动验证 EHR 页面按钮、详情页打开、四个 Tab 可切换、当前月数据可展示。

## Assumptions

- 第一版接受增加 React/Radix/Recharts 等依赖，优先保证原型 UI 完整迁移。
- 非核心业务模块先使用原型模拟数据。
- 插件页面打开为扩展内新标签页，不做 popup 或 options page。
- 首期真实数据只要求打通当前已具备的 EHR 加班统计能力。
