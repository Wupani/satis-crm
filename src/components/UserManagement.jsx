import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, 
  getDocs, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc,
  getDoc
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { db, auth } from '../auth/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Shield, 
  Mail, 
  User, 
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserX
} from 'lucide-react';

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

const UserManagement = () => {
  const { currentUser } = useAuth(); // Mevcut admin kullanıcısını al
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [systemSettings, setSystemSettings] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'Personnel'
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  
  // Confirmation modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'delete', 'activate', 'deactivate'

  const roles = ['Admin', 'Team Leader', 'Personnel'];

  useEffect(() => {
    fetchUsers();
    loadSystemSettings();
    
    // Component unmount olduğunda body stillerini sıfırla
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.overflow = '';
      document.body.style.width = '';
    };
  }, []);

  const loadSystemSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'system_settings', 'main'));
      if (settingsDoc.exists()) {
        setSystemSettings(settingsDoc.data());
      } else {
        // Varsayılan ayarlar
        setSystemSettings({
          security: {
            passwordMinLength: 8,
            passwordRequireUppercase: true,
            passwordRequireNumbers: true,
            passwordRequireSpecialChars: false
          }
        });
      }
    } catch (error) {
      console.error('Sistem ayarları yüklenirken hata:', error);
      // Hata durumunda varsayılan ayarları kullan
      setSystemSettings({
        security: {
          passwordMinLength: 8,
          passwordRequireUppercase: true,
          passwordRequireNumbers: true,
          passwordRequireSpecialChars: false
        }
      });
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErrors({}); // Clear previous errors
      
      const usersRef = collection(db, 'users');
      // orderBy kaldırıyoruz çünkü bazı dokümanlarda createdAt field'ı olmayabilir
      const snapshot = await getDocs(usersRef);
      
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // JavaScript ile sıralama yapalım
      usersData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA; // En yeni önce
      });
      
      setUsers(usersData);
      
      
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      setErrors({ general: `Kullanıcılar yüklenirken hata oluştu: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gerekli';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'İsim gerekli';
    }
    
    // Şifre validasyonu - sadece yeni kullanıcı eklenirken
    if (!editingUser && !formData.password.trim()) {
      newErrors.password = 'Şifre gerekli';
    } else if (!editingUser && formData.password.trim()) {
      // Sistem ayarlarından şifre politikalarını al
      const securitySettings = systemSettings?.security || {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: false
      };
      
      const password = formData.password;
      const passwordErrors = [];
      
      // Minimum uzunluk kontrolü
      if (password.length < securitySettings.passwordMinLength) {
        passwordErrors.push(`En az ${securitySettings.passwordMinLength} karakter`);
      }
      
      // Büyük harf kontrolü
      if (securitySettings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
        passwordErrors.push('En az bir büyük harf');
      }
      
      // Sayı kontrolü
      if (securitySettings.passwordRequireNumbers && !/[0-9]/.test(password)) {
        passwordErrors.push('En az bir rakam');
      }
      
      // Özel karakter kontrolü
      if (securitySettings.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        passwordErrors.push('En az bir özel karakter (!@#$%^&*(),.?":{}|<>)');
      }
      
      if (passwordErrors.length > 0) {
        newErrors.password = `Şifre gereksinimleri: ${passwordErrors.join(', ')}`;
      }
    }
    
    if (!formData.role) {
      newErrors.role = 'Rol seçimi gerekli';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Mevcut admin kullanıcısının bilgilerini sakla
      const adminEmail = currentUser.email;
      
      // Yeni kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      // Firestore'da kullanıcı bilgilerini kaydet - UID'yi document ID olarak kullan
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        createdAt: new Date(),
        isActive: true
      });
      
      // Admin kullanıcısını tekrar giriş yaptır
      await signInWithEmailAndPassword(auth, adminEmail, 'admin123'); // Admin şifresi
      
      setSuccessMessage('Kullanıcı başarıyla eklendi!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      closeModal();
      fetchUsers();
      
    } catch (error) {
      console.error('Kullanıcı eklenirken hata:', error);
      if (error.code === 'auth/email-already-in-use') {
        setErrors({ email: 'Bu e-posta adresi zaten kullanımda' });
      } else if (error.code === 'auth/wrong-password') {
        setErrors({ general: 'Admin şifresi yanlış. Kullanıcı oluşturuldu ama admin oturumu tekrar açılamadı.' });
      } else {
        setErrors({ general: 'Kullanıcı eklenirken hata oluştu: ' + error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        updatedAt: new Date()
      });
      
      setSuccessMessage('Kullanıcı başarıyla güncellendi!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      closeModal();
      fetchUsers();
      
    } catch (error) {
      console.error('Kullanıcı güncellenirken hata:', error);
      setErrors({ general: 'Kullanıcı güncellenirken hata oluştu: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setLoading(true);
      
      await deleteDoc(doc(db, 'users', selectedUser.id));
      
      setSuccessMessage('Kullanıcı başarıyla silindi!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      fetchUsers();
      setShowDeleteModal(false);
      setSelectedUser(null);
      
    } catch (error) {
      console.error('Kullanıcı silinirken hata:', error);
      setErrors({ general: 'Kullanıcı silinirken hata oluştu: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setActionType('delete');
    setShowDeleteModal(true);
  };

  const handleToggleUserStatus = async () => {
    const newStatus = !selectedUser.isActive;
    const statusText = newStatus ? 'aktif' : 'pasif';
    
    try {
      setLoading(true);
      
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        isActive: newStatus,
        updatedAt: new Date()
      });
      
      setSuccessMessage(`Kullanıcı durumu ${statusText} olarak güncellendi!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      fetchUsers();
      setShowStatusModal(false);
      setSelectedUser(null);
      
    } catch (error) {
      console.error('Kullanıcı durumu güncellenirken hata:', error);
      setErrors({ general: 'Kullanıcı durumu güncellenirken hata oluştu: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (user) => {
    setSelectedUser(user);
    const newStatus = !user.isActive;
    setActionType(newStatus ? 'activate' : 'deactivate');
    setShowStatusModal(true);
  };

  const openEditModal = (user) => {
    // Mevcut scroll pozisyonunu kaydet
    const scrollY = window.scrollY;
    
    // Body scroll'ını devre dışı bırak ve pozisyonu koru
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', name: '', role: 'Personnel' });
    setErrors({});
    setEditingUser(null);
  };

  const closeModal = () => {
    // Kaydedilen scroll pozisyonunu geri yükle
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.overflow = '';
    document.body.style.width = '';
    
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    setShowAddModal(false);
    setShowEditModal(false);
    resetForm();
  };





  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'Team Leader': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Personnel': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Admin User'ı gizle - kimse silip değiştiremesin
  const filteredUsers = users.filter(user => user.name !== 'Admin User' && user.email !== 'wupaniyazilim@gmail.com');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
            <p className="text-gray-600">Sistem kullanıcılarını yönetin</p>
          </div>
        </div>
        
        <div className="flex space-x-3">          
          <button
            onClick={() => {
              // Mevcut scroll pozisyonunu kaydet
              const scrollY = window.scrollY;
              
              // Body scroll'ını devre dışı bırak ve pozisyonu koru
              document.body.style.overflow = 'hidden';
              document.body.style.position = 'fixed';
              document.body.style.top = `-${scrollY}px`;
              document.body.style.width = '100%';
              
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kullanıcı</span>
          </button>
        </div>
      </div>



      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-green-800 dark:text-green-300 whitespace-pre-line">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-800 dark:text-red-300">{errors.general}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Kullanıcılar ({filteredUsers.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Henüz kullanıcı bulunmuyor</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    E-posta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Oluşturulma
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive !== false ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {user.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Bilinmiyor'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openStatusModal(user)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isActive !== false 
                              ? 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30' 
                              : 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30'
                          }`}
                                                      title={user.isActive !== false ? 'Pasif Yap' : 'Aktif Yap'}
                          >
                            {user.isActive !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <PortalModal isOpen={showAddModal} onClose={closeModal}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Yeni Kullanıcı Ekle</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    İsim Soyisim
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Kullanıcının adını girin"
                  />
                  {errors.name && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="kullanici@example.com"
                  />
                  {errors.email && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 pr-10 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={systemSettings ? `En az ${systemSettings.security?.passwordMinLength || 8} karakter` : "En az 8 karakter"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {systemSettings && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Şifre gereksinimleri: 
                      {systemSettings.security?.passwordMinLength && ` ${systemSettings.security.passwordMinLength}+ karakter`}
                      {systemSettings.security?.passwordRequireUppercase && ', büyük harf'}
                      {systemSettings.security?.passwordRequireNumbers && ', rakam'}
                      {systemSettings.security?.passwordRequireSpecialChars && ', özel karakter'}
                    </div>
                  )}
                  {errors.password && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.password}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  {errors.role && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.role}</p>}
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
        </div>
      </PortalModal>

      {/* Edit User Modal */}
      <PortalModal isOpen={showEditModal} onClose={closeModal}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Kullanıcı Düzenle</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditUser} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    İsim Soyisim
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Kullanıcının adını girin"
                  />
                  {errors.name && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="kullanici@example.com"
                  />
                  {errors.email && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  {errors.role && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.role}</p>}
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Güncelle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
        </div>
      </PortalModal>

      {/* Delete Confirmation Modal */}
      <PortalModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Trash2 className="w-5 h-5 text-red-600 mr-2" />
              Kullanıcı Sil
            </h3>
          </div>
          
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              <strong>{selectedUser?.name}</strong> kullanıcısını silmek istediğinizden emin misiniz?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Bu işlem geri alınamaz ve kullanıcının tüm verileri silinecektir.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={loading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </PortalModal>

      {/* Status Change Confirmation Modal */}
      <PortalModal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              {actionType === 'activate' ? (
                <UserCheck className="w-5 h-5 text-green-600 mr-2" />
              ) : (
                <UserX className="w-5 h-5 text-orange-600 mr-2" />
              )}
              Kullanıcı Durumu Değiştir
            </h3>
          </div>
          
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              <strong>{selectedUser?.name}</strong> kullanıcısını{' '}
              <span className={actionType === 'activate' ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                {actionType === 'activate' ? 'aktif' : 'pasif'}
              </span>{' '}
              yapmak istediğinizden emin misiniz?
            </p>
            
            {actionType === 'deactivate' && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  ⚠️ Pasif yapılan kullanıcı sisteme giriş yapamayacaktır.
                </p>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleToggleUserStatus}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 ${
                  actionType === 'activate'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    {actionType === 'activate' ? (
                      <UserCheck className="w-4 h-4" />
                    ) : (
                      <UserX className="w-4 h-4" />
                    )}
                    <span>{actionType === 'activate' ? 'Aktif Yap' : 'Pasif Yap'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </PortalModal>
    </div>
  );
};

export default UserManagement; 