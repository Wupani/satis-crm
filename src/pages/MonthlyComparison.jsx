import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../auth/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  Calendar,
  TrendingUp,
  BarChart3,
  Users,
  Phone,
  CheckCircle,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  Filter,
  Download
} from 'lucide-react';

const MonthlyComparison = () => {
  const { currentUser, userRole } = useAuth();
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [totalStats, setTotalStats] = useState({
    totalRecords: 0,
    totalSales: 0,
    conversionRate: 0,
    activePersonnel: 0
  });

  // Ay isimleri
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedYear, currentUser]);

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      // Tüm kayıtları çek
      let recordsQuery = collection(db, 'sales_records');
      let allowedUserIds = [];
      
      // Eğer admin değilse, yetki kontrolü yap
      if (userRole !== 'admin') {
        if (userRole === 'teamLeader') {
          // Takım lideri ise: kendisi + takım üyeleri
          
          // Önce tüm kullanıcıları çek
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const users = [];
          usersSnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
          });
          
          // Takım liderinin kendisi
          allowedUserIds.push(currentUser.uid);
          
          // Takım üyelerini bul (teamLeader alanı bu kullanıcının ID'si olan)
          const teamMembers = users.filter(user => 
            user.teamLeader === currentUser.uid || user.teamLeader === currentUser.id
          );
          
          teamMembers.forEach(member => {
            allowedUserIds.push(member.id);
          });
          
        } else {
          // Personel ise: sadece kendi kayıtları
          allowedUserIds = [currentUser.uid];
        }
        
        // Kayıtları filtrele
        recordsQuery = query(recordsQuery, where('createdBy', 'in', allowedUserIds));
      }
      
      const recordsSnapshot = await getDocs(recordsQuery);
      const allRecords = [];
      const years = new Set();
      
      recordsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.tarih) {
          allRecords.push(data);
          // Yıl bilgisini çıkar
          const year = new Date(data.tarih).getFullYear();
          if (year >= 2020 && year <= 2030) {
            years.add(year);
          }
        }
      });
      
      // Mevcut yılları güncelle
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears);
      
      // Debug: Detay değerlerini kontrol et
      const detayValues = new Set();
      allRecords.forEach(record => {
        if (record.detay) {
          detayValues.add(record.detay);
        }
      });
      
      // Seçili yıla göre filtrele ve aylık grupla
      const monthlyStats = {};
      let totalRecords = 0;
      let totalSales = 0;
      const personnelSet = new Set();
      
      // 12 ayı başlat
      for (let month = 0; month < 12; month++) {
        monthlyStats[month] = {
          month: month,
          monthName: monthNames[month],
          totalRecords: 0,
          sales: 0,
          ulasilamadi: 0,
          other: 0,
          conversionRate: 0,
          personnel: new Set(),
          statusBreakdown: {}
        };
      }
      
      allRecords.forEach(record => {
        const recordDate = new Date(record.tarih);
        const recordYear = recordDate.getFullYear();
        const recordMonth = recordDate.getMonth();
        
        if (recordYear === selectedYear) {
          totalRecords++;
          personnelSet.add(record.createdByName || record.personel);
          
          const monthData = monthlyStats[recordMonth];
          monthData.totalRecords++;
          monthData.personnel.add(record.createdByName || record.personel);
          
          // Satış kontrolü - Dashboard'daki mantığı kullan
          if (record.detay === 'Satış Sağlandı' || record.detay === 'Satış sağlandı') {
            monthData.sales++;
            totalSales++;
          }
          
          // Durum bazlı sayım (durum alanından)
          const status = record.durum || 'Diğer';
          monthData.statusBreakdown[status] = (monthData.statusBreakdown[status] || 0) + 1;
          
          switch (status) {
            case 'Ulaşılamadı':
              monthData.ulasilamadi++;
              break;
            default:
              monthData.other++;
          }
        }
      });
      
      // Dönüşüm oranlarını hesapla
      Object.values(monthlyStats).forEach(month => {
        month.conversionRate = month.totalRecords > 0 
          ? ((month.sales / month.totalRecords) * 100).toFixed(1)
          : 0;
        month.personnelCount = month.personnel.size;
      });
      
      const monthlyArray = Object.values(monthlyStats);
      setMonthlyData(monthlyArray);
      
      // Genel istatistikler
      setTotalStats({
        totalRecords,
        totalSales,
        conversionRate: totalRecords > 0 ? ((totalSales / totalRecords) * 100).toFixed(1) : 0,
        activePersonnel: personnelSet.size
      });
      
    } catch (error) {
      console.error('Aylık veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // CSV Export fonksiyonu
  const exportToCSV = () => {
    const headers = ['Ay', 'Toplam Kayıt', 'Satış', 'Ulaşılamadı', 'Dönüşüm Oranı', 'Aktif Personel'];
    const csvContent = [
      headers.join(','),
      ...monthlyData.map(month => [
        month.monthName,
        month.totalRecords,
        month.sales,
        month.ulasilamadi,
        `${month.conversionRate}%`,
        month.personnelCount
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aylik-karsilastirma-${selectedYear}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Aylık veriler yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Başlık ve Yıl Seçici */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Aylık Karşılaştırma
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Aylık performans analizi ve karşılaştırma
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV İndir
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Özet İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Kayıt</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.totalRecords}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Satış</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalStats.totalSales}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dönüşüm Oranı</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalStats.conversionRate}%</p>
                </div>
                <Target className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktif Personel</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalStats.activePersonnel}</p>
                </div>
                <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          {/* Aylık Karşılaştırma Tablosu */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                {selectedYear} Yılı Aylık Performans
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Toplam Kayıt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Satış
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ulaşılamadı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Dönüşüm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trend
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Personel
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {monthlyData.map((month, index) => {
                    const prevMonth = index > 0 ? monthlyData[index - 1] : null;
                    const trendIcon = prevMonth ? (
                      month.sales > prevMonth.sales ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : month.sales < prevMonth.sales ? (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-400" />
                      )
                    ) : (
                      <Minus className="h-4 w-4 text-gray-400" />
                    );

                    return (
                      <tr key={month.month} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {month.monthName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {month.totalRecords}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            {month.sales}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                            {month.ulasilamadi}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(month.conversionRate, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {month.conversionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            {trendIcon}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {month.personnelCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyComparison;
