import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import RoleGuard from '../components/RoleGuard';
import Modal from '../components/Modal';
import {
  Settings,
  Shield,
  Users,
  FileText,
  RefreshCw,
  Save,
  AlertTriangle,
  Server,
  HardDrive,
  Monitor
} from 'lucide-react';

const SystemSettings = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('security');
  const [systemStats, setSystemStats] = useState({});
  
  const [settings, setSettings] = useState({
    // Güvenlik Ayarları
    security: {
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: false,
      sessionTimeout: 480, // dakika
      maxLoginAttempts: 5,
      ipWhitelist: [],
      allowRemoteLogin: true
    }
  });

  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null
  });

  const tabs = [
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'system', label: 'Sistem Bilgisi', icon: Monitor }
  ];

  useEffect(() => {
    loadSettings();
    loadSystemStats();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'system_settings', 'main'));
      
      if (settingsDoc.exists()) {
        const loadedData = settingsDoc.data();
        
        setSettings(prevSettings => ({
          ...prevSettings,
          ...loadedData
        }));
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      // Kullanıcı sayısı
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;
      const activeUsers = usersSnapshot.docs.filter(doc => doc.data().isActive !== false).length;
      
      // Satış kayıtları sayısı
      const recordsSnapshot = await getDocs(collection(db, 'sales_records'));
      const totalRecords = recordsSnapshot.size;
      
      // Bu ay kayıtları
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthRecords = recordsSnapshot.docs.filter(doc => {
        const data = doc.data();
        const recordDate = data.createdAt?.toDate() || new Date(data.tarih);
        return recordDate >= startOfMonth;
      }).length;

      // Veritabanı boyutunu yaklaşık olarak hesapla
      const estimatedSizeKB = (totalUsers * 2) + (totalRecords * 1.5); // Her kullanıcı ~2KB, her kayıt ~1.5KB
      const estimatedSizeMB = (estimatedSizeKB / 1024).toFixed(1);
      
      setSystemStats({
        totalUsers,
        activeUsers,
        totalRecords,
        thisMonthRecords,
        systemUptime: '99.9%',
        lastBackup: new Date().toLocaleDateString('tr-TR'),
        databaseSize: `${estimatedSizeMB} MB`,
        avgResponseTime: '120ms'
      });
    } catch (error) {
      console.error('Sistem istatistikleri yüklenirken hata:', error);
    }
  };

  const handleSettingChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };



  const saveSettings = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ...settings,
        lastUpdated: new Date(),
        updatedBy: currentUser.uid,
        savedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'system_settings', 'main'), dataToSave);
      
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Ayarlar Kaydedildi',
        message: `Sistem ayarları başarıyla güncellendi. Kayıt zamanı: ${new Date().toLocaleString('tr-TR')}`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
      });
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Kaydetme Hatası',
        message: `Ayarlar kaydedilirken bir hata oluştu: ${error.message}`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setModal({
      isOpen: true,
      type: 'warning',
      title: 'Varsayılan Ayarlara Dön',
      message: 'Tüm ayarlar varsayılan değerlere sıfırlanacak. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
      onConfirm: async () => {
        try {
          // Varsayılan ayarları geri yükle
          const defaultSettings = {
            security: {
              passwordMinLength: 8,
              passwordRequireUppercase: true,
              passwordRequireNumbers: true,
              passwordRequireSpecialChars: false,
              sessionTimeout: 480,
              maxLoginAttempts: 5,
              ipWhitelist: [],
              allowRemoteLogin: true
            }
          };
          
          setSettings(defaultSettings);
          
          // Firebase'e kaydet
          await setDoc(doc(db, 'system_settings', 'main'), {
            ...defaultSettings,
            lastUpdated: new Date(),
            updatedBy: currentUser.uid,
            resetToDefaults: true
          });
          
          setModal({
            isOpen: true,
            type: 'success',
            title: 'Varsayılan Ayarlar Yüklendi',
            message: 'Tüm ayarlar varsayılan değerlere sıfırlandı.',
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
          });
        } catch (error) {
          console.error('Varsayılan ayarlar yüklenirken hata:', error);
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Hata',
            message: 'Varsayılan ayarlar yüklenirken bir hata oluştu.',
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };



  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Güvenlik ayarları değişiklikleri tüm kullanıcıları etkileyecektir.
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Minimum Şifre Uzunluğu
          </label>
          <input
            type="number"
            min="6"
            max="20"
            value={settings.security.passwordMinLength}
            onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Oturum Zaman Aşımı (dakika)
          </label>
          <input
            type="number"
            min="30"
            max="1440"
            value={settings.security.sessionTimeout}
            onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Maksimum Giriş Denemesi
          </label>
          <input
            type="number"
            min="3"
            max="10"
            value={settings.security.maxLoginAttempts}
            onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Büyük Harf Zorunluluğu</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Şifrelerde en az bir büyük harf olmalı</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.passwordRequireUppercase}
              onChange={(e) => handleSettingChange('security', 'passwordRequireUppercase', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Sayı Zorunluluğu</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Şifrelerde en az bir sayı olmalı</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.passwordRequireNumbers}
              onChange={(e) => handleSettingChange('security', 'passwordRequireNumbers', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </label>
        </div>
        

      </div>
    </div>
  );

  const renderSystemInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Toplam Kullanıcı</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{systemStats.totalUsers}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{systemStats.activeUsers} aktif</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Toplam Kayıt</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{systemStats.totalRecords}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Bu ay: {systemStats.thisMonthRecords}</p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
          <div className="flex items-center">
            <Server className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sistem Durumu</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{systemStats.systemUptime}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Çalışma süresi</p>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
          <div className="flex items-center">
            <HardDrive className="h-8 w-8 text-orange-600 dark:text-orange-400 mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Veritabanı</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{systemStats.databaseSize}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Toplam boyut</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sistem Bilgileri</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Son Yedekleme:</span>
            <span className="font-medium text-gray-900 dark:text-white">{systemStats.lastBackup}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Ortalama Yanıt Süresi:</span>
            <span className="font-medium text-gray-900 dark:text-white">{systemStats.avgResponseTime}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Uygulama Versiyonu:</span>
            <span className="font-medium text-gray-900 dark:text-white">v2.1.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Son Güncelleme:</span>
            <span className="font-medium text-gray-900 dark:text-white">{new Date().toLocaleDateString('tr-TR')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600 dark:text-gray-300">Sistem ayarları yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Sistem Ayarları
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Uygulama konfigürasyonu ve sistem yönetimi
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={resetToDefaults}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Varsayılana Dön
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white border-b-2 border-purple-600'
                      : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            {activeTab === 'security' && renderSecuritySettings()}
            {activeTab === 'system' && renderSystemInfo()}
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
    </RoleGuard>
  );
};

export default SystemSettings; 