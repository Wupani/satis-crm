import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { 
  Users, 
  Crown, 
  UserCheck, 
  User, 
  Shield, 
  ArrowLeft,
  LogIn,
  Eye,
  Settings,
  Star,
  Building2
} from 'lucide-react';

const UserSwitcher = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switchedUser, setSwitchedUser] = useState(null);
  const [originalAdmin, setOriginalAdmin] = useState(null);

  useEffect(() => {
    fetchUsers();
    checkIfSwitched();
  }, []);

  const checkIfSwitched = () => {
    // Session storage'dan kontrol et admin başka hesapta mı
    const adminData = sessionStorage.getItem('originalAdmin');
    const switchedData = sessionStorage.getItem('switchedUser');
    
    if (adminData && switchedData) {
      setOriginalAdmin(JSON.parse(adminData));
      setSwitchedUser(JSON.parse(switchedData));
    } else if (adminData || switchedData) {
      // Tutarsızlık varsa temizle
      sessionStorage.removeItem('originalAdmin');
      sessionStorage.removeItem('switchedUser');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersData = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => 
          user.email !== 'wupaniyazilim@gmail.com' && 
          user.name !== 'Admin User' &&
          user.isActive
        )
        .sort((a, b) => {
          // Önce role göre sırala, sonra isim
          const roleOrder = { 'Admin': 1, 'Team Leader': 2, 'Personnel': 3 };
          const roleA = roleOrder[a.role] || 4;
          const roleB = roleOrder[b.role] || 4;
          
          if (roleA !== roleB) return roleA - roleB;
          return (a.name || '').localeCompare(b.name || '');
        });
      
      setUsers(usersData);
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchToUser = async (targetUser) => {
    try {
      // Orijinal admin bilgilerini sakla (sadece ilk geçişte)
      const existingAdmin = sessionStorage.getItem('originalAdmin');
      if (!existingAdmin) {
        // Gerçek admin bilgilerini Firebase'den al
        const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const currentUserData = currentUserDoc.data();
        
        const adminData = {
          uid: currentUser.uid,
          email: currentUserData?.email || currentUser.email,
          name: currentUserData?.name || currentUser.displayName || 'Admin User',
          role: currentUserData?.role || 'Admin'
        };
        sessionStorage.setItem('originalAdmin', JSON.stringify(adminData));
        setOriginalAdmin(adminData);
      }

      // Hedef kullanıcının tam bilgilerini çek
      const userDoc = await getDoc(doc(db, 'users', targetUser.id));
      const userData = userDoc.data();

      // Session storage'a hedef kullanıcı bilgilerini kaydet
      sessionStorage.setItem('switchedUser', JSON.stringify({
        uid: targetUser.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      }));

      // Sayfayı yenile - AuthContext otomatik olarak switched user'ı algılayacak
      window.location.reload();
      
    } catch (error) {
      console.error('Kullanıcı geçişi hatası:', error);
      alert('Kullanıcı geçişi sırasında hata oluştu.');
    }
  };

  const returnToAdmin = () => {
    // Session storage'ı temizle
    sessionStorage.removeItem('originalAdmin');
    sessionStorage.removeItem('switchedUser');
    
    // Sayfayı yenile
    window.location.reload();
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'Admin': return Crown;
      case 'Team Leader': return UserCheck;
      case 'Personnel': return User;
      default: return User;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'from-purple-500 to-purple-600';
      case 'Team Leader': return 'from-blue-500 to-blue-600';
      case 'Personnel': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-800';
      case 'Team Leader': return 'bg-blue-100 text-blue-800';
      case 'Personnel': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Hesaplarına Giriş</h1>
            <p className="text-gray-600">Herhangi bir kullanıcının hesabına geçiş yapabilirsiniz</p>
          </div>
        </div>

        {/* Geri Dön Butonu */}
        {originalAdmin && (
          <button
            onClick={returnToAdmin}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Admin Hesabına Dön</span>
          </button>
        )}
      </div>

      {/* Mevcut Durum */}
      {originalAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="font-medium text-yellow-800">Admin Geçiş Modu Aktif</h4>
              <p className="text-sm text-yellow-700">
                Şu anda <strong>{switchedUser?.email}</strong> hesabında görüntüleme yapıyorsunuz.
                Orijinal admin: <strong>{originalAdmin.email}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Kullanıcı Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map((user) => {
          const RoleIcon = getRoleIcon(user.role);
          
          return (
            <div
              key={user.id}
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => switchToUser(user)}
            >
              {/* Gradient Header */}
              <div className={`h-20 bg-gradient-to-r ${getRoleColor(user.role)} relative`}>
                <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                <div className="absolute bottom-3 left-4 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <RoleIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>

              {/* User Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg truncate">
                    {user.name || 'İsimsiz Kullanıcı'}
                  </h3>
                  <LogIn className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span className="truncate">{user.email}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Eye className="w-4 h-4 mr-1" />
                      <span>Hesabına Geç</span>
                    </div>
                    
                    {user.role === 'Admin' && (
                      <Star className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-purple-600 bg-opacity-0 hover:bg-opacity-5 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                <div className="bg-white rounded-full p-3 shadow-lg">
                  <LogIn className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {users.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Kullanıcı Bulunamadı</h3>
          <p className="text-gray-500">Aktif kullanıcı bulunmuyor.</p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="font-medium text-blue-800 mb-1">Güvenlik Bilgisi</h4>
            <p className="text-sm text-blue-700">
              Bu özellik sadece admin hesapları için kullanılabilir. Geçiş yaptığınız hesapta sadece 
              o kullanıcının yetkilerine sahip olursunuz. İstediğiniz zaman "Admin Hesabına Dön" 
              butonuyla orijinal hesabınıza dönebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSwitcher; 