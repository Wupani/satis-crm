import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, doc, getDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { formatDate, formatPhoneNumber } from '../utils/helpers';
import { Edit, Phone, Calendar, User, Filter, Trash2 } from 'lucide-react';
import Modal from './Modal';

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

const RecordTable = () => {
  const { currentUser, userRole } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    recordToDelete: null
  });
  const [dropdownOptions, setDropdownOptions] = useState({
    kanalList: [],
    durumList: [],
    detayList: [],
    abonelikDurumList: []
  });
  const [filter, setFilter] = useState({
    personel: '',
    kanal: '',
    durum: '',
    detay: '',
    abonelikDurum: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // Pagination state'leri
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10); // Sayfa başına kayıt sayısı
  
  // Kullanıcı adını sakla (Personnel için gerekli)
  const [currentUserName, setCurrentUserName] = useState('');
  
  // Düzenleme state'leri
  const [editingRecord, setEditingRecord] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    personel: '',
    tarih: '',
    telefon: '',
    kanal: '',
    durum: '',
    detay: '',
    abonelikDurum: '',
    aboneNo: '',
    not: ''
  });

  // Kullanıcı adını al (Personnel için gerekli)
  useEffect(() => {
    const fetchUserName = async () => {
      if (!currentUser || !userRole) return;
      
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          setCurrentUserName(userData.name || '');
        } else {
          // Alternatif arama: email ile
          const emailQuery = query(usersRef, where('email', '==', currentUser.email));
          const emailSnapshot = await getDocs(emailQuery);
          
          if (!emailSnapshot.empty) {
            const userData = emailSnapshot.docs[0].data();
            setCurrentUserName(userData.name || '');
          }
        }
      } catch (error) {
        console.error('Kullanıcı adı alınırken hata:', error);
      }
    };

    fetchUserName();

    // Component unmount olduğunda body stillerini sıfırla
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.overflow = '';
      document.body.style.width = '';
    };
  }, [currentUser, userRole]);

  // Dropdown seçeneklerini yükle
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const dropdownRef = doc(db, 'dropdown_settings', 'main');
        const dropdownSnap = await getDoc(dropdownRef);
        
        if (dropdownSnap.exists()) {
          const data = dropdownSnap.data();
          setDropdownOptions({
            kanalList: data.kanalList || [],
            durumList: data.durumList || [],
            detayList: data.detayList || [],
            abonelikDurumList: data.abonelikDurumList || []
          });
        } else {
          // Varsayılan değerler
          setDropdownOptions({
            kanalList: ['Telefon', 'WhatsApp', 'E-posta', 'Yüz Yüze', 'Web Site'],
            durumList: ['Arandı', 'Meşgul', 'Ulaşılamadı', 'Geri Arama', 'Reddetti'],
            detayList: ['İlgilendi', 'Düşünecek', 'Fiyat Sordu', 'Bilgi İstedi', 'İlgilenmedi', 'Satış Sağlandı'],
            abonelikDurumList: ['Yeni Abone', 'Mevcut Abone', 'İptal', 'Askıya Alındı', 'Beklemede']
          });
        }
      } catch (error) {
        console.error('Dropdown seçenekleri yüklenirken hata:', error);
      }
    };

    fetchDropdownOptions();
  }, []);

  // Mevcut ay başlangıç ve bitiş tarihlerini hesapla
  const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { startOfMonth, endOfMonth };
  };

  // Verileri manuel olarak yükle (real-time değil)
  const loadRecords = async () => {
    if (!currentUser || !userRole) return;
    
    setLoading(true);
    try {
      const { startOfMonth, endOfMonth } = getCurrentMonthRange();
      
      let q;
      
      // Firebase'den tüm verileri çekiyoruz (client-side pagination için)
      // Tüm kayıtları çekiyoruz - artık sınır yok
      
      // Eski import edilmiş veriler createdAt alanı olmayabilir, 
      // o yüzden tüm kayıtları çekip JavaScript'te filtreliyoruz
      if (userRole === 'admin') {
        // Admin tüm kayıtları görebilir - index gerektirmeyen basit query
        q = query(
          collection(db, 'sales_records')
        );
      } else if (userRole === 'teamLeader') {
        // Team Leader tüm kayıtları görebilir - index gerektirmeyen basit query
        q = query(
          collection(db, 'sales_records')
        );
      } else if (userRole === 'personnel') {
        // Personnel: Sadece kendi oluşturduğu kayıtları çek
        q = query(
          collection(db, 'sales_records'),
          where('createdBy', '==', currentUser.uid)
        );
      } else {
        // Bilinmeyen role için boş array döndür
        setRecords([]);
        setLoading(false);
        return;
      }

      const snapshot = await getDocs(q);
      let recordsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Personnel için ek olarak import edilmiş kayıtları da çek
      if (userRole === 'personnel' && currentUserName) {
        try {
          // Import edilmiş kayıtlar için personel ismi bazlı arama
          const importQuery = query(
            collection(db, 'sales_records'),
            where('personel', '==', currentUserName)
          );
          const importSnapshot = await getDocs(importQuery);
          const importedRecords = importSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Duplicate kayıtları önlemek için ID bazlı birleştirme
          const existingIds = new Set(recordsData.map(record => record.id));
          const newImportedRecords = importedRecords.filter(record => !existingIds.has(record.id));
          
          recordsData = [...recordsData, ...newImportedRecords];
        } catch (error) {
          console.warn('Import edilmiş kayıtlar çekilirken hata:', error);
        }
      }
      
      // Mevcut ay kontrolü yap (Firebase query'yi geçen eski kayıtları filtrele)
      recordsData = recordsData.filter(record => {
        // createdAt alanı varsa önce onu kontrol et
        if (record.createdAt) {
          try {
            const recordDate = record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt);
            return recordDate >= startOfMonth && recordDate <= endOfMonth;
          } catch {
            // Tarih parse edilemedi
          }
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
        
        // Hiçbir tarih alanı yoksa bu kaydı dahil etme
        return false;
      });
      
      // Personnel için filtreleme artık Firebase seviyesinde yapıldı, ek işlem gerekmiyor
      
      // Javascript tarafında tarihe göre sırala
      recordsData.sort((a, b) => {
        // Önce createdAt'e göre sırala
        if (a.createdAt && b.createdAt) {
          try {
            const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA; // Yeni kayıtlar üstte
          } catch (error) {
            console.warn('Tarih sıralama hatası:', error);
          }
        }
        
        // createdAt yoksa tarih alanına göre sırala
        if (a.tarih && b.tarih) {
          try {
            const dateA = new Date(a.tarih);
            const dateB = new Date(b.tarih);
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              return dateB - dateA; // Yeni kayıtlar üstte
            }
          } catch (error) {
            console.warn('Tarih sıralama hatası:', error);
          }
        }
        
        return 0;
      });
      
      setRecords(recordsData);
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Component mount olduğunda verileri yükle
  useEffect(() => {
    loadRecords();
  }, [currentUser.uid, userRole, currentUserName]);

  // Manuel yenileme butonu için
  const handleRefresh = () => {
    loadRecords();
  };

  const filteredRecords = records.filter(record => {
    try {
      if (filter.personel && record.personel && !record.personel.toLowerCase().includes(filter.personel.toLowerCase())) {
        return false;
      }
      if (filter.kanal && record.kanal !== filter.kanal) {
        return false;
      }
      if (filter.durum && record.durum !== filter.durum) {
        return false;
      }
      if (filter.detay && record.detay !== filter.detay) {
        return false;
      }
      if (filter.abonelikDurum && record.abonelikDurum !== filter.abonelikDurum) {
        return false;
      }
      if (filter.dateFrom && record.tarih && new Date(record.tarih) < new Date(filter.dateFrom)) {
        return false;
      }
      if (filter.dateTo && record.tarih && new Date(record.tarih) > new Date(filter.dateTo)) {
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Kayıt filtrelenirken hata:', record, error);
      return true; // Hata durumunda kaydı göster
    }
  });

  // Pagination hesaplamaları
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // Sayfa değiştiğinde en üste scroll et
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtre değiştiğinde sayfayı 1'e sıfırla
  const handleFilterChangeWithReset = (e) => {
    handleFilterChange(e);
    setCurrentPage(1);
  };

  // Filtreleri temizlerken sayfayı da sıfırla
  const clearFiltersWithReset = () => {
    clearFilters();
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilter({
      personel: '',
      kanal: '',
      durum: '',
      detay: '',
      abonelikDurum: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleDeleteRecord = (recordId, refId) => {
    // Sadece admin ve teamLeader silebilir
    if (userRole !== 'admin' && userRole !== 'teamLeader') {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Yetki Hatası',
        message: 'Bu işlem için yetkiniz bulunmamaktadır.',
        onConfirm: null,
        recordToDelete: null
      });
      return;
    }

    // Silme onayı modal'ı
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Kayıt Silme Onayı',
      message: `"${refId}" numaralı kaydı silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`,
      onConfirm: () => confirmDeleteRecord(recordId),
      recordToDelete: { id: recordId, refId }
    });
  };

  const confirmDeleteRecord = async (recordId) => {
    try {
      setDeleting(recordId);
      setModal({ ...modal, isOpen: false });
      
      await deleteDoc(doc(db, 'sales_records', recordId));
      
      // Tabloyu yenile
      await loadRecords();
      
      // Başarı mesajı
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Kayıt Silindi',
        message: 'Kayıt başarıyla silindi.',
        onConfirm: null,
        recordToDelete: null
      });
      
    } catch (error) {
      console.error('Kayıt silinirken hata:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Silme Hatası',
        message: 'Kayıt silinirken bir hata oluştu. Lütfen tekrar deneyin.',
        onConfirm: null,
        recordToDelete: null
      });
    } finally {
      setDeleting(null);
    }
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: 'info',
      title: '',
      message: '',
      onConfirm: null,
      recordToDelete: null
    });
  };

  // Modal açma/kapama için scroll pozisyonu koruma
  const openEditModal = (record) => {
    // Mevcut scroll pozisyonunu kaydet
    const scrollY = window.scrollY;
    
    // Body scroll'ını devre dışı bırak ve pozisyonu koru
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    setEditingRecord(record);
    setEditForm({
      personel: record.personel || '',
      tarih: record.tarih || '',
      telefon: record.telefon || '',
      kanal: record.kanal || '',
      durum: record.durum || '',
      detay: record.detay || '',
      abonelikDurum: record.abonelikDurum || '',
      aboneNo: record.aboneNo || '',
      not: record.not || ''
    });
    setEditModal(true);
  };

  const closeEditModal = () => {
    // Kaydedilen scroll pozisyonunu geri yükle
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.overflow = '';
    document.body.style.width = '';
    
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    setEditModal(false);
    setEditingRecord(null);
    setEditForm({
      personel: '',
      tarih: '',
      telefon: '',
      kanal: '',
      durum: '',
      detay: '',
      abonelikDurum: '',
      aboneNo: '',
      not: ''
    });
  };

  // Düzenleme fonksiyonları
  const handleEditRecord = (record) => {
    openEditModal(record);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    try {
      const { updateDoc } = await import('firebase/firestore');
      const recordRef = doc(db, 'sales_records', editingRecord.id);
      
      await updateDoc(recordRef, {
        ...editForm,
        updatedAt: new Date()
      });

      // Önce edit modal'ını kapat
      closeEditModal();

      // Tabloyu yenile
      await loadRecords();

      // Sonra başarı mesajını göster
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Kayıt Güncellendi',
        message: 'Kayıt başarıyla güncellendi.',
        onConfirm: null
      });

      // 2 saniye sonra başarı mesajını otomatik kapat
      setTimeout(() => {
        setModal(prev => ({ ...prev, isOpen: false }));
      }, 2000);

    } catch (error) {
      console.error('Kayıt güncellenirken hata:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Güncelleme Hatası',
        message: 'Kayıt güncellenirken bir hata oluştu. Lütfen tekrar deneyin.',
        onConfirm: null
      });
    }
  };

  const handleCancelEdit = () => {
    closeEditModal();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Satış Kayıtları</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sadece <strong>{new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</strong> ayına ait kayıtlar gösteriliyor
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
              ({new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('tr-TR')} - {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString('tr-TR')})
            </span>
          </p>

        </div>
        <div className="text-right">
          <div>
            <span className="text-sm text-gray-600">
              Toplam {totalRecords} kayıt • Sayfa {currentPage}/{totalPages} • Gösterilen: {startIndex + 1}-{Math.min(endIndex, totalRecords)}
            </span>

            {userRole === 'personnel' && (
              <p className="text-xs text-orange-600 mt-1">
                Kendi oluşturduğunuz kayıtlar ve sizin adınıza import edilen kayıtlar gösteriliyor
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Filtreler</h3>
          <div className="ml-auto flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center transition-colors text-sm"
            >
              <svg 
                className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Yükleniyor...' : 'Yenile'}
            </button>
            <button
              onClick={clearFiltersWithReset}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Personel
            </label>
            <input
              type="text"
              name="personel"
              value={filter.personel}
              onChange={handleFilterChangeWithReset}
              placeholder="Personel adı..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kanal
            </label>
            <select
              name="kanal"
              value={filter.kanal}
              onChange={handleFilterChangeWithReset}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Tümü</option>
              {dropdownOptions.kanalList.map((kanal, index) => (
                <option key={index} value={kanal}>{kanal}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Durum
            </label>
            <select
              name="durum"
              value={filter.durum}
              onChange={handleFilterChangeWithReset}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Tümü</option>
              {dropdownOptions.durumList.map((durum, index) => (
                <option key={index} value={durum}>{durum}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Satış Detayı
            </label>
            <select
              name="detay"
              value={filter.detay}
              onChange={handleFilterChangeWithReset}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Tümü</option>
              {dropdownOptions.detayList.map((detay, index) => (
                <option key={index} value={detay}>{detay}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Abonelik Durumu
            </label>
            <select
              name="abonelikDurum"
              value={filter.abonelikDurum}
              onChange={handleFilterChangeWithReset}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Tümü</option>
              {dropdownOptions.abonelikDurumList.map((abonelikDurum, index) => (
                <option key={index} value={abonelikDurum}>{abonelikDurum}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              name="dateFrom"
              value={filter.dateFrom}
              onChange={handleFilterChangeWithReset}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              name="dateTo"
              value={filter.dateTo}
              onChange={handleFilterChangeWithReset}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kanal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Satış Detayı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abonelik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abone No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Not
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{record.personel}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{formatDate(record.tarih) || record.tarih || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{formatPhoneNumber(record.telefon) || record.telefon || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {record.kanal}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.durum === 'Arandı' ? 'bg-green-100 text-green-800' :
                      record.durum === 'Meşgul' ? 'bg-yellow-100 text-yellow-800' :
                      record.durum === 'Ulaşılamadı' ? 'bg-red-100 text-red-800' :
                      record.durum === 'Geri Arama' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {record.durum}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {record.detay || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {record.abonelikDurum || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {record.aboneNo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate" title={record.not}>
                    {record.not || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleEditRecord(record)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Kaydı Düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      {(userRole === 'admin' || userRole === 'teamLeader') && (
                        <button
                          onClick={() => handleDeleteRecord(record.id, record.refId)}
                          disabled={deleting === record.id}
                          className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50"
                          title="Kaydı Sil"
                        >
                          {deleting === record.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalRecords === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Kayıt bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-4 mt-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Sayfa bilgisi */}
          <div className="flex justify-center mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, totalRecords)}</span> arası, 
              toplam <span className="font-medium">{totalRecords}</span> kayıt
            </p>
          </div>
          
          {/* Pagination butonları */}
          <div className="flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              {/* Önceki buton */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Önceki
              </button>
              
              {/* Sayfa numaraları */}
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium hover:bg-gray-50 ${
                      currentPage === pageNum
                        ? 'z-10 bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                        : 'bg-white border-gray-300 text-gray-500'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {/* Sonraki buton */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki →
              </button>
            </nav>
          </div>
          
          {/* Hızlı sayfa geçişi */}
          <div className="flex justify-center mt-4 space-x-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İlk Sayfa
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Son Sayfa
            </button>
          </div>
        </div>
      )}

      {/* Düzenleme Modal */}
      <PortalModal isOpen={editModal} onClose={handleCancelEdit}>
        <div className="w-full max-w-4xl p-6 border shadow-xl rounded-lg bg-white" style={{ minWidth: '90vw', maxWidth: '95vw' }}>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Kayıt Düzenle</h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personel</label>
                  <input
                    type="text"
                    name="personel"
                    value={editForm.personel}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                  <input
                    type="date"
                    name="tarih"
                    value={editForm.tarih}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    name="telefon"
                    value={editForm.telefon}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kanal</label>
                  <select
                    name="kanal"
                    value={editForm.kanal}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    {dropdownOptions.kanalList.map((kanal, index) => (
                      <option key={index} value={kanal}>{kanal}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select
                    name="durum"
                    value={editForm.durum}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    {dropdownOptions.durumList.map((durum, index) => (
                      <option key={index} value={durum}>{durum}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satış Detayı</label>
                  <select
                    name="detay"
                    value={editForm.detay}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    {dropdownOptions.detayList.map((detay, index) => (
                      <option key={index} value={detay}>{detay}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abonelik Durumu</label>
                  <select
                    name="abonelikDurum"
                    value={editForm.abonelikDurum}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    {dropdownOptions.abonelikDurumList.map((abonelikDurum, index) => (
                      <option key={index} value={abonelikDurum}>{abonelikDurum}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abone No</label>
                  <input
                    type="text"
                    name="aboneNo"
                    value={editForm.aboneNo}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Not</label>
                  <textarea
                    name="not"
                    value={editForm.not}
                    onChange={handleEditFormChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Kaydet
                </button>
              </div>
            </div>
        </div>
      </PortalModal>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        showCancel={modal.type === 'confirm'}
        confirmText={modal.type === 'confirm' ? 'Sil' : 'Tamam'}
        cancelText="İptal"
      />
    </div>
  );
};

export default RecordTable; 