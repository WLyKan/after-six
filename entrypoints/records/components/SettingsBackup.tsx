import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Download, Upload, FileText, Database, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { getAttendanceHistory, getCachedAttendanceMonths, type AttendanceHistoryMonth } from '../../../utils/monthlyAttendance';
import type { AttendanceMonthCache } from '../../../types';

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(history: AttendanceHistoryMonth[]) {
  const header = ['月份', '总加班小时', '工作日加班小时', '周末加班小时', '记录数', '缓存更新时间'];
  const rows = history.map((item) => [
    item.month,
    item.hours,
    item.workdayHours,
    item.weekendHours,
    item.recordCount,
    item.fetchedAt,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function SettingsBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [cacheMonths, setCacheMonths] = useState<AttendanceMonthCache[]>([]);
  const [history, setHistory] = useState<AttendanceHistoryMonth[]>([]);
  const [statusText, setStatusText] = useState('正在读取本地缓存...');

  useEffect(() => {
    async function loadSummary() {
      try {
        if (typeof browser === 'undefined' || !browser.storage?.local) {
          setStatusText('当前页面未运行在插件环境中，请从 EHR 汇总行打开详情页。');
          return;
        }
        const cached = await browser.storage.local.get('staffId');
        const staffId = typeof cached.staffId === 'string' ? cached.staffId : undefined;
        const months = await getCachedAttendanceMonths(browser.storage.local, staffId);
        setCacheMonths(months);
        setHistory(getAttendanceHistory(months));
        setStatusText(months.length > 0 ? `已读取 ${months.length} 个月缓存。` : '暂无可导出的本地缓存。');
      } catch (error) {
        setStatusText(error instanceof Error ? error.message : '缓存读取失败。');
      }
    }

    loadSummary();
  }, []);

  const handleExportData = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      if (format === 'json') {
        downloadText(
          `after-six-cache-${timestamp}.json`,
          JSON.stringify({ exportedAt: new Date().toISOString(), months: cacheMonths }, null, 2),
          'application/json;charset=utf-8'
        );
      } else {
        downloadText(
          `after-six-history-${timestamp}.csv`,
          `\ufeff${toCsv(history)}`,
          'text/csv;charset=utf-8'
        );
      }
      setStatusText(`已导出 ${format.toUpperCase()} 数据。`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    // 模拟导入过程
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsImporting(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // 实际实现中这里会处理文件导入
    console.log('导入文件:', file.name);
  };

  const getDataSummary = () => {
    const lastBackup = cacheMonths
      .map((item) => item.fetchedAt)
      .sort()
      .at(-1);
    return {
      totalRecords: history.reduce((sum, item) => sum + item.recordCount, 0),
      totalOvertimeHours: Number(history.reduce((sum, item) => sum + item.hours, 0).toFixed(1)),
      cachedMonths: cacheMonths.length,
      lastBackup: lastBackup ? lastBackup.slice(0, 10) : '-',
    };
  };

  const dataSummary = getDataSummary();

  return (
    <div className="space-y-6">
      {/* 数据概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            数据概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-primary">{dataSummary.totalRecords}</p>
              <p className="text-sm text-muted-foreground">总记录数</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-primary">{dataSummary.totalOvertimeHours}h</p>
              <p className="text-sm text-muted-foreground">累计加班</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-primary">{dataSummary.cachedMonths}</p>
              <p className="text-sm text-muted-foreground">缓存月份</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium text-primary">{dataSummary.lastBackup}</p>
              <p className="text-sm text-muted-foreground">最后备份</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据导出 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            数据导出
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {statusText}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => handleExportData('json')}
              disabled={isExporting}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              {isExporting ? '导出中...' : '导出为 JSON'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleExportData('csv')}
              disabled={isExporting}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              {isExporting ? '导出中...' : '导出为 CSV'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• JSON格式：包含完整数据结构，适合数据迁移</p>
            <p>• CSV格式：适合在Excel等表格软件中查看分析</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 数据导入 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            数据导入
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              导入数据会与现有记录合并，相同日期的记录可能会被覆盖。请在导入前确保数据正确性。
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label htmlFor="import-file">选择备份文件</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json,.csv"
              onChange={handleImportData}
              disabled={isImporting}
            />
          </div>

          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>导入进度</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• 支持导入之前导出的JSON格式备份文件</p>
            <p>• 导入前请确保文件格式正确且来源可靠</p>
            <p>• 建议在导入前先导出当前数据作为备份</p>
          </div>
        </CardContent>
      </Card>

      {/* 数据安全 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            数据安全说明
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              所有数据均存储在您的浏览器本地，不会上传到任何服务器。
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">隐私保护承诺：</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>数据完全本地存储，不经过网络传输</li>
              <li>不收集任何个人身份信息</li>
              <li>您可以随时删除或导出所有数据</li>
              <li>插件更新不会影响已存储的数据</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">数据管理建议：</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• 定期导出数据备份，防止意外丢失</p>
              <p>• 如需更换设备，请先导出数据再在新设备导入</p>
              <p>• 清除浏览器数据时请注意保留插件存储数据</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
