import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus,
  BookOpen,
  Award,
  AlertTriangle,
  Star,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Users,
  Target,
  Activity,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  BarChart3
} from 'lucide-react';

const PersonnelDevelopment = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [personnelData, setPersonnelData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('conversionRate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Personel gelişimi analizi fonksiyonu
  const calculatePersonnelDevelopment = async () => {
    try {
      setLoading(true);
      
      // Sales records çek
      const recordsRef = collection(db, 'sales_records');
      const recordsSnapshot = await getDocs(recordsRef);
      const records = [];
      
      recordsSnapshot.forEach((doc) => {
        const data = doc.data();
        records.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });

      // Kullanıcı bilgilerini çek
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData = {};
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        usersData[userData.uid] = userData;
        if (userData.email) {
          usersData[userData.email] = userData;
        }
      });

      // Personel istatistikleri hesapla
      const personnelStats = {};
      records.forEach(record => {
        // Önce createdBy'a bak, yoksa personel'e bak (düzeltilmiş veriler için)
        let personnelKey = null;
        let personnelName = null;
        
        // createdBy UID'si varsa, kullanıcı verilerinden gerçek ismi bul
        if (record.createdBy && usersData[record.createdBy]) {
          personnelKey = record.createdBy;
          personnelName = usersData[record.createdBy].name || record.createdBy;
        } 
        // createdBy yoksa veya kullanıcı bulunamadıysa, personel field'ını kullan
        else if (record.personel) {
          personnelKey = record.personel;
          personnelName = record.personel;
          
          // Personel ismini UID ile eşleştirmeye çalış
          const matchingUser = Object.values(usersData).find(user => 
            user.name && user.name.toLowerCase() === record.personel.toLowerCase()
          );
          if (matchingUser) {
            personnelKey = matchingUser.uid;
            personnelName = matchingUser.name;
          }
        }
        // Her ikisi de yoksa
        else {
          personnelKey = 'Personel Atanmamış';
          personnelName = 'Personel Atanmamış';
        }
        
        if (!personnelStats[personnelKey]) {
          personnelStats[personnelKey] = {
            name: personnelName,
            uid: personnelKey,
            totalRecords: 0,
            successfulSales: 0,
            conversionRate: 0
          };
        }
        personnelStats[personnelKey].totalRecords++;
        if (record.detay === 'Satış Sağlandı' || record.detay === 'Satış sağlandı') {
          personnelStats[personnelKey].successfulSales++;
        }
      });

      // Conversion rate hesapla
      Object.values(personnelStats).forEach(stat => {
        stat.conversionRate = stat.totalRecords > 0 
          ? ((stat.successfulSales / stat.totalRecords) * 100).toFixed(1)
          : 0;
      });

      // Detaylı analiz
      const development = Object.entries(personnelStats).map(([personnelId, stats]) => {
        const userInfo = usersData[personnelId] || {};
        
        // Rol kontrolü
        if (currentUser?.role === 'teamLeader') {
          if (userInfo.role === 'admin' || userInfo.role === 'teamLeader') {
            return null;
          }
        }

        // Personelin kayıtlarını analiz et (güncellenmiş mantık)
        const personnelRecords = records.filter(record => {
          // UID ile eşleştir
          if (record.createdBy === personnelId) return true;
          
          // İsim ile eşleştir
          if (record.personel === personnelId) return true;
          
          // Kullanıcı adı ile eşleştir (esnek)
          const userInfo = usersData[personnelId];
          if (userInfo && userInfo.name && record.personel) {
            return userInfo.name.toLowerCase() === record.personel.toLowerCase();
          }
          
          return false;
        });

        // Durum ve detay analizi
        const statusAnalysis = {};
        const detailAnalysis = {};
        const monthlyAnalysis = {};
        
        personnelRecords.forEach(record => {
          const status = record.durum || 'Bilinmeyen';
          const detail = record.detay || 'Bilinmeyen';
          const month = record.createdAt ? record.createdAt.toISOString().slice(0, 7) : 'Bilinmeyen';
          
          statusAnalysis[status] = (statusAnalysis[status] || 0) + 1;
          detailAnalysis[detail] = (detailAnalysis[detail] || 0) + 1;
          
          if (!monthlyAnalysis[month]) {
            monthlyAnalysis[month] = { total: 0, successful: 0 };
          }
          monthlyAnalysis[month].total++;
          if (record.detay === 'Satış Sağlandı' || record.detay === 'Satış sağlandı') {
            monthlyAnalysis[month].successful++;
          }
        });

        // En çok karşılaştığı durumlar
        const topStatuses = Object.entries(statusAnalysis)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);

        const topDetails = Object.entries(detailAnalysis)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);

        // Aylık trend analizi
        const monthlyTrends = Object.entries(monthlyAnalysis)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({
            month,
            total: data.total,
            successful: data.successful,
            conversionRate: data.total > 0 ? ((data.successful / data.total) * 100).toFixed(1) : 0
          }));

        // Performans değerlendirmesi
        const conversionRate = parseFloat(stats.conversionRate);
        let performanceLevel = 'Orta';
        let performanceScore = 50;
        let recommendations = [];
        let strengths = [];
        let weaknesses = [];
        let urgentActions = [];

        if (conversionRate >= 30) {
          performanceLevel = 'Mükemmel';
          performanceScore = 95;
          strengths.push('Olağanüstü dönüşüm oranı');
          strengths.push('Üstün satış becerileri');
          strengths.push('Müşteri ilişkilerinde uzman');
          recommendations.push('Diğer personele mentorluk yapabilir');
          recommendations.push('İleri seviye satış tekniklerini öğrenebilir');
        } else if (conversionRate >= 20) {
          performanceLevel = 'Çok İyi';
          performanceScore = 80;
          strengths.push('Yüksek dönüşüm oranı');
          strengths.push('Etkili satış teknikleri');
          strengths.push('İyi müşteri yaklaşımı');
          recommendations.push('Liderlik becerilerini geliştirebilir');
          recommendations.push('Kompleks satış durumlarında eğitim alabilir');
        } else if (conversionRate >= 15) {
          performanceLevel = 'İyi';
          performanceScore = 70;
          strengths.push('Ortalama üstü performans');
          strengths.push('Tutarlı çalışma');
          recommendations.push('Satış tekniklerini derinleştirme eğitimi');
          recommendations.push('Müşteri psikolojisi eğitimi');
          recommendations.push('Hedef odaklı çalışma planı');
        } else if (conversionRate >= 10) {
          performanceLevel = 'Orta';
          performanceScore = 50;
          recommendations.push('Temel satış eğitimi');
          recommendations.push('Müşteri iletişimi eğitimi');
          recommendations.push('Satış süreçlerini gözden geçirme');
          recommendations.push('Haftalık performans takibi');
          weaknesses.push('Dönüşüm oranı geliştirilebilir');
          weaknesses.push('Satış tekniklerinde eksiklik');
        } else if (conversionRate >= 5) {
          performanceLevel = 'Gelişmeli';
          performanceScore = 30;
          urgentActions.push('Acil satış eğitimi programına dahil et');
          urgentActions.push('Günlük mentorluk desteği sağla');
          urgentActions.push('Basit satış hedefleri belirle');
          recommendations.push('Temel iletişim becerileri eğitimi');
          recommendations.push('Ürün bilgisi eğitimi');
          weaknesses.push('Düşük dönüşüm oranı');
          weaknesses.push('Satış tekniklerinde büyük eksiklik');
          weaknesses.push('Müşteri yaklaşımında sorunlar');
        } else {
          performanceLevel = 'Kritik';
          performanceScore = 10;
          urgentActions.push('Acil performans geliştirme planı');
          urgentActions.push('Yoğun mentorluk programı');
          urgentActions.push('Temel satış eğitimi (1-1)');
          urgentActions.push('Performans gözden geçirme toplantısı');
          recommendations.push('Rol uygunluğunu değerlendir');
          weaknesses.push('Çok düşük dönüşüm oranı');
          weaknesses.push('Temel satış becerilerinde eksiklik');
          weaknesses.push('Müşteri iletişiminde ciddi sorunlar');
        }

        // Aktivite analizi
        if (stats.totalRecords < 5) {
          weaknesses.push('Çok düşük aktivite seviyesi');
          urgentActions.push('Günlük minimum çağrı hedefi belirle');
          performanceScore -= 10;
        } else if (stats.totalRecords < 15) {
          weaknesses.push('Düşük aktivite seviyesi');
          recommendations.push('Günlük çağrı hedefini artır');
          performanceScore -= 5;
        } else if (stats.totalRecords > 100) {
          strengths.push('Çok yüksek aktivite seviyesi');
          performanceScore += 5;
        } else if (stats.totalRecords > 50) {
          strengths.push('Yüksek aktivite seviyesi');
          performanceScore += 3;
        }

        // Durum analizi
        const topStatus = topStatuses[0];
        if (topStatus) {
          const statusPercentage = (topStatus[1] / stats.totalRecords) * 100;
          
          if (topStatus[0] === 'Ulaşılamadı' && statusPercentage > 60) {
            weaknesses.push('Çok yüksek ulaşılamama oranı');
            urgentActions.push('İletişim stratejisini gözden geçir');
            recommendations.push('Çağrı saatlerini optimize et');
            performanceScore -= 15;
          } else if (topStatus[0] === 'Meşgul' && statusPercentage > 40) {
            recommendations.push('Farklı saatlerde arama stratejisi');
            recommendations.push('Randevu sistemi kullanmayı dene');
          } else if (topStatus[0] === 'Arandı' && statusPercentage > 50) {
            strengths.push('İyi ulaşım oranı');
            performanceScore += 5;
          }
        }

        // Trend analizi
        if (monthlyTrends.length >= 2) {
          const lastMonth = monthlyTrends[monthlyTrends.length - 1];
          const previousMonth = monthlyTrends[monthlyTrends.length - 2];
          
          if (parseFloat(lastMonth.conversionRate) > parseFloat(previousMonth.conversionRate)) {
            strengths.push('Yükselişte olan performans');
            performanceScore += 5;
          } else if (parseFloat(lastMonth.conversionRate) < parseFloat(previousMonth.conversionRate)) {
            weaknesses.push('Düşüşte olan performans');
            recommendations.push('Performans düşüşünün nedenlerini araştır');
            performanceScore -= 5;
          }
        }

        // Performans skoru düzeltmesi
        performanceScore = Math.max(0, Math.min(100, performanceScore));

        return {
          personnelId,
          name: userInfo.name || userInfo.email?.split('@')[0] || personnelId,
          email: userInfo.email || '',
          role: userInfo.role || 'personnel',
          totalRecords: stats.totalRecords,
          successfulSales: stats.successfulSales,
          conversionRate,
          performanceLevel,
          performanceScore,
          strengths,
          weaknesses,
          recommendations,
          urgentActions,
          topStatuses: topStatuses.map(([status, count]) => ({ 
            status, 
            count, 
            percentage: ((count / stats.totalRecords) * 100).toFixed(1) 
          })),
          topDetails: topDetails.map(([detail, count]) => ({ 
            detail, 
            count, 
            percentage: ((count / stats.totalRecords) * 100).toFixed(1) 
          })),
          monthlyTrends,
          lastActivity: personnelRecords.length > 0 ? new Date(Math.max(...personnelRecords.map(r => {
            if (r.createdAt?.toDate) return r.createdAt.toDate().getTime();
            if (r.createdAt) return new Date(r.createdAt).getTime();
            if (r.tarih) return new Date(r.tarih).getTime();
            return 0;
          }))) : null,
          totalCallsThisMonth: monthlyTrends.length > 0 ? monthlyTrends[monthlyTrends.length - 1]?.total || 0 : 0,
          successfulCallsThisMonth: monthlyTrends.length > 0 ? monthlyTrends[monthlyTrends.length - 1]?.successful || 0 : 0
        };
      }).filter(Boolean);

      const sortedDevelopment = development.sort((a, b) => b.performanceScore - a.performanceScore);
      
      setPersonnelData(sortedDevelopment);
      setFilteredData(sortedDevelopment);
      
    } catch (error) {
      console.error('Personel gelişimi analizi hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'teamLeader') {
      calculatePersonnelDevelopment();
    }
  }, [currentUser]);

  // Filtreleme ve sıralama
  useEffect(() => {
    let filtered = [...personnelData];

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(person => 
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Performans filtresi
    if (performanceFilter !== 'all') {
      filtered = filtered.filter(person => person.performanceLevel === performanceFilter);
    }

    // Sıralama
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredData(filtered);
  }, [personnelData, searchTerm, performanceFilter, sortBy, sortOrder]);

  const getPerformanceColor = (level) => {
    switch (level) {
      case 'Mükemmel': return 'from-green-500 to-green-600';
      case 'Çok İyi': return 'from-emerald-500 to-emerald-600';
      case 'İyi': return 'from-blue-500 to-blue-600';
      case 'Orta': return 'from-yellow-500 to-yellow-600';
      case 'Gelişmeli': return 'from-orange-500 to-orange-600';
      case 'Kritik': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getPerformanceIcon = (level) => {
    switch (level) {
      case 'Mükemmel': return Award;
      case 'Çok İyi': return Star;
      case 'İyi': return TrendingUp;
      case 'Orta': return BookOpen;
      case 'Gelişmeli': return AlertTriangle;
      case 'Kritik': return TrendingDown;
      default: return Users;
    }
  };

  const exportData = () => {
    // CSV export functionality
    const csvData = filteredData.map(person => ({
      'Personel Adı': person.name,
      'Email': person.email,
      'Performans Seviyesi': person.performanceLevel,
      'Performans Skoru': person.performanceScore,
      'Toplam Kayıt': person.totalRecords,
      'Başarılı Satış': person.successfulSales,
      'Dönüşüm Oranı': `%${person.conversionRate}`,
      'Bu Ay Çağrı': person.totalCallsThisMonth,
      'Bu Ay Satış': person.successfulCallsThisMonth,
      'Son Aktivite': person.lastActivity?.toLocaleDateString('tr-TR') || 'Bilinmiyor'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `personel-gelisimi-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teamLeader')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Erişim Yetkisi Yok
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Bu sayfaya erişim için admin veya takım lideri yetkisi gereklidir.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Personel verileri analiz ediliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="card-modern p-8 bg-gradient-lavender">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-purple rounded-2xl flex items-center justify-center shadow-lg">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gradient-purple">
                  Personel Gelişimi ve Analizi
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 font-medium mt-2">
                  Detaylı performans analizi ve gelişim önerileri
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    <Users className="h-4 w-4 mr-1" />
                    {filteredData.length} Personel
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Activity className="h-4 w-4 mr-1" />
                    Canlı Analiz
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="card-modern p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Personel ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              {/* Performance Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  value={performanceFilter}
                  onChange={(e) => setPerformanceFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 appearance-none bg-white"
                >
                  <option value="all">Tüm Performanslar</option>
                  <option value="Mükemmel">Mükemmel</option>
                  <option value="Çok İyi">Çok İyi</option>
                  <option value="İyi">İyi</option>
                  <option value="Orta">Orta</option>
                  <option value="Gelişmeli">Gelişmeli</option>
                  <option value="Kritik">Kritik</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="performanceScore">Performans Skoru</option>
                  <option value="conversionRate">Dönüşüm Oranı</option>
                  <option value="totalRecords">Toplam Kayıt</option>
                  <option value="successfulSales">Başarılı Satış</option>
                  <option value="name">İsim</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={calculatePersonnelDevelopment}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Yenile</span>
              </button>
              <button
                onClick={exportData}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Dışa Aktar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {['Mükemmel', 'Çok İyi', 'İyi', 'Orta', 'Gelişmeli', 'Kritik'].map((level) => {
            const count = filteredData.filter(p => p.performanceLevel === level).length;
            const percentage = filteredData.length > 0 
              ? ((count / filteredData.length) * 100).toFixed(1)
              : 0;
            
            const colors = {
              'Mükemmel': 'bg-green-100 text-green-800 border-green-200',
              'Çok İyi': 'bg-emerald-100 text-emerald-800 border-emerald-200',
              'İyi': 'bg-blue-100 text-blue-800 border-blue-200',
              'Orta': 'bg-yellow-100 text-yellow-800 border-yellow-200',
              'Gelişmeli': 'bg-orange-100 text-orange-800 border-orange-200',
              'Kritik': 'bg-red-100 text-red-800 border-red-200'
            };

            return (
              <div key={level} className={`p-4 rounded-xl border-2 ${colors[level]} hover:shadow-lg transition-shadow`}>
                <div className="text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm font-medium">{level}</p>
                  <p className="text-xs opacity-75">%{percentage}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Personnel Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredData.map((personnel) => {
            const PerformanceIcon = getPerformanceIcon(personnel.performanceLevel);

            return (
              <div 
                key={personnel.personnelId} 
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  setSelectedPersonnel(personnel);
                  setShowDetailModal(true);
                }}
              >
                {/* Header */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${getPerformanceColor(personnel.performanceLevel)} rounded-xl flex items-center justify-center shadow-lg`}>
                    <PerformanceIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {personnel.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {personnel.email}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        personnel.performanceLevel === 'Mükemmel' ? 'bg-green-100 text-green-800' :
                        personnel.performanceLevel === 'Çok İyi' ? 'bg-emerald-100 text-emerald-800' :
                        personnel.performanceLevel === 'İyi' ? 'bg-blue-100 text-blue-800' :
                        personnel.performanceLevel === 'Orta' ? 'bg-yellow-100 text-yellow-800' :
                        personnel.performanceLevel === 'Gelişmeli' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {personnel.performanceLevel}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {personnel.performanceScore}/100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {personnel.totalRecords}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Toplam Kayıt
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {personnel.successfulSales}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Başarılı Satış
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      %{personnel.conversionRate}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Dönüşüm
                    </p>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Performans Skoru
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {personnel.performanceScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full bg-gradient-to-r ${getPerformanceColor(personnel.performanceLevel)} transition-all duration-500`}
                      style={{ width: `${personnel.performanceScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="space-y-2">
                  {personnel.urgentActions.length > 0 && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        {personnel.urgentActions.length} acil eylem gerekli
                      </span>
                    </div>
                  )}
                  
                  {personnel.strengths.length > 0 && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        {personnel.strengths.length} güçlü yön
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-blue-600">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      {personnel.recommendations.length} öneri
                    </span>
                  </div>
                </div>

                {/* Last Activity */}
                {personnel.lastActivity && (
                  <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs">
                        Son Aktivite: {personnel.lastActivity.toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                )}

                {/* View Details Button */}
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                  <button className="w-full flex items-center justify-center space-x-2 text-purple-600 hover:text-purple-700 font-medium text-sm">
                    <Eye className="h-4 w-4" />
                    <span>Detayları Görüntüle</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredData.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Personel Bulunamadı
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Arama kriterlerinize uygun personel bulunamadı. Filtreleri kontrol edin.
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedPersonnel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {selectedPersonnel.name} - Detaylı Analiz
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Güçlü Yönler */}
              {selectedPersonnel.strengths.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Güçlü Yönler
                  </h4>
                  <ul className="space-y-2">
                    {selectedPersonnel.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                        • {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gelişim Alanları */}
              {selectedPersonnel.weaknesses.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" />
                    Gelişim Alanları
                  </h4>
                  <ul className="space-y-2">
                    {selectedPersonnel.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                        • {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Öneriler */}
              {selectedPersonnel.recommendations.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Gelişim Önerileri
                  </h4>
                  <ul className="space-y-2">
                    {selectedPersonnel.recommendations.map((recommendation, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                        • {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Acil Eylemler */}
              {selectedPersonnel.urgentActions.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-orange-700 dark:text-orange-400 mb-3 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Acil Eylemler
                  </h4>
                  <ul className="space-y-2">
                    {selectedPersonnel.urgentActions.map((action, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                        • {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Durum Analizi */}
            <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                En Çok Karşılaştığı Durumlar
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPersonnel.topStatuses.slice(0, 4).map((status, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {status.status}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {status.count}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                        %{status.percentage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aylık Trend */}
            {selectedPersonnel.monthlyTrends.length > 0 && (
              <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Aylık Performans Trendi
                </h4>
                <div className="space-y-2">
                  {selectedPersonnel.monthlyTrends.slice(-3).map((trend, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(trend.month + '-01').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                      </span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {trend.successful}/{trend.total}
                        </span>
                        <span className="text-sm font-semibold text-purple-600">
                          %{trend.conversionRate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelDevelopment; 