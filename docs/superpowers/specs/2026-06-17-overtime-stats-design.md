# 加班工时统计Chrome插件设计文档

## 1. 项目概述

### 1.1 目标
开发一个Chrome插件，在UBD系统页面显示从EHR系统获取的当月总加班工时。

### 1.2 核心需求
| 需求 | 说明 |
|------|------|
| 数据源 | EHR系统 (ehr.supcon.com) |
| 展示位置 | UBD系统 (ubd.supcon.com) 特定容器底部 |
| 统计内容 | 本月总加班时长 |
| 刷新策略 | 页面加载时自动获取 |
| staff_id获取 | 通过localStorage的personInfo解析 |

## 2. 技术选型

| 技术 | 说明 |
|------|------|
| WXT框架 | Web扩展开发框架，基于Vite，支持TypeScript |
| Chrome Extension Manifest V3 | 使用最新的扩展规范 |
| Background Script | 处理跨域API调用和cookie解析 |
| Content Script | 处理UI注入和页面交互 |

## 3. 项目结构

```
overtime-stats/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts      # Service Worker
│   │   └── ubd.content.ts     # UBD页面注入
│   ├── utils/
│   │   ├── api.ts             # EHR API调用
│   │   ├── storage.ts         # localStorage解析staff_id
│   │   └── calculator.ts      # 工时计算逻辑
│   └── types/
│       └── index.ts           # TypeScript类型定义
├── wxt.config.ts
└── package.json
```

## 4. 数据流

```
UBD页面加载
  → content.ts检测到页面
  → 从localStorage的personInfo中解析staff_id
  → 发送staff_id给background.ts
  → background.ts调用EHR API获取本月打卡数据
  → 计算总加班时长
  → 返回结果给content.ts
  → 注入统计文案到容器底部
```

## 5. 核心功能

### 5.1 从localStorage解析staff_id

```typescript
// utils/storage.ts
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

### 5.2 EHR API调用

```typescript
// utils/api.ts
export async function fetchDailyAttendance(staffId: string, date: string) {
  const url = `https://ehr.supcon.com/RedseaPlatform/redmagicapi/rf_s_kq_count_SelectStaffIDDaily/redApiExec.mc?staff_id=${staffId}&work_day=${date}`;
  // background script中调用，无跨域限制
}
```

### 5.3 工时计算逻辑

复用现有代码中的 `computerTime` 和 `getDaysArray` 函数，转换为TypeScript模块。

**计算规则：**
- **工作日加班**：
  - 上班打卡时间 ≤ 08:00 → 加班开始时间 = 17:30
  - 上班打卡时间 ≥ 09:00 → 加班开始时间 = 18:30
  - 上班打卡时间在08:00-09:00之间 → 加班开始时间 = 17:30 + (打卡时间 - 08:00)
  - 加班时长 = 下班打卡时间 - 加班开始时间

- **周末/法定节假日加班**：
  - 加班时长 = 下班打卡时间 - 上班打卡时间

- **其他类型（调休、年假等）**：
  - 如果有打卡且打卡时间 < 18:00 → 加班开始时间 = 18:30

### 5.4 UI注入策略

```typescript
// ubd.content.ts
export default defineContentScript({
  matches: ['*://ubd.supcon.com/*'],
  main() {
    // 等待目标容器加载
    // 注入统计文案
    // 格式: "本月加班: XX小时XX分钟"
  }
});
```

## 6. 错误处理

| 场景 | 处理方式 |
|------|----------|
| 未登录EHR | 显示"未登录EHR系统"提示 |
| personInfo不存在 | 显示"未登录系统"提示 |
| staff_id字段缺失 | 显示"无法获取工号"提示 |
| API请求失败 | 显示"数据获取失败，点击重试" |
| 目标容器未找到 | 延迟重试（最多3次，间隔1秒） |
| 当月无加班数据 | 显示"本月加班: 0小时0分钟" |

## 7. UI样式

- 字体大小：14px
- 颜色：跟随UBD页面主题色
- 位置：容器底部，左对齐，适当padding
- 显示格式：`本月加班: XX小时XX分钟`

## 8. 权限需求

| 权限 | 用途 |
|------|------|
| `host_permissions` | 访问ehr.supcon.com的API |
| `activeTab` | 访问UBD页面 |

## 9. 实现步骤

1. 使用WXT初始化项目
2. 实现cookie解析和staff_id获取
3. 实现EHR API调用
4. 实现工时计算逻辑
5. 实现content script的UI注入
6. 实现background和content的消息通信
7. 测试和调试
8. 打包发布
