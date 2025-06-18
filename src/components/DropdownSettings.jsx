import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  List,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const DropdownSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [dropdownData, setDropdownData] = useState({
    kanalList: [],
    durumList: [],
    detayList: [],
    abonelikDurumList: []
  });

  const dropdownLabels = {
    kanalList: 'Çağrı Kanalları',
    durumList: 'Çağrı Durumları', 
    detayList: 'Satış Çağrısı Detayları',
    abonelikDurumList: 'Abonelik Durumları'
  };

  useEffect(() => {
    fetchDropdownSettings();
  }, []);

  const fetchDropdownSettings = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'dropdown_settings', 'main');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDropdownData({
          kanalList: data.kanalList || [],
          durumList: data.durumList || [],
          detayList: data.detayList || [],
          abonelikDurumList: data.abonelikDurumList || []
        });
      } else {
        // Varsayılan değerler
        setDropdownData({
          kanalList: ['Telefon', 'WhatsApp', 'E-posta', 'Yüz Yüze', 'Web Site'],
          durumList: ['Arandı', 'Meşgul', 'Ulaşılamadı', 'Geri Arama', 'Reddetti'],
          detayList: ['İlgilendi', 'Düşünecek', 'Fiyat Sordu', 'Bilgi İstedi', 'İlgilenmedi', 'Satış Sağlandı'],
          abonelikDurumList: ['Yeni Abone', 'Mevcut Abone', 'İptal', 'Askıya Alındı', 'Beklemede']
        });
      }
    } catch (error) {
      console.error('Dropdown ayarları yüklenirken hata:', error);
      setError('Ayarlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (listKey) => {
    const newItem = prompt(`Yeni ${dropdownLabels[listKey]} değeri:`);
    if (newItem && newItem.trim()) {
      setDropdownData(prev => ({
        ...prev,
        [listKey]: [...prev[listKey], newItem.trim()]
      }));
    }
  };

  const handleRemoveItem = (listKey, index) => {
    if (window.confirm('Bu değeri silmek istediğinizden emin misiniz?')) {
      setDropdownData(prev => ({
        ...prev,
        [listKey]: prev[listKey].filter((_, i) => i !== index)
      }));
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      
      const docRef = doc(db, 'dropdown_settings', 'main');
      await setDoc(docRef, {
        ...dropdownData,
        updatedAt: new Date()
      });
      
      setSuccess('Ayarlar başarıyla kaydedildi!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      setError('Ayarlar kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Settings className="h-6 w-6 mr-2" />
            Açılır Liste Ayarları
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Yeni kayıt formundaki açılır listeleri yönetin</p>
        </div>
        
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(dropdownData).map(([listKey, items]) => (
          <div key={listKey} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                <List className="h-5 w-5 mr-2" />
                {dropdownLabels[listKey]}
              </h3>
              <button
                onClick={() => handleAddItem(listKey)}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ekle
              </button>
            </div>
            
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <span className="text-gray-900 dark:text-gray-100">{item}</span>
                  <button
                    onClick={() => handleRemoveItem(listKey, index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {items.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">Henüz değer eklenmemiş</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DropdownSettings; 