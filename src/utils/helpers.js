// Benzersiz referans ID oluşturur
export const generateRefId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `REF-${timestamp}-${random.toUpperCase()}`;
};

// Tarih formatı (DD/MM/YYYY)
export const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn('Tarih formatlanırken hata:', date, error);
    return '';
  }
};

// Tarih formatı (YYYY-MM-DD) - input field için
export const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Telefon numarası formatla
export const formatPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  try {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return cleaned.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    }
    return phone;
  } catch (error) {
    console.warn('Telefon formatlanırken hata:', phone, error);
    return phone || '';
  }
};

// Rol çevirisi
export const translateRole = (role) => {
  const roles = {
    'Admin': 'Yönetici',
    'Team Leader': 'Takım Lideri', 
    'Personnel': 'Personel'
  };
  return roles[role] || 'Belirsiz';
};

// Dropdown değerleri
export const defaultDropdownValues = {
  personelList: ['Ahmet Yılmaz', 'Mehmet Demir', 'Ayşe Kaya', 'Fatma Öz'],
  kanalList: ['Telefon', 'WhatsApp', 'E-posta', 'Yüz Yüze'],
  durumList: ['Arandı', 'Meşgul', 'Ulaşılamadı', 'Geri Arama', 'Reddetti'],
  detayList: ['İlgilendi', 'Düşünecek', 'Fiyat Sordu', 'Bilgi İstedi', 'İlgilenmedi', 'Satış Sağlandı'],
  abonelikDurumList: ['Yeni Abone', 'Mevcut Abone', 'İptal', 'Askıya Alındı', 'Beklemede']
}; 