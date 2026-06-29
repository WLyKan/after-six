import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Plus, Edit, Trash2, Download, Trophy, Zap, Star, TrendingUp, Coffee, RefreshCw } from 'lucide-react';
import { OvertimeRecordForm } from './OvertimeRecordForm';
import { AchievementCard } from './AchievementSystem';
import { useAchievementState } from '../hooks/useAchievementState';
import { MonthSelect } from './MonthSelect';
import type { MessageResponse, OvertimeDetail, OvertimeStats } from '../../../types';

interface OvertimeRecord {
  id: string;
  date: string;
  workStart: string;
  workEnd: string;
  overtimeType: string;
  overtimeStart: string;
  overtimeDuration: number;
  notes?: string;
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toHours(time: number) {
  return Number((time / 1000 / 60 / 60).toFixed(1));
}

function formatClock(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function mapDetailToRecord(detail: OvertimeDetail): OvertimeRecord {
  return {
    id: detail.work_day,
    date: detail.work_day,
    workStart: formatClock(detail.sb_dk_time),
    workEnd: formatClock(detail.xb_dk_time),
    overtimeType: detail.typename === '周末' ? '周末加班' : '工作日加班',
    overtimeStart: formatClock(detail.startTime),
    overtimeDuration: toHours(Math.max(detail.sum, 0)),
    notes: detail.datetypename,
  };
}

function formatFetchedAt(value?: string) {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function MonthlyOverview() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);
  const [stats, setStats] = useState<OvertimeStats | null>(null);
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [statusText, setStatusText] = useState('正在读取插件缓存...');
  const [isLoading, setIsLoading] = useState(true);
  const achievementState = useAchievementState();
  const achievements = achievementState.achievements;

  async function loadStats(forceRefresh = false, isCancelled = () => false) {
    setIsLoading(true);
    setStatusText(forceRefresh ? '正在刷新线上 EHR 数据...' : '正在加载 EHR 加班统计...');

    try {
      if (
        typeof browser === 'undefined' ||
        !browser.storage?.local ||
        !browser.runtime?.sendMessage
      ) {
        if (!isCancelled()) {
          setStats(null);
          setOvertimeRecords([]);
          setStatusText('当前页面未运行在插件环境中，请从 EHR 汇总行打开详情页。');
        }
        return;
      }

      const cached = await browser.storage.local.get('staffId');
      const staffId = cached.staffId;

      if (!staffId || typeof staffId !== 'string') {
        if (!isCancelled()) {
          setStats(null);
          setOvertimeRecords([]);
          setStatusText('请先打开 EHR 考勤页面完成一次统计加载。');
        }
        return;
      }

      const [year, month] = selectedMonth.split('-').map(Number);
      const response = await browser.runtime.sendMessage({
        action: 'getOvertimeStats',
        staffId,
        year,
        month,
        forceRefresh,
      }) as MessageResponse;

      if (isCancelled()) return;

      if (response.success && response.data) {
        const records = response.data.detailList
          .filter((detail) => detail.sum > 0)
          .map(mapDetailToRecord);
        const sourceText = response.cache?.cacheHit ? '本地缓存' : 'EHR 线上同步';
        const fetchedAtText = formatFetchedAt(response.cache?.fetchedAt);
        setStats(response.data);
        setOvertimeRecords(records);
        setStatusText(`${sourceText}，更新时间：${fetchedAtText}${records.length > 0 ? '' : '，当前月份暂无加班记录。'}`);
      } else {
        setStats(null);
        setOvertimeRecords([]);
        setStatusText(response.error || '数据获取失败，请回到 EHR 页面刷新后重试。');
      }
    } catch (error) {
      if (!isCancelled()) {
        setStats(null);
        setOvertimeRecords([]);
        setStatusText(error instanceof Error ? error.message : '数据获取失败，请稍后重试。');
      }
    } finally {
      if (!isCancelled()) setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    loadStats(false, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  const totalOvertimeHours = stats ? toHours(stats.allTime) : 0;
  const weekendHours = stats ? toHours(stats.weekTime) : 0;
  const weekdayHours = stats ? toHours(stats.workTime) : 0;
  const avgDailyOvertime = overtimeRecords.length > 0 ? totalOvertimeHours / overtimeRecords.length : 0;

  // 近期解锁的成就
  const recentAchievements = achievements.filter(a => a.isUnlocked).slice(0, 2);
  
  // 即将解锁的成就
  const nearAchievements = achievements
    .filter(a => !a.isUnlocked && a.progress && a.progress > 50)
    .sort((a, b) => (b.progress || 0) - (a.progress || 0))
    .slice(0, 2);

  const handleAddRecord = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEditRecord = (record: OvertimeRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDeleteRecord = (id: string) => {
    console.log('删除记录:', id);
  };

  const handleExportData = () => {
    console.log('导出数据');
  };

  const getOvertimeTypeVariant = (type: string) => {
    switch (type) {
      case '工作日加班':
        return 'default';
      case '周末加班':
        return 'secondary';
      case '法定节假日':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getWorkIntensityLevel = (hours: number) => {
    if (hours >= 40) return { level: '超强度', emoji: '🔥', color: 'text-red-600' };
    if (hours >= 30) return { level: '高强度', emoji: '⚡', color: 'text-orange-600' };
    if (hours >= 20) return { level: '中等强度', emoji: '💪', color: 'text-yellow-600' };
    if (hours >= 10) return { level: '轻度加班', emoji: '☕', color: 'text-blue-600' };
    return { level: '工作平衡', emoji: '😊', color: 'text-green-600' };
  };

  const workLevel = getWorkIntensityLevel(totalOvertimeHours);

  return (
    <div className="space-y-6">
      {/* 成就提醒 */}
      {recentAchievements.length > 0 && (
        <Alert className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-600">
          <Trophy className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <span>🎉 恭喜解锁新成就：</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                {recentAchievements[0].name}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 头部统计和操作 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <MonthSelect
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            maxDate={new Date()}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">本月累计:</span>
            <span className="font-medium text-foreground">{totalOvertimeHours}小时</span>
            <span className={`font-medium ${workLevel.color}`}>
              {workLevel.emoji} {workLevel.level}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadStats(true)} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新线上数据
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            导出数据
          </Button>
          <Button size="sm" onClick={handleAddRecord}>
            <Plus className="w-4 h-4 mr-2" />
            新增记录
          </Button>
        </div>
      </div>

      <Alert className={isLoading ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : ''}>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>{statusText}</AlertDescription>
      </Alert>

      {/* 趣味化统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">总加班时长</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totalOvertimeHours}h</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">≈ {Math.round(totalOvertimeHours / 8)} 个工作日</p>
              </div>
              <div className="text-2xl">{workLevel.emoji}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">工作日加班</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">{weekdayHours}h</p>
                <p className="text-xs text-green-600 dark:text-green-400">日均 {weekdayHours > 0 ? (weekdayHours / 20).toFixed(1) : 0}h</p>
              </div>
              <Coffee className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">周末加班</p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{weekendHours}h</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {weekendHours > 0 ? '牺牲了周末 😅' : '周末休息良好 😊'}
                </p>
              </div>
              <div className="text-2xl">{weekendHours > 0 ? '📅' : '🏖️'}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300">平均效率</p>
                <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{avgDailyOvertime.toFixed(1)}h</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">每次加班时长</p>
              </div>
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 成就展示区域 */}
      {(recentAchievements.length > 0 || nearAchievements.length > 0) && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            成就动态
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentAchievements.map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
            {nearAchievements.map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
      )}

      {/* 记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>加班记录</span>
            <Badge variant="outline" className="text-xs">
              {overtimeRecords.length} 条记录
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>上班时间</TableHead>
                <TableHead>下班时间</TableHead>
                <TableHead>加班类型</TableHead>
                <TableHead>加班开始</TableHead>
                <TableHead>加班时长</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overtimeRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-4xl">📝</div>
                      <p>还没有加班记录</p>
                      <p className="text-sm">点击"新增记录"开始记录您的加班时间</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                overtimeRecords.map((record, index) => (
                  <TableRow key={record.id} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                    <TableCell className="font-medium">{record.date}</TableCell>
                    <TableCell>{record.workStart}</TableCell>
                    <TableCell>{record.workEnd}</TableCell>
                    <TableCell>
                      <Badge variant={getOvertimeTypeVariant(record.overtimeType)}>
                        {record.overtimeType}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.overtimeStart}</TableCell>
                    <TableCell className="font-medium">
                      {record.overtimeDuration}小时
                      {record.overtimeDuration >= 8 && <span className="ml-1">🔥</span>}
                      {record.overtimeDuration >= 4 && record.overtimeDuration < 8 && <span className="ml-1">💪</span>}
                    </TableCell>
                    <TableCell className="max-w-32 truncate">{record.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditRecord(record)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 加班记录表单对话框 */}
      <OvertimeRecordForm 
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingRecord}
      />
    </div>
  );
}
