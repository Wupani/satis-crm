import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../auth/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  Phone, 
  Users, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  User,
  AlertTriangle
} from 'lucide-react';

const DuplicateNumbers = () => {
  const { currentUser, userRole } = useAuth();
  const [duplicateData, setDuplicateData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [minCallCount, setMinCallCount] = useState(2);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState('');
  const [personnelList, setPersonnelList] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);

  useEffect(() => {
    fetchDuplicateNumbers();
  }, [currentUser, userRole]);

  // Filtreler değiştiğinde sayfayı 1'e sıfırla
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, minCallCount, selectedStatus, selectedPersonnel]);

  const fetchDuplicateNumbers = async () => {
    setLoading(true);
    try {
      let recordsQuery = collection(db, 'sales_records');
      let allowedUserIds = [];
      
      // Yetki kontrolü
      if (userRole !== 'admin') {
        if (userRole === 'teamLeader') {
          // Takım lideri: kendisi + takım üyeleri
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const users = [];
          usersSnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
          });
          
          allowedUserIds.push(currentUser.uid);
          const teamMembers = users.filter(user => 
            user.teamLeader === currentUser.uid || user.teamLeader === currentUser.id
          );
          teamMembers.forEach(member => {
            allowedUserIds.push(member.id);
          });
          
          recordsQuery = query(recordsQuery, where('createdBy', 'in', allowedUserIds));
        } else {
          // Personel: sadece kendi kayıtları
          recordsQuery = query(recordsQuery, where('createdBy', '==', currentUser.uid));
        }
      }
      
      const recordsSnapshot = await getDocs(recordsQuery);
      const allRecords = [];
      const personnel = new Set();
      
      recordsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.telefon) {
          // Telefon numarasını normalize et
          const normalizedPhone = data.telefon.replace(/\D/g, '');
          if (normalizedPhone.length >= 10) {
            allRecords.push({
              ...data,
              id: doc.id,
              normalizedPhone
            });
            if (data.personel) personnel.add(data.personel);
          }
        }
      });
      
      setPersonnelList(Array.from(personnel).sort());
      
      // Telefon numaralarına göre gruplandır
      const phoneGroups = {};
      allRecords.forEach(record => {
        const phone = record.normalizedPhone;
        if (!phoneGroups[phone]) {
          phoneGroups[phone] = {
            phone: record.telefon, // Orijinal format
            normalizedPhone: phone,
            count: 0,
            records: [],
            lastCallDate: null,
            firstCallDate: null,
            statusBreakdown: {},
            personnelBreakdown: {},
            uniquePersonnel: new Set()
          };
        }
        
        phoneGroups[phone].count++;
        phoneGroups[phone].records.push(record);
        phoneGroups[phone].uniquePersonnel.add(record.personel || 'Bilinmeyen');
        
        // Durum sayacı
        const status = record.durum || 'Bilinmeyen';
        phoneGroups[phone].statusBreakdown[status] = (phoneGroups[phone].statusBreakdown[status] || 0) + 1;
        
        // Personel sayacı
        const personnel = record.personel || 'Bilinmeyen';
        phoneGroups[phone].personnelBreakdown[personnel] = (phoneGroups[phone].personnelBreakdown[personnel] || 0) + 1;
        
        // Tarih kontrolü
        if (record.tarih) {
          const recordDate = new Date(record.tarih);
          if (!phoneGroups[phone].lastCallDate || recordDate > phoneGroups[phone].lastCallDate) {
            phoneGroups[phone].lastCallDate = recordDate;
          }
          if (!phoneGroups[phone].firstCallDate || recordDate < phoneGroups[phone].firstCallDate) {
            phoneGroups[phone].firstCallDate = recordDate;
          }
        }
      });
      
      // Sadece mükerrer numaraları al (2+ arama)
      const duplicates = Object.values(phoneGroups)
        .filter(group => group.count >= 2)
        .map(group => ({
          ...group,
          uniquePersonnelCount: group.uniquePersonnel.size,
          uniquePersonnelList: Array.from(group.uniquePersonnel),
          mostCommonStatus: Object.entries(group.statusBreakdown)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Bilinmeyen',
          mostCommonPersonnel: Object.entries(group.personnelBreakdown)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Bilinmeyen'
        }))
        .sort((a, b) => b.count - a.count);
      
      setDuplicateData(duplicates);
    } catch (error) {
      console.error('Mükerrer numara verileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtreleme
  const filteredData = duplicateData.filter(item => {
    const phoneMatch = item.phone.includes(searchQuery) || 
                     item.normalizedPhone.includes(searchQuery.replace(/\D/g, ''));
    const countMatch = item.count >= minCallCount;
    const statusMatch = !selectedStatus || item.mostCommonStatus === selectedStatus;
    const personnelMatch = !selectedPersonnel || 
                          item.uniquePersonnelList.includes(selectedPersonnel);
    
    return phoneMatch && countMatch && statusMatch && personnelMatch;
  });

  // Sayfalama hesaplamaları
  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredData.slice(startIndex, endIndex);

  // Sayfa değiştiğinde en üste scroll et
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Telefon', 'Arama Sayısı', 'İlk Arama', 'Son Arama', 'En Sık Durum', 'Personel Sayısı', 'Personeller'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.phone,
        item.count,
        item.firstCallDate?.toLocaleDateString('tr-TR') || '-',
        item.lastCallDate?.toLocaleDateString('tr-TR') || '-',
        item.mostCommonStatus,
        item.uniquePersonnelCount,
        item.uniquePersonnelList.join(' | ')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mukerrer-numaralar-${new Date().toLocaleDateString('tr-TR')}.csv`;
    a.click();
  };

  const toggleRowExpansion = (phone) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(phone)) {
      newExpanded.delete(phone);
    } else {
      newExpanded.add(phone);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Satış Sağlandı': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Arandı': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Meşgul': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Ulaşılamadı': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Geri Arama': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Reddetti': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const uniqueStatuses = [...new Set(duplicateData.map(item => item.mostCommonStatus))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Mükerrer numara verileri yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Phone className="h-8 w-8 text-purple-600 mr-3" />
              Mükerrer Numara Analizi
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Aynı telefon numarasından birden fazla arama yapılan kayıtları analiz edin
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            CSV İndir
          </button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Mükerrer Numara</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{duplicateData.length}</p>
            </div>
            <Phone className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Mükerrer Arama</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {duplicateData.reduce((sum, item) => sum + item.count, 0)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Çok Aranan</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {duplicateData[0]?.count || 0} kez
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ortalama Arama</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {duplicateData.length > 0 ? (duplicateData.reduce((sum, item) => sum + item.count, 0) / duplicateData.length).toFixed(1) : 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Filtreler</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telefon Ara
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Telefon numarası..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min. Arama Sayısı
            </label>
            <input
              type="number"
              min="2"
              value={minCallCount}
              onChange={(e) => setMinCallCount(parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              En Sık Durum
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Tümü</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Personel
            </label>
            <select
              value={selectedPersonnel}
              onChange={(e) => setSelectedPersonnel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Tümü</option>
              {personnelList.map(personnel => (
                <option key={personnel} value={personnel}>{personnel}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                fetchDuplicateNumbers();
                setCurrentPage(1);
              }}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm"
            >
              Yenile
            </button>
          </div>
        </div>
      </div>

      {/* Sonuçlar Tablosu */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Mükerrer Numara Listesi ({totalRecords} sonuç)
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Sayfa {currentPage}/{totalPages} • Gösterilen: {startIndex + 1}-{Math.min(endIndex, totalRecords)}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Arama Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih Aralığı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  En Sık Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Personel Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentRecords.map((item) => (
                <React.Fragment key={item.normalizedPhone}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                          {item.count} kez
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          {formatDate(item.firstCallDate)} - {formatDate(item.lastCallDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.mostCommonStatus)}`}>
                        {item.mostCommonStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {item.uniquePersonnelCount} personel
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleRowExpansion(item.normalizedPhone)}
                        className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        title="Detayları Göster"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Row Details */}
                  {expandedRows.has(item.normalizedPhone) && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                        <div className="space-y-4">
                          {/* Durum Dağılımı */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Durum Dağılımı:</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(item.statusBreakdown).map(([status, count]) => (
                                <span key={status} className={`px-2 py-1 rounded text-xs ${getStatusColor(status)}`}>
                                  {status}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          {/* Personel Dağılımı */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Personel Dağılımı:</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(item.personnelBreakdown).map(([personnel, count]) => (
                                <span key={personnel} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                                  {personnel}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          {/* Son Aramalar */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Son Aramalar:</h4>
                            <div className="max-h-40 overflow-y-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 dark:text-gray-400">
                                    <th className="text-left py-1">Tarih</th>
                                    <th className="text-left py-1">Personel</th>
                                    <th className="text-left py-1">Durum</th>
                                    <th className="text-left py-1">Detay</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.records
                                    .sort((a, b) => new Date(b.tarih) - new Date(a.tarih))
                                    .slice(0, 5)
                                    .map((record, index) => (
                                    <tr key={index} className="text-gray-700 dark:text-gray-300">
                                      <td className="py-1">{formatDate(new Date(record.tarih))}</td>
                                      <td className="py-1">{record.personel || '-'}</td>
                                      <td className="py-1">{record.durum || '-'}</td>
                                      <td className="py-1">{record.detay || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {totalRecords === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Filtrelere uygun mükerrer numara bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">{totalRecords}</span> sonuçtan{' '}
              <span className="font-medium">{startIndex + 1}</span>-<span className="font-medium">{Math.min(endIndex, totalRecords)}</span> arası gösteriliyor
            </div>
            
            <div className="flex items-center space-x-2">
              {/* İlk sayfa */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                İlk
              </button>
              
              {/* Önceki sayfa */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Önceki
              </button>

              {/* Sayfa numaraları */}
              <div className="flex items-center space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = index + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + index;
                  } else {
                    pageNumber = currentPage - 2 + index;
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNumber
                          ? 'bg-purple-600 text-white border border-purple-600'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              {/* Sonraki sayfa */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Sonraki
              </button>
              
              {/* Son sayfa */}
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Son
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicateNumbers; 