import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['activeTab', 'storage'],
    host_permissions: ['https://ehr.supcon.com/*'],
  },
});
