import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['activeTab', 'storage', 'tabs'],
    host_permissions: ['https://ehr.supcon.com/*'],
    action: {
      default_title: '打开考勤页面',
      default_icon: {
        '16': 'icon/16.png',
        '48': 'icon/48.png',
        '128': 'icon/128.png',
      },
    },
  },
});
