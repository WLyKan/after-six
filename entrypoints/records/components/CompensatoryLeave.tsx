import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Clock, 
  Plus, 
  Calendar, 
  Info, 
  TrendingUp, 
  Target,
  Coffee,
  Plane,
  Home,
  Sparkles,
  Gift
} from 'lucide-react';

interface CompensatoryRecord {
  id: string;
  sourceMonth: string;
  hours: number;
  usedHours: number;
  notes: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'used';
}

export function CompensatoryLeave() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);

  // 模拟调休记录数据
  const compensatoryRecords: CompensatoryRecord[] = [
    {
      id: '1',
      sourceMonth: '2024-11',
      hours: 28,
      usedHours: 16,
      notes: '项目加班产生',
      expiryDate: '2025-05-31',
      status: 'active'
    },
    {
      id: '2',
      sourceMonth: '2024-12',
      hours: 12,
      usedHours: 0,
      notes: '年末冲刺加班',
      expiryDate: '2025-06-30',
      status: 'active'
    },
    {
      id: '3',
      sourceMonth: '2024-10',
      hours: 18,
      usedHours: 18,
      notes: '产品发布加班',
      expiryDate: '2025-04-30',
      status: 'used'
    }
  ];

  const totalHours = compensatoryRecords.reduce((sum, record) => sum + record.hours, 0);
  const usedHours = compensatoryRecords.reduce((sum, record) => sum + record.usedHours, 0);
  const remainingHours = totalHours - usedHours;
  const activeRecords = compensatoryRecords.filter(record => record.status === 'active');
  const soonExpireHours = activeRecords
    .filter(record => new Date(record.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, record) => sum + (record.hours - record.usedHours), 0);

  // 趣味化计算
  const vacationDays = Math.floor(remainingHours / 8);
  const coffeeBreaks = Math.floor(remainingHours / 0.5);
  const longWeekends = Math.floor(remainingHours / 4);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'used':
        return 'secondary';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '有效';
      case 'used':
        return '已用完';
      case 'expired':
        return '已过期';
      default:
        return '未知';
    }
  };

  const getUsageLevel = (usageRate: number) => {
    if (usageRate >= 80) return { level: '高效利用', emoji: '🎯', color: 'text-green-600', bgColor: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20' };
    if (usageRate >= 50) return { level: '适度使用', emoji: '⚖️', color: 'text-blue-600', bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20' };
    if (usageRate >= 20) return { level: '谨慎使用', emoji: '🤔', color: 'text-yellow-600', bgColor: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20' };
    return { level: '待激活', emoji: '💤', color: 'text-gray-600', bgColor: 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20' };
  };

  const usageRate = totalHours > 0 ? (usedHours / totalHours) * 100 : 0;
  const usageLevel = getUsageLevel(usageRate);

  return (
    <div className="space-y-6">
      {/* 即将过期提醒 */}
      {soonExpireHours > 0 && (
        <Alert className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-300 dark:border-orange-600">
          <Sparkles className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <span>⏰ 即将过期提醒：{soonExpireHours} 小时调休将在30天内过期，记得及时使用！</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 调休余额概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">调休余额</p>
                <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{remainingHours}h</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">≈ {vacationDays} 个假期</p>
              </div>
              <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-full">
                <Clock className="w-6 h-6 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${usageLevel.bgColor}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">使用等级</p>
                <p className={`text-lg font-bold ${usageLevel.color}`}>{usageLevel.level}</p>
                <p className="text-xs opacity-70">{usageRate.toFixed(0)}% 使用率</p>
              </div>
              <div className="text-2xl">{usageLevel.emoji}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">长周末</p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{longWeekends}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">4小时/次</p>
              </div>
              <Home className="w-5 h-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">小憩时光</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">{coffeeBreaks}</p>
                <p className="text-xs text-green-600 dark:text-green-400">30分钟/次</p>
              </div>
              <Coffee className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 使用率进度条和建议 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              使用情况分析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">调休使用情况</span>
                <span className="text-sm font-medium">{usedHours}h / {totalHours}h</span>
              </div>
              <Progress value={usageRate} className="h-3" />
              <p className="text-xs text-muted-foreground">
                使用率: {usageRate.toFixed(0)}% ({usageLevel.level})
              </p>
            </div>

            <div className="pt-3 border-t space-y-2">
              <h4 className="text-sm font-medium">智能建议:</h4>
              <div className="text-xs space-y-1">
                {usageRate < 30 && (
                  <p className="text-amber-600 dark:text-amber-400">
                    💡 调休余额较多，建议适时安排休息，避免过期浪费
                  </p>
                )}
                {soonExpireHours > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    ⚠️ 有 {soonExpireHours} 小时即将过期，请尽快安排使用
                  </p>
                )}
                {remainingHours >= 8 && (
                  <p className="text-green-600 dark:text-green-400">
                    🎉 余额充足，可以安排一个完整的休息日
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              休息方案推荐
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Plane className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">完整假期</p>
                  <p className="text-xs text-muted-foreground">可安排 {vacationDays} 天完整休假</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Home className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">长周末计划</p>
                  <p className="text-xs text-muted-foreground">可享受 {longWeekends} 个长周末</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Coffee className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">灵活小憩</p>
                  <p className="text-xs text-muted-foreground">可灵活安排 {coffeeBreaks} 次短时间休息</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                💡 建议结合工作安排和个人需求，制定合理的调休计划
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <h3>调休记录</h3>
        <div className="flex gap-2">
          <Dialog open={isRulesDialogOpen} onOpenChange={setIsRulesDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Info className="w-4 h-4 mr-2" />
                规则说明
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>调休规则说明</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">获得调休</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>工作日加班：按1:1比例转换为调休</li>
                    <li>周末加班：按1:1.5比例转换为调休</li>
                    <li>法定节假日：按1:2比例转换为调休</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">使用期限</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>调休时间自获得之日起6个月内有效</li>
                    <li>超期未使用的调休将自动失效</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">使用建议</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>优先使用即将过期的调休时间</li>
                    <li>结合工作计划安排连续休息时间</li>
                    <li>可与年假等其他假期合理搭配</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                使用调休
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>使用调休</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="useDate">使用日期</Label>
                  <Input id="useDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="useHours">使用时长（小时）</Label>
                  <Input id="useHours" type="number" step="0.5" min="0.5" placeholder="0.5" />
                  <p className="text-xs text-muted-foreground">
                    当前余额: {remainingHours} 小时
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">使用原因</Label>
                  <Textarea id="reason" placeholder="请输入使用调休的原因..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit">确认使用</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 调休记录列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>来源月份</TableHead>
                <TableHead>获得时长</TableHead>
                <TableHead>已使用</TableHead>
                <TableHead>余额</TableHead>
                <TableHead>过期时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compensatoryRecords.map((record, index) => (
                <TableRow key={record.id} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                  <TableCell className="font-medium">{record.sourceMonth}</TableCell>
                  <TableCell>{record.hours}h</TableCell>
                  <TableCell>{record.usedHours}h</TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {record.hours - record.usedHours}h
                    </span>
                    {record.hours - record.usedHours >= 8 && <span className="ml-1">🎉</span>}
                  </TableCell>
                  <TableCell className={new Date(record.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-orange-600' : ''}>
                    {record.expiryDate}
                    {new Date(record.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && 
                      <span className="ml-1">⚠️</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(record.status)}>
                      {getStatusText(record.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-32 truncate">{record.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}