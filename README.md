# 📊 Satış Takip CRM – React + Firebase + GitHub Pages

Bu CRM uygulaması, satış personelinin çağrı ve abonelik süreçlerini takip edebilmesi için geliştirilmiş modern, güvenli ve modüler bir sistemdir.

## ⚙️ Kullanılan Teknolojiler

- **React.js** (Vite)
- **Tailwind CSS**
- **Lucide Icons**
- **Firebase Firestore** (Veritabanı)
- **Firebase Authentication** (Kimlik Doğrulama)
- **GitHub Pages** (Yayınlama)

## 👥 Kullanıcı Rolleri

| Rol | Yetkiler |
|-----|----------|
| **Admin** | Tüm kullanıcı ve kayıtları görüntüler, düzenler, ayarları yönetir |
| **Takım Lideri** | Kendi personelinin verilerine erişebilir |
| **Personel** | Yalnızca kendi kayıtlarını görür ve oluşturur |

## 🚀 Kurulum

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Firebase konfigürasyonunu yapılandırın:**
   - `src/auth/firebaseConfig.js` dosyasında Firebase projenizdeki değerleri güncelleyin

3. **Geliştirme sunucusunu başlatın:**
   ```bash
   npm run dev
   ```

4. **Projeyi derleyin:**
   ```bash
   npm run build
   ```

5. **GitHub Pages'e yayınlayın:**
   ```bash
   npm run deploy
   ```

## 🔐 Firebase Kurulumu

1. [Firebase Console](https://console.firebase.google.com/)'da yeni bir proje oluşturun
2. Firestore Database'i etkinleştirin
3. Authentication'ı etkinleştirin ve Email/Password yöntemini aktif edin
4. Web app konfigürasyonunu alın ve `firebaseConfig.js` dosyasına ekleyin

## 🔒 Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sales_records/{docId} {
      allow read, write: if request.auth != null
        && (request.auth.token.role == 'admin'
         || request.auth.token.role == 'leader'
         || request.auth.uid == resource.data.createdBy);
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null
        && (request.auth.token.role == 'admin'
         || request.auth.uid == userId);
    }
  }
}
```

## 📋 Özellikler

- ✅ Giriş yapmadan hiçbir veriye erişim yok
- ✅ Rol tabanlı yetki sistemi
- ✅ Modern ve responsive tasarım
- ✅ Gerçek zamanlı veri güncelleme
- ✅ Filtrelenebilir kayıt listesi
- ✅ İstatistik dashboard'u
- ✅ Firebase güvenlik kuralları

## 📁 Proje Yapısı

```
src/
├── App.jsx                 # Ana uygulama bileşeni
├── main.jsx               # Uygulama giriş noktası
├── auth/
│   └── firebaseConfig.js  # Firebase konfigürasyonu
├── components/
│   ├── Navbar.jsx         # Üst menü
│   ├── Sidebar.jsx        # Yan menü
│   ├── RecordForm.jsx     # Kayıt ekleme formu
│   ├── RecordTable.jsx    # Kayıt listesi tablosu
│   └── RoleGuard.jsx      # Rol kontrol bileşeni
├── context/
│   └── AuthContext.jsx    # Authentication context
├── pages/
│   ├── Login.jsx          # Giriş sayfası
│   └── Dashboard.jsx      # Ana sayfa
└── utils/
    └── helpers.js         # Yardımcı fonksiyonlar
```

## 🎯 Veri Modeli

### Sales Records (sales_records)
- `refId`: Benzersiz referans kodu
- `personel`: Kaydı oluşturan kullanıcı
- `tarih`: Satış tarihi
- `telefon`: Müşteri telefonu
- `kanal`: Çağrı kanalı
- `durum`: Çağrı durumu
- `detay`: Satış detayı
- `abonelikDurum`: Abonelik durumu
- `aboneNo`: Abone numarası
- `not`: Açıklama
- `createdBy`: Oluşturan kullanıcı UID

## 📞 İletişim

Proje hakkında sorularınız için issue açabilirsiniz.
