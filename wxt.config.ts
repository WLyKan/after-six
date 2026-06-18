import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['activeTab', 'storage', 'tabs'],
    host_permissions: ['https://ehr.supcon.com/*'],
    icons: {
      '16': 'icon/程序员上班logo设计_16x16.png',
      '32': 'icon/程序员上班logo设计_32x32.png',
      '48': 'icon/程序员上班logo设计_64x64.png',
      '128': 'icon/程序员上班logo设计_128x128.png',
    },
    action: {
      default_title: '打开考勤页面',
      default_icon: {
        '16': 'icon/程序员上班logo设计_16x16.png',
        '48': 'icon/程序员上班logo设计_64x64.png',
        '128': 'icon/程序员上班logo设计_128x128.png',
      },
    },
  },
});
