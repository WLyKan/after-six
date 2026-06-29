import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { 
  Trophy, 
  Star, 
  Target, 
  Zap, 
  Clock, 
  Calendar,
  Award,
  TrendingUp,
  Coffee,
  Moon,
  Sun,
  Flame,
  Shield,
  Crown,
  Gem,
  Check,
  Lock
} from 'lucide-react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'work' | 'balance' | 'milestone' | 'streak' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: {
    type: 'overtime_hours' | 'streak_days' | 'monthly_balance' | 'total_records' | 'efficiency' | 'special';
    value: number;
    period?: 'month' | 'total' | 'streak';
  };
  unlockedAt?: string;
  progress?: number;
  isUnlocked: boolean;
}

export interface AchievementMetrics {
  currentMonthHours: number;
  maxWeekendHours: number;
  totalHours: number;
  totalRecords: number;
  balancedMonthStreak: number;
  latestReductionPercent: number;
  hotStreakDays: number;
  earlyPunchDays: number;
  latePunchStreakDays: number;
  hasNewYearRecord: boolean;
}

const defaultMetrics: AchievementMetrics = {
  currentMonthHours: 0,
  maxWeekendHours: 0,
  totalHours: 0,
  totalRecords: 0,
  balancedMonthStreak: 0,
  latestReductionPercent: 0,
  hotStreakDays: 0,
  earlyPunchDays: 0,
  latePunchStreakDays: 0,
  hasNewYearRecord: false,
};

function progress(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / target) * 100)));
}

export function getAchievements(metrics: AchievementMetrics = defaultMetrics): Achievement[] {
  return [
  // 工作成就
  {
    id: 'workaholic',
    name: '工作狂人',
    description: '单月加班超过40小时',
    icon: Coffee,
    category: 'work',
    rarity: 'epic',
    condition: { type: 'overtime_hours', value: 40, period: 'month' },
    isUnlocked: metrics.currentMonthHours >= 40,
    progress: progress(metrics.currentMonthHours, 40)
  },
  {
    id: 'night_owl',
    name: '夜猫子',
    description: '连续7天加班到晚上10点后',
    icon: Moon,
    category: 'work',
    rarity: 'rare',
    condition: { type: 'streak_days', value: 7 },
    isUnlocked: metrics.latePunchStreakDays >= 7,
    progress: progress(metrics.latePunchStreakDays, 7)
  },
  {
    id: 'early_bird',
    name: '早起鸟',
    description: '连续5天早上8点前开始工作',
    icon: Sun,
    category: 'work',
    rarity: 'common',
    condition: { type: 'streak_days', value: 5 },
    isUnlocked: metrics.earlyPunchDays >= 5,
    progress: progress(metrics.earlyPunchDays, 5)
  },
  {
    id: 'weekend_warrior',
    name: '周末战士',
    description: '单月周末加班超过16小时',
    icon: Shield,
    category: 'work',
    rarity: 'rare',
    condition: { type: 'overtime_hours', value: 16, period: 'month' },
    isUnlocked: metrics.maxWeekendHours >= 16,
    progress: progress(metrics.maxWeekendHours, 16)
  },

  // 平衡成就
  {
    id: 'work_life_balance',
    name: '生活平衡大师',
    description: '连续3个月加班时间少于20小时',
    icon: Target,
    category: 'balance',
    rarity: 'epic',
    condition: { type: 'monthly_balance', value: 20, period: 'streak' },
    isUnlocked: metrics.balancedMonthStreak >= 3,
    progress: progress(metrics.balancedMonthStreak, 3)
  },
  {
    id: 'efficiency_expert',
    name: '效率专家',
    description: '单月加班时间比上月减少50%',
    icon: Zap,
    category: 'balance',
    rarity: 'rare',
    condition: { type: 'efficiency', value: 50 },
    isUnlocked: metrics.latestReductionPercent >= 50,
    progress: progress(metrics.latestReductionPercent, 50)
  },

  // 里程碑成就
  {
    id: 'century_club',
    name: '百时俱乐部',
    description: '累计加班时间达到100小时',
    icon: Trophy,
    category: 'milestone',
    rarity: 'rare',
    condition: { type: 'overtime_hours', value: 100, period: 'total' },
    isUnlocked: metrics.totalHours >= 100,
    progress: progress(metrics.totalHours, 100)
  },
  {
    id: 'record_keeper',
    name: '记录管家',
    description: '添加50条加班记录',
    icon: Award,
    category: 'milestone',
    rarity: 'common',
    condition: { type: 'total_records', value: 50 },
    isUnlocked: metrics.totalRecords >= 50,
    progress: progress(metrics.totalRecords, 50)
  },
  {
    id: 'marathon_runner',
    name: '马拉松跑者',
    description: '累计加班时间达到500小时',
    icon: Crown,
    category: 'milestone',
    rarity: 'legendary',
    condition: { type: 'overtime_hours', value: 500, period: 'total' },
    isUnlocked: metrics.totalHours >= 500,
    progress: progress(metrics.totalHours, 500)
  },

  // 连击成就
  {
    id: 'hot_streak',
    name: '火热连击',
    description: '连续15天有加班记录',
    icon: Flame,
    category: 'streak',
    rarity: 'epic',
    condition: { type: 'streak_days', value: 15 },
    isUnlocked: metrics.hotStreakDays >= 15,
    progress: progress(metrics.hotStreakDays, 15)
  },

  // 特殊成就
  {
    id: 'new_year_grinder',
    name: '新年加班王',
    description: '在元旦当天加班',
    icon: Gem,
    category: 'special',
    rarity: 'legendary',
    condition: { type: 'special', value: 1 },
    isUnlocked: metrics.hasNewYearRecord,
    progress: metrics.hasNewYearRecord ? 100 : 0
  }
  ];
}

export const achievements: Achievement[] = getAchievements();

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600';
      case 'rare': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600';
      case 'epic': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600';
      case 'legendary': return 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-400 dark:border-yellow-600';
      default: return 'bg-muted';
    }
  };

  const getRarityBadgeVariant = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'secondary' as const;
      case 'rare': return 'default' as const;
      case 'epic': return 'secondary' as const;
      case 'legendary': return 'default' as const;
      default: return 'outline' as const;
    }
  };

  const Icon = achievement.icon;

  return (
    <Card className={`relative overflow-hidden ${getRarityColor(achievement.rarity)} ${achievement.isUnlocked ? '' : 'opacity-60'}`}>
      {/* 圆形印章 - 右上角 */}
      <div className="absolute -top-2 -right-2 z-20 pointer-events-none">
        <div 
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            transform transition-all duration-300
            ${achievement.isUnlocked 
              ? 'rotate-12 bg-green-500/20 border-2 border-green-500/60' 
              : '-rotate-12 bg-gray-500/20 border-2 border-gray-500/60'
            }
            backdrop-blur-sm shadow-lg
          `}
          style={{
            background: achievement.isUnlocked 
              ? 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.1) 70%, rgba(34, 197, 94, 0.05) 100%)'
              : 'radial-gradient(circle, rgba(107, 114, 128, 0.15) 0%, rgba(107, 114, 128, 0.1) 70%, rgba(107, 114, 128, 0.05) 100%)'
          }}
        >
          {/* 内圆边框 */}
          <div 
            className={`
              w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center
              ${achievement.isUnlocked 
                ? 'border-green-600/80 text-green-700 dark:text-green-400' 
                : 'border-gray-600/80 text-gray-600 dark:text-gray-400'
              }
            `}
          >
            {achievement.isUnlocked ? (
              <>
                <Check className="w-3 h-3 mb-0.5" />
                <span className="text-[8px] font-bold leading-none">已解锁</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 mb-0.5" />
                <span className="text-[8px] font-bold leading-none">未解锁</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 稀有度标记 - 左上角 */}
      <div className="absolute top-2 left-2 z-10">
        <Badge variant={getRarityBadgeVariant(achievement.rarity)} className="text-xs">
          {achievement.rarity === 'common' && '普通'}
          {achievement.rarity === 'rare' && '稀有'}
          {achievement.rarity === 'epic' && '史诗'}
          {achievement.rarity === 'legendary' && '传说'}
        </Badge>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full flex-shrink-0 ${achievement.isUnlocked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 space-y-2 min-w-0 pr-6">
            <div>
              <h4 className="font-medium truncate">{achievement.name}</h4>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">{achievement.description}</p>
            
            {!achievement.isUnlocked && achievement.progress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>进度</span>
                  <span>{achievement.progress}%</span>
                </div>
                <Progress value={achievement.progress} className="h-1" />
              </div>
            )}
            
            {achievement.isUnlocked && achievement.unlockedAt && (
              <p className="text-xs text-muted-foreground">
                解锁时间: {achievement.unlockedAt}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AchievementSummary({ items = achievements }: { items?: Achievement[] }) {
  const unlockedCount = items.filter(a => a.isUnlocked).length;
  const totalCount = items.length;
  const completionRate = Math.round((unlockedCount / totalCount) * 100);
  
  const rarityStats = items.reduce((acc, achievement) => {
    if (achievement.isUnlocked) {
      acc[achievement.rarity] = (acc[achievement.rarity] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          成就概览
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>完成度</span>
          <span className="font-medium">{unlockedCount}/{totalCount}</span>
        </div>
        <Progress value={completionRate} className="h-2" />
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-2 bg-white/50 dark:bg-white/5 rounded-lg">
            <p className="text-sm text-muted-foreground">解锁率</p>
            <p className="font-bold text-lg text-primary">{completionRate}%</p>
          </div>
          <div className="text-center p-2 bg-white/50 dark:bg-white/5 rounded-lg">
            <p className="text-sm text-muted-foreground">传说成就</p>
            <p className="font-bold text-lg text-yellow-600">{rarityStats.legendary || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
