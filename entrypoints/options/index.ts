import { enabledUrls } from '../utils/config';

const textarea = document.getElementById('urls') as HTMLTextAreaElement;
const saveBtn = document.getElementById('save')!;
const status = document.getElementById('status')!;

async function loadSettings() {
  const urls = await enabledUrls.getValue();
  textarea.value = urls.join('\n');
}

async function saveSettings() {
  const raw = textarea.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (raw.length === 0) {
    status.textContent = '请至少输入一个 URL 模式';
    status.style.color = 'red';
    return;
  }

  await enabledUrls.setValue(raw);
  status.textContent = '设置已保存';
  status.style.color = 'green';
  setTimeout(() => { status.textContent = ''; }, 2000);
}

loadSettings();
saveBtn.addEventListener('click', saveSettings);
