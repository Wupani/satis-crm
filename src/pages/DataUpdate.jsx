import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../auth/firebaseConfig';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Settings,
  Play,
  Pause
} from 'lucide-react';

const DataUpdate = () => {
  const { currentUser } = useAuth();
  
  const [updateProgress, setUpdateProgress] = useState({
    current: 0,
    total: 0,
    isProcessing: false,
    isPaused: false,
    updated: 0,
    skipped: 0,
    errors: []
  });
  
  const [updateResults, setUpdateResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  // Mevcut veriyi analiz et
  const analyzeData = async () => {
    setIsAnalyzing(true);
    
    try {
      console.log('📊 Mevcut veriler analiz ediliyor...');
      
      // Tüm kullanıcıları çek
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap = {};
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        userMap[userData.name] = userData;
      });
      
      // Tüm satış kayıtlarını çek
      const recordsSnapshot = await getDocs(collection(db, 'sales_records'));
      const records = [];
      
      recordsSnapshot.forEach(doc => {
        records.push({ id: doc.id, ...doc.data() });
      });
      
      // Analiz yap
      let adminRecords = 0;
      let correctRecords = 0;
      let unmatchedPersonnel = new Set();
      let fixableRecords = 0;
      
      records.forEach(record => {
        // Admin User olarak kayıtlı mı?
        if (record.createdByName === 'Admin User' || record.createdBy === currentUser.uid) {
          adminRecords++;
          
          // Bu personel sistemde var mı?
          if (userMap[record.personel]) {
            fixableRecords++;
          } else {
            unmatchedPersonnel.add(record.personel);
          }
        } else {
          correctRecords++;
        }
      });
      
      const analysis = {
        totalRecords: records.length,
        adminRecords,
        correctRecords,
        fixableRecords,
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

  // Verileri güncelle
  const updateData = async () => {
    const confirmUpdate = window.confirm(
      `🔄 ${analysisResults.fixableRecords} kayıt güncellenecek.\n\n` +
      `⚠️ Bu işlem geri alınamaz.\n\n` +
      `Devam etmek istiyor musunuz?`
    );

    if (!confirmUpdate) return;

    setUpdateProgress({
      current: 0,
      total: analysisResults.fixableRecords,
      isProcessing: true,
      isPaused: false,
      updated: 0,
      skipped: 0,
      errors: []
    });

    try {
      // Kullanıcıları tekrar çek
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap = {};
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        userMap[userData.name] = userData;
      });

      // Admin User olarak kayıtlı kayıtları çek
      const adminRecordsQuery = query(
        collection(db, 'sales_records'),
        where('createdBy', '==', currentUser.uid)
      );
      
      const adminRecordsSnapshot = await getDocs(adminRecordsQuery);
      const recordsToUpdate = [];
      
      adminRecordsSnapshot.forEach(doc => {
        const recordData = doc.data();
        if (userMap[recordData.personel]) {
          recordsToUpdate.push({ id: doc.id, ...recordData });
        }
      });

      console.log(`🔄 ${recordsToUpdate.length} kayıt güncellenecek`);

      let updatedCount = 0;
      let skippedCount = 0;
      const errors = [];

      for (let i = 0; i < recordsToUpdate.length; i++) {
        // Duraklama kontrolü
        while (updateProgress.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const record = recordsToUpdate[i];
        
        setUpdateProgress(prev => ({
          ...prev,
          current: i + 1
        }));

        try {
          const correctUser = userMap[record.personel];
          
          if (correctUser) {
            // Kaydı güncelle
            await updateDoc(doc(db, 'sales_records', record.id), {
              createdBy: correctUser.uid,
              createdByName: correctUser.name,
              updatedAt: new Date(),
              updatedByAdmin: currentUser.uid,
              wasImportFixed: true
            });
            
            updatedCount++;
            console.log(`✅ ${record.personel} - ${record.refId} güncellendi`);
          } else {
            skippedCount++;
          }

        } catch (error) {
          console.error(`❌ ${record.refId} güncellenirken hata:`, error);
          errors.push(`${record.refId}: ${error.message}`);
        }

        // Her 50 kayıtta bir kısa bekleme
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Sonuçları kaydet
      const results = {
        total: recordsToUpdate.length,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.length,
        errorDetails: errors.slice(0, 10)
      };

      setUpdateResults(results);
      setUpdateProgress(prev => ({
        ...prev,
        isProcessing: false,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors
      }));

      // Başarı mesajı
      alert(
        `✅ Veri güncelleme tamamlandı!\n\n` +
        `📊 Toplam: ${results.total}\n` +
        `✅ Güncellendi: ${results.updated}\n` +
        `⚠️ Atlandı: ${results.skipped}\n` +
        `❌ Hata: ${results.errors}\n\n` +
        `🎉 Artık dashboard'da doğru personeller görünecek!`
      );

    } catch (error) {
      console.error('Güncelleme genel hatası:', error);
      setUpdateProgress(prev => ({
        ...prev,
        isProcessing: false
      }));
      alert('❌ Güncelleme sırasında hata: ' + error.message);
    }
  };

  // İşlemi duraklat/devam ettir
  const togglePause = () => {
    setUpdateProgress(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
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
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Önce mevcut verileri analiz edelim ve hangi kayıtların güncellenmesi gerektiğini görelim.
            </p>
            <button
              onClick={analyzeData}
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
                  <Database className="w-4 h-4" />
                  <span>Veriyi Analiz Et</span>
                </>
              )}
            </button>
          </div>
        ) : (
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
        )}

        {analysisResults && analysisResults.unmatchedPersonnel.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Eşleşmeyen Personeller:</h4>
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

      {/* Update Section */}
      {analysisResults && analysisResults.fixableRecords > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <RefreshCw className="w-5 h-5 text-orange-600 mr-2" />
            2. Veri Güncelleme
          </h2>
          
          {!updateProgress.isProcessing ? (
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
                onClick={updateData}
                className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Verileri Güncelle ({analysisResults.fixableRecords} kayıt)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    {updateProgress.isPaused ? '⏸️ Duraklatıldı' : '🔄 Güncelleniyor...'}
                  </span>
                  <span>
                    {updateProgress.current} / {updateProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-orange-600 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(updateProgress.current / updateProgress.total) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>✅ Güncellendi: {updateProgress.updated}</span>
                  <span>⚠️ Atlandı: {updateProgress.skipped}</span>
                  <span>❌ Hata: {updateProgress.errors.length}</span>
                </div>
              </div>
              
              {/* Control Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={togglePause}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {updateProgress.isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                  <span>{updateProgress.isPaused ? 'Devam Et' : 'Duraklat'}</span>
                </button>
              </div>
            </div>
          )}
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
          
          {updateResults.errorDetails.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Hata Detayları:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {updateResults.errorDetails.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
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