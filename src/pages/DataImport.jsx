import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../auth/firebaseConfig';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../auth/firebaseConfig';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  Database,
  Users,
  Calendar,
  Phone,
  Square,
  BarChart3,
  Shield,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';

const DataImport = () => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    isPaused: false
  });
  const [importResults, setImportResults] = useState(null);
  
  // Geliştirici doğrulama state'leri
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [developerPassword, setDeveloperPassword] = useState('');
  const [isDeveloperVerified, setIsDeveloperVerified] = useState(false);
  const [developerError, setDeveloperError] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'file' veya 'analyze'

  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Excel dosyasını okuma
  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      alert('❌ Lütfen sadece Excel dosyası (.xlsx veya .xls) seçin');
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // İlk sheet'i al (Düzenlenmiş_Veri)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // JSON'a çevir
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Ham veriyi sakla ve önizleme için formatla
        setExcelData(jsonData); // Ham veriyi sakla
        
        // Sadece önizleme için formatla
        const previewFormatted = jsonData.slice(0, 10).map(row => ({
          ...row,
          telefon: formatPhoneNumber(row.telefon)
        }));
        
        setPreviewData(previewFormatted);
        setShowPreview(true);
        
        
      } catch (error) {
        console.error('Excel okuma hatası:', error);
        alert('❌ Excel dosyası okunurken hata oluştu: ' + error.message);
      }
    };
    
    reader.readAsArrayBuffer(selectedFile);
  };

  // Telefon numarasını formatla
  const formatPhoneNumber = (phone) => {
    if (!phone) return phone;
    
    // Sadece rakamları al
    const digits = phone.toString().replace(/\D/g, '');
    
    // 10 haneli ve 5 ile başlayan (normal mobil)
    if (digits.length === 10 && digits.startsWith('5')) {
      const formatted = '0' + digits;
      return `${formatted.substring(0, 4)} ${formatted.substring(4, 7)} ${formatted.substring(7, 9)} ${formatted.substring(9, 11)}`;
    }
    
    // 10 haneli ve 9 ile başlayan (eski format veya özel)
    if (digits.length === 10 && digits.startsWith('9')) {
      const formatted = '0' + digits;
      return `${formatted.substring(0, 4)} ${formatted.substring(4, 7)} ${formatted.substring(7, 9)} ${formatted.substring(9, 11)}`;
    }
    
    // 11 haneli ve 05 ile başlayan
    if (digits.length === 11 && digits.startsWith('05')) {
      return `${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7, 9)} ${digits.substring(9, 11)}`;
    }
    
    // 11 haneli ve 09 ile başlayan
    if (digits.length === 11 && digits.startsWith('09')) {
      return `${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7, 9)} ${digits.substring(9, 11)}`;
    }
    
    // Diğer formatlar için olduğu gibi bırak
    return phone;
  };

  // Veri validasyonu (basitleştirilmiş)
  const validateData = (data) => {
    const errors = [];
    
    data.forEach((row, index) => {
      // Sadece zorunlu alanları kontrol et
      if (!row.personel) errors.push(`Satır ${index + 1}: Personel adı eksik`);
      if (!row.telefon) errors.push(`Satır ${index + 1}: Telefon numarası eksik`);
      if (!row.tarih) errors.push(`Satır ${index + 1}: Tarih eksik`);
      
      // Telefon numarasının en az bir rakam içerdiğini kontrol et
      if (row.telefon) {
        const digits = row.telefon.toString().replace(/\D/g, '');
        if (digits.length < 7) { // Çok kısa telefon numaraları için
          errors.push(`Satır ${index + 1}: Telefon numarası çok kısa (${row.telefon})`);
        }
      }
    });
    
    return errors;
  };

  // Firebase'e veri aktarma
  const handleImportData = async () => {
    if (!excelData.length) {
      alert('❌ Önce Excel dosyası yükleyin');
      return;
    }

    // Veri validasyonu
    const validationErrors = validateData(excelData);
    if (validationErrors.length > 0) {
      alert('❌ Veri hatası:\n' + validationErrors.slice(0, 5).join('\n'));
      return;
    }

    const confirmImport = window.confirm(
      `📊 ${excelData.length} satır veri Firebase'e aktarılacak.\n\n` +
      `⚠️ Bu işlem uzun sürebilir ve geri alınamaz.\n\n` +
      `Devam etmek istiyor musunuz?`
    );

    if (!confirmImport) return;

    setImportProgress({
      current: 0,
      total: excelData.length,
      isPaused: false
    });

    let successCount = 0;
    let skippedCount = 0;
    const errors = [];

    try {
      // Tüm kullanıcıları bir kere çek (performans için)
      const personnelUsers = await getDocs(collection(db, 'users'));
      const userMap = {};
      
      personnelUsers.forEach(doc => {
        const userData = doc.data();
        userMap[userData.name] = userData;
      });
      

      for (let i = 0; i < excelData.length; i++) {
        // Duraklama kontrolü
        while (importProgress.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const row = excelData[i];
        
        setImportProgress(prev => ({
          ...prev,
          current: i + 1
        }));

        try {
          // Telefon numarasını formatla (ham veriden)
          const phoneFormatted = formatPhoneNumber(row.telefon);

          // Aynı telefon ve tarih ile kayıt var mı kontrol et
          const existingQuery = query(
            collection(db, 'sales_records'),
            where('telefon', '==', phoneFormatted),
            where('tarih', '==', row.tarih)
          );
          
          const existingDocs = await getDocs(existingQuery);
          
          if (!existingDocs.empty) {
            skippedCount++;
            continue; // Aynı kayıt varsa atla
          }

          // Referans ID oluştur
          const refId = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

          // Cache'lenmiş kullanıcılardan bul
          const foundUser = userMap[row.personel] || null;
          
          // Kullanıcı bulunamadıysa uyar (sadece ilk 5 kez)
          if (!foundUser && errors.length < 5) {
            console.warn(`⚠️ Kullanıcı bulunamadı: ${row.personel}`);
          }

          // Firebase'e kaydet
          await addDoc(collection(db, 'sales_records'), {
            refId: refId,
            personel: row.personel || '',
            telefon: phoneFormatted || '',
            kanal: row.kanal || '',
            durum: row.durum || '',
            detay: row.detay || '',
            abonelikDurum: row.abonelikDurum || '',
            aboneNumarasi: row.aboneNumarasi || '',
            not: row.not || '',
            tarih: row.tarih,
            createdBy: foundUser ? foundUser.uid : currentUser.uid,
            createdByName: foundUser ? foundUser.name : row.personel,
            createdAt: new Date(),
            importedAt: new Date(),
            isImported: true,
            importedByAdmin: currentUser.uid // Kim import etti bilgisi
          });

          successCount++;

        } catch (error) {
          console.error(`Satır ${i + 1} hatası:`, error);
          errors.push(`Satır ${i + 1}: ${error.message}`);
        }

        // Her 100 kayıtta bir kısa bekleme
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Sonuçları kaydet
      const results = {
        total: excelData.length,
        success: successCount,
        skipped: skippedCount,
        errors: errors.length,
        errorDetails: errors.slice(0, 10) // İlk 10 hatayı göster
      };

      setImportResults(results);
      setImportProgress(prev => ({
        ...prev,
        isPaused: false
      }));

      // Başarı mesajı
      const foundUsersCount = Object.keys(userMap).length;
      const unmatchedPersonnel = new Set();
      
      excelData.forEach(row => {
        if (!userMap[row.personel]) {
          unmatchedPersonnel.add(row.personel);
        }
      });

      alert(
        `✅ İçe aktarma tamamlandı!\n\n` +
        `📊 Toplam: ${results.total}\n` +
        `✅ Başarılı: ${results.success}\n` +
        `⚠️ Atlandı: ${results.skipped}\n` +
        `❌ Hata: ${results.errors}\n\n` +
        `👥 Sistemdeki kullanıcılar: ${foundUsersCount}\n` +
        `🔍 Eşleşmeyen personel: ${unmatchedPersonnel.size > 0 ? Array.from(unmatchedPersonnel).slice(0, 3).join(', ') + (unmatchedPersonnel.size > 3 ? '...' : '') : 'Yok'}`
      );

    } catch (error) {
      console.error('İçe aktarma genel hatası:', error);
      setImportProgress(prev => ({
        ...prev,
        isPaused: false
      }));
      alert('❌ İçe aktarma sırasında hata: ' + error.message);
    }
  };

  // İşlemi duraklat/devam ettir
  const togglePause = () => {
    setImportProgress(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  // İşlemi sıfırla
  const resetImport = () => {
    setFile(null);
    setExcelData([]);
    setPreviewData([]);
    setShowPreview(false);
    setImportProgress({
      current: 0,
      total: 0,
      isPaused: false
    });
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Geliştirici doğrulama fonksiyonu
  const verifyDeveloper = async () => {
    try {
      setDeveloperError('');
      
      // wupaniyazilim@gmail.com ile şifre doğrulama
      await signInWithEmailAndPassword(auth, 'wupaniyazilim@gmail.com', developerPassword);
      
      setIsDeveloperVerified(true);
      setShowDeveloperModal(false);
      setDeveloperPassword('');
      
      // Bekleyen işlemi gerçekleştir
      if (pendingAction === 'file') {
        fileInputRef.current?.click();
      } else if (pendingAction === 'analyze') {
        handleImportData();
      }
      
      setPendingAction(null);
      
    } catch (error) {
      console.error('Geliştirici doğrulama hatası:', error);
      setDeveloperError('❌ Geçersiz geliştirici şifresi!');
    }
  };

  // Korumalı dosya seçme
  const handleProtectedFileSelect = () => {
    if (isDeveloperVerified) {
      fileInputRef.current?.click();
    } else {
      setPendingAction('file');
      setShowDeveloperModal(true);
    }
  };

  // Korumalı analiz başlatma
  const handleProtectedAnalyze = () => {
    if (isDeveloperVerified) {
      handleImportData();
    } else {
      setPendingAction('analyze');
      setShowDeveloperModal(true);
    }
  };



  // Modal kapatma
  const closeDeveloperModal = () => {
    setShowDeveloperModal(false);
    setDeveloperPassword('');
    setDeveloperError('');
    setPendingAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Database className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veri İçe Aktarma</h1>
          <p className="text-gray-600">Excel dosyasından Firebase'e veri aktarın</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Upload className="w-5 h-5 text-blue-600 mr-2" />
          1. Excel Dosyası Yükle
        </h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          
          {!file ? (
            <>
              <p className="text-gray-600 mb-4">
                Düzenlenmiş Excel dosyanızı buraya sürükleyin veya seçin
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={handleProtectedFileSelect}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Dosya Seç
              </button>
            </>
          ) : (
            <div className="text-green-600">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">{excelData.length} satır veri</p>
              <button
                onClick={resetImport}
                className="mt-2 text-red-600 hover:text-red-700 text-sm"
              >
                Dosyayı Değiştir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileSpreadsheet className="w-5 h-5 text-green-600 mr-2" />
            2. Veri Önizleme ({excelData.length} satır)
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Personel</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Tarih</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Telefon</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Kanal</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900">{row.personel}</td>
                    <td className="px-3 py-2 text-gray-600">{row.tarih}</td>
                    <td className="px-3 py-2 text-gray-600">{row.telefon}</td>
                    <td className="px-3 py-2 text-gray-600">{row.kanal}</td>
                    <td className="px-3 py-2 text-gray-600">{row.durum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            İlk 10 satır gösteriliyor. Toplam {excelData.length} satır aktarılacak.
          </p>
        </div>
      )}

      {/* Import Section */}
      {showPreview && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Database className="w-5 h-5 text-purple-600 mr-2" />
            3. Firebase'e Aktar
          </h2>
          
          {!importProgress.isPaused ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Dikkat!</h4>
                    <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                      <li>Bu işlem uzun sürebilir ({excelData.length} satır)</li>
                      <li>Mevcut kayıtlar atlanacak (telefon + tarih eşleşmesi)</li>
                      <li>İşlem geri alınamaz</li>
                      <li>Tarayıcıyı kapatmayın</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleProtectedAnalyze}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Database className="w-5 h-5" />
                <span>Firebase'e Aktar ({excelData.length} satır)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    {importProgress.isPaused ? '⏸️ Duraklatıldı' : '🔄 İşleniyor...'}
                  </span>
                  <span>
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(importProgress.current / importProgress.total) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Control Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={togglePause}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {importProgress.isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                  <span>{importProgress.isPaused ? 'Devam Et' : 'Duraklat'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {importResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            İçe Aktarma Sonuçları
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
              <div className="text-sm text-blue-700">Toplam Satır</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
              <div className="text-sm text-green-700">Başarılı</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{importResults.skipped}</div>
              <div className="text-sm text-yellow-700">Atlandı</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
              <div className="text-sm text-red-700">Hata</div>
            </div>
          </div>
          
          {importResults.errorDetails.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Hata Detayları:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {importResults.errorDetails.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <button
            onClick={resetImport}
            className="mt-4 flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Yeni İçe Aktarma</span>
          </button>
        </div>
      )}

      {/* Geliştirici Doğrulama Modalı */}
      {showDeveloperModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Geliştirici Doğrulaması</h3>
              </div>
              <button
                onClick={closeDeveloperModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Lock className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-gray-700">
                    Bu işlem sadece geliştiriciler tarafından yapılabilir.
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  wupaniyazilim@gmail.com hesabının şifresini girin.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Geliştirici Şifresi
                  </label>
                  <input
                    type="password"
                    value={developerPassword}
                    onChange={(e) => setDeveloperPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Geliştirici şifresini girin"
                    onKeyPress={(e) => e.key === 'Enter' && verifyDeveloper()}
                  />
                </div>

                {developerError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{developerError}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={closeDeveloperModal}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={verifyDeveloper}
                    disabled={!developerPassword}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Doğrula
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataImport; 