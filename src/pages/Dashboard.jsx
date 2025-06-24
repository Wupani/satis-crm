import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import AchievementWidget from '../components/AchievementWidget';
import { 
  CheckCircle,
  BarChart3,
  ArrowUp,
  UserCheck,
  Briefcase,
  Activity,
  Zap,
  Eye,
  Plus,
  PieChart,
  Target,
  Users,
  Trophy,
  Medal,
  Award,
  Settings,
  FileText,
  TrendingUp,
  Calendar,
  MessageSquare,
  UserPlus,
  Database,
  Download,
  Filter,
  Search,
  BarChart2,
  Shield,
  Clock
} from 'lucide-react';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRecords: 0,
    successfulSales: 0,
    totalRecordsChange: '0%',
    successfulSalesChange: '0%'
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userTargets, setUserTargets] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        if (currentUser?.uid) {
          // Kullanıcı adını çek
          const usersRef = collection(db, 'users');
          const userQuery = query(usersRef, where('uid', '==', currentUser.uid));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setUserName(userData.name || userData.email?.split('@')[0] || 'Kullanıcı');
          } else {
            // Eğer users koleksiyonunda yoksa email'den isim çıkar
            setUserName(currentUser.email?.split('@')[0] || 'Kullanıcı');
          }
        }
      } catch (error) {
        console.error('Kullanıcı adı alınırken hata:', error);
        setUserName(currentUser?.email?.split('@')[0] || 'Kullanıcı');
      }
    };

    const fetchStats = async () => {
      try {
        if (currentUser?.uid) {
          // Bugünün tarihleri
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          
          // Dünün tarihleri
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
          const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);

          // İstatistikleri çek
          let q;
          
          if (currentUser?.role === 'admin') {
            q = query(collection(db, 'sales_records'));
          } else if (currentUser?.role === 'teamLeader') {
            q = query(collection(db, 'sales_records'));
          } else {
            // Personel sadece kendi verilerini görebilir
            q = query(
              collection(db, 'sales_records'),
              where('createdBy', '==', currentUser.uid)
            );
          }

          const snapshot = await getDocs(q);
          let allRecords = snapshot.docs.map(doc => doc.data());
          
          // Bugünkü veriler filtresi
          const todayRecords = allRecords.filter(record => {
            if (record.createdAt) {
              try {
                const recordDate = record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt);
                return recordDate >= startOfDay && recordDate <= endOfDay;
              } catch {
                return false;
              }
            }
            
            if (record.tarih) {
              try {
                const recordDate = new Date(record.tarih);
                if (!isNaN(recordDate.getTime())) {
                  return recordDate >= startOfDay && recordDate <= endOfDay;
                }
              } catch {
                return false;
              }
            }
            
            return false;
          });

          // Dünün verileri filtresi
          const yesterdayRecords = allRecords.filter(record => {
            if (record.createdAt) {
              try {
                const recordDate = record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt);
                return recordDate >= startOfYesterday && recordDate <= endOfYesterday;
              } catch {
                return false;
              }
            }
            
            if (record.tarih) {
              try {
                const recordDate = new Date(record.tarih);
                if (!isNaN(recordDate.getTime())) {
                  return recordDate >= startOfYesterday && recordDate <= endOfYesterday;
                }
              } catch {
                return false;
              }
            }
            
            return false;
          });

          // Bugünkü istatistikler
          const totalRecords = todayRecords.length;
          const successfulSales = todayRecords.filter(record => 
            record.detay === 'Satış Sağlandı' || record.detay === 'Satış sağlandı'
          ).length;

          // Dünkü istatistikler (kıyaslama için)
          const yesterdayTotalRecords = yesterdayRecords.length;
          const yesterdaySuccessfulSales = yesterdayRecords.filter(record => 
            record.detay === 'Satış Sağlandı' || record.detay === 'Satış sağlandı'
          ).length;

          // Yüzdelik değişimler hesapla
          const calculatePercentageChange = (today, yesterday) => {
            if (yesterday === 0) return today > 0 ? '+100%' : '0%';
            const change = ((today - yesterday) / yesterday) * 100;
            return change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
          };

          const totalRecordsChange = calculatePercentageChange(totalRecords, yesterdayTotalRecords);
          const successfulSalesChange = calculatePercentageChange(successfulSales, yesterdaySuccessfulSales);

          setStats({
            totalRecords,
            successfulSales,
            totalRecordsChange,
            successfulSalesChange
          });
        }
      } catch (error) {
        console.error('İstatistikler alınırken hata:', error);
        // Hata durumunda varsayılan değerler
        setStats({
          totalRecords: 0,
          successfulSales: 0,
          totalRecordsChange: '0%',
          successfulSalesChange: '0%'
        });
      }
    };
    
    const fetchTargets = async () => {
      try {
        if (currentUser?.uid && (currentUser?.role === 'personnel' || currentUser?.role === 'teamLeader')) {
          const targetsRef = collection(db, 'targets');
          const targetQuery = query(targetsRef, where('userId', '==', currentUser.uid));
          const targetSnapshot = await getDocs(targetQuery);
          
          const targets = targetSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setUserTargets(targets);
        }
      } catch (error) {
        console.error('Hedefler alınırken hata:', error);
      }
    };

    const fetchTopPerformers = async () => {
      try {
        // Son 3 ay için en iyi performans gösteren personelleri çek (test için)
        const now = new Date();
        const startOfMonth = new Date(2025, 5, 1); // Haziran 2025 (ay 0-indexed)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Tüm satış kayıtlarını çek
        const recordsRef = collection(db, 'sales_records');
        const recordsSnapshot = await getDocs(recordsRef);
        
        // Bu ay içindeki başarılı satışları filtrele
        const allRecords = recordsSnapshot.docs.map(doc => doc.data());

        
        const thisMonthSuccessfulSales = allRecords.filter(record => {
          // Tarih kontrolü
          let recordDate = null;
          if (record.createdAt) {
            try {
              recordDate = record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt);
            } catch {
              // createdAt parse edilemedi
            }
          }
          
          if (!recordDate && record.tarih) {
            try {
              recordDate = new Date(record.tarih);
              if (isNaN(recordDate.getTime())) {
                recordDate = null;
              }
            } catch {
              // tarih parse edilemedi
            }
          }

          if (!recordDate) {
            return false;
          }

          // Bu ay içinde mi ve başarılı satış mı kontrol et
          const isThisMonth = recordDate >= startOfMonth && recordDate <= endOfMonth;
          const isSuccessful = record.detay === 'Satış Sağlandı' || 
                             record.detay === 'Satış sağlandı' || 
                             record.detay === 'Satış Bilgisi';
          
          return isThisMonth && isSuccessful && record.createdBy;
        });

        // Personel bazında satış sayılarını hesapla
        const salesByUser = {};
        thisMonthSuccessfulSales.forEach(sale => {
          const userId = sale.createdBy;
          if (userId) {
            salesByUser[userId] = (salesByUser[userId] || 0) + 1;
          }
        });

        // Kullanıcı bilgilerini çek
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersData = {};
        const emailToUserData = {};
        
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          const docId = doc.id;
          
          // Hem document ID hem de uid alanını kontrol et
          const userKey = userData.uid || docId;
          
          if (userKey) {
            usersData[userKey] = {
              name: userData.name || userData.email?.split('@')[0] || 'Bilinmeyen',
              email: userData.email,
              role: userData.role
            };
          }
          
          // Email ile de eşleştirme için
          if (userData.email) {
            emailToUserData[userData.email] = {
              name: userData.name || userData.email?.split('@')[0] || 'Bilinmeyen',
              email: userData.email,
              role: userData.role
            };
          }
        });
        


        // En iyi 3 performansı hesapla
        const performers = Object.entries(salesByUser)
          .map(([userId, salesCount]) => {
            // Önce UID ile eşleştirmeyi dene
            let userInfo = usersData[userId];
            
            // Eğer UID ile bulunamadıysa, email ile eşleştirmeyi dene
            if (!userInfo && userId.includes('@')) {
              userInfo = emailToUserData[userId];
            }
            
            return {
              userId,
              salesCount,
              userName: userInfo?.name || 'Bilinmeyen Kullanıcı',
              userEmail: userInfo?.email || '',
              userRole: userInfo?.role || 'personnel'
            };
          })
          // .filter(performer => 
          //   performer.userRole === 'personnel' || performer.userRole === 'teamLeader'
          // )
          .sort((a, b) => b.salesCount - a.salesCount)
          .slice(0, 3);

        setTopPerformers(performers);
      } catch (error) {
        console.error('En iyi performanslar alınırken hata:', error);
        setTopPerformers([]);
      }
    };

    fetchUserName();
    fetchStats();
    fetchTargets();
    fetchTopPerformers();
    setLoading(false);
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full spin-smooth mx-auto mb-3"></div>
          <p className="text-gray-600 font-medium">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Welcome Header */}
        <div className="card-modern p-4 sm:p-6 lg:p-8 bg-gradient-lavender">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-purple rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gradient-purple">
                  Hoş Geldiniz, {userName || 'Kullanıcı'}! 👋
                </h1>
                <p className="text-sm sm:text-base lg:text-xl text-gray-600 dark:text-gray-300 font-medium mt-1 sm:mt-2">
                  Satış Takip CRM - <strong className="hidden sm:inline">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  <span className="sm:hidden">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span> günü özeti
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
                  <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-purple-100 text-purple-800">
                    <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {currentUser?.role === 'admin' ? 'Yönetici' : 
                     currentUser?.role === 'teamLeader' ? 'Takım Lideri' : 'Personel'}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800">
                    <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Aktif
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 float-animation"></div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card-modern p-6 hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center space-x-1 text-sm font-semibold text-green-600">
                <ArrowUp className="h-4 w-4" />
                <span>{stats.totalRecordsChange}</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Bugünkü Toplam Kayıt
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalRecords.toLocaleString('tr-TR')}
              </p>
            </div>
          </div>

          <div className="card-modern p-6 hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center space-x-1 text-sm font-semibold text-green-600">
                <ArrowUp className="h-4 w-4" />
                <span>{stats.successfulSalesChange}</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Bugünkü Başarılı Satışlar
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.successfulSales.toLocaleString('tr-TR')}
              </p>
            </div>
          </div>

          {/* Achievement Widget */}
          <div className="hover:scale-105 transition-transform duration-300">
            <AchievementWidget />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-modern p-4 sm:p-6 lg:p-8">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Hızlı İşlemler</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Herkes için ortak işlemler */}
            <button
              onClick={() => navigate('/records')}
              className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
              </div>
              <h3 className="text-sm sm:text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                Kayıtları Görüntüle
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                Tüm satış kayıtlarını listele ve filtrele
              </p>
            </button>

            <button
              onClick={() => navigate('/add-record')}
              className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                Yeni Kayıt Ekle
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                Hızlı satış kaydı oluştur
              </p>
            </button>

            {/* Admin için özel işlemler - Mantıklı sıralama */}
            {currentUser?.role === 'admin' && (
              <>
                {/* 1. Analitik ve Raporlar */}
                <button
                  onClick={() => navigate('/analytics')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <PieChart className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Analitik Dashboard
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Detaylı raporlar ve analizler
                  </p>
                </button>

                <button
                  onClick={() => navigate('/personnel-development')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-rose-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <UserPlus className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Personel Gelişimi
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Personel analizi ve gelişim önerileri
                  </p>
                </button>

                <button
                  onClick={() => navigate('/monthly-comparison')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <BarChart2 className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Aylık Karşılaştırma
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Aylık performans karşılaştırması
                  </p>
                </button>

                <button
                  onClick={() => navigate('/duplicate-numbers')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <Search className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Mükerrer Analizi
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Tekrar aranan numaraları analiz et
                  </p>
                </button>

                {/* 2. Kullanıcı ve Takım Yönetimi */}
                <button
                  onClick={() => navigate('/user-management')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Kullanıcı Yönetimi
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Personel ekle, düzenle ve yönet
                  </p>
                </button>

                <button
                  onClick={() => navigate('/team-management')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Takım Yönetimi
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Takım liderleri ve ekip yönetimi
                  </p>
                </button>

                <button
                  onClick={() => navigate('/target-management')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Hedef Yönetimi
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Personel hedefleri belirle ve takip et
                  </p>
                </button>

                <button
                  onClick={() => navigate('/user-switcher')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <UserCheck className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Hesap Geçişi
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Başka kullanıcı hesabına geçiş yap
                  </p>
                </button>

                {/* 3. Veri Yönetimi */}
                <button
                  onClick={() => navigate('/data-import')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <Database className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Veri İçe Aktarma
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Excel dosyalarından toplu veri yükle
                  </p>
                </button>

                {/* 4. Sistem Yönetimi */}
                <button
                  onClick={() => navigate('/system-settings')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Sistem Ayarları
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Genel sistem konfigürasyonu
                  </p>
                </button>

                <button
                  onClick={() => navigate('/system-logs')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Sistem Logları
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Güvenlik ve sistem kayıtları
                  </p>
                </button>
              </>
            )}

            {/* Takım Lideri için özel işlemler */}
            {currentUser?.role === 'teamLeader' && (
              <>
                <button
                  onClick={() => navigate('/analytics')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <PieChart className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Analitik Raporları
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Takım performans analizleri
                  </p>
                </button>

                <button
                  onClick={() => navigate('/personnel-development')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-rose-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <UserPlus className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Takım Gelişimi
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Takım üyelerinin gelişim analizi
                  </p>
                </button>

                <button
                  onClick={() => navigate('/team-performance')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Takım Performansı
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Ekip üyelerinin detaylı analizi
                  </p>
                </button>

                <button
                  onClick={() => navigate('/monthly-comparison')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <BarChart2 className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Aylık Karşılaştırma
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Takım aylık performans raporu
                  </p>
                </button>

                <button
                  onClick={() => navigate('/duplicate-numbers')}
                  className="group text-left p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <Search className="h-5 w-5 text-white" />
                    </div>
                    <ArrowUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transform group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-700 transition-colors">
                    Mükerrer Analizi
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                    Takım mükerrer numara analizi
                  </p>
                </button>

              </>
            )}

            {/* Personel için temel işlemler - Sadece ortak işlemler kullanılır */}
          </div>
        </div>

        {/* Top Performers - Zirveye Adını Yazdıranlar */}
        <div className="card-modern p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Zirveye Adını Yazdıranlar</h2>
            </div>
            <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 sm:px-3 sm:py-1 rounded-full">Bu Ay En İyi 3 Satışçı</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {topPerformers.length > 0 ? (
              topPerformers.map((performer, index) => {
                const positions = [
                  {
                    title: '🥇 ALTIN',
                    bgGradient: 'from-yellow-400 via-yellow-500 to-yellow-600',
                    borderColor: 'border-yellow-300',
                    textColor: 'text-yellow-800',
                    icon: Trophy,
                    iconBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                  },
                  {
                    title: '🥈 GÜMÜŞ',
                    bgGradient: 'from-gray-300 via-gray-400 to-gray-500',
                    borderColor: 'border-gray-300',
                    textColor: 'text-gray-800',
                    icon: Medal,
                    iconBg: 'bg-gradient-to-br from-gray-400 to-gray-500'
                  },
                  {
                    title: '🥉 BRONZ',
                    bgGradient: 'from-orange-400 via-orange-500 to-orange-600',
                    borderColor: 'border-orange-300',
                    textColor: 'text-orange-800',
                    icon: Award,
                    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600'
                  }
                ];
                
                const position = positions[index];
                const Icon = position.icon;
                
                return (
                  <div 
                    key={performer.userId} 
                    className={`relative p-6 rounded-2xl border-2 ${position.borderColor} bg-gradient-to-br ${position.bgGradient} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
                  >
                    <div className="text-center">
                      <div className={`w-16 h-16 ${position.iconBg} rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-1">
                        {position.title}
                      </h3>
                      
                      <h4 className="text-xl font-bold text-white mb-2">
                        {performer.userName}
                      </h4>
                      
                      <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
                        <p className="text-2xl font-bold text-white">
                          {performer.salesCount}
                        </p>
                        <p className="text-sm text-white opacity-90">
                          Başarılı Satış
                        </p>
                      </div>
                      
                      {index === 0 && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-yellow-800 font-bold text-sm">👑</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-8">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trophy className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Bu ay henüz satış verisi bulunmuyor</p>
                <p className="text-sm text-gray-400 mt-1">İlk satışları yapan personeller burada görünecek</p>
              </div>
            )}
          </div>
        </div>

        {/* User Targets */}
        {(currentUser?.role === 'personnel' || currentUser?.role === 'teamLeader') && userTargets.length > 0 && (
          <div className="card-modern p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Hedeflerim</h3>
            </div>
            
            <div className="space-y-6">
              {userTargets.map((target) => {
                // Bu ay için hedef mi kontrol et
                const currentMonth = new Date().toISOString().slice(0, 7);
                const isCurrentMonth = target.period === currentMonth;
                
                if (!isCurrentMonth) return null;
                
                // Basit hesaplama - gerçek veri için daha detaylı hesaplama gerekebilir
                const monthlyProgress = Math.min((stats.successfulSales / target.targetValue) * 100, 100);
                const progressPercentage = Math.round(monthlyProgress);
                
                return (
                  <div key={target.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">
                        Hedef: {target.targetValue} {target.targetType === 'monthly' ? 'Aylık' : 'Yıllık'} Satış
                      </span>
                      <span className="text-sm font-bold text-green-600">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {stats.successfulSales} / {target.targetValue} satış tamamlandı
                    </p>
                    {target.description && (
                      <p className="text-xs text-gray-400 italic">{target.description}</p>
                    )}
                  </div>
                );
              })}

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Başarı Oranı</span>
                  <span className="text-sm font-bold text-blue-600">
                    {stats.totalRecords > 0 ? Math.round((stats.successfulSales / stats.totalRecords) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${stats.totalRecords > 0 ? (stats.successfulSales / stats.totalRecords) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">{stats.successfulSales} başarılı / {stats.totalRecords} toplam</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="card-modern p-6 bg-gradient-periwinkle">
          <div className="text-center">
            <p className="text-gray-600 font-medium">
              Bugün <span className="font-bold text-purple-700">{stats.totalRecords}</span> yeni kayıt eklediniz.
              Bu ay toplam <span className="font-bold text-purple-700">{stats.totalRecords}</span> kayıt oluşturdunuz.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Başarı oranınız: <span className="font-semibold text-green-600">
                {stats.totalRecords > 0 ? Math.round((stats.successfulSales / stats.totalRecords) * 100) : 0}%
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 