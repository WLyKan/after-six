import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['activeTab'],
    host_permissions: ['https://ehr.supcon.com/*'],
  },
});
