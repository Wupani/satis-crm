import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { useAuth } from './AuthContext';

const AchievementContext = createContext();

export const useAchievement = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievement must be used within an AchievementProvider');
  }
  return context;
};

// Başarım tanımları
const ACHIEVEMENT_DEFINITIONS = {
  // Satış Başarıları
  FIRST_SALE: {
    id: 'first_sale',
    title: 'İlk Satış',
    description: 'İlk satışınızı gerçekleştirdiniz!',
    icon: '🎯',
    category: 'sales',
    requirement: 1,
    points: 100
  },
  SALES_10: {
    id: 'sales_10',
    title: 'Satış Ustası',
    description: '10 satış tamamladınız!',
    icon: '💼',
    category: 'sales',
    requirement: 10,
    points: 500
  },
  SALES_50: {
    id: 'sales_50',
    title: 'Satış Şampiyonu',
    description: '50 satış tamamladınız!',
    icon: '🏆',
    category: 'sales',
    requirement: 50,
    points: 2000
  },
  SALES_100: {
    id: 'sales_100',
    title: 'Satış Efsanesi',
    description: '100 satış tamamladınız!',
    icon: '👑',
    category: 'sales',
    requirement: 100,
    points: 5000
  },

  // Günlük Aktivite Başarıları
  DAILY_TARGET: {
    id: 'daily_target',
    title: 'Günlük Hedef',
    description: 'Günlük hedefinizi tamamladınız!',
    icon: '⭐',
    category: 'daily',
    requirement: 1,
    points: 50
  },
  WEEKLY_STREAK: {
    id: 'weekly_streak',
    title: 'Haftalık Tutarlılık',
    description: '7 gün boyunca hedefinizi tutturdunuz!',
    icon: '🔥',
    category: 'streak',
    requirement: 7,
    points: 350
  },
  MONTHLY_CHAMPION: {
    id: 'monthly_champion',
    title: 'Aylık Şampiyon',
    description: 'Aylık hedefinizi aştınız!',
    icon: '🥇',
    category: 'monthly',
    requirement: 1,
    points: 1000
  },

  // Aktivite Başarıları
  EARLY_BIRD: {
    id: 'early_bird',
    title: 'Erken Kuş',
    description: 'Sabah 9\'dan önce ilk kaydınızı oluşturdunuz!',
    icon: '🌅',
    category: 'activity',
    requirement: 1,
    points: 75
  },
  NIGHT_OWL: {
    id: 'night_owl',
    title: 'Gece Kuşu',
    description: 'Akşam 8\'den sonra kayıt oluşturdunuz!',
    icon: '🦉',
    category: 'activity',
    requirement: 1,
    points: 75
  },
  RECORD_MASTER: {
    id: 'record_master',
    title: 'Kayıt Ustası',
    description: 'Günde 20 kayıt oluşturdunuz!',
    icon: '📝',
    category: 'activity',
    requirement: 20,
    points: 200
  }
};

export const AchievementProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userAchievements, setUserAchievements] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [newAchievements, setNewAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Kullanıcı başarımlarını yükle
  const loadUserAchievements = async () => {
    if (!currentUser?.uid) return;

    try {
      const achievementDoc = await getDoc(doc(db, 'user_achievements', currentUser.uid));
      if (achievementDoc.exists()) {
        const data = achievementDoc.data();
        setUserAchievements(data.achievements || []);
        setUserStats(data.stats || {});
      } else {
        // İlk kez kullanıcı için başarım dokümanı oluştur
        await setDoc(doc(db, 'user_achievements', currentUser.uid), {
          achievements: [],
          stats: {
            totalSales: 0,
            dailyStreak: 0,
            lastActiveDate: new Date().toISOString().split('T')[0],
            totalPoints: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        setUserAchievements([]);
        setUserStats({
          totalSales: 0,
          dailyStreak: 0,
          lastActiveDate: new Date().toISOString().split('T')[0],
          totalPoints: 0
        });
      }
    } catch (error) {
      console.error('Başarımlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcı istatistiklerini güncelle
  const updateUserStats = async () => {
    if (!currentUser?.uid) return;

    try {
      // Satış verilerini çek
      const salesQuery = query(
        collection(db, 'sales_records'),
        where('createdBy', '==', currentUser.uid)
      );
      const salesSnapshot = await getDocs(salesQuery);
      const salesData = salesSnapshot.docs.map(doc => doc.data());

      // Başarılı satışları say
      const successfulSales = salesData.filter(record => 
        record.detay === 'Satış Sağlandı' || record.detay === 'Satış sağlandı'
      ).length;

      // Bugünkü kayıtları say
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = salesData.filter(record => {
        if (record.createdAt) {
          try {
            const recordDate = record.createdAt.toDate ? 
              record.createdAt.toDate().toISOString().split('T')[0] : 
              new Date(record.createdAt).toISOString().split('T')[0];
            return recordDate === today;
          } catch {
            return false;
          }
        }
        return false;
      }).length;

      // Günlük streak hesapla
      const currentStreak = calculateDailyStreak(salesData);

      const newStats = {
        ...userStats,
        totalSales: successfulSales,
        todayRecords,
        dailyStreak: currentStreak,
        lastActiveDate: today
      };

      setUserStats(newStats);

      // Firestore'u güncelle
      await updateDoc(doc(db, 'user_achievements', currentUser.uid), {
        stats: newStats,
        updatedAt: new Date()
      });

      // Başarımları kontrol et
      await checkAchievements(newStats, salesData);

    } catch (error) {
      console.error('İstatistikler güncellenirken hata:', error);
    }
  };

  // Günlük streak hesapla
  const calculateDailyStreak = (salesData) => {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    while (streak < 365) { // Maksimum 1 yıl kontrol et
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasRecordsOnDate = salesData.some(record => {
        if (record.createdAt) {
          try {
            const recordDate = record.createdAt.toDate ? 
              record.createdAt.toDate().toISOString().split('T')[0] : 
              new Date(record.createdAt).toISOString().split('T')[0];
            return recordDate === dateStr;
          } catch {
            return false;
          }
        }
        return false;
      });

      if (hasRecordsOnDate) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // Başarımları kontrol et
  const checkAchievements = async (stats, salesData) => {
    const unlockedAchievements = [];

    // Satış başarımlarını kontrol et
    Object.values(ACHIEVEMENT_DEFINITIONS).forEach(achievement => {
      if (userAchievements.find(ua => ua.id === achievement.id)) return;

      let shouldUnlock = false;

      switch (achievement.id) {
        case 'first_sale':
        case 'sales_10':
        case 'sales_50':
        case 'sales_100':
          shouldUnlock = stats.totalSales >= achievement.requirement;
          break;
        
        case 'daily_target':
          // Bugün en az 5 kayıt ise günlük hedef
          shouldUnlock = stats.todayRecords >= 5;
          break;
        
        case 'weekly_streak':
          shouldUnlock = stats.dailyStreak >= 7;
          break;
        
        case 'monthly_champion': {
          // Bu ay 50+ satış varsa aylık şampiyon
          const thisMonth = new Date().getMonth();
          const thisYear = new Date().getFullYear();
          const thisMonthSales = salesData.filter(record => {
            if (record.createdAt) {
              try {
                const recordDate = record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt);
                return recordDate.getMonth() === thisMonth && recordDate.getFullYear() === thisYear &&
                       (record.detay === 'Satış Sağlandı' || record.detay === 'Satış sağlandı');
              } catch {
                return false;
              }
            }
            return false;
          }).length;
          shouldUnlock = thisMonthSales >= 50;
          break;
        }
        
        case 'early_bird': {
          // Bugün sabah 9'dan önce kayıt var mı?
          const earlyRecords = salesData.filter(record => {
            if (record.createdAt) {
              try {
                const recordDate = record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt);
                const today = new Date();
                return recordDate.toDateString() === today.toDateString() && recordDate.getHours() < 9;
              } catch {
                return false;
              }
            }
            return false;
          });
          shouldUnlock = earlyRecords.length > 0;
          break;
        }
        
        case 'night_owl': {
          // Bugün akşam 8'den sonra kayıt var mı?
          const nightRecords = salesData.filter(record => {
            if (record.createdAt) {
              try {
                const recordDate = record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt);
                const today = new Date();
                return recordDate.toDateString() === today.toDateString() && recordDate.getHours() >= 20;
              } catch {
                return false;
              }
            }
            return false;
          });
          shouldUnlock = nightRecords.length > 0;
          break;
        }
        
        case 'record_master':
          shouldUnlock = stats.todayRecords >= 20;
          break;
      }

      if (shouldUnlock) {
        const newAchievement = {
          ...achievement,
          unlockedAt: new Date(),
          isNew: true
        };
        unlockedAchievements.push(newAchievement);
      }
    });

    if (unlockedAchievements.length > 0) {
      const updatedAchievements = [...userAchievements, ...unlockedAchievements];
      const totalPoints = updatedAchievements.reduce((sum, ach) => sum + ach.points, 0);

      setUserAchievements(updatedAchievements);
      setNewAchievements(unlockedAchievements);
      setUserStats(prev => ({ ...prev, totalPoints }));

      // Firestore'u güncelle
      await updateDoc(doc(db, 'user_achievements', currentUser.uid), {
        achievements: updatedAchievements,
        stats: { ...stats, totalPoints },
        updatedAt: new Date()
      });
    }
  };

  // Yeni başarım bildirimini temizle
  const clearNewAchievements = () => {
    setNewAchievements([]);
  };

  // İlk yükleme
  useEffect(() => {
    if (currentUser?.uid) {
      loadUserAchievements();
    }
  }, [currentUser?.uid]);

  // Periyodik güncelleme
  useEffect(() => {
    if (currentUser?.uid && !loading) {
      updateUserStats();
      
      const interval = setInterval(() => {
        updateUserStats();
      }, 60000); // Her dakika kontrol et

      return () => clearInterval(interval);
    }
  }, [currentUser?.uid, loading]);

  const value = {
    userAchievements,
    userStats,
    newAchievements,
    loading,
    achievementDefinitions: ACHIEVEMENT_DEFINITIONS,
    updateUserStats,
    clearNewAchievements
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
}; 