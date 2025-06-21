import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../auth/firebaseConfig';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../auth/firebaseConfig';
import { RefreshCw, Database, CheckCircle, AlertCircle, Shield, Lock } from 'lucide-react';

const DataUpdate = () => {
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  


  // Geliştirici doğrulama fonksiyonu
  const verifyDeveloper = async () => {
    const password = prompt('🔒 Bu işlem sadece geliştiriciler yapabilir.\nwupaniyazilim@gmail.com şifresini girin:');
    
    if (!password) {
      return false;
    }

    try {
      await signInWithEmailAndPassword(auth, 'wupaniyazilim@gmail.com', password);
      console.log('✅ Geliştirici doğrulandı');
      return true;
    } catch (error) {
      alert('❌ Geçersiz geliştirici şifresi!');
      console.error('Geliştirici doğrulama hatası:', error);
      return false;
    }
  };

  // Korumalı analiz fonksiyonu
  const handleProtectedAnalyze = async () => {
    const isVerified = await verifyDeveloper();
    if (isVerified) {
      analyzeData();
    }
  };

  // Korumalı güncelleme fonksiyonu
  const handleProtectedUpdate = async () => {
    const isVerified = await verifyDeveloper();
    if (isVerified) {
      updateExistingData();
    }
  };

  // Kullanıcıların uid field'ını düzelt
  const fixUserUIDs = async () => {
    const isVerified = await verifyDeveloper();
    if (!isVerified) return;

    try {
      console.log('🔧 Kullanici UID leri duzeltiliyor...');
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let fixedCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const docId = userDoc.id;
        
        // Eğer uid field'ı yoksa veya document ID ile farklıysa düzelt
        if (!userData.uid || userData.uid !== docId) {
          console.log(`🔧 Duzeltiliyor: ${userData.name} (${userData.email})`);
          console.log(`   Eski UID: ${userData.uid || 'undefined'}`);
          console.log(`   Yeni UID: ${docId}`);
          
          await updateDoc(doc(db, 'users', docId), {
            uid: docId,
            updatedAt: new Date(),
            uidFixed: true
          });
          
          fixedCount++;
        }
      }
      
      console.log(`✅ ${fixedCount} kullanicinin UID i duzeltildi`);
      alert(`✅ ${fixedCount} kullanicinin UID i duzeltildi!`);
      
    } catch (error) {
      console.error('❌ UID duzeltme hatasi:', error);
      alert('❌ UID duzeltme hatasi: ' + error.message);
    }
  };

  // Aslı Kılıç kayıtlarını manuel düzelt
  const fixAsliRecords = async () => {
    const isVerified = await verifyDeveloper();
    if (!isVerified) return;

    try {
      console.log('🔧 Asli Kilic kayitlari duzeltiliyor...');
      
      // Aslı Kılıç kullanıcısını bul
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let asliUser = null;
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.name && userData.name.toLowerCase().includes('aslı')) {
          asliUser = userData;
          console.log(`👤 Asli kullanicisi bulundu: ${userData.name} (${userData.uid})`);
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
          console.log(`🔧 Duzeltiliyor: ${recordData.personel} - ${recordData.refId}`);
          
          await updateDoc(doc(db, 'sales_records', recordDoc.id), {
            createdBy: asliUser.uid,
            createdByName: asliUser.name,
            updatedAt: new Date(),
            manuallyFixed: true
          });
          
          fixedCount++;
        }
      }
      
      console.log(`✅ ${fixedCount} Asli kaydi duzeltildi`);
      alert(`✅ ${fixedCount} Aslı Kılıç kaydı düzeltildi!`);
      
    } catch (error) {
      console.error('❌ Asli kayitlari duzeltme hatasi:', error);
      alert('❌ Aslı kayıtları düzeltme hatası: ' + error.message);
    }
  };

  // Mevcut veriyi analiz et
  const analyzeData = async () => {
    setIsAnalyzing(true);
    
    try {
      console.log('📊 Mevcut veriler analiz ediliyor...');
      
      // Tüm kullanıcıları çek
      console.log('🔄 Kullanıcılar yükleniyor...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap = {};
      
      console.log(`📊 Toplam ${usersSnapshot.docs.length} kullanıcı dokümanı bulundu`);
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log(`👤 Güncelleme - Kullanıcı: "${userData.name}" -> UID: ${userData.uid}`);
        
        if (userData.name) {
          userMap[userData.name] = userData;
          
          // Sevde Hocaoğlu için özel kontrol
          if (userData.name && userData.name.includes('Sevde')) {
            console.log(`🔍 SEVDE BULUNDU! Tam isim: "${userData.name}"`);
            console.log(`📧 E-posta: ${userData.email}`);
            console.log(`🆔 UID: ${userData.uid}`);
          }
        } else {
          console.warn(`⚠️ İsimsiz kullanıcı bulundu:`, userData);
        }
      });

      console.log('👥 Kullanıcı haritası:', Object.keys(userMap));
      console.log('🔍 Sevde kontrolü:', userMap['Sevde Hocaoğlu'] ? 'BULUNDU' : 'BULUNAMADI');
      
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
            
            console.log(`🔧 Yanlış UID: ${record.personel} (${record.createdBy} -> ${correctUser.uid})`);
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
      console.log('✅ Analiz tamamlandı:', analysis);
      
    } catch (error) {
      console.error('Analiz hatası:', error);
      alert('❌ Analiz sırasında hata: ' + error.message);
    }
    
    setIsAnalyzing(false);
  };

  const updateExistingData = async () => {
    const confirmUpdate = window.confirm(
      `🔄 ${analysisResults.fixableRecords} kayıt güncellenecek.\n\n` +
      'Admin User olarak kayıtlı tüm kayıtlar doğru personellerle eşleştirilecek.\n\n' +
      'Bu işlem geri alınamaz. Devam etmek istiyor musunuz?'
    );

    if (!confirmUpdate) return;

    setIsProcessing(true);
    console.log('🔄 Veri güncelleme işlemi başladı');

    try {
      console.log('🔄 Mevcut veriler güncelleniyor...');

      // Tüm kullanıcıları çek
      console.log('🔄 Kullanıcılar yükleniyor...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap = {};
      
      console.log(`📊 Toplam ${usersSnapshot.docs.length} kullanıcı dokümanı bulundu`);
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log(`👤 Güncelleme - Kullanıcı: "${userData.name}" -> UID: ${userData.uid}`);
        
        if (userData.name) {
          userMap[userData.name] = userData;
          
          // Sevde Hocaoğlu için özel kontrol
          if (userData.name && userData.name.includes('Sevde')) {
            console.log(`🔍 SEVDE BULUNDU! Tam isim: "${userData.name}"`);
            console.log(`📧 E-posta: ${userData.email}`);
            console.log(`🆔 UID: ${userData.uid}`);
          }
        } else {
          console.warn(`⚠️ İsimsiz kullanıcı bulundu:`, userData);
        }
      });

      console.log('👥 Kullanıcı haritası:', Object.keys(userMap));
      console.log('🔍 Sevde kontrolü:', userMap['Sevde Hocaoğlu'] ? 'BULUNDU' : 'BULUNAMADI');
      console.log('🔍 Aslı kontrolü:', userMap['Aslı Kılıç'] ? 'BULUNDU' : 'BULUNAMADI');
      
      // Tüm kullanıcıları detaylı listele
      console.log('📋 DETAYLI KULLANICI LİSTESİ:');
      Object.entries(userMap).forEach(([name, user]) => {
        console.log(`  👤 "${name}" (${user.email}) -> ${user.uid}`);
      });
      
      if (Object.keys(userMap).length === 0) {
        console.error('❌ HİÇBİR KULLANICI YÜKLENEMEDİ!');
        alert('❌ Kullanıcılar yüklenemedi! Lütfen sayfayı yenileyin.');
        return;
      }

      // TÜM kayıtları çek (sadece admin değil)
      console.log('🔍 Tüm satış kayıtları kontrol ediliyor...');
      const allRecordsSnapshot = await getDocs(collection(db, 'sales_records'));
      const recordsToUpdate = [];
      const personnelStats = {};
      
      allRecordsSnapshot.forEach(doc => {
        const recordData = doc.data();
        
        // Personel istatistikleri
        if (recordData.personel) {
          if (!personnelStats[recordData.personel]) {
            personnelStats[recordData.personel] = { count: 0, uids: new Set() };
          }
          personnelStats[recordData.personel].count++;
          if (recordData.createdBy) {
            personnelStats[recordData.personel].uids.add(recordData.createdBy);
          }
        }
        
        // Aslı Kılıç ve Sevde Hocaoğlu kayıtlarını özel olarak logla
        if (recordData.personel && 
            (recordData.personel.includes('Aslı') || recordData.personel.includes('Sevde'))) {
          console.log(`🔍 ${recordData.personel} kaydı: UID=${recordData.createdBy}, REF=${recordData.refId}`);
        }
        
        // Eğer personel userMap'te varsa ama UID farklıysa güncelle
        if (recordData.personel && userMap[recordData.personel]) {
          const correctUser = userMap[recordData.personel];
          
          // UID farklıysa veya createdByName yanlışsa güncelle
          if (recordData.createdBy !== correctUser.uid || 
              recordData.createdByName !== correctUser.name) {
            recordsToUpdate.push({ id: doc.id, ...recordData });
            console.log(`📝 Güncellenecek: ${recordData.personel} (${recordData.createdBy} -> ${correctUser.uid})`);
          }
        }
      });
      
      // Personel istatistiklerini logla
      console.log('📊 Personel istatistikleri:');
      Object.entries(personnelStats).forEach(([name, stats]) => {
        console.log(`👤 ${name}: ${stats.count} kayıt, UID'ler: ${Array.from(stats.uids).join(', ')}`);
      });

      // Aslı ile ilgili tüm kayıtları bul
      console.log('🔍 ASLI İLE İLGİLİ TÜM KAYITLAR:');
      Object.entries(personnelStats).forEach(([name, stats]) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('asl') || lowerName.includes('kıl') || lowerName.includes('kil')) {
          console.log(`🔍 ASLI BENZERI KAYIT: "${name}" - ${stats.count} kayıt`);
        }
      });

      console.log(`📊 ${recordsToUpdate.length} kayıt güncellenecek`);

      if (recordsToUpdate.length === 0) {
        alert('ℹ️ Güncellenecek kayıt bulunamadı!');
        return;
      }

      // Firebase quota koruması için batch size
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(recordsToUpdate.length / BATCH_SIZE);
      console.log(`📦 ${totalBatches} batch'te işlenecek (${BATCH_SIZE} kayıt/batch)`);

      let updatedCount = 0;
      let skippedCount = 0;
      const errors = [];

      // Batch processing
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, recordsToUpdate.length);
        const currentBatch = recordsToUpdate.slice(startIndex, endIndex);
        
        console.log(`📦 Batch ${batchIndex + 1}/${totalBatches} işleniyor (${currentBatch.length} kayıt)`);

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
                if (correctUser) {
                  console.log(`🔧 Sevde için esnek eşleştirme: "${personelName}" -> "${correctUser.name}"`);
                }
              }
              
              // Aslı Kılıç için alternatif eşleştirmeler
              if (personelName.includes('Aslı') || personelName.includes('Kılıç')) {
                correctUser = Object.values(userMap).find(user => 
                  user.name && (
                    user.name.toLowerCase().includes('aslı') ||
                    user.name.toLowerCase().includes('asli') ||
                    user.name.toLowerCase().includes('kılıç') ||
                    user.name.toLowerCase().includes('kilic')
                  )
                );
                if (correctUser) {
                  console.log(`🔧 Aslı için esnek eşleştirme: "${personelName}" -> "${correctUser.name}"`);
                }
              }
            }
            
            let finalUser = correctUser;
            
            if (finalUser && finalUser.uid) {
              console.log(`🔄 Güncelleniyor: ${record.personel} - ${record.refId}`);
              console.log(`🔄 Final User:`, finalUser);
              console.log(`🔄 Record ID:`, record.id);
              
              // Güvenlik kontrolleri
              if (!finalUser.uid || !finalUser.name) {
                console.error(`❌ Geçersiz kullanıcı verisi: ${record.personel}`, finalUser);
                skippedCount++;
                continue;
              }
              
              const updateData = {
                createdBy: finalUser.uid,
                createdByName: finalUser.name,
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

              console.log(`🔄 Update Data:`, updateData);
              
              try {
                await updateDoc(doc(db, 'sales_records', record.id), updateData);
                updatedCount++;
                console.log(`✅ ${record.personel} - ${record.refId} güncellendi`);
              } catch (updateError) {
                console.error(`❌ UpdateDoc hatası:`, updateError);
                console.error(`❌ UpdateDoc hatası - kod:`, updateError.code);
                console.error(`❌ UpdateDoc hatası - mesaj:`, updateError.message);
                errors.push(`${record.refId}: UpdateDoc hatası - ${updateError.message}`);
                skippedCount++;
              }
              
              // Rate limiting için bekleme (Firebase quota koruması)
              await new Promise(resolve => setTimeout(resolve, 100));
              
            } else {
              skippedCount++;
              console.log(`⚠️ ${record.personel} - kullanıcı bulunamadı veya geçersiz`);
              
              // Detaylı hata ayıklama
              console.log(`🔍 HATA AYIKLAMA: "${record.personel}"`);
              console.log(`🔍 Mevcut kullanıcılar:`, Object.keys(userMap));
              console.log(`🔍 Sevde içeren kullanıcılar:`, Object.keys(userMap).filter(name => name.includes('Sevde')));
              console.log(`🔍 Aslı içeren kullanıcılar:`, Object.keys(userMap).filter(name => name.includes('Aslı')));
              console.log(`🔍 Asli içeren kullanıcılar:`, Object.keys(userMap).filter(name => name.toLowerCase().includes('asli')));
              console.log(`🔍 Kılıç içeren kullanıcılar:`, Object.keys(userMap).filter(name => name.toLowerCase().includes('kılıç')));
              console.log(`🔍 Kilic içeren kullanıcılar:`, Object.keys(userMap).filter(name => name.toLowerCase().includes('kilic')));
              
              // Aslı için özel kontrol
              if (record.personel.toLowerCase().includes('asl')) {
                console.log(`🔍 ASLI KAYDI BULUNDU: "${record.personel}"`);
                console.log(`🔍 UserMap'te Aslı araması:`, Object.keys(userMap).filter(name => 
                  name.toLowerCase().includes('asl') || name.toLowerCase().includes('kıl')
                ));
              }
              
              // Manuel arama dene - hem Sevde hem Aslı için
              let manualMatch = null;
              
              // Sevde için manuel arama
              if (record.personel.toLowerCase().includes('sevde') || record.personel.toLowerCase().includes('hocaoğlu')) {
                manualMatch = Object.values(userMap).find(user => {
                  if (!user.name) return false;
                  const userName = user.name.toLowerCase().trim();
                  return userName.includes('sevde') || userName.includes('hocaoğlu');
                });
                if (manualMatch) {
                  console.log(`🔧 SEVDE MANUEL EŞLEŞTİRME: "${record.personel}" -> "${manualMatch.name}"`);
                }
              }
              
              // Aslı için manuel arama - çok daha esnek
              if (!manualMatch && (record.personel.toLowerCase().includes('asl') || record.personel.toLowerCase().includes('kıl') || record.personel.toLowerCase().includes('kil'))) {
                manualMatch = Object.values(userMap).find(user => {
                  if (!user.name) return false;
                  const userName = user.name.toLowerCase().trim();
                  const personelName = record.personel.toLowerCase().trim();
                  
                  // Çok esnek eşleştirme
                  return (
                    (userName.includes('aslı') || userName.includes('asli')) ||
                    (userName.includes('kılıç') || userName.includes('kilic') || userName.includes('kiliç')) ||
                    (personelName.includes('asl') && userName.includes('asl')) ||
                    (personelName.includes('kıl') && (userName.includes('kıl') || userName.includes('kil')))
                  );
                });
                if (manualMatch) {
                  console.log(`🔧 ASLI MANUEL EŞLEŞTİRME: "${record.personel}" -> "${manualMatch.name}"`);
                }
              }
              
              if (manualMatch) {
                console.log(`🔧 MANUEL EŞLEŞTİRME BULUNDU: "${record.personel}" -> "${manualMatch.name}"`);
                console.log(`🔧 Manuel eşleştirme UID:`, manualMatch.uid);
                console.log(`🔧 Manuel eşleştirme tam verisi:`, manualMatch);
                
                // Manuel eşleştirme bulunduysa kullan
                finalUser = manualMatch;
                console.log(`🔄 Manuel eşleştirme ile güncelleme deneniyor...`);
                
                try {
                  const updateData = {
                    createdBy: manualMatch.uid,
                    createdByName: manualMatch.name,
                    updatedAt: new Date(),
                    updatedByAdmin: currentUser.uid,
                    wasImportFixed: true,
                    manualMatchUsed: true
                  };

                  console.log(`🔄 Update data hazırlandı:`, updateData);
                  await updateDoc(doc(db, 'sales_records', record.id), updateData);
                  
                  updatedCount++;
                  console.log(`✅ MANUEL EŞLEŞTİRME İLE GÜNCELLENDİ: ${record.personel} - ${record.refId}`);
                  
                  // Rate limiting için bekleme
                  await new Promise(resolve => setTimeout(resolve, 100));
                  continue; // Döngünün başına dön
                  
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
              console.log('⏸️ Firebase quota aşıldı, işlem durduruluyor');
              break;
            }
          }
        }
        
        // Batch'ler arası bekleme (Firebase quota koruması)
        if (batchIndex < totalBatches - 1) {
          console.log(`⏸️ Batch ${batchIndex + 1} tamamlandı, 1 saniye bekleniyor...`);
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

      console.log('📊 Güncelleme sonuçları:', updateResults);
      setResults(updateResults);

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
      console.log('🔄 Veri güncelleme işlemi tamamlandı');
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
                    onClick={fixUserUIDs}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 mx-auto text-sm"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Kullanıcı UID'lerini Düzelt (Geliştirici)</span>
                  </button>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Aslı Kılıç kayıtları düzeltilmiyorsa:</p>
                  <button
                    onClick={fixAsliRecords}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 mx-auto text-sm"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Aslı Kılıç Kayıtlarını Manuel Düzelt (Geliştirici)</span>
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
          
          {!isProcessing && !results ? (
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
              
              {/* Debug bilgileri */}
              <div className="mt-6 text-left bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                <h4 className="font-medium text-gray-700 mb-2">🔍 İşlem Durumu:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Firebase bağlantısı kuruldu
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                    Kayıtlar güncelleniyor...
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
                    Sonuçlar gösterilecek
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Console'u açarak detayları görebilirsiniz (F12)
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            Güncelleme Sonuçları
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{results.total}</div>
              <div className="text-sm text-blue-700">Toplam İşlenen</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{results.updated}</div>
              <div className="text-sm text-green-700">Güncellendi</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{results.skipped}</div>
              <div className="text-sm text-yellow-700">Atlandı</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{results.errors}</div>
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
    </div>
  );
};

export default DataUpdate; 