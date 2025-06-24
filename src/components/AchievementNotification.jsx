import React, { useEffect, useState } from 'react';
import { useAchievement } from '../context/AchievementContext';
import { X, Trophy } from 'lucide-react';

const AchievementNotification = () => {
  const { newAchievements, clearNewAchievements } = useAchievement();
  const [visible, setVisible] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);

  useEffect(() => {
    if (newAchievements.length > 0 && !visible) {
      setCurrentAchievement(newAchievements[0]);
      setVisible(true);
      
      // 5 saniye sonra otomatik kapat
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [newAchievements, visible]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      clearNewAchievements();
      setCurrentAchievement(null);
    }, 300);
  };

  if (!currentAchievement || !visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-500">
      <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 p-1 rounded-lg shadow-2xl max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 relative overflow-hidden">
          {/* Parlak efekt */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
                  Başarım Açıldı!
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-4xl animate-bounce">
                {currentAchievement.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  {currentAchievement.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {currentAchievement.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    +{currentAchievement.points} puan
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {currentAchievement.category === 'sales' && 'Satış'}
                    {currentAchievement.category === 'daily' && 'Günlük'}
                    {currentAchievement.category === 'streak' && 'Seri'}
                    {currentAchievement.category === 'monthly' && 'Aylık'}
                    {currentAchievement.category === 'activity' && 'Aktivite'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementNotification; 