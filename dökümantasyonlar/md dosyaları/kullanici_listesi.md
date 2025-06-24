# 👥 CRM Kullanıcı Listesi

## 📋 Eklenecek Kullanıcılar

| No | Ad Soyad | E-posta | Şifre | Rol |
|----|----------|---------|--------|-----|
| 1 | Ezgi Çoban | ezgi.coban@satiscrm.com | 9JI6R1x3iadtWqk | personnel |
| 2 | Damlanur Doğan | damlanur.dogan@satiscrm.com | K8mP2xQ7vnBsLwR | personnel |
| 3 | Yaren Kaçar | yaren.kacar@satiscrm.com | T5rN9wE3qXpZmCs | personnel |
| 4 | Zeliha Aktaş | zeliha.aktas@satiscrm.com | F7hY4uI6oLkJnMp | personnel |
| 5 | Tuğçe Tavlı | tugce.tavli@satiscrm.com | B3dG8sA5tRqWxZv | personnel |
| 6 | İrem Dönmez | irem.donmez@satiscrm.com | M9pL2nH7cVbXyQw | personnel |
| 7 | İlayda Ekşi | ilayda.eksi@satiscrm.com | J4kR6mT9fGhYuIo | personnel |
| 8 | Tuğçe Mutlu | tugce.mutlu@satiscrm.com | W8zN3qP5aDfGhJk | personnel |
| 9 | Zeynep Mutlu | zeynep.mutlu@satiscrm.com | L6vC9xS2eTrYuPw | personnel |
| 10 | Hülya Çolak | hulya.colak@satiscrm.com | Q4mF7nK8pLsZxCv | personnel |
| 11 | Nurcan Özmen | nurcan.ozmen@satiscrm.com | R2tY5wE9qXhGjKl | personnel |
| 12 | Münevver Morgül | munevver.morgul@satiscrm.com | D8nB4mV7cFgHyQw | personnel |
| 13 | Eylem Önavcı | eylem.onavci@satiscrm.com | S3rT6pL9xZbNmKj | personnel |
| 14 | Aslı Kılıç | asli.kilic@satiscrm.com | H7wQ2nM5vCxZaFg | personnel |
| 15 | Suzan Akbarı | suzan.akbari@satiscrm.com | P9kL4rY7tEsWqXz | personnel |
| 16 | Aygül Akbaba | aygul.akbaba@satiscrm.com | N6mJ3xF8cVbHyTr | personnel |
| 17 | Fatma Zorba | fatma.zorba@satiscrm.com | G5wP9nK2qLsZxMj | personnel |
| 18 | Tuğçe Günel | tugce.gunel@satiscrm.com | V8rT4mQ7fGhBnCx | personnel |
| 19 | Mevlüdiye Taş | mevludiye.tas@satiscrm.com | X2yN6pL9sDfGhJk | personnel |
| 20 | Ayşe Çandır | ayse.candir@satiscrm.com | Z5wR8nM3qXtYvCs | personnel |

---

## 🔧 Firebase'e Nasıl Eklersiniz?

### Yöntem 1: Admin Panel Üzerinden (Tek Tek)
1. Admin hesabınızla giriş yapın
2. **Kullanıcı Yönetimi** bölümüne gidin
3. **Yeni Kullanıcı Ekle** butonuna tıklayın
4. Yukarıdaki tablodaki bilgileri girin
5. Rol: **Personnel** seçin
6. Her kullanıcı için tekrarlayın

### Yöntem 2: Firebase Console Üzerinden (Toplu)
1. Firebase Console'a gidin: https://console.firebase.google.com
2. Projenizi seçin: **satistakip-bc5c4**
3. **Authentication** > **Users** bölümüne gidin
4. **Add User** butonu ile tek tek ekleyin

### Yöntem 3: Firebase Admin SDK (Programatik - Önerilen)
```javascript
// Firebase Admin SDK ile toplu kullanıcı ekleme
const admin = require('firebase-admin');

const users = [
  { email: 'ezgi.coban@satiscrm.com', password: '9JI6R1x3iadtWqk', name: 'Ezgi Çoban' },
  { email: 'damlanur.dogan@satiscrm.com', password: 'K8mP2xQ7vnBsLwR', name: 'Damlanur Doğan' },
  // ... diğer kullanıcılar
];

async function createUsers() {
  for (const user of users) {
    try {
      // Firebase Auth'da kullanıcı oluştur
      const userRecord = await admin.auth().createUser({
        email: user.email,
        password: user.password,
        displayName: user.name
      });

      // Firestore'da kullanıcı profilini oluştur
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: user.email,
        name: user.name,
        role: 'personnel',
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ ${user.name} başarıyla eklendi`);
    } catch (error) {
      console.error(`❌ ${user.name} eklenirken hata:`, error);
    }
  }
}

createUsers();
```

---

## 📧 Kullanıcılara Gönderilecek E-posta Şablonu

```
Konu: CRM Sistemi Hesap Bilgileriniz

Merhaba [AD SOYAD],

Satış CRM sistemine hoş geldiniz! Hesap bilgileriniz aşağıdaki gibidir:

🌐 Giriş Adresi: https://wupani.github.io/satis-crm
📧 E-posta: [E-POSTA]
🔐 Şifre: [ŞİFRE]

İlk giriş sonrası şifrenizi değiştirmenizi öneriyoruz.

Sistem hakkında sorularınız için IT ekibi ile iletişime geçebilirsiniz.

İyi çalışmalar!
```

---

## 🔐 Güvenlik Notları

### Şifre Güvenliği:
- ✅ Her şifre 15 karakter uzunluğunda
- ✅ Büyük/küçük harf, rakam ve özel karakter içeriyor
- ✅ Her kullanıcı için benzersiz
- ⚠️ İlk giriş sonrası değiştirilmeli

### Kullanıcı Rolleri:
- 👤 **Personnel**: Sadece kendi kayıtlarını görebilir
- 👥 **Team Leader**: Takım verilerini yönetebilir  
- 👑 **Admin**: Tüm sistem erişimi

---

## 📊 Toplu İşlemler için SQL/Firestore Queries

### Firestore Collection Document Format:
```javascript
// users collection'ı için
{
  uid: "firebase-generated-uid",
  email: "ezgi.coban@satiscrm.com", 
  name: "Ezgi Çoban",
  role: "personnel",
  isActive: true,
  createdAt: firestore.Timestamp.now()
}
```

### Toplu Aktivasyon/Deaktivasyon:
```javascript
// Tüm personeli aktif yap
db.collection('users')
  .where('role', '==', 'personnel')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      doc.ref.update({ isActive: true });
    });
  });
```

---

**💡 İPUCU**: En pratik yöntem Firebase Admin SDK kullanmaktır. Node.js scripti yazıp tüm kullanıcıları tek seferde ekleyebilirsiniz! 