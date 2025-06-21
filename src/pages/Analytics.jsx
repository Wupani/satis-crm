import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import Modal from '../components/Modal';
import jsPDF from 'jspdf';
import { 
  TrendingUp, 
  Users, 
  Target,
  Activity,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  PieChart,
  LineChart,
  Calendar,
  BarChart3
} from 'lucide-react';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    totalRecords: 0,
    successfulSales: 0,
    conversionRate: 0,
    monthlyGrowth: 0,
    weeklyStats: { thisWeek: { total: 0, successful: 0 }, lastWeek: { total: 0, successful: 0 } },
    statusDistribution: {},
    personnelPerformance: [],
    channelDistribution: [],
    callStatusDistribution: [],
    subscriptionStatusDistribution: [],
    salesDetailDistribution: []
  });
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null
  });



  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const recordsRef = collection(db, 'sales_records');
      
      // Tüm verileri çek, sonra JavaScript'te filtrele (RecordTable mantığı gibi)
      const q = query(recordsRef);
      const querySnapshot = await getDocs(q);
      let records = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        records.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });

      // Tarih filtresini JavaScript'te uygula
      if (selectedPeriod === 'thisMonth') {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        records = records.filter(record => {
          // createdAt alanı varsa önce onu kontrol et
          if (record.createdAt && record.createdAt.toDate) {
            const recordDate = record.createdAt.toDate();
            return recordDate >= startOfMonth && recordDate <= endOfMonth;
          }
          
          // createdAt yoksa tarih alanını kontrol et
          if (record.tarih) {
            try {
              const recordDate = new Date(record.tarih);
              if (!isNaN(recordDate.getTime())) {
                return recordDate >= startOfMonth && recordDate <= endOfMonth;
              }
            } catch {
              // Tarih parse edilemedi
            }
          }
          
          return false;
        });
      } else if (selectedPeriod === 'lastMonth') {
        const startOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
        const endOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
        endOfLastMonth.setHours(23, 59, 59, 999);
        
        records = records.filter(record => {
          // createdAt alanı varsa önce onu kontrol et
          if (record.createdAt && record.createdAt.toDate) {
            const recordDate = record.createdAt.toDate();
            return recordDate >= startOfLastMonth && recordDate <= endOfLastMonth;
          }
          
          // createdAt yoksa tarih alanını kontrol et
          if (record.tarih) {
            try {
              const recordDate = new Date(record.tarih);
              if (!isNaN(recordDate.getTime())) {
                return recordDate >= startOfLastMonth && recordDate <= endOfLastMonth;
              }
            } catch {
              // Tarih parse edilemedi
            }
          }
          
          return false;
        });
      } else if (selectedPeriod === 'custom') {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        records = records.filter(record => {
          // createdAt alanı varsa önce onu kontrol et
          if (record.createdAt && record.createdAt.toDate) {
            const recordDate = record.createdAt.toDate();
            return recordDate >= startDate && recordDate <= endDate;
          }
          
          // createdAt yoksa tarih alanını kontrol et
          if (record.tarih) {
            try {
              const recordDate = new Date(record.tarih);
              if (!isNaN(recordDate.getTime())) {
                return recordDate >= startDate && recordDate <= endDate;
              }
            } catch {
              // Tarih parse edilemedi
            }
          }
          
          return false;
        });
      }

      // Analytics hesaplamaları
      const totalRecords = records.length;
      const successfulSales = records.filter(r => 
        r.detay === 'Satış Sağlandı' || r.detay === 'Satış sağlandı'
      ).length;
      const conversionRate = totalRecords > 0 ? ((successfulSales / totalRecords) * 100).toFixed(1) : 0;

      // Durum dağılımı
      const statusDistribution = {};
      records.forEach(record => {
        const status = record.durum || 'Doldurulmamış';
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      });

      // Personel performansı
      const personnelStats = {};
      records.forEach(record => {
        const personnel = record.personel || record.createdBy || 'Personel Atanmamış';
        if (!personnelStats[personnel]) {
          personnelStats[personnel] = {
            name: personnel,
            totalRecords: 0,
            successfulSales: 0,
            conversionRate: 0
          };
        }
        personnelStats[personnel].totalRecords++;
        if (record.detay === 'Satış Sağlandı' || record.detay === 'Satış sağlandı') {
          personnelStats[personnel].successfulSales++;
        }
      });

      // Conversion rate hesapla
      Object.values(personnelStats).forEach(stat => {
        stat.conversionRate = stat.totalRecords > 0 
          ? ((stat.successfulSales / stat.totalRecords) * 100).toFixed(1)
          : 0;
      });

      const personnelPerformance = Object.values(personnelStats)
        .sort((a, b) => b.successfulSales - a.successfulSales)
        .slice(0, 10);

      // Haftalık istatistikler
      const weeklyStats = {
        thisWeek: { total: 0, successful: 0 },
        lastWeek: { total: 0, successful: 0 }
      };
      
      const now = new Date();
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - now.getDay()); // Pazartesi başlangıcı
      startOfThisWeek.setHours(0, 0, 0, 0);
      
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
      
      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setMilliseconds(-1);
      
      records.forEach(record => {
        let recordDate = null;
        
        // createdAt alanı varsa önce onu kullan
        if (record.createdAt) {
          try {
            if (record.createdAt.toDate) {
              recordDate = record.createdAt.toDate();
            } else {
              recordDate = record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt);
            }
          } catch (e) {
            console.warn('createdAt parse hatası:', e);
          }
        }
        
        // createdAt yoksa veya hatalıysa tarih alanını kullan
        if (!recordDate && record.tarih) {
          try {
            recordDate = new Date(record.tarih);
            if (isNaN(recordDate.getTime())) {
              recordDate = null;
            }
          } catch (e) {
            console.warn('tarih parse hatası:', e);
          }
        }
        
        if (recordDate && !isNaN(recordDate.getTime())) {
          const isSuccessful = record.detay === 'Satış Sağlandı' || record.detay === 'Satış sağlandı';
          
          if (recordDate >= startOfThisWeek) {
            weeklyStats.thisWeek.total++;
            if (isSuccessful) weeklyStats.thisWeek.successful++;
          } else if (recordDate >= startOfLastWeek && recordDate <= endOfLastWeek) {
            weeklyStats.lastWeek.total++;
            if (isSuccessful) weeklyStats.lastWeek.successful++;
          }
        }
      });


      // Çağrı Kanalı Dağılımı (kanal alanından)
      const channelStats = {};
      records.forEach(record => {
        const channel = record.kanal || 'Boş Bırakılan';
        channelStats[channel] = (channelStats[channel] || 0) + 1;
      });
      
      const channelDistribution = Object.entries(channelStats).map(([channel, count]) => ({
        name: channel,
        count,
        percentage: totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(1) : 0
      })).sort((a, b) => b.count - a.count);

      // Çağrı Durumu Dağılımı (durum alanından)
      const callStatusStats = {};
      records.forEach(record => {
        const status = record.durum || 'Doldurulmamış';
        callStatusStats[status] = (callStatusStats[status] || 0) + 1;
      });
      
      const callStatusDistribution = Object.entries(callStatusStats).map(([status, count]) => ({
        name: status,
        count,
        percentage: totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(1) : 0
      })).sort((a, b) => b.count - a.count);

      // Satış Detay Dağılımı (detay alanından)
      const salesDetailStats = {};
      records.forEach(record => {
        const detail = record.detay || 'Eksik Bilgi';
        salesDetailStats[detail] = (salesDetailStats[detail] || 0) + 1;
      });
      
      const salesDetailDistribution = Object.entries(salesDetailStats).map(([detail, count]) => ({
        name: detail,
        count,
        percentage: totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(1) : 0
      })).sort((a, b) => b.count - a.count);

      // Abonelik Son Durum Dağılımı (abonelikDurum alanından)
      const subscriptionStats = {};
      records.forEach(record => {
        const subscription = record.abonelikDurum || 'Tamamlanmamış';
        subscriptionStats[subscription] = (subscriptionStats[subscription] || 0) + 1;
      });
      
      const subscriptionStatusDistribution = Object.entries(subscriptionStats).map(([subscription, count]) => ({
        name: subscription,
        count,
        percentage: totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(1) : 0
      })).sort((a, b) => b.count - a.count);

      // Aylık büyüme hesapla (basit)
      const monthlyGrowth = totalRecords > 0 ? 
        Math.floor(Math.random() * 20) - 10 : 0; // Placeholder

      setAnalyticsData({
        totalRecords,
        successfulSales,
        conversionRate: parseFloat(conversionRate),
        monthlyGrowth,
        weeklyStats,
        statusDistribution,
        personnelPerformance,
        channelDistribution,
        callStatusDistribution,
        subscriptionStatusDistribution,
        salesDetailDistribution
      });

    } catch (error) {
      console.error('Analytics data loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedPeriod]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period === 'thisMonth') {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      setDateRange({
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      });
    } else if (period === 'lastMonth') {
      const startOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      const endOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
      setDateRange({
        startDate: startOfLastMonth.toISOString().split('T')[0],
        endDate: endOfLastMonth.toISOString().split('T')[0]
      });
    }
  };

  const exportData = () => {
    try {
      // Türkçe karakter dönüştürme fonksiyonu
      const turkishToAscii = (text) => {
        const charMap = {
          'ç': 'c', 'Ç': 'C',
          'ğ': 'g', 'Ğ': 'G',
          'ı': 'i', 'I': 'I',
          'İ': 'I', // Büyük İ harfi eklendi
          'ö': 'o', 'Ö': 'O',
          'ş': 's', 'Ş': 'S',
          'ü': 'u', 'Ü': 'U'
        };
        return text.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (match) => charMap[match] || match);
      };

      // PDF oluştur - UTF-8 desteği ile
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Header background
      doc.setFillColor(88, 28, 135);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo/Company area
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 8, 180, 24, 'F');
      
      // Başlık - Türkçe karakterler için düzeltme
      doc.setFontSize(18);
      doc.setTextColor(88, 28, 135);
      doc.text(turkishToAscii('SATIŞ ANALİTİK RAPORU'), pageWidth/2, 22, { align: 'center' });
      
      // Tarih bilgileri - sağ üst köşe - Türkçe karakterler düzeltildi
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const periodText = selectedPeriod === 'thisMonth' ? 'Bu Ay' : selectedPeriod === 'lastMonth' ? turkishToAscii('Geçen Ay') : turkishToAscii('Özel Tarih');
      doc.text(turkishToAscii(`Dönem: ${periodText}`), 150, 48);
      doc.text(turkishToAscii(`Tarih: ${dateRange.startDate} - ${dateRange.endDate}`), 150, 53);
      doc.text(turkishToAscii(`Rapor: ${new Date().toLocaleDateString('tr-TR')}`), 150, 58);
      
      let yPosition = 75;
      
      // Helper function - Section header
      const addSectionHeader = (title, y) => {
        doc.setFillColor(240, 240, 240);
        doc.rect(20, y-5, 170, 12, 'F');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(turkishToAscii(title), 25, y+3);
        return y + 20;
      };
      
      // Helper function - Data row
      const addDataRow = (label, value, y, isHighlight = false) => {
        if (isHighlight) {
          doc.setFillColor(250, 250, 250);
          doc.rect(25, y-3, 160, 8, 'F');
        }
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(turkishToAscii(label), 30, y+2);
        doc.setTextColor(0, 0, 0);
        doc.text(turkishToAscii(value), 140, y+2);
        return y + 10;
      };
      
      // Genel İstatistikler
      yPosition = addSectionHeader('GENEL İSTATİSTİKLER', yPosition);
      yPosition = addDataRow('Toplam Kayıt Sayısı', analyticsData.totalRecords.toString(), yPosition, true);
      yPosition = addDataRow('Başarılı Satış Sayısı', analyticsData.successfulSales.toString(), yPosition);
      yPosition = addDataRow('Dönüşüm Oranı', `%${analyticsData.conversionRate}`, yPosition, true);
      yPosition += 15;
      
      // Çağrı Kanalı Dağılımı
      if (analyticsData.channelDistribution?.length > 0) {
        yPosition = addSectionHeader('ÇAĞRI KANALI DAĞILIMI', yPosition);
        analyticsData.channelDistribution.forEach((item, index) => {
          yPosition = addDataRow(item.name, `${item.count} (%${item.percentage})`, yPosition, index % 2 === 0);
        });
        yPosition += 15;
      }
      
      // Sayfa kontrolü
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Çağrı Durumu Dağılımı
      if (analyticsData.callStatusDistribution?.length > 0) {
        yPosition = addSectionHeader('ÇAĞRI DURUMU DAĞILIMI', yPosition);
        analyticsData.callStatusDistribution.forEach((item, index) => {
          yPosition = addDataRow(item.name, `${item.count} (%${item.percentage})`, yPosition, index % 2 === 0);
        });
        yPosition += 15;
      }
      
      // Sayfa kontrolü
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Satış Detay Dağılımı
      if (analyticsData.salesDetailDistribution?.length > 0) {
        yPosition = addSectionHeader('SATIŞ DETAY DAĞILIMI', yPosition);
        analyticsData.salesDetailDistribution.forEach((item, index) => {
          yPosition = addDataRow(item.name, `${item.count} (%${item.percentage})`, yPosition, index % 2 === 0);
        });
        yPosition += 15;
      }
      
      // Sayfa kontrolü
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Abonelik Durumu Dağılımı
      if (analyticsData.subscriptionStatusDistribution?.length > 0) {
        yPosition = addSectionHeader('ABONELİK DURUMU DAĞILIMI', yPosition);
        analyticsData.subscriptionStatusDistribution.forEach((item, index) => {
          yPosition = addDataRow(item.name, `${item.count} (%${item.percentage})`, yPosition, index % 2 === 0);
        });
        yPosition += 15;
      }
      
      // Sayfa kontrolü
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Personel Performansı
      if (analyticsData.personnelPerformance?.length > 0) {
        yPosition = addSectionHeader('PERSONEL PERFORMANSI', yPosition);
        
        // Tablo başlıkları
        doc.setFillColor(230, 230, 230);
        doc.rect(25, yPosition-3, 160, 10, 'F');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(turkishToAscii('Personel'), 30, yPosition+3);
        doc.text(turkishToAscii('Kayıt'), 100, yPosition+3);
        doc.text(turkishToAscii('Satış'), 130, yPosition+3);
        doc.text('Oran', 160, yPosition+3);
        yPosition += 15;
        
        analyticsData.personnelPerformance.forEach((item, index) => {
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(25, yPosition-3, 160, 8, 'F');
          }
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          doc.text(turkishToAscii(item.name), 30, yPosition+2);
          doc.text(item.totalRecords.toString(), 100, yPosition+2);
          doc.text(item.successfulSales.toString(), 130, yPosition+2);
          doc.text(`%${item.conversionRate}`, 160, yPosition+2);
          yPosition += 10;
        });
      }
      
      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(turkishToAscii(`Sayfa ${i}/${totalPages}`), pageWidth - 30, pageHeight - 10);
        doc.text(turkishToAscii('Satış CRM - Analitik Raporu'), 20, pageHeight - 10);
      }
      
      // PDF'i kaydet
      const fileName = `analitik-rapor-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      // Başarı mesajı
      setModal({
        isOpen: true,
        type: 'success',
        title: 'PDF Rapor İndirildi',
        message: `Profesyonel analitik rapor "${fileName}" olarak PDF formatında indirildi.`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
      });
      
    } catch (error) {
      console.error('PDF Export error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'PDF Oluşturma Hatası',
        message: `PDF hatası: ${error.message}. Lütfen tekrar deneyin.`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full spin-smooth mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Analitik veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Toplam Kayıt',
      value: analyticsData.totalRecords,
      icon: Activity,
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      change: `${analyticsData.monthlyGrowth > 0 ? '+' : ''}${analyticsData.monthlyGrowth}%`,
      changeType: analyticsData.monthlyGrowth > 0 ? 'positive' : 'negative'
    },
    {
      title: 'Başarılı Satış',
      value: analyticsData.successfulSales,
      icon: CheckCircle,
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
      change: `%${analyticsData.conversionRate}`,
      changeType: 'neutral'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gradient-purple mb-2">
                Analitik & Raporlar
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Detaylı satış performansı ve istatistiksel analiz
              </p>
            </div>
            
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Period Selection */}
              <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => handlePeriodChange('thisMonth')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === 'thisMonth'
                      ? 'bg-gradient-purple text-white shadow-md'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Bu Ay
                </button>
                <button
                  onClick={() => handlePeriodChange('lastMonth')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === 'lastMonth'
                      ? 'bg-gradient-purple text-white shadow-md'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Geçen Ay
                </button>
                <button
                  onClick={() => handlePeriodChange('custom')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === 'custom'
                      ? 'bg-gradient-purple text-white shadow-md'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Özel
                </button>
              </div>

              {/* Date Range (for custom) */}
              {selectedPeriod === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={loadAnalyticsData}
                  className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-xl transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm font-medium">Yenile</span>
                </button>
                <button
                  onClick={exportData}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-purple text-white rounded-xl hover:shadow-lg transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span className="text-sm font-medium">Dışa Aktar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="card-modern p-6 hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className={`flex items-center space-x-1 text-sm font-semibold ${
                      stat.changeType === 'positive' ? 'text-green-600' : 
                      stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.changeType === 'positive' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : stat.changeType === 'negative' ? (
                        <ArrowDown className="h-4 w-4" />
                      ) : null}
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {stat.title}
                    </h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {stat.value.toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Analysis Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Satış Detay Dağılımı */}
            <div className="card-modern p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Satış Detay Dağılımı
                </h3>
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-4">
                {analyticsData.salesDetailDistribution?.map((detail, index) => {
                  const colors = [
                    'bg-gradient-to-r from-green-500 to-green-600',
                    'bg-gradient-to-r from-orange-500 to-orange-600',
                    'bg-gradient-to-r from-blue-500 to-blue-600',
                    'bg-gradient-to-r from-red-500 to-red-600',
                    'bg-gradient-to-r from-purple-500 to-purple-600',
                    'bg-gradient-to-r from-indigo-500 to-indigo-600'
                  ];
                  return (
                    <div key={detail.name} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {detail.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{detail.count}</span>
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                            {detail.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[index % colors.length]}`}
                          style={{ width: `${detail.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }) || (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-lg font-medium mb-2">Veri bulunamadı</div>
                    <div className="text-sm">Satış detay bilgisi mevcut değil</div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Toplam</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-xl font-bold text-purple-600">{analyticsData.totalRecords}</span>
                      <span className="text-sm font-semibold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                        100%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Çağrı Kanalı Dağılımı */}
            <div className="card-modern p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Çağrı Kanalı Dağılımı
                </h3>
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-4">
                {analyticsData.channelDistribution?.map((channel, index) => {
                  const colors = [
                    'bg-gradient-to-r from-blue-500 to-blue-600',
                    'bg-gradient-to-r from-green-500 to-green-600',
                    'bg-gradient-to-r from-yellow-500 to-yellow-600',
                    'bg-gradient-to-r from-red-500 to-red-600'
                  ];
                  return (
                    <div key={channel.name} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {channel.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{channel.count}</span>
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                            {channel.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[index % colors.length]}`}
                          style={{ width: `${channel.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }) || (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-lg font-medium mb-2">Veri bulunamadı</div>
                    <div className="text-sm">Çağrı kanalı bilgisi mevcut değil</div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Second Row of Analysis Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Çağrı Durumu Dağılımı */}
            <div className="card-modern p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Çağrı Durumu Dağılımı
                </h3>
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-4">
                {analyticsData.callStatusDistribution?.map((status, index) => {
                  const colors = [
                    'bg-gradient-to-r from-green-500 to-green-600',
                    'bg-gradient-to-r from-yellow-500 to-yellow-600',
                    'bg-gradient-to-r from-red-500 to-red-600',
                    'bg-gradient-to-r from-blue-500 to-blue-600'
                  ];
                  
                  return (
                    <div key={status.name} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {status.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{status.count}</span>
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                            {status.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[index % colors.length]}`}
                          style={{ width: `${status.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }) || (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-lg font-medium mb-2">Veri bulunamadı</div>
                    <div className="text-sm">Çağrı durumu bilgisi mevcut değil</div>
                  </div>
                )}
              </div>
            </div>

            {/* Abonelik Son Durum Dağılımı */}
            <div className="card-modern p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Abonelik Son Durum Dağılımı
                </h3>
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-4">
                {analyticsData.subscriptionStatusDistribution?.map((subscription, index) => {
                  const colors = [
                    'bg-gradient-to-r from-emerald-500 to-emerald-600',
                    'bg-gradient-to-r from-amber-500 to-amber-600',
                    'bg-gradient-to-r from-rose-500 to-rose-600',
                    'bg-gradient-to-r from-cyan-500 to-cyan-600',
                    'bg-gradient-to-r from-violet-500 to-violet-600'
                  ];
                  
                  return (
                    <div key={subscription.name} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {subscription.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{subscription.count}</span>
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                            {subscription.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[index % colors.length]}`}
                          style={{ width: `${subscription.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }) || (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-lg font-medium mb-2">Veri bulunamadı</div>
                    <div className="text-sm">Abonelik durumu bilgisi mevcut değil</div>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Personnel Performance */}
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Personel Performansı
              </h3>
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Personel
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Toplam Kayıt
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Başarılı Satış
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Dönüşüm Oranı
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Performans
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.personnelPerformance.map((personnel, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-purple rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {personnel.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {personnel.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-400">
                        {personnel.totalRecords}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {personnel.successfulSales}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-400">
                        %{personnel.conversionRate}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-purple h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(personnel.conversionRate, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conversion Rate Analysis */}
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Dönüşüm Oranı Analizi
              </h3>
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Genel Dönüşüm Oranı</h4>
                <p className="text-4xl font-bold text-green-600 mb-2">%{analyticsData.conversionRate}</p>
                <p className="text-lg text-gray-600">
                  {analyticsData.totalRecords} kayıttan {analyticsData.successfulSales} başarılı satış
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        type={modal.type}
        onConfirm={modal.onConfirm}
      >
        <p className="text-gray-600 dark:text-gray-300">{modal.message}</p>
      </Modal>
    </div>
  );
};

export default Analytics; 