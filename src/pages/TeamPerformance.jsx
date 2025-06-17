import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { Users, Award, BarChart3 } from 'lucide-react';
import RoleGuard from '../components/RoleGuard';

const TeamPerformance = () => {
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  const calculateTeamPerformance = async () => {
    try {
      // Kullanıcıları ve takım yapısını al
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = {};
      const teams = {};

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const userId = userData.uid || doc.id;
        users[userId] = { ...userData, id: userId };

        if (userData.role === 'teamLeader' || userData.role === 'Team Leader') {
          teams[userId] = {
            leader: userData,
            members: []
          };
        }
      });

      // Takım üyelerini atama
      Object.values(users).forEach(user => {
        if ((user.role === 'personnel' || user.role === 'Personnel') && user.teamLeader && teams[user.teamLeader]) {
          teams[user.teamLeader].members.push(user);
        }
      });

      // Satış verilerini al
      const recordsSnapshot = await getDocs(collection(db, 'sales_records'));
      const records = [];
      recordsSnapshot.forEach(doc => {
        const data = doc.data();
        records.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(data.tarih)
        });
      });

      // Her takım için performans hesapla
      const teamPerformanceData = [];

      Object.entries(teams).forEach(([leaderId, team]) => {
        const allTeamMemberIds = [leaderId, ...team.members.map(m => m.id)];
        
        // Takım kayıtlarını filtrele
        const teamRecords = records.filter(record => 
          allTeamMemberIds.includes(record.createdBy)
        );

        // Takım performansını hesapla
        const memberPerformances = allTeamMemberIds.map(memberId => {
          const memberRecords = teamRecords.filter(r => r.createdBy === memberId);
          const successfulSales = memberRecords.filter(record => {
            const isSuccessful = record.detay === 'Satış Sağlandı' || 
                               record.detay === 'Satış sağlandı' || 
                               record.detay === 'Satış Bilgisi';
            return isSuccessful;
          }).length;

          const user = users[memberId];
          
          return {
            user,
            totalRecords: memberRecords.length,
            successfulSales,
            conversionRate: memberRecords.length > 0 ? (successfulSales / memberRecords.length) * 100 : 0,
            isLeader: memberId === leaderId
          };
        });

        const totalRecords = memberPerformances.reduce((sum, mp) => sum + mp.totalRecords, 0);
        const totalSuccessfulSales = memberPerformances.reduce((sum, mp) => sum + mp.successfulSales, 0);
        const averageConversionRate = memberPerformances.length > 0 
          ? memberPerformances.reduce((sum, mp) => sum + mp.conversionRate, 0) / memberPerformances.length 
          : 0;

        teamPerformanceData.push({
          leader: team.leader,
          members: memberPerformances,
          teamStats: {
            totalMembers: allTeamMemberIds.length,
            totalRecords,
            totalSuccessfulSales,
            averageConversionRate
          }
        });
      });

      // Takımları başarılı satışa göre sırala
      teamPerformanceData.sort((a, b) => b.teamStats.totalSuccessfulSales - a.teamStats.totalSuccessfulSales);

      setTeamPerformance(teamPerformanceData);
    } catch (error) {
      console.error('Takım performansı hesaplanırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateTeamPerformance();
  }, []);

  const getRankBadge = (index) => {
    switch (index) {
      case 0: return { emoji: '🥇', text: 'En İyi Takım', color: 'text-yellow-600 bg-yellow-100' };
      case 1: return { emoji: '🥈', text: 'İkinci Takım', color: 'text-gray-600 bg-gray-100' };
      case 2: return { emoji: '🥉', text: 'Üçüncü Takım', color: 'text-orange-600 bg-orange-100' };
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600 dark:text-gray-300">Takım performansı hesaplanıyor...</div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['admin', 'teamLeader']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Takım Performansı Karşılaştırması
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Takım liderlerinin ve üyelerinin detaylı performans analizi
                </p>
              </div>
            </div>
          </div>

          {/* Team Performance Cards */}
          <div className="space-y-8">
            {teamPerformance.map((team, index) => {
              const rankBadge = getRankBadge(index);
              
              return (
                <div key={team.leader.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  {/* Team Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="w-6 h-6" />
                          <h2 className="text-2xl font-bold">
                            {team.leader.displayName || team.leader.email} Takımı
                          </h2>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="opacity-80">Üye Sayısı</div>
                            <div className="text-xl font-bold">{team.teamStats.totalMembers}</div>
                          </div>
                          <div>
                            <div className="opacity-80">Toplam Kayıt</div>
                            <div className="text-xl font-bold">{team.teamStats.totalRecords}</div>
                          </div>
                          <div>
                            <div className="opacity-80">Başarılı Satış</div>
                            <div className="text-xl font-bold">{team.teamStats.totalSuccessfulSales}</div>
                          </div>
                          <div>
                            <div className="opacity-80">Ortalama Dönüşüm</div>
                            <div className="text-xl font-bold">%{team.teamStats.averageConversionRate.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                      
                      {rankBadge && (
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${rankBadge.color}`}>
                          {rankBadge.emoji} {rankBadge.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="p-6">
                    <div className="grid gap-4">
                      {team.members.map((member) => (
                        <div 
                          key={member.user.id} 
                          className={`p-4 rounded-lg border-2 ${
                            member.isLeader 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                member.isLeader ? 'bg-blue-500' : 'bg-green-500'
                              }`}>
                                {member.isLeader ? 'L' : 'T'}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {member.user.displayName || member.user.email}
                                  {member.isLeader && ' (Takım Lideri)'}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {member.user.email}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-6 text-sm">
                              <div className="text-center">
                                <div className="text-gray-600 dark:text-gray-300">Kayıt</div>
                                <div className="font-bold text-gray-900 dark:text-white">
                                  {member.totalRecords}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-600 dark:text-gray-300">Başarılı</div>
                                <div className="font-bold text-green-600">
                                  {member.successfulSales}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-600 dark:text-gray-300">Dönüşüm</div>
                                <div className={`font-bold ${
                                  member.conversionRate >= 75 ? 'text-green-600' :
                                  member.conversionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  %{member.conversionRate.toFixed(1)}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  member.conversionRate >= 75 ? 'bg-green-500' :
                                  member.conversionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(member.conversionRate, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {teamPerformance.length === 0 && (
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Henüz takım verisi bulunmuyor
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Takım performansını görüntülemek için önce takım yapısını oluşturun.
              </p>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
};

export default TeamPerformance; 