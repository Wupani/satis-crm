import React from 'react';
import { useAchievement } from '../context/AchievementContext';
import { Trophy, Award, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const AchievementWidget = () => {
  const { userAchievements, userStats, loading } = useAchievement();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  const recentAchievements = userAchievements
    .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
    .slice(0, 3);

  const totalPoints = userStats.totalPoints || 0;
  const achievementCount = userAchievements.length;

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl shadow-lg p-6 border border-yellow-200 dark:border-yellow-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-600" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Başarımlar</h3>
        </div>
        <Link 
          to="/achievements"
          className="text-xs text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
        >
          Tümünü Gör
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{totalPoints}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Toplam Puan</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{achievementCount}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Başarım</div>
        </div>
      </div>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Son Başarımlar</h4>
          {recentAchievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 rounded-lg p-2">
              <div className="text-lg">{achievement.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                  {achievement.title}
                </div>
                <div className="text-xs text-yellow-600">
                  +{achievement.points} puan
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <Star className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Henüz başarım yok
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            İlk satışınızı yapın!
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {userStats.totalSales >= 0 && (
        <div className="mt-4 pt-3 border-t border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>İlk Satışa</span>
            <span>{Math.min(userStats.totalSales, 1)}/1</span>
          </div>
          <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-1.5">
            <div 
              className="bg-yellow-500 rounded-full h-1.5 transition-all duration-300"
              style={{ width: `${Math.min((userStats.totalSales || 0) / 1 * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementWidget; 