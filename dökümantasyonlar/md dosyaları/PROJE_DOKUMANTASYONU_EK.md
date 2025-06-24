# 🔌 Satış CRM - Ek Teknik Dokümantasyon

## API Referansı ve Fonksiyonlar

### Firebase Firestore İşlemleri

#### Veri Okuma Fonksiyonları
```javascript
// Tüm kayıtları getir
const getAllRecords = async () => {
  const q = query(collection(db, 'sales_records'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Kullanıcıya göre kayıtları getir
const getUserRecords = async (userId) => {
  const q = query(
    collection(db, 'sales_records'),
    where('createdBy', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
```

#### Yardımcı Fonksiyonlar (helpers.js)
```javascript
// Benzersiz referans ID oluştur
export const generateRefId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `REF-${timestamp}-${random.toUpperCase()}`;
};

// Telefon numarası formatla
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }
  return phone;
};
```

## UI/UX Tasarım Sistemi

### Renk Paleti
```css
/* Ana Renkler */
--purple-500: #a855f7;
--purple-600: #9333ea;
--lavender-100: #f8f4ff;
--periwinkle-500: #7a7aff;
```

### Responsive Breakpoints
```css
xs: 475px;    /* Extra Small */
sm: 640px;    /* Small */
md: 768px;    /* Medium */
lg: 1024px;   /* Large */
xl: 1280px;   /* Extra Large */
```

## Yapılandırma Dosyaları

### Vite Config (vite.config.js)
```javascript
export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    base: command === 'build' ? '/satis-crm/' : '/',
    build: { outDir: 'dist' },
    server: { port: 5173, host: true }
  }
})
```

### Tailwind Config Özellikleri
- **Custom Colors**: Purple, Lavender, Periwinkle tonları
- **Animations**: Float, fade-in, scale-in animasyonları
- **Typography**: Poppins font ailesi
- **Shadows**: Modern gölge efektleri

## Performans Optimizasyonları

### Lazy Loading
```javascript
import { lazy, Suspense } from 'react';
const Analytics = lazy(() => import('./pages/Analytics'));

<Suspense fallback={<PageLoader />}>
  <Analytics />
</Suspense>
```

### Memory Management
```javascript
useEffect(() => {
  const unsubscribe = onSnapshot(query, callback);
  return () => unsubscribe(); // Cleanup
}, []);
```

## Güvenlik Best Practices

### Input Sanitization
```javascript
const sanitizeInput = (input) => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
```

### Authentication Security
- Session timeout: 8 saat
- Role-based access control
- Secure password policies
- Firebase security rules

## Test Senaryoları

### Manuel Test Checklist
- [ ] Kullanıcı girişi ve çıkışı
- [ ] CRUD işlemleri
- [ ] Filtreleme ve arama
- [ ] Export işlemleri
- [ ] Responsive design
- [ ] Chat sistemi
- [ ] Rol tabanlı erişim

## Deployment

### GitHub Pages
```bash
npm run build
npm run deploy
```

### Environment Variables
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## Maintenance

### Günlük Kontroller
- Sistem logları
- Performance metrikleri
- Error monitoring
- User activity

### Haftalık Kontroller
- Database backups
- Security updates
- Performance optimization
- User feedback

---

*Bu ek dokümantasyon, ana dokümantasyonu tamamlar ve gelişmiş teknik konuları kapsar.* 