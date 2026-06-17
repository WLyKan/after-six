# 加班工时统计Chrome插件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 开发一个Chrome插件，在UBD系统页面显示从EHR系统获取的当月总加班工时

**Architecture:** 使用WXT框架构建Chrome扩展，content script负责UI注入和localStorage读取，background script负责EHR API调用，两者通过消息通信传递数据

**Tech Stack:** WXT, TypeScript, Chrome Extension Manifest V3

---

## 文件结构

| 文件路径 | 职责 |
|----------|------|
| `overtime-stats/wxt.config.ts` | WXT配置文件，声明权限和匹配规则 |
| `overtime-stats/types/index.ts` | TypeScript类型定义 |
| `overtime-stats/utils/storage.ts` | 从localStorage解析staff_id |
| `overtime-stats/utils/api.ts` | EHR API调用封装 |
| `overtime-stats/utils/calculator.ts` | 工时计算逻辑 |
| `overtime-stats/entrypoints/background.ts` | Service Worker，处理API调用和消息 |
| `overtime-stats/entrypoints/ubd.content.ts` | Content Script，UI注入和用户交互 |

---

### Task 1: 使用WXT初始化项目

**Files:**
- Create: `overtime-stats/wxt.config.ts`
- Create: `overtime-stats/package.json`
- Create: `overtime-stats/tsconfig.json`

- [ ] **Step 1: 创建项目目录**

```bash
mkdir -p overtime-stats
cd overtime-stats
```

- [ ] **Step 2: 初始化WXT项目**

```bash
npx wxt@latest init .
```

选择模板：Vanilla + TypeScript

- [ ] **Step 3: 配置wxt.config.ts**

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['activeTab'],
    host_permissions: ['https://ehr.supcon.com/*'],
  },
});
```

- [ ] **Step 4: 验证项目初始化**

```bash
npm run dev
```

Expected: 开发服务器启动成功

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize WXT project"
```

---

### Task 2: 定义TypeScript类型

**Files:**
- Create: `overtime-stats/src/types/index.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// 打卡记录响应
export interface AttendanceRecord {
  work_day: string;
  datetypename: string;
  sb_dk_time: string | null;
  xb_dk_time: string | null;
  sb_dk_time2: string | null;
  xb_dk_time2: string | null;
  sb_dk_time3: string | null;
  xb_dk_time3: string | null;
}

// API响应
export interface ApiResponse {
  data: AttendanceRecord[];
}

// 加班明细
export interface OvertimeDetail {
  work_day: string;
  datetypename: string;
  sb_dk_time: string | null;
  xb_dk_time: string | null;
  type: number; // 0: 平时, 1: 周末
  typename: string;
  startTime: Date;
  sum: number; // 毫秒
  sumString: string;
}

// 加班统计结果
export interface OvertimeStats {
  workTime: number; // 工作日加班（毫秒）
  weekTime: number; // 周末加班（毫秒）
  allTime: number;  // 总加班（毫秒）
  detailList: OvertimeDetail[];
}

// 消息类型
export interface MessageRequest {
  action: 'getOvertimeStats';
}

export interface MessageResponse {
  success: boolean;
  data?: OvertimeStats;
  error?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 3: 实现localStorage解析staff_id

**Files:**
- Create: `overtime-stats/src/utils/storage.ts`
- Test: `overtime-stats/src/utils/__tests__/storage.test.ts`

- [ ] **Step 1: 编写失败的测试**

```typescript
// src/utils/__tests__/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getStaffId } from '../storage';

describe('getStaffId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return null when personInfo not exists', () => {
    expect(getStaffId()).toBeNull();
  });

  it('should return null when personInfo is invalid JSON', () => {
    localStorage.setItem('personInfo', 'invalid');
    expect(getStaffId()).toBeNull();
  });

  it('should return null when staff_id not in personInfo', () => {
    localStorage.setItem('personInfo', JSON.stringify({ name: 'test' }));
    expect(getStaffId()).toBeNull();
  });

  it('should return staff_id when valid personInfo exists', () => {
    localStorage.setItem('personInfo', JSON.stringify({ staff_id: '12345' }));
    expect(getStaffId()).toBe('12345');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test src/utils/__tests__/storage.test.ts
```

Expected: FAIL with "getStaffId not defined"

- [ ] **Step 3: 编写最小实现**

```typescript
// src/utils/storage.ts
export function getStaffId(): string | null {
  try {
    const personInfoStr = localStorage.getItem('personInfo');
    if (!personInfoStr) return null;

    const personInfo = JSON.parse(personInfoStr);
    return personInfo.staff_id || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test src/utils/__tests__/storage.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/storage.ts src/utils/__tests__/storage.test.ts
git commit -m "feat: implement staff_id extraction from localStorage"
```

---

### Task 4: 实现EHR API调用

**Files:**
- Create: `overtime-stats/src/utils/api.ts`
- Test: `overtime-stats/src/utils/__tests__/api.test.ts`

- [ ] **Step 1: 编写失败的测试**

```typescript
// src/utils/__tests__/api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchDailyAttendance } from '../api';

describe('fetchDailyAttendance', () => {
  it('should call correct URL', async () => {
    const mockResponse = { data: [] };
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchDailyAttendance('12345', '2026-6-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('staff_id=12345'),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('work_day=2026-6-1'),
      expect.any(Object)
    );
    expect(result).toEqual(mockResponse);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test src/utils/__tests__/api.test.ts
```

Expected: FAIL with "fetchDailyAttendance not defined"

- [ ] **Step 3: 编写最小实现**

```typescript
// src/utils/api.ts
import type { ApiResponse } from '../types';

export async function fetchDailyAttendance(
  staffId: string,
  date: string
): Promise<ApiResponse> {
  const url = `https://ehr.supcon.com/RedseaPlatform/redmagicapi/rf_s_kq_count_SelectStaffIDDaily/redApiExec.mc?staff_id=${staffId}&work_day=${date}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return response.json();
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test src/utils/__tests__/api.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/api.ts src/utils/__tests__/api.test.ts
git commit -m "feat: implement EHR API call for attendance data"
```

---

### Task 5: 实现工时计算逻辑

**Files:**
- Create: `overtime-stats/src/utils/calculator.ts`
- Test: `overtime-stats/src/utils/__tests__/calculator.test.ts`

- [ ] **Step 1: 编写失败的测试**

```typescript
// src/utils/__tests__/calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateOvertime } from '../calculator';
import type { AttendanceRecord } from '../../types';

describe('calculateOvertime', () => {
  it('should return zero stats for empty records', () => {
    const result = calculateOvertime([]);
    expect(result.workTime).toBe(0);
    expect(result.weekTime).toBe(0);
    expect(result.allTime).toBe(0);
    expect(result.detailList).toHaveLength(0);
  });

  it('should calculate workday overtime correctly', () => {
    const records: AttendanceRecord[] = [
      {
        work_day: '2026-6-1',
        datetypename: '工作日',
        sb_dk_time: '2026-6-1 08:30:00',
        xb_dk_time: '2026-6-1 20:00:00',
        sb_dk_time2: null,
        xb_dk_time2: null,
        sb_dk_time3: null,
        xb_dk_time3: null,
      },
    ];

    const result = calculateOvertime(records);
    expect(result.workTime).toBeGreaterThan(0);
    expect(result.weekTime).toBe(0);
  });

  it('should calculate weekend overtime correctly', () => {
    const records: AttendanceRecord[] = [
      {
        work_day: '2026-6-7',
        datetypename: '休息日',
        sb_dk_time: '2026-6-7 09:00:00',
        xb_dk_time: '2026-6-7 18:00:00',
        sb_dk_time2: null,
        xb_dk_time2: null,
        sb_dk_time3: null,
        xb_dk_time3: null,
      },
    ];

    const result = calculateOvertime(records);
    expect(result.workTime).toBe(0);
    expect(result.weekTime).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test src/utils/__tests__/calculator.test.ts
```

Expected: FAIL with "calculateOvertime not defined"

- [ ] **Step 3: 编写实现**

```typescript
// src/utils/calculator.ts
import type { AttendanceRecord, OvertimeDetail, OvertimeStats } from '../types';

function timeToString(time: number): string {
  const second = Math.floor((time / 1000) % 60);
  const minute = Math.floor(((time / 1000) - second) / 60) % 60;
  const hour = Math.floor(((time / 1000) - second) / 60 - minute) / 60;

  return `${hour}小时${minute}分钟`;
}

export function calculateOvertime(records: AttendanceRecord[]): OvertimeStats {
  let workTime = 0;
  let weekTime = 0;
  const detailList: OvertimeDetail[] = [];

  for (const day of records) {
    const { work_day, datetypename, sb_dk_time, xb_dk_time } = day;
    const time8 = new Date(`${work_day} 08:00:00`);
    const time9 = new Date(`${work_day} 09:00:00`);

    const actualSbDk = sb_dk_time || day.sb_dk_time2 || day.sb_dk_time3;
    const actualXbDk = xb_dk_time || day.xb_dk_time2 || day.xb_dk_time3;

    if (actualSbDk && actualXbDk) {
      const minStartTime = new Date(`${work_day} 17:30:00`);
      const maxStartTime = new Date(`${work_day} 18:30:00`);
      const sbdkTime = new Date(actualSbDk);
      const xbdkTime = new Date(actualXbDk);

      if (datetypename === '工作日') {
        let startTime: Date;
        if (sbdkTime <= time8) {
          startTime = minStartTime;
        } else if (sbdkTime >= time9) {
          startTime = maxStartTime;
        } else {
          startTime = new Date(minStartTime.getTime() + (sbdkTime.getTime() - time8.getTime()));
        }

        const sum = xbdkTime.getTime() - startTime.getTime();
        detailList.push({
          work_day,
          datetypename,
          sb_dk_time: actualSbDk,
          xb_dk_time: actualXbDk,
          type: 0,
          typename: '平时',
          startTime,
          sum,
          sumString: sum > 0 ? timeToString(sum) : '0',
        });
      } else if (datetypename === '休息日' || datetypename === '法定节日') {
        const sum = xbdkTime.getTime() - sbdkTime.getTime();
        detailList.push({
          work_day,
          datetypename,
          sb_dk_time: actualSbDk,
          xb_dk_time: actualXbDk,
          type: 1,
          typename: '周末',
          startTime: sbdkTime,
          sum,
          sumString: sum > 0 ? timeToString(sum) : '0',
        });
      } else {
        const maxStartTime = new Date(`${work_day} 18:30:00`);
        if (sbdkTime < new Date(`${work_day} 18:00:00`)) {
          const sum = xbdkTime.getTime() - maxStartTime.getTime();
          detailList.push({
            work_day,
            datetypename,
            sb_dk_time: actualSbDk,
            xb_dk_time: actualXbDk,
            type: 0,
            typename: '平时',
            startTime: maxStartTime,
            sum,
            sumString: sum > 0 ? timeToString(sum) : '0',
          });
        }
      }
    }
  }

  detailList.forEach((item) => {
    if (item.type === 0 && item.sum > 0) {
      workTime += item.sum;
    }
    if (item.type === 1 && item.sum > 0) {
      weekTime += item.sum;
    }
  });

  return {
    workTime,
    weekTime,
    allTime: workTime + weekTime,
    detailList,
  };
}

export function getDaysArray(year: number, month: number): string[] {
  const currentMonth = new Date(year, month, 0);
  const dayCount = currentMonth.getDate();
  const dayArray: string[] = [];

  for (let day = 1; day <= dayCount; day++) {
    dayArray.push(`${year}-${month}-${day}`);
  }

  return dayArray;
}

export { timeToString };
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test src/utils/__tests__/calculator.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/calculator.ts src/utils/__tests__/calculator.test.ts
git commit -m "feat: implement overtime calculation logic"
```

---

### Task 6: 实现Background Script

**Files:**
- Create: `overtime-stats/src/entrypoints/background.ts`

- [ ] **Step 1: 实现Service Worker**

```typescript
// src/entrypoints/background.ts
import { fetchDailyAttendance } from '../utils/api';
import { calculateOvertime, getDaysArray } from '../utils/calculator';
import type { MessageRequest, MessageResponse } from '../types';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(
    (
      request: MessageRequest,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      if (request.action === 'getOvertimeStats') {
        handleGetOvertimeStats()
          .then(sendResponse)
          .catch((error) => {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
        return true; // 保持消息通道开放
      }
    }
  );
});

async function handleGetOvertimeStats(): Promise<MessageResponse> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 从消息中获取staff_id（由content script传递）
    // 这里需要先从storage获取staff_id
    const staffId = await getStaffIdFromStorage();

    if (!staffId) {
      return {
        success: false,
        error: '无法获取工号，请确认已登录系统',
      };
    }

    const days = getDaysArray(year, month);
    const promises = days.map((day) => fetchDailyAttendance(staffId, day));
    const results = await Promise.all(promises);

    const validRecords = results
      .filter((r) => r.data && r.data.length > 0)
      .map((r) => r.data[0]);

    const stats = calculateOvertime(validRecords);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取数据失败',
    };
  }
}

async function getStaffIdFromStorage(): Promise<string | null> {
  // 从content script接收的staff_id缓存
  const result = await chrome.storage.local.get('staffId');
  return result.staffId || null;
}
```

- [ ] **Step 2: 验证Background Script**

```bash
npm run dev
```

在Chrome中加载扩展，检查Service Worker是否正常运行

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/background.ts
git commit -m "feat: implement background service worker"
```

---

### Task 7: 实现Content Script

**Files:**
- Create: `overtime-stats/src/entrypoints/ubd.content.ts`

- [ ] **Step 1: 实现Content Script**

```typescript
// src/entrypoints/ubd.content.ts
import { getStaffId } from '../utils/storage';

export default defineContentScript({
  matches: ['*://ubd.supcon.com/*'],
  main() {
    initOvertimeStats();
  },
});

async function initOvertimeStats() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const container = document.querySelector(
      '#desktopSectionArea > div:nth-child(2) > div > div > div:nth-child(3) > div > div > div'
    );

    if (container) {
      await injectOvertimeStats(container as HTMLElement);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }

  console.warn('目标容器未找到');
}

async function injectOvertimeStats(container: HTMLElement) {
  const staffId = getStaffId();

  if (!staffId) {
    appendMessage(container, '未登录系统');
    return;
  }

  // 先缓存staff_id到storage供background使用
  await chrome.storage.local.set({ staffId });

  // 显示加载中
  const loadingEl = appendMessage(container, '加载中...');

  // 发送消息给background获取数据
  chrome.runtime.sendMessage(
    { action: 'getOvertimeStats' },
    (response) => {
      loadingEl.remove();

      if (response.success && response.data) {
        const { allTime } = response.data;
        const hour = Math.floor(allTime / 1000 / 60 / 60);
        const minute = Math.floor((allTime / 1000 / 60) % 60);
        appendMessage(container, `本月加班: ${hour}小时${minute}分钟`);
      } else {
        appendMessage(container, response.error || '数据获取失败');
      }
    }
  );
}

function appendMessage(container: HTMLElement, text: string): HTMLElement {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = `
    font-size: 14px;
    padding: 8px 0;
    color: #333;
    text-align: left;
  `;
  container.appendChild(div);
  return div;
}
```

- [ ] **Step 2: 验证Content Script**

```bash
npm run dev
```

访问UBD页面，检查统计文案是否显示

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/ubd.content.ts
git commit -m "feat: implement content script for UBD page injection"
```

---

### Task 8: 集成测试与调试

**Files:**
- Modify: `overtime-stats/src/entrypoints/background.ts`
- Modify: `overtime-stats/src/entrypoints/ubd.content.ts`

- [ ] **Step 1: 构建生产版本**

```bash
npm run build
```

- [ ] **Step 2: 在Chrome中加载扩展**

1. 打开 `chrome://extensions/`
2. 开启开发者模式
3. 加载已解压的扩展程序
4. 选择 `overtime-stats/.output/chrome-mv3` 目录

- [ ] **Step 3: 测试功能**

1. 访问UBD系统 (https://ubd.supcon.com/ubd/)
2. 检查目标容器底部是否显示加班统计
3. 测试错误场景（未登录等）

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: final integration and testing"
```

---

### Task 9: 打包发布

**Files:**
- Modify: `overtime-stats/package.json`

- [ ] **Step 1: 更新package.json版本号**

```json
{
  "version": "1.0.0",
  "name": "overtime-stats"
}
```

- [ ] **Step 2: 构建生产版本**

```bash
npm run build
```

- [ ] **Step 3: 打包为zip**

```bash
cd .output
zip -r ../overtime-stats.zip chrome-mv3/
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "release: v1.0.0 - initial release"
```

---

## 执行计划完成

计划已保存到 `docs/superpowers/plans/2026-06-17-overtime-stats.md`

**两种执行选项：**

**1. Subagent-Driven（推荐）** - 我为每个任务分派独立的子代理，任务间进行审核，快速迭代

**2. Inline Execution** - 在当前会话中使用executing-plans执行任务，批量执行并设置检查点

**选择哪种方式？**
