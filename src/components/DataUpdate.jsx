import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  RefreshCw, 
  Database, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Lock,
  X
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc
} from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../auth/firebaseConfig';

const DataUpdate = () => {
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [updateResults, setUpdateResults] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixingUIDs, setIsFixingUIDs] = useState(false);
  const [isFixingAsli, setIsFixingAsli] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Modal state'leri
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [developerPassword, setDeveloperPassword] = useState('');
  const [developerError, setDeveloperError] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'analyze', 'update', 'fixUIDs', 'fixAsli'
  


  // Geliştirici doğrulama fonksiyonu
  const verifyDeveloper = async () => {
    if (!developerPassword) {
      setDeveloperError('❌ Lütfen şifre girin!');
      return;
    }

    setIsVerifying(true);
    try {
      await signInWithEmailAndPassword(auth, 'wupaniyazilim@gmail.com', developerPassword);
      
      // Modal'ı kapat
      setShowDeveloperModal(false);
      setDeveloperPassword('');
      setDeveloperError('');
      setIsVerifying(false);
      
      // Bekleyen işlemi gerçekleştir
      if (pendingAction === 'analyze') {
        analyzeData();
      } else if (pendingAction === 'update') {
        updateExistingData();
      } else if (pendingAction === 'fixUIDs') {
        fixUserUIDs();
      } else if (pendingAction === 'fixAsli') {
        fixAsliRecords();
      }
      
      setPendingAction(null);
      
    } catch (error) {
      console.error('Geliştirici doğrulama hatası:', error);
      setDeveloperError('❌ Geçersiz geliştirici şifresi!');
      setIsVerifying(false);
    }
  };

  // Modal kapatma
  const closeDeveloperModal = () => {
    // Loading durumundayken modal kapatma
    if (isVerifying) return;
    
    setShowDeveloperModal(false);
    setDeveloperPassword('');
    setDeveloperError('');
    setPendingAction(null);
  };

  // Korumalı işlemler
  const handleProtectedAnalyze = () => {
    setPendingAction('analyze');
    setShowDeveloperModal(true);
  };

  const handleProtectedUpdate = () => {
    setPendingAction('update');
    setShowDeveloperModal(true);
  };

  const handleProtectedFixUIDs = () => {
    setPendingAction('fixUIDs');
    setShowDeveloperModal(true);
  };

  const handleProtectedFixAsli = () => {
    setPendingAction('fixAsli');
    setShowDeveloperModal(true);
  };

  // Kullanıcıların uid field'ını düzelt
  const fixUserUIDs = async () => {
    setIsFixingUIDs(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let fixedCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const docId = userDoc.id;
        
        // Eğer uid field'ı yoksa veya document ID ile farklıysa düzelt
        if (!userData.uid || userData.uid !== docId) {
          await updateDoc(doc(db, 'users', docId), {
            uid: docId,
            updatedAt: new Date(),
            uidFixed: true
          });
          
          fixedCount++;
        }
      }
      
      if (fixedCount > 0) {
        alert(`✅ Başarılı! ${fixedCount} kullanıcının UID'si düzeltildi.`);
      } else {
        alert('ℹ️ Düzeltilecek UID bulunamadı. Tüm kullanıcıların UID\'leri zaten doğru.');
      }
      
    } catch (error) {
      console.error('❌ UID duzeltme hatasi:', error);
      alert('❌ UID duzeltme hatasi: ' + error.message);
    } finally {
      setIsFixingUIDs(false);
    }
  };

  // Aslı Kılıç kayıtlarını manuel düzelt
  const fixAsliRecords = async () => {
    setIsFixingAsli(true);
    try {
      // Aslı Kılıç kullanıcısını bul
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let asliUser = null;
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.name && userData.name.toLowerCase().includes('aslı')) {
          asliUser = userData;
        }
      });
      
      if (!asliUser) {
        alert('❌ Aslı Kılıç kullanıcısı bulunamadı!');
        return;
      }
      
      // Aslı'nın kayıtlarını bul ve düzelt
      const recordsSnapshot = await getDocs(collection(db, 'sales_records'));
      let fixedCount = 0;
      
      for (const recordDoc of recordsSnapshot.docs) {
        const recordData = recordDoc.data();
        
        // Aslı ile ilgili kayıtları bul
        if (recordData.personel && recordData.personel.toLowerCase().includes('aslı')) {
          await updateDoc(doc(db, 'sales_records', recordDoc.id), {
            createdBy: asliUser.uid,
            createdByName: asliUser.name,
            updatedAt: new Date(),
            manuallyFixed: true
          });
          
          fixedCount++;
        }
      }
      
      if (fixedCount > 0) {
        alert(`✅ Başarılı! ${fixedCount} adet Aslı Kılıç kaydı düzeltildi ve doğru kullanıcıya atandı.`);
      } else {
        alert('ℹ️ Düzeltilecek Aslı Kılıç kaydı bulunamadı. Tüm kayıtlar zaten doğru kullanıcıya atanmış.');
      }
      
    } catch (error) {
      console.error('❌ Asli kayitlari duzeltme hatasi:', error);
      alert('❌ Aslı kayıtları düzeltme hatası: ' + error.message);
    } finally {
      setIsFixingAsli(false);
    }
  };

  // Mevcut veriyi analiz et
  const analyzeData = async () => {
    setIsAnalyzing(true);
    
    try {
      // Tüm kullanıcıları çek
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap = {};
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        
        if (userData.name) {
          userMap[userData.name] = userData;
        }
      });
      
      if (Object.keys(userMap).length === 0) {
        console.error('❌ HİÇBİR KULLANICI YÜKLENEMEDİ!');
        alert('❌ Kullanıcılar yüklenemedi! Lütfen sayfayı yenileyin.');
        return;
      }
      
      // Tüm satış kayıtlarını çek
      const recordsSnapshot = await getDocs(collection(db, 'sales_records'));
      const records = [];
      
      recordsSnapshot.forEach(doc => {
        records.push({ id: doc.id, ...doc.data() });
      });
      
      // Analiz yap - TÜM kayıtları kontrol et
      let adminRecords = 0;
      let correctRecords = 0;
      let unmatchedPersonnel = new Set();
      let fixableRecords = 0;
      let wrongUidRecords = 0;
      
      records.forEach(record => {
        if (record.personel && userMap[record.personel]) {
          const correctUser = userMap[record.personel];
          
          // UID yanlış mı?
          if (record.createdBy !== correctUser.uid) {
            wrongUidRecords++;
            fixableRecords++;
            
            // Admin User olarak kayıtlı mı?
            if (record.createdByName === 'Admin User' || record.createdBy === currentUser.uid) {
              adminRecords++;
            }
          } else {
            correctRecords++;
          }
        } else if (record.personel) {
          // Personel sistemde yok
          unmatchedPersonnel.add(record.personel);
          
          if (record.createdByName === 'Admin User' || record.createdBy === currentUser.uid) {
            adminRecords++;
          }
        }
      });
      
      const analysis = {
        totalRecords: records.length,
        adminRecords,
        correctRecords,
        fixableRecords,
        wrongUidRecords,
        unmatchedPersonnel: Array.from(unmatchedPersonnel),
        systemUsers: Object.keys(userMap).length
      };
      
      setAnalysisResults(analysis);
      
    } catch (error) {
      console.error('Analiz hatası:', error);
      alert('❌ Analiz sırasında hata: ' + error.message);
    }
    
    setIsAnalyzing(false);
  };

  const updateExistingData = async () => {
    setIsProcessing(true);

    try {
      // Tüm kullanıcıları çek
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap = {};
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.name) {
          userMap[userData.name] = userData;
        }
      });
      
      if (Object.keys(userMap).length === 0) {
        console.error('❌ HİÇBİR KULLANICI YÜKLENEMEDİ!');
        alert('❌ Kullanıcılar yüklenemedi! Lütfen sayfayı yenileyin.');
        return;
      }

      // TÜM kayıtları çek
      const allRecordsSnapshot = await getDocs(collection(db, 'sales_records'));
      const recordsToUpdate = [];
      
      allRecordsSnapshot.forEach(doc => {
        const recordData = doc.data();
        
        // Eğer personel userMap'te varsa ama UID farklıysa güncelle
        if (recordData.personel && userMap[recordData.personel]) {
          const correctUser = userMap[recordData.personel];
          
          // UID farklıysa veya createdByName yanlışsa güncelle
          if (recordData.createdBy !== correctUser.uid || 
              recordData.createdByName !== correctUser.name) {
            recordsToUpdate.push({ id: doc.id, ...recordData });
          }
        }
      });

      if (recordsToUpdate.length === 0) {
        alert('ℹ️ Güncellenecek kayıt bulunamadı!');
        return;
      }

      // Firebase quota koruması için batch size
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(recordsToUpdate.length / BATCH_SIZE);

      let updatedCount = 0;
      let skippedCount = 0;
      const errors = [];

      // Batch processing
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, recordsToUpdate.length);
        const currentBatch = recordsToUpdate.slice(startIndex, endIndex);

        for (const record of currentBatch) {
          try {
            let correctUser = userMap[record.personel];
            
            // Esnek kullanıcı eşleştirme
            if (!correctUser) {
              const personelName = record.personel || '';
              
              // Sevde Hocaoğlu için alternatif eşleştirmeler
              if (personelName.includes('Sevde')) {
                correctUser = Object.values(userMap).find(user => 
                  user.name && (
                    user.name.toLowerCase().includes('sevde') ||
                    user.name.toLowerCase().includes('hocaoğlu') ||
                    user.name.toLowerCase().includes('hocaoglu')
                  )
                );
              }
              
              // Aslı Kılıç için alternatif eşleştirmeler
              if (!correctUser && (personelName.includes('Aslı') || personelName.includes('Kılıç'))) {
                correctUser = Object.values(userMap).find(user => 
                  user.name && (
                    user.name.toLowerCase().includes('aslı') ||
                    user.name.toLowerCase().includes('asli') ||
                    user.name.toLowerCase().includes('kılıç') ||
                    user.name.toLowerCase().includes('kilic')
                  )
                );
              }
            }
            
            if (correctUser && correctUser.uid) {
              // Güvenlik kontrolleri
              if (!correctUser.uid || !correctUser.name) {
                console.error(`❌ Geçersiz kullanıcı verisi: ${record.personel}`, correctUser);
                skippedCount++;
                continue;
              }
              
              const updateData = {
                createdBy: correctUser.uid,
                createdByName: correctUser.name,
                updatedAt: new Date(),
                updatedByAdmin: currentUser.uid,
                wasImportFixed: true
              };

              // Undefined değerleri kontrol et
              if (updateData.createdBy === undefined || updateData.createdByName === undefined) {
                console.error(`❌ Undefined değer tespit edildi:`, updateData);
                errors.push(`${record.refId}: Undefined createdBy veya createdByName`);
                continue;
              }
              
              try {
                await updateDoc(doc(db, 'sales_records', record.id), updateData);
                updatedCount++;
              } catch (updateError) {
                console.error(`❌ UpdateDoc hatası:`, updateError);
                errors.push(`${record.refId}: UpdateDoc hatası - ${updateError.message}`);
                skippedCount++;
              }
              
              // Rate limiting için bekleme
              await new Promise(resolve => setTimeout(resolve, 100));
              
            } else {
              skippedCount++;
              
              // Manuel arama dene - hem Sevde hem Aslı için
              let manualMatch = null;
              
              // Sevde için manuel arama
              if (record.personel.toLowerCase().includes('sevde') || record.personel.toLowerCase().includes('hocaoğlu')) {
                manualMatch = Object.values(userMap).find(user => {
                  if (!user.name) return false;
                  const userName = user.name.toLowerCase().trim();
                  return userName.includes('sevde') || userName.includes('hocaoğlu');
                });
              }
              
              // Aslı için manuel arama
              if (!manualMatch && (record.personel.toLowerCase().includes('asl') || record.personel.toLowerCase().includes('kıl'))) {
                manualMatch = Object.values(userMap).find(user => {
                  if (!user.name) return false;
                  const userName = user.name.toLowerCase().trim();
                  return userName.includes('aslı') || userName.includes('asli') || 
                         userName.includes('kılıç') || userName.includes('kilic');
                });
              }
              
              if (manualMatch) {
                try {
                  const updateData = {
                    createdBy: manualMatch.uid,
                    createdByName: manualMatch.name,
                    updatedAt: new Date(),
                    updatedByAdmin: currentUser.uid,
                    wasImportFixed: true,
                    manualMatchUsed: true
                  };

                  await updateDoc(doc(db, 'sales_records', record.id), updateData);
                  updatedCount++;
                  
                  // Rate limiting için bekleme
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                } catch (manualUpdateError) {
                  console.error(`❌ Manuel güncelleme hatası:`, manualUpdateError);
                  errors.push(`${record.refId}: Manuel güncelleme hatası - ${manualUpdateError.message}`);
                }
              }
            }

          } catch (recordError) {
            console.error(`❌ ${record.refId} güncellenirken hata:`, recordError);
            errors.push(`${record.refId}: ${recordError.message}`);
            
            // Rate limit hatası durumunda dur
            if (recordError.code === 'resource-exhausted') {
              break;
            }
          }
        }
        
        // Batch'ler arası bekleme
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const updateResults = {
        total: recordsToUpdate.length,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.length,
        errorDetails: errors.slice(0, 10)
      };

      setUpdateResults(updateResults);

      // Success message
      alert(
        `✅ Veri güncelleme tamamlandı!\n\n` +
        `📊 Toplam: ${updateResults.total}\n` +
        `✅ Güncellendi: ${updateResults.updated}\n` +
        `⚠️ Atlandı: ${updateResults.skipped}\n` +
        `❌ Hata: ${updateResults.errors}\n\n` +
        `🎉 Artık dashboard'da doğru personeller görünecek!`
      );

    } catch (error) {
      console.error('❌ Güncelleme hatası:', error);
      alert('❌ Güncelleme sırasında hata: ' + error.message);
    } finally {
      // Her durumda loading state'ini kapat
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <RefreshCw className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veri Güncelleme</h1>
          <p className="text-gray-600">Mevcut kayıtları doğru personellerle eşleştir</p>
        </div>
      </div>

      {/* Analysis Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="w-5 h-5 text-blue-600 mr-2" />
          1. Mevcut Veri Analizi
        </h2>
        
        {!analysisResults ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600 mb-4">
              Önce mevcut verileri analiz edelim ve hangi kayıtların güncellenmesi gerektiğini görelim.
            </p>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleProtectedAnalyze}
                disabled={isAnalyzing}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2 mx-auto"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Analiz Ediliyor...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <Database className="w-4 h-4" />
                    <span>Veriyi Analiz Et (Geliştirici)</span>
                  </>
                )}
              </button>
              
              <div className="border-t pt-3 space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Eğer kullanıcı UID problemi varsa:</p>
                  <button
                    onClick={handleProtectedFixUIDs}
                    disabled={isFixingUIDs}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 mx-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFixingUIDs ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                    <span>
                      {isFixingUIDs ? 'Kullanıcı UID\'leri Düzeltiliyor...' : 'Kullanıcı UID\'lerini Düzelt (Geliştirici)'}
                    </span>
                  </button>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Aslı Kılıç kayıtları düzeltilmiyorsa:</p>
                  <button
                    onClick={handleProtectedFixAsli}
                    disabled={isFixingAsli}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 mx-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFixingAsli ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                    <span>
                      {isFixingAsli ? 'Aslı Kılıç Kayıtları Düzeltiliyor...' : 'Aslı Kılıç Kayıtlarını Manuel Düzelt (Geliştirici)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analysisResults.totalRecords}</div>
                <div className="text-sm text-blue-700">Toplam Kayıt</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{analysisResults.adminRecords}</div>
                <div className="text-sm text-red-700">Admin Olarak Kayıtlı</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{analysisResults.fixableRecords}</div>
                <div className="text-sm text-green-700">Düzeltilebilir</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{analysisResults.unmatchedPersonnel.length}</div>
                <div className="text-sm text-yellow-700">Eşleşmeyen Personel</div>
              </div>
            </div>

            {analysisResults.unmatchedPersonnel.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Eşleşmeyen Personeller:
                </h4>
                <div className="text-sm text-yellow-700">
                  {analysisResults.unmatchedPersonnel.slice(0, 10).join(', ')}
                  {analysisResults.unmatchedPersonnel.length > 10 && ` ve ${analysisResults.unmatchedPersonnel.length - 10} tane daha...`}
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  Bu personeller için önce kullanıcı hesabı oluşturulmalı.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Update Section */}
      {analysisResults && analysisResults.fixableRecords > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <RefreshCw className="w-5 h-5 text-orange-600 mr-2" />
            2. Veri Güncelleme
          </h2>
          
          {!isProcessing && !updateResults ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-green-800">Güncelleme Hazır!</h4>
                    <ul className="text-sm text-green-700 mt-1 list-disc list-inside">
                      <li>{analysisResults.fixableRecords} kayıt doğru personellerle eşleştirilecek</li>
                      <li>createdBy ve createdByName alanları güncellenecek</li>
                      <li>Dashboard istatistikleri düzelecek</li>
                      <li>Zirveye Adını Yazdıranlar doğru gösterilecek</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleProtectedUpdate}
                className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Shield className="w-5 h-5" />
                <RefreshCw className="w-5 h-5" />
                <span>Verileri Güncelle ({analysisResults.fixableRecords} kayıt) - Geliştirici</span>
              </button>
            </div>
          ) : isProcessing ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Veriler güncelleniyor...</p>
              <p className="text-gray-500 text-sm mt-2">Lütfen bekleyin, bu işlem birkaç dakika sürebilir</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Results Section */}
      {updateResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            Güncelleme Sonuçları
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{updateResults.total}</div>
              <div className="text-sm text-blue-700">Toplam İşlenen</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{updateResults.updated}</div>
              <div className="text-sm text-green-700">Güncellendi</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{updateResults.skipped}</div>
              <div className="text-sm text-yellow-700">Atlandı</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{updateResults.errors}</div>
              <div className="text-sm text-red-700">Hata</div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <h4 className="font-medium text-green-800">🎉 Güncelleme Tamamlandı!</h4>
                <p className="text-sm text-green-700 mt-1">
                  Artık Dashboard'da "Zirveye Adını Yazdıranlar" bölümünde doğru personeller görünecek.
                  Sayfayı yenileyerek kontrol edebilirsiniz.
                </p>
              </div>
            </div>
          </div>
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
                <X className="w-5 h-5" />
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
                    disabled={isVerifying}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    İptal
                  </button>
                  <button
                    onClick={verifyDeveloper}
                    disabled={!developerPassword || isVerifying}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Doğrulanıyor...</span>
                      </>
                    ) : (
                      <span>Doğrula</span>
                    )}
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

export default DataUpdate; 