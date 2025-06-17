import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Crown, 
  Edit, 
  Save, 
  X, 
  Plus,
  Shield,
  Star,
  TrendingUp,
  Target,
  Award,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc
} from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';

const TeamManagement = () => {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [selectedTeamLeader, setSelectedTeamLeader] = useState('');
  const [expandedTeams, setExpandedTeams] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersData = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.name !== 'Admin User' && user.email !== 'wupaniyazilim@gmail.com');
      
      setUsers(usersData);
      organizeTeams(usersData);
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      setError('Kullanıcılar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const organizeTeams = (usersData) => {
    const teamLeaders = usersData.filter(user => user.role === 'Team Leader');
    const personnel = usersData.filter(user => user.role === 'Personnel');
    
    const teamsData = teamLeaders.map(leader => {
      const teamMembers = personnel.filter(person => person.teamLeader === leader.id);
      
      return {
        leader,
        members: teamMembers,
        memberCount: teamMembers.length
      };
    });

    // Atanmamış personeller için özel bir takım
    const unassignedPersonnel = personnel.filter(person => !person.teamLeader);
    if (unassignedPersonnel.length > 0) {
      teamsData.push({
        leader: { id: 'unassigned', name: 'Atanmamış Personeller', role: 'Unassigned' },
        members: unassignedPersonnel,
        memberCount: unassignedPersonnel.length,
        isUnassigned: true
      });
    }

    setTeams(teamsData);
  };

  const handleAssignPersonnel = async () => {
    if (!selectedPersonnel || !selectedTeamLeader) return;

    try {
      const userRef = doc(db, 'users', selectedPersonnel.id);
      await updateDoc(userRef, {
        teamLeader: selectedTeamLeader === 'unassigned' ? null : selectedTeamLeader
      });

      setSuccessMessage('Personel başarıyla atandı!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      await fetchUsers();
      setShowAssignModal(false);
      setSelectedPersonnel(null);
      setSelectedTeamLeader('');
    } catch (error) {
      console.error('Atama sırasında hata:', error);
      setError('Atama sırasında hata oluştu.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const openAssignModal = (personnel) => {
    setSelectedPersonnel(personnel);
    setSelectedTeamLeader(personnel.teamLeader || '');
    setShowAssignModal(true);
  };

  const toggleTeamExpansion = (teamIndex) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamIndex]: !prev[teamIndex]
    }));
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Team Leader': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Personnel': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTeamLeaderOptions = () => {
    const teamLeaders = users.filter(user => user.role === 'Team Leader');
    return [
      { id: 'unassigned', name: 'Atanmamış (Takım lideri yok)' },
      ...teamLeaders.map(leader => ({ id: leader.id, name: leader.name }))
    ];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Takım Yönetimi</h1>
            <p className="text-gray-600">Takım liderlerini ve personelleri yönetin</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{users.length} Toplam Kullanıcı</span>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
          <UserCheck className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <X className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Teams Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Takım Liderleri</p>
              <p className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'Team Leader').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Personeller</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter(u => u.role === 'Personnel').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Atanmamış</p>
              <p className="text-2xl font-bold text-orange-600">
                {users.filter(u => u.role === 'Personnel' && !u.teamLeader).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="space-y-4">
        {teams.map((team, index) => (
          <div key={team.leader.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Team Header */}
            <div 
              className={`p-6 cursor-pointer transition-colors ${
                team.isUnassigned ? 'bg-orange-50 hover:bg-orange-100' : 'bg-blue-50 hover:bg-blue-100'
              }`}
              onClick={() => toggleTeamExpansion(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    team.isUnassigned ? 'bg-orange-200' : 'bg-blue-200'
                  }`}>
                    {team.isUnassigned ? (
                      <UserCheck className={`w-6 h-6 ${team.isUnassigned ? 'text-orange-600' : 'text-blue-600'}`} />
                    ) : (
                      <Crown className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>{team.leader.name}</span>
                      {!team.isUnassigned && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(team.leader.role)}`}>
                          Takım Lideri
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {team.memberCount} {team.memberCount === 1 ? 'personel' : 'personel'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{team.memberCount} Üye</p>
                    <p className="text-xs text-gray-500">
                      {team.isUnassigned ? 'Atanmamış' : 'Aktif Takım'}
                    </p>
                  </div>
                  {expandedTeams[index] ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Team Members */}
            {expandedTeams[index] && (
              <div className="border-t border-gray-200">
                {team.members.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p>Bu takımda henüz personel bulunmuyor</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {team.members.map((member) => (
                      <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                              Personel
                            </span>
                            <button
                              onClick={() => openAssignModal(member)}
                              className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors"
                              title="Takım değiştir"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Takım Ataması
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Personel:</p>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedPersonnel?.name}</p>
                    <p className="text-xs text-gray-500">{selectedPersonnel?.email}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Takım Lideri Seçin:
                </label>
                <select
                  value={selectedTeamLeader}
                  onChange={(e) => setSelectedTeamLeader(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Takım lideri seçin...</option>
                  {getTeamLeaderOptions().map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleAssignPersonnel}
                  disabled={!selectedTeamLeader}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>Ata</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement; 