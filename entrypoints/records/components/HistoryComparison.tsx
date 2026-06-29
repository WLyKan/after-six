import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Target, 
  Coffee,
  Trophy,
  Flame,
  Zap,
  Moon,
  Sun,
  Calendar,
  Clock,
  Star
} from 'lucide-react';
import { AchievementSummary, achievements } from './AchievementSystem';

export function HistoryComparison() {
  const [timeRange, setTimeRange] = useState('6');
  const [chartType, setChartType] = useState('area');

  // 模拟历史数据
  const historyData = [
    { month: '2024-08', hours: 15, label: '8月', weekendHours: 4, efficiency: 85, mood: '😊' },
    { month: '2024-09', hours: 22, label: '9月', weekendHours: 8, efficiency: 78, mood: '😐' },
    { month: '2024-10', hours: 18, label: '10月', weekendHours: 6, efficiency: 82, mood: '🙂' },
    { month: '2024-11', hours: 28, label: '11月', weekendHours: 12, efficiency: 75, mood: '😓' },
    { month: '2024-12', hours: 12, label: '12月', weekendHours: 2, efficiency: 92, mood: '😄' },
    { month: '2025-01', hours: 13.5, label: '1月', weekendHours: 8, efficiency: 88, mood: '😊' }
  ];

  const currentMonthHours = historyData[historyData.length - 1]?.hours || 0;
  const previousMonthHours = historyData[historyData.length - 2]?.hours || 0;
  const averageHours = historyData.reduce((sum, item) => sum + item.hours, 0) / historyData.length;
  const trend = currentMonthHours - previousMonthHours;
  const maxMonth = historyData.reduce((max, item) => item.hours > max.hours ? item : max, historyData[0]);
  const minMonth = historyData.reduce((min, item) => item.hours < min.hours ? item : min, historyData[0]);

  // 趣味统计
  const totalHours = historyData.reduce((sum, item) => sum + item.hours, 0);
  const totalWeekendHours = historyData.reduce((sum, item) => sum + item.weekendHours, 0);
  const avgEfficiency = historyData.reduce((sum, item) => sum + item.efficiency, 0) / historyData.length;
  const nightOwlDays = Math.floor(totalHours / 2); // 假设平均每2小时加班算一个"夜猫子"积分

  const getAchievementLevel = (hours: number) => {
    if (hours >= 30) return { level: '加班达人', icon: Trophy, color: 'destructive', bgColor: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20' };
    if (hours >= 20) return { level: '努力工作', icon: Coffee, color: 'default', bgColor: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20' };
    if (hours >= 10) return { level: '适度加班', icon: Clock, color: 'secondary', bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20' };
    return { level: '工作平衡', icon: Target, color: 'outline', bgColor: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20' };
  };

  const achievement = getAchievementLevel(currentMonthHours);
  const Icon = achievement.icon;

  const getPersonalityType = () => {
    const avgWeekendRatio = totalWeekendHours / totalHours;
    if (avgWeekendRatio > 0.4) return { type: '周末战士', emoji: '⚔️', desc: '你似乎特别喜欢在周末工作' };
    if (avgEfficiency > 85) return { type: '效率大师', emoji: '⚡', desc: '工作效率很高，值得表扬！' };
    if (currentMonthHours < averageHours * 0.7) return { type: '平衡达人', emoji: '🧘', desc: '工作生活平衡得很好' };
    return { type: '稳定输出', emoji: '🤖', desc: '工作节奏很稳定' };
  };

  const personality = getPersonalityType();

  // 即将解锁的成就
  const nearUnlockAchievements = achievements.filter(a => !a.isUnlocked && a.progress && a.progress > 60);

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2>历史数据对比</h2>
          <Badge variant="outline" className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            {personality.emoji} {personality.type}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">近3个月</SelectItem>
              <SelectItem value="6">近6个月</SelectItem>
              <SelectItem value="12">近12个月</SelectItem>
            </SelectContent>
          </Select>
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">柱状图</SelectItem>
              <SelectItem value="line">折线图</SelectItem>
              <SelectItem value="area">面积图</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 成就总览 */}
      <AchievementSummary />

      {/* 趣味统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`bg-gradient-to-br ${achievement.bgColor}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">本月等级</p>
                <p className="text-lg font-bold">{achievement.level}</p>
                <p className="text-xs opacity-70">{currentMonthHours}小时</p>
              </div>
              <div className="p-2 bg-white/20 dark:bg-black/20 rounded-full">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">夜猫子指数</p>
                <p className="text-lg font-bold text-purple-800 dark:text-purple-200">{nightOwlDays}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">深夜工作天数</p>
              </div>
              <Moon className="w-5 h-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">工作效率</p>
                <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{avgEfficiency.toFixed(0)}%</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">平均效率评分</p>
              </div>
              <Zap className="w-5 h-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-teal-100 dark:from-green-900/20 dark:to-teal-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">环比变化</p>
                <p className={`text-lg font-bold ${trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}h
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {trend >= 0 ? '比上月增加' : '比上月减少'}
                </p>
              </div>
              <div className="p-2 bg-white/20 dark:bg-black/20 rounded-full">
                {trend >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-red-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表展示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>加班时长趋势</span>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>最高: {maxMonth.label} ({maxMonth.hours}h) {maxMonth.mood}</span>
              <span>最低: {minMonth.label} ({minMonth.hours}h) {minMonth.mood}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'hours') return [`${value}小时`, '加班时长'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => {
                      const data = historyData.find(d => d.label === label);
                      return `${label} ${data?.mood || ''}`;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value}小时`, '加班时长']}
                    labelFormatter={(label) => {
                      const data = historyData.find(d => d.label === label);
                      return `${label} ${data?.mood || ''}`;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }}
                  />
                </LineChart>
              ) : (
                <AreaChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value}小时`, '加班时长']}
                    labelFormatter={(label) => {
                      const data = historyData.find(d => d.label === label);
                      return `${label} ${data?.mood || ''}`;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 趣味化分析和建议 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              个性分析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl">{personality.emoji}</div>
              <div>
                <p className="font-medium">{personality.type}</p>
                <p className="text-sm text-muted-foreground">{personality.desc}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>周末加班比例</span>
                <span>{Math.round((totalWeekendHours / totalHours) * 100)}%</span>
              </div>
              <Progress value={(totalWeekendHours / totalHours) * 100} className="h-2" />
            </div>

            <div className="text-sm space-y-2">
              <h4 className="font-medium">工作模式分析:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 累计加班 {totalHours} 小时 ≈ {Math.round(totalHours / 8)} 个工作日</li>
                <li>• 其中周末加班 {totalWeekendHours} 小时</li>
                <li>• 平均工作效率 {avgEfficiency.toFixed(0)}%</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              成就进度
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nearUnlockAchievements.length > 0 ? (
              nearUnlockAchievements.map(achievement => (
                <div key={achievement.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <achievement.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{achievement.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{achievement.progress}%</span>
                  </div>
                  <Progress value={achievement.progress || 0} className="h-1" />
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">暂无即将解锁的成就</p>
                <p className="text-xs text-muted-foreground">继续记录加班时间解锁更多成就！</p>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              <h4 className="text-sm font-medium">快速解锁建议:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>🎯 连续记录可解锁"坚持达人"</li>
                <li>⚡ 提高工作效率可解锁"效率专家"</li>
                <li>🏆 累计时长达标可解锁里程碑成就</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 智能建议 */}
      <Card className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            AI 智能建议
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trend > 5 && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                📈 本月加班时间较上月显著增加，建议：
              </p>
              <ul className="text-xs text-orange-600 dark:text-orange-400 mt-1 ml-4 list-disc">
                <li>评估工作负载，优化时间分配</li>
                <li>考虑提高工作效率或寻求团队支持</li>
              </ul>
            </div>
          )}
          
          {currentMonthHours < 10 && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                🎉 工作生活平衡度很棒！继续保持：
              </p>
              <ul className="text-xs text-green-600 dark:text-green-400 mt-1 ml-4 list-disc">
                <li>当前加班时间控制良好</li>
                <li>有更多时间用于个人发展和休息</li>
              </ul>
            </div>
          )}

          {avgEfficiency > 85 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                ⚡ 你的工作效率很高！可以考虑：
              </p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-4 list-disc">
                <li>分享高效工作方法给团队</li>
                <li>承担更有挑战性的项目</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}