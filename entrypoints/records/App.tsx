import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { MonthlyOverview } from './components/MonthlyOverview';
import { HistoryComparison } from './components/HistoryComparison';
import { CompensatoryLeave } from './components/CompensatoryLeave';
import { SettingsBackup } from './components/SettingsBackup';
import { Calendar, BarChart3, Clock, Settings, Trophy, Star, Crown } from 'lucide-react';
import { achievements } from './components/AchievementSystem';

export default function App() {
  // 计算用户统计
  const unlockedAchievements = achievements.filter(a => a.isUnlocked).length;
  const totalAchievements = achievements.length;
  const completionRate = Math.round((unlockedAchievements / totalAchievements) * 100);
  
  // 根据成就完成度确定用户等级
  const getUserLevel = (rate: number) => {
    if (rate >= 80) return { level: '传奇大师', icon: Crown, color: 'from-yellow-400 to-yellow-600', textColor: 'text-yellow-700 dark:text-yellow-300' };
    if (rate >= 60) return { level: '资深专家', icon: Trophy, color: 'from-purple-400 to-purple-600', textColor: 'text-purple-700 dark:text-purple-300' };
    if (rate >= 40) return { level: '熟练工作者', icon: Star, color: 'from-blue-400 to-blue-600', textColor: 'text-blue-700 dark:text-blue-300' };
    if (rate >= 20) return { level: '初级记录员', icon: Calendar, color: 'from-green-400 to-green-600', textColor: 'text-green-700 dark:text-green-300' };
    return { level: '新手', icon: Clock, color: 'from-gray-400 to-gray-600', textColor: 'text-gray-700 dark:text-gray-300' };
  };

  const userLevel = getUserLevel(completionRate);
  const LevelIcon = userLevel.icon;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 min-h-screen bg-background">
      {/* 头部信息 */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">加班记录管理</h1>
            <p className="text-muted-foreground">轻松管理您的加班时间和调休安排</p>
          </div>
          
          {/* 用户等级和成就展示 */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`bg-gradient-to-r ${userLevel.color} text-white border-0`}>
                  <LevelIcon className="w-3 h-3 mr-1" />
                  {userLevel.level}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="w-4 h-4" />
                <span>{unlockedAchievements}/{totalAchievements} 成就</span>
                <Badge variant="outline" className="text-xs">
                  {completionRate}%
                </Badge>
              </div>
            </div>
            
            <Card className="p-3 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="text-center">
                <div className="text-2xl mb-1">
                  {completionRate >= 80 ? '👑' : 
                   completionRate >= 60 ? '🏆' : 
                   completionRate >= 40 ? '⭐' : 
                   completionRate >= 20 ? '📅' : '🕐'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Lv.{Math.floor(completionRate / 20) + 1}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 成就解锁提示 */}
        {completionRate > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">成就进度:</span>
              <div className="flex-1 bg-muted rounded-full h-2 max-w-48">
                <div 
                  className={`h-2 bg-gradient-to-r ${userLevel.color} rounded-full transition-all duration-500`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${userLevel.textColor}`}>
                {completionRate}%
              </span>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            月度总览
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            历史对比
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            调休管理
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            设置备份
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <MonthlyOverview />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <HistoryComparison />
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <CompensatoryLeave />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsBackup />
        </TabsContent>
      </Tabs>
    </div>
  );
}