import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase konfigürasyonu - YENİ PROJE
const firebaseConfig = {
  apiKey: "AIzaSyB43OqFebSz7JoqGmSk4ybzQouhkwKLaOo",
  authDomain: "satistakip-bc5c4.firebaseapp.com",
  projectId: "satistakip-bc5c4",
  storageBucket: "satistakip-bc5c4.firebasestorage.app",
  messagingSenderId: "931339446084",
  appId: "1:931339446084:web:d934b0bee4311198ecd911"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Authentication ve Firestore servisleri
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app; 