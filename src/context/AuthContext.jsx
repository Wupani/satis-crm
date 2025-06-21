import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../auth/firebaseConfig';
import logger from '../utils/logger';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(480); // dakika - varsayılan 8 saat
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Oturum zaman aşımı kontrolü
  useEffect(() => {
    if (!currentUser) return;

    const checkSessionTimeout = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const timeoutMs = sessionTimeout * 60 * 1000; // dakikayı milisaniyeye çevir

      if (timeSinceLastActivity >= timeoutMs) {
        console.log('⏰ Oturum zaman aşımına uğradı, kullanıcı çıkış yapılıyor...');
        handleSessionTimeout();
      }
    };

    // Her 30 saniyede bir kontrol et
    const interval = setInterval(checkSessionTimeout, 30000);

    return () => clearInterval(interval);
  }, [currentUser, lastActivity, sessionTimeout]);

  // Kullanıcı aktivitesi takibi
  useEffect(() => {
    if (!currentUser) return;

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Kullanıcı aktivitelerini dinle
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [currentUser]);

  // Sistem ayarlarını yükle - Hemen başlangıçta yükle
  useEffect(() => {
    const loadSystemSettings = async () => {
      try {
        console.log('🔧 Sistem ayarları yükleniyor...');
        const settingsDoc = await getDoc(doc(db, 'system_settings', 'main'));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          if (settings.security?.sessionTimeout) {
            setSessionTimeout(settings.security.sessionTimeout);
            console.log(`✅ Oturum zaman aşımı ayarı yüklendi: ${settings.security.sessionTimeout} dakika`);
          } else {
            console.log('⚠️ Sistem ayarlarında sessionTimeout bulunamadı, varsayılan değer kullanılıyor: 480 dakika');
          }
        } else {
          console.log('⚠️ Sistem ayarları dokümanı bulunamadı, varsayılan değer kullanılıyor: 480 dakika');
        }
      } catch (error) {
        console.error('❌ Sistem ayarları yüklenirken hata:', error);
        console.log('🔄 Varsayılan değer kullanılıyor: 480 dakika');
      }
    };

    // Hemen yükle, kullanıcı girişini bekleme
    loadSystemSettings();
  }, []); // Boş dependency array - sadece component mount olduğunda çalış

  const handleSessionTimeout = async () => {
    try {
      // Zaman aşımı logunu kaydet (admin hesabı hariç)
      if (currentUser && currentUser.email !== 'wupaniyazilim@gmail.com') {
        await logger.logSessionTimeout(
          currentUser.uid,
          currentUser.name || currentUser.email?.split('@')[0] || 'Kullanıcı',
          currentUser.email,
          sessionTimeout
        );
      }

      // Session storage'ı temizle
      sessionStorage.removeItem('originalAdmin');
      sessionStorage.removeItem('switchedUser');
      
      await signOut(auth);
      setUserRole(null);
      setUserName(null);
      setCurrentUser(null);
      
      // Kullanıcıya bildirim göster
      alert(`Oturum zaman aşımına uğradı (${sessionTimeout} dakika). Tekrar giriş yapmanız gerekiyor.`);
    } catch (error) {
      console.error('Oturum zaman aşımı işlenirken hata:', error);
      // Hata olsa bile çıkış yap
      await signOut(auth);
      setUserRole(null);
      setUserName(null);
      setCurrentUser(null);
    }
  };

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Kullanıcının aktif durumunu kontrol et
    const uid = userCredential.user.uid;
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Eğer kullanıcı pasif ise (isActive false), oturumu kapat ve hata fırlat
      if (userData.isActive === false) {
        await signOut(auth);
        throw new Error('Hesabınız pasif durumda. Lütfen yöneticinizle iletişime geçin.');
      }
    }
    
    return userCredential;
  };

  const logout = async () => {
    // Çıkış yapmadan önce log kaydet (admin hesabı hariç)
    if (currentUser && currentUser.email !== 'wupaniyazilim@gmail.com') {
      await logger.logUserLogout(
        currentUser.uid,
        currentUser.name || currentUser.email?.split('@')[0] || 'Kullanıcı',
        currentUser.email
      );
    }
    
    // Session storage'ı temizle
    sessionStorage.removeItem('originalAdmin');
    sessionStorage.removeItem('switchedUser');
    
    await signOut(auth);
    setUserRole(null);
    setUserName(null);
    setCurrentUser(null);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const getUserRole = async (uid) => {
    try {
      // uid'yi document ID olarak kullanarak user'ı bul
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Role mapping - Firebase'te farklı formatlar olabilir
        const roleMapping = {
          'Admin': 'admin',
          'admin': 'admin',
          'Team Leader': 'teamLeader',
          'teamLeader': 'teamLeader',
          'Personnel': 'personnel',
          'personnel': 'personnel'
        };
        
        const mappedRole = roleMapping[userData.role] || 'personnel';
        
        // Kullanıcı adını da döndür
        return { role: mappedRole, name: userData.name || userData.email || 'Kullanıcı', active: userData.isActive };
      }
      
      return { role: 'personnel', name: 'Kullanıcı', active: false }; // Varsayılan değerler
    } catch (error) {
      console.error('Rol alınırken hata:', error);
      return { role: 'personnel', name: 'Kullanıcı', active: false };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Admin geçiş modunu kontrol et
          const switchedUserData = sessionStorage.getItem('switchedUser');
          const originalAdminData = sessionStorage.getItem('originalAdmin');
          
          if (switchedUserData && originalAdminData) {
            // Admin başka kullanıcının hesabında
            const switchedUser = JSON.parse(switchedUserData);
            
            // Role mapping
            const roleMapping = {
              'Admin': 'admin',
              'admin': 'admin',
              'Team Leader': 'teamLeader',
              'teamLeader': 'teamLeader',
              'Personnel': 'personnel',
              'personnel': 'personnel'
            };
            
            const mappedRole = roleMapping[switchedUser.role] || 'personnel';
            
            const userWithInfo = {
              uid: switchedUser.uid,
              email: switchedUser.email,
              role: mappedRole,
              name: switchedUser.name,
              isSwitched: true,
              originalAdmin: JSON.parse(originalAdminData)
            };
            
            setCurrentUser(userWithInfo);
            setUserRole(mappedRole);
            setUserName(switchedUser.name);
          } else {
            // Eğer sadece biri varsa session'ı temizle
            if (switchedUserData || originalAdminData) {
              sessionStorage.removeItem('switchedUser');
              sessionStorage.removeItem('originalAdmin');
            }
            // Normal kullanıcı girişi
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              // Kullanıcı pasif ise oturumu kapat
              if (userData.isActive === false) {
        
                await signOut(auth);
                setCurrentUser(null);
                setUserRole(null);
                setUserName(null);
                setLoading(false);
                return;
              }
              
              // Kullanıcı aktifse role bilgisini al
              const userInfo = await getUserRole(user.uid);
              setUserRole(userInfo.role);
              setUserName(userInfo.name);
              
              // currentUser objesine role ve name'i ekle
              const userWithInfo = {
                ...user,
                role: userInfo.role,
                name: userInfo.name,
                active: userData.isActive,
                isSwitched: false
              };
              setCurrentUser(userWithInfo);
            } else {
              // Kullanıcı veritabanında bulunamadı
      
              await signOut(auth);
              setCurrentUser(null);
              setUserRole(null);
              setUserName(null);
            }
          }
        } catch (error) {
          console.error('Kullanıcı durumu kontrol edilirken hata:', error);
          // Hata durumunda güvenlik için oturumu kapat
          await signOut(auth);
          setCurrentUser(null);
          setUserRole(null);
          setUserName(null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserName(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Kullanıcının aktif durumunu kontrol etmek için fonksiyon
  const checkUserStatus = async () => {
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Kullanıcı pasif hale getirilmişse oturumu kapat
          if (userData.isActive === false) {
    
            await signOut(auth);
            setCurrentUser(null);
            setUserRole(null);
            setUserName(null);
            return false;
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('Kullanıcı durumu kontrol edilirken hata:', error);
        return false;
      }
    }
    return false;
  };

  const value = {
    currentUser,
    userRole,
    userName,
    login,
    logout,
    resetPassword,
    checkUserStatus,
    loading,
    sessionTimeout,
    lastActivity,
    timeUntilTimeout: sessionTimeout * 60 * 1000 - (Date.now() - lastActivity)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 