import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../auth/firebaseConfig';

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
    await signOut(auth);
    setUserRole(null);
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
          // Kullanıcının aktif durumunu kontrol et
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
              active: userData.isActive
            };
            setCurrentUser(userWithInfo);
          } else {
            // Kullanıcı veritabanında bulunamadı
    
            await signOut(auth);
            setCurrentUser(null);
            setUserRole(null);
            setUserName(null);
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
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 