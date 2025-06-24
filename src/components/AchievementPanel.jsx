import React, { useState } from 'react';
import { useAchievement } from '../context/AchievementContext';
import { Trophy, Star, Target, Flame, Clock, Award, Lock, CheckCircle } from 'lucide-react';

const AchievementPanel = () => {
  const { userAchievements, userStats, achievementDefinitions, loading } = useAchievement();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'Tümü', icon: Trophy },
    { id: 'sales', name: 'Satış', icon: Target },
    { id: 'daily', name: 'Günlük', icon: Star },
    { id: 'streak', name: 'Seri', icon: Flame },
    { id: 'monthly', name: 'Aylık', icon: Award },
    { id: 'activity', name: 'Aktivite', icon: Clock }
  ];

  const isAchievementUnlocked = (achievementId) => {
    return userAchievements.some(ach => ach.id === achievementId);
  };

  const getAchievementProgress = (achievement) => {
    if (isAchievementUnlocked(achievement.id)) return 100;

    let progress = 0;
    const stats = userStats;

    switch (achievement.id) {
      case 'first_sale':
      case 'sales_10':
      case 'sales_50':
      case 'sales_100':
        progress = Math.min((stats.totalSales || 0) / achievement.requirement * 100, 100);
        break;
      case 'daily_target':
        progress = Math.min((stats.todayRecords || 0) / 5 * 100, 100);
        break;
      case 'weekly_streak':
        progress = Math.min((stats.dailyStreak || 0) / 7 * 100, 100);
        break;
      case 'record_master':
        progress = Math.min((stats.todayRecords || 0) / 20 * 100, 100);
        break;
      default:
        progress = 0;
    }

    return Math.round(progress);
  };

  const getProgressText = (achievement) => {
    const stats = userStats;
    
    switch (achievement.id) {
      case 'first_sale':
      case 'sales_10':
      case 'sales_50':
      case 'sales_100':
        return `${stats.totalSales || 0} / ${achievement.requirement}`;
      case 'daily_target':
        return `${stats.todayRecords || 0} / 5`;
      case 'weekly_streak':
        return `${stats.dailyStreak || 0} / 7 gün`;
      case 'record_master':
        return `${stats.todayRecords || 0} / 20`;
      default:
        return '-';
    }
  };

  const filteredAchievements = Object.values(achievementDefinitions).filter(achievement => {
    if (selectedCategory === 'all') return true;
    return achievement.category === selectedCategory;
  });

  const unlockedCount = userAchievements.length;
  const totalCount = Object.keys(achievementDefinitions).length;
  const completionPercentage = Math.round((unlockedCount / totalCount) * 100);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Başarımlarım</h2>
            <p className="text-purple-100">
              Toplam {unlockedCount} / {totalCount} başarım açıldı
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{userStats.totalPoints || 0}</div>
            <div className="text-purple-100">Toplam Puan</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Tamamlama Oranı</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-purple-400 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{userStats.totalSales || 0}</div>
            <div className="text-xs text-purple-100">Toplam Satış</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{userStats.dailyStreak || 0}</div>
            <div className="text-xs text-purple-100">Günlük Seri</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{userStats.todayRecords || 0}</div>
            <div className="text-xs text-purple-100">Bugünkü Kayıt</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map(achievement => {
          const isUnlocked = isAchievementUnlocked(achievement.id);
          const progress = getAchievementProgress(achievement);
          const progressText = getProgressText(achievement);

          return (
            <div
              key={achievement.id}
              className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                isUnlocked
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-600 shadow-lg'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {/* Achievement Icon & Status */}
              <div className="flex items-start justify-between mb-3">
                <div className={`text-4xl ${isUnlocked ? 'animate-pulse' : 'grayscale opacity-50'}`}>
                  {achievement.icon}
                </div>
                <div className="flex items-center gap-1">
                  {isUnlocked ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="mb-3">
                <h3 className={`font-semibold mb-1 ${
                  isUnlocked ? 'text-yellow-800 dark:text-yellow-300' : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {achievement.title}
                </h3>
                <p className={`text-sm ${
                  isUnlocked ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {achievement.description}
                </p>
              </div>

              {/* Progress Bar (for non-unlocked achievements) */}
              {!isUnlocked && progress > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">İlerleme</span>
                    <span className="text-gray-500">{progressText}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 rounded-full h-1.5 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Points & Category */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  achievement.category === 'sales' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  achievement.category === 'daily' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  achievement.category === 'streak' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  achievement.category === 'monthly' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                }`}>
                  {achievement.category === 'sales' && 'Satış'}
                  {achievement.category === 'daily' && 'Günlük'}
                  {achievement.category === 'streak' && 'Seri'}
                  {achievement.category === 'monthly' && 'Aylık'}
                  {achievement.category === 'activity' && 'Aktivite'}
                </span>
                <span className={`font-semibold ${
                  isUnlocked ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500'
                }`}>
                  {achievement.points} puan
                </span>
              </div>

              {/* Unlocked Date */}
              {isUnlocked && (
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                  {userAchievements.find(ach => ach.id === achievement.id)?.unlockedAt && 
                    `Açıldı: ${new Date(userAchievements.find(ach => ach.id === achievement.id).unlockedAt).toLocaleDateString('tr-TR')}`
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementPanel; 