import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { generateRefId, formatDateForInput } from '../utils/helpers';
import { Save, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import logger from '../utils/logger';

const RecordForm = () => {
  const { currentUser, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null
  });
  const [phoneError, setPhoneError] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState({
    kanalList: [],
    durumList: [],
    detayList: [],
    abonelikDurumList: []
  });

  const [formData, setFormData] = useState({
    refId: generateRefId(),
    personel: '',
    tarih: formatDateForInput(new Date()),
    telefon: '',
    kanal: '',
    durum: '',
    detay: '',
    abonelikDurum: '',
    aboneNo: '',
    not: ''
  });

  // Kullanıcıları, dropdown seçeneklerini ve mevcut kullanıcının adını al
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        // Tüm kullanıcıları çek
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const usersData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            displayName: doc.data().name || doc.data().email || 'Kullanıcı'
          }))
          .filter(user => 
            user.isActive !== false && // Sadece aktif kullanıcılar
            user.email !== 'wupaniyazilim@gmail.com' && // Admin hesabı hariç
            (user.role === 'Personnel' || user.role === 'Team Leader' || user.role === 'personnel' || user.role === 'teamLeader') // Sadece personel ve takım liderleri
          );
        setAllUsers(usersData);
        
        // Dropdown seçeneklerini çek
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
        
        // Eğer Personnel ise kendi adını bul ve otomatik doldur
        if (userRole === 'personnel') {
          const currentUserData = usersData.find(user => user.uid === currentUser.uid);
          if (currentUserData) {
            const userName = currentUserData.name || currentUserData.email;
            setCurrentUserName(userName);
    
            // Personel alanını otomatik doldur
            setFormData(prev => ({
              ...prev,
              personel: userName
            }));
          } else {
            // Fallback: email ile arama
            const emailUser = usersData.find(user => user.email === currentUser.email);
            if (emailUser) {
              const userName = emailUser.name || emailUser.email;
              setCurrentUserName(userName);
              setFormData(prev => ({
                ...prev,
                personel: userName
              }));
            }
          }
        }
      } catch (error) {
        console.error('Veriler yüklenirken hata:', error);
      }
    };
    
    fetchData();
  }, [currentUser, userRole]);

  const validatePhoneNumber = (phone) => {
    // Boşluk ve özel karakterleri temizle
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[()-]/g, '');
    
    // Türkiye telefon numarası regex'leri
    const mobileRegex = /^(05)([0-9]{2})([0-9]{3})([0-9]{2})([0-9]{2})$/; // 05XX XXX XX XX
    const landlineRegex = /^(0)([2-4])([0-9]{2})([0-9]{3})([0-9]{2})([0-9]{2})$/; // 0XXX XXX XX XX
    
    if (!cleanPhone) {
      return 'Telefon numarası gereklidir.';
    }
    
    if (cleanPhone.length !== 11) {
      return 'Telefon numarası 11 haneli olmalıdır.';
    }
    
    if (!cleanPhone.startsWith('0')) {
      return 'Telefon numarası 0 ile başlamalıdır.';
    }
    
    if (!mobileRegex.test(cleanPhone) && !landlineRegex.test(cleanPhone)) {
      return 'Geçersiz telefon numarası formatı.';
    }
    
    return '';
  };

  const formatPhoneNumber = (phone) => {
    // Sadece rakamları al
    const numbers = phone.replace(/\D/g, '');
    
    // 11 haneden fazla girişi engelle
    if (numbers.length > 11) {
      return phone.slice(0, -1);
    }
    
    // Format: 0XXX XXX XX XX
    if (numbers.length >= 7) {
      return numbers.replace(/^(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    } else if (numbers.length >= 4) {
      return numbers.replace(/^(\d{4})(\d{0,3})/, '$1 $2');
    }
    
    return numbers;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telefon') {
      const formattedPhone = formatPhoneNumber(value);
      const error = validatePhoneNumber(formattedPhone);
      setPhoneError(error);
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedPhone
      }));
    } else if (name === 'kanal' && value === 'Fake Talep') {
      // Fake Talep seçildiğinde diğer alanları temizle
      setFormData(prev => ({
        ...prev,
        [name]: value,
        durum: '',
        detay: '',
        abonelikDurum: '',
        aboneNo: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Fake Talep seçili mi kontrol et
  const isFakeTalep = formData.kanal === 'Fake Talep';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Telefon numarası validasyonu
    const phoneValidationError = validatePhoneNumber(formData.telefon);
    if (phoneValidationError) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Geçersiz Telefon Numarası',
        message: phoneValidationError,
        onConfirm: null
      });
      return;
    }

    // Fake Talep dışında çağrı durumu zorunlu
    if (!isFakeTalep && !formData.durum) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Eksik Bilgi',
        message: 'Çağrı Durumu seçimi zorunludur.',
        onConfirm: null
      });
      return;
    }
    
    setLoading(true);

    try {
      const docData = {
        ...formData,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'sales_records'), docData);
      
      // Satış kaydı oluşturma işlemini logla
      await logger.logSalesRecordCreated(
        currentUser.uid,
        currentUser.name || currentUser.email?.split('@')[0] || 'Kullanıcı',
        formData
      );
      
      // Form'u resetle
      setFormData({
        refId: generateRefId(),
        personel: userRole === 'personnel' ? currentUserName : '',
        tarih: formatDateForInput(new Date()),
        telefon: '',
        kanal: '',
        durum: '',
        detay: '',
        abonelikDurum: '',
        aboneNo: '',
        not: ''
      });

      // Başarı modal'ı göster
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Kayıt Eklendi',
        message: `Kayıt başarıyla eklendi!\nReferans ID: ${formData.refId}`,
        onConfirm: null
      });
      
    } catch (error) {
      console.error('Kayıt eklenirken hata:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Hata',
        message: 'Kayıt eklenirken bir hata oluştu. Lütfen tekrar deneyin.',
        onConfirm: null
      });
    }

    setLoading(false);
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: 'info',
      title: '',
      message: '',
      onConfirm: null
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Yeni Satış Kaydı</h2>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Referans ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Referans ID
            </label>
            <input
              type="text"
              name="refId"
              value={formData.refId}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Personel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Personel <span className="text-red-500">*</span>
            </label>
            {userRole === 'personnel' ? (
              <input
                type="text"
                name="personel"
                value={formData.personel}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
            ) : (
              <select
                name="personel"
                value={formData.personel}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Seçiniz</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.displayName}>{user.displayName}</option>
                ))}
              </select>
            )}
          </div>

          {/* Tarih */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tarih <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="tarih"
              value={formData.tarih}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Telefon <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="telefon"
              value={formData.telefon}
              onChange={handleChange}
              required
              placeholder="0555 123 45 67"
              maxLength="13"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:placeholder-gray-400 ${
                phoneError 
                  ? 'border-red-300 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {phoneError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {phoneError}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Format: 0555 123 45 67 (Mobil) veya 0212 123 45 67 (Sabit)
            </p>
          </div>

          {/* Kanal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Çağrı Kanalı <span className="text-red-500">*</span>
            </label>
            <select
              name="kanal"
              value={formData.kanal}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Seçiniz</option>
              {dropdownOptions.kanalList.map(kanal => (
                <option key={kanal} value={kanal}>{kanal}</option>
              ))}
            </select>
          </div>

          {/* Durum - Fake Talep değilse göster */}
          {!isFakeTalep && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Çağrı Durumu <span className="text-red-500">*</span>
              </label>
              <select
                name="durum"
                value={formData.durum}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Seçiniz</option>
                {dropdownOptions.durumList.map(durum => (
                  <option key={durum} value={durum}>{durum}</option>
                ))}
              </select>
            </div>
          )}

          {/* Detay - Fake Talep değilse göster */}
          {!isFakeTalep && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Satış Çağrısı Detayı
              </label>
              <select
                name="detay"
                value={formData.detay}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Seçiniz</option>
                {dropdownOptions.detayList.map(detay => (
                  <option key={detay} value={detay}>{detay}</option>
                ))}
              </select>
            </div>
          )}

          {/* Abonelik Durumu - Fake Talep değilse göster */}
          {!isFakeTalep && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Abonelik Durumu
              </label>
              <select
                name="abonelikDurum"
                value={formData.abonelikDurum}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Seçiniz</option>
                {dropdownOptions.abonelikDurumList.map(durum => (
                  <option key={durum} value={durum}>{durum}</option>
                ))}
              </select>
            </div>
          )}

          {/* Abone No - Fake Talep değilse göster */}
          {!isFakeTalep && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Abone Numarası
              </label>
              <input
                type="text"
                name="aboneNo"
                value={formData.aboneNo}
                onChange={handleChange}
                placeholder="12345678"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
          )}

          {/* Not */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Açıklama/Not
            </label>
            <textarea
              name="not"
              value={formData.not}
              onChange={handleChange}
              rows="3"
              placeholder="Ek açıklamalar..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText="Tamam"
      />
    </div>
  );
};

export default RecordForm; 