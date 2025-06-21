import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
// import { useAuth } from '../context/AuthContext'; // Log sayfası için şu an gerekmiyor
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { 
  Shield, 
  Clock, 
  User, 
  Globe, 
  Filter, 
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  Trash2
} from 'lucide-react';
import { formatDate } from '../utils/helpers';

// Portal Modal Component
const PortalModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root') || document.body;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxHeight: '90vh',
          overflow: 'auto',
          margin: '0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    modalRoot
  );
};

const SystemLogs = () => {
  // const { currentUser } = useAuth(); // Log sayfası için şu an gerekmiyor ancak ileride kullanılabilir
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(10);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);

  // Log seviyeleri
  const logLevels = [
    { value: '', label: 'Tüm Seviyeler' },
    { value: 'info', label: 'Bilgi' },
    { value: 'warning', label: 'Uyarı' },
    { value: 'error', label: 'Hata' },
    { value: 'success', label: 'Başarılı' },
    { value: 'security', label: 'Güvenlik' }
  ];

  // Log kategorileri
  const logCategories = [
    { value: '', label: 'Tüm Kategoriler' },
    { value: 'authentication', label: 'Kimlik Doğrulama' },
    { value: 'user_management', label: 'Kullanıcı Yönetimi' },
    { value: 'sales', label: 'Satış İşlemleri' },
    { value: 'system', label: 'Sistem' },
    { value: 'data', label: 'Veri İşlemleri' },
    { value: 'security', label: 'Güvenlik' },
    { value: 'navigation', label: 'Sayfa Geçişleri' },
    { value: 'ui_interaction', label: 'Kullanıcı Etkileşimleri' },
    { value: 'form_interaction', label: 'Form İşlemleri' },
    { value: 'filter_search', label: 'Arama & Filtreleme' },
    { value: 'export_download', label: 'Dışa Aktarma' }
  ];

  useEffect(() => {
    fetchLogs();
  }, [filters, currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Daha büyük bir set çek ve client-side filtrele (Firebase query limitasyonları nedeniyle)
      let q = query(
        collection(db, 'system_logs'),
        orderBy('timestamp', 'desc'),
        limit(1000) // Daha büyük bir set çek
      );

      const snapshot = await getDocs(q);
      let allLogsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      // Client-side filtreleme
      let filteredLogs = allLogsData;

      // Admin hesabını (wupaniyazilim@gmail.com) gizle
      filteredLogs = filteredLogs.filter(log => 
        log.email !== 'wupaniyazilim@gmail.com' &&
        log.userId !== 'wupaniyazilim@gmail.com' &&
        log.userName !== 'Admin User' &&
        !log.details?.email?.includes('wupaniyazilim@gmail.com')
      );

      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }

      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
      }

      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => 
          log.userId?.toLowerCase().includes(filters.userId.toLowerCase()) ||
          log.userName?.toLowerCase().includes(filters.userId.toLowerCase())
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.action?.toLowerCase().includes(searchTerm) ||
          log.userName?.toLowerCase().includes(searchTerm) ||
          JSON.stringify(log.details).toLowerCase().includes(searchTerm)
        );
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filteredLogs = filteredLogs.filter(log => log.timestamp >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filteredLogs = filteredLogs.filter(log => log.timestamp <= toDate);
      }

      setTotalLogs(filteredLogs.length);
      
      // Pagination için sadece current page verilerini al
      const startIndex = (currentPage - 1) * logsPerPage;
      const endIndex = startIndex + logsPerPage;
      const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
      
      setLogs(paginatedLogs);
    } catch (error) {
      console.error('Loglar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Filtre değiştiğinde ilk sayfaya dön
  };

  const clearFilters = () => {
    setFilters({
      level: '',
      category: '',
      userId: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setCurrentPage(1);
  };

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'security':
        return <Shield className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogLevelBadge = (level) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (level) {
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'security':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`;
      default:
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
    }
  };

  const getCategoryBadge = (category) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (category) {
      case 'authentication':
        return `${baseClasses} bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200`;
      case 'user_management':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`;
      case 'sales':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'system':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`;
      case 'security':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
    }
  };

  const showLogDetail = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };


  const exportLogs = () => {
    // CSV export functionality
    const csvContent = [
      ['Tarih', 'Seviye', 'Kategori', 'Aksiyon', 'Kullanıcı', 'Detaylar'].join(','),
      ...logs.map(log => [
        formatDate(log.timestamp),
        log.level,
        log.category,
        log.action,
        log.userName || log.userId,
        JSON.stringify(log.details).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-purple">Sistem Log Kayıtları</h1>
            <p className="text-gray-600 dark:text-gray-400">Sistem güvenlik ve aktivite kayıtları</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card-modern p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Log</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalLogs}</p>
              </div>
            </div>
          </div>

          <div className="card-modern p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Başarılı</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {logs.filter(log => log.level === 'success').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card-modern p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Uyarılar</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {logs.filter(log => log.level === 'warning').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card-modern p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Hatalar</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {logs.filter(log => log.level === 'error').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-modern p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtreler</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Arama
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Aksiyon, kullanıcı..."
                className="input-modern pl-10"
              />
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Seviye
            </label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="input-modern"
            >
              {logLevels.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kategori
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input-modern"
            >
              {logCategories.map(category => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kullanıcı
            </label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              placeholder="Kullanıcı adı..."
              className="input-modern"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="input-modern"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="input-modern"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Filtreleri Temizle
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            CSV İndir
          </button>

        </div>
      </div>

      {/* Logs Table */}
      <div className="card-modern overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih/Saat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Seviye
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Aksiyon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 text-gray-400 animate-spin mr-2" />
                      <span className="text-gray-500">Loglar yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Belirtilen kriterlere uygun log kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(log.timestamp)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.timestamp.toLocaleTimeString('tr-TR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getLogLevelIcon(log.level)}
                        <span className={getLogLevelBadge(log.level)}>
                          {log.level}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getCategoryBadge(log.category)}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.action}
                      </div>
                      {log.details?.message && (
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                          {log.details.message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.userName || 'System'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.userId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => showLogDetail(log)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Detay
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span>Sayfa başına {logsPerPage} kayıt gösteriliyor</span>
                <span className="mx-2">•</span>
                <span>Toplam {totalLogs} kayıt</span>
                <span className="mx-2">•</span>
                <span>Sayfa {currentPage} / {totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* İlk sayfa */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  İlk
                </button>
                
                {/* Önceki sayfa */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Önceki
                </button>
                
                {/* Sayfa numaraları */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {/* Sonraki sayfa */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Sonraki
                </button>
                
                {/* Son sayfa */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Son
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      <PortalModal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)}>
        {selectedLog && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Log Detayı
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tarih/Saat</label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(selectedLog.timestamp)} {selectedLog.timestamp.toLocaleTimeString('tr-TR')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Seviye</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getLogLevelIcon(selectedLog.level)}
                    <span className={getLogLevelBadge(selectedLog.level)}>
                      {selectedLog.level}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Kategori</label>
                  <div className="mt-1">
                    <span className={getCategoryBadge(selectedLog.category)}>
                      {selectedLog.category}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Kullanıcı</label>
                  <p className="text-gray-900 dark:text-white">{selectedLog.userName || 'System'}</p>
                  <p className="text-sm text-gray-500">{selectedLog.userId}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Aksiyon</label>
                <p className="text-gray-900 dark:text-white">{selectedLog.action}</p>
              </div>

              {/* Technical Details */}
              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Teknik Detaylar</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-gray-500 dark:text-gray-400">IP Adresi</label>
                    <p className="text-gray-900 dark:text-white">{selectedLog.ip || 'Bilinmiyor'}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500 dark:text-gray-400">URL</label>
                    <p className="text-gray-900 dark:text-white break-all">{selectedLog.url}</p>
                  </div>
                </div>

                <div>
                  <label className="font-medium text-gray-500 dark:text-gray-400">User Agent</label>
                  <p className="text-gray-900 dark:text-white text-sm break-all">{selectedLog.userAgent}</p>
                </div>
              </div>

              {/* Details Object */}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="font-medium text-gray-500 dark:text-gray-400">Detaylar</label>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <pre className="text-sm text-gray-900 dark:text-white overflow-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </PortalModal>
    </div>
  );
};

export default SystemLogs; 