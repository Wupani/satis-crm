import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import MonthlyComparison from './pages/MonthlyComparison';
import TeamPerformance from './pages/TeamPerformance';
import DuplicateNumbers from './pages/DuplicateNumbers';
import PersonnelDevelopment from './pages/PersonnelDevelopment';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import RecordForm from './components/RecordForm';
import RecordTable from './components/RecordTable';
import UserManagement from './components/UserManagement';
import TargetManagement from './components/TargetManagement';
import TeamManagement from './components/TeamManagement';
import DropdownSettings from './components/DropdownSettings';
import SystemSettings from './pages/SystemSettings';
import SystemLogs from './pages/SystemLogs';
import DataImport from './pages/DataImport';
import DataUpdate from './components/DataUpdate';
import UserSwitcher from './pages/UserSwitcher';
import RoleGuard from './components/RoleGuard';
import ChatSystem from './components/ChatSystem';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
}

// Main Layout Component
function MainLayout({ children }) {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-transparent px-2 sm:px-4 lg:px-6">
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>
      {/* Chat System - Tüm sayfalarda görünür */}
      <ChatSystem />
    </div>
  );
}

// App Content with Routes
function AppContent() {
  const { currentUser, checkUserStatus } = useAuth();

  // Kullanıcı durumunu periyodik olarak kontrol et
  useEffect(() => {
    if (currentUser) {
      const interval = setInterval(async () => {
        await checkUserStatus();
      }, 30000); // Her 30 saniyede bir kontrol et

      return () => clearInterval(interval);
    }
  }, [currentUser, checkUserStatus]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={!currentUser ? <Login /> : <Navigate to="/dashboard" replace />} 
        />
        
        {/* Protected Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/records"
          element={
            <ProtectedRoute>
              <MainLayout>
            <div className="p-2 sm:p-4 lg:p-6">
                  <RecordTable />
              </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-record"
          element={
            <ProtectedRoute>
              <MainLayout>
                <div className="p-2 sm:p-4 lg:p-6">
                  <RecordForm />
            </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin']}>
            <div className="p-2 sm:p-4 lg:p-6">
              <UserManagement />
            </div>
          </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-switcher"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <UserSwitcher />
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/target-management"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin', 'teamLeader']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <TargetManagement />
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/team-management"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <TeamManagement />
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dropdown-settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin']}>
            <DropdownSettings />
          </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-import"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <DataImport />
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-update"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <DataUpdate />
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-export"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <div className="max-w-4xl mx-auto">
                      <div className="card-modern p-8">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h2 className="text-3xl font-bold text-gradient-purple mb-4">Veri Dışa Aktarma</h2>
                          <p className="text-xl text-gray-600 mb-8">Verileri Excel formatında dışa aktarın</p>
                          <div className="bg-gradient-periwinkle p-2 sm:p-4 lg:p-6 rounded-2xl">
                            <p className="text-gray-700 font-medium">Veri dışa aktarma özelliği geliştirme aşamasında...</p>
                            <p className="text-sm text-gray-500 mt-2">Excel formatında veri dışa aktarım araçları yakında eklenecek.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/database-management"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <div className="max-w-4xl mx-auto">
                      <div className="card-modern p-8">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                          </div>
                          <h2 className="text-3xl font-bold text-gradient-purple mb-4">Veritabanı Yönetimi</h2>
                          <p className="text-xl text-gray-600 mb-8">Veri yedekleme ve bakım işlemleri</p>
                          <div className="bg-gradient-periwinkle p-2 sm:p-4 lg:p-6 rounded-2xl">
                            <p className="text-gray-700 font-medium">Veritabanı yönetim araçları geliştirme aşamasında...</p>
                            <p className="text-sm text-gray-500 mt-2">Veri yedekleme, geri yükleme ve bakım araçları yakında eklenecek.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SystemSettings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/system-logs"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin']}>
                  <SystemLogs />
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin', 'teamLeader']}>
                  <Analytics />
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/personnel-development"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin', 'teamLeader']}>
                  <PersonnelDevelopment />
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/monthly-comparison"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin', 'teamLeader']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <MonthlyComparison />
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/team-performance"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TeamPerformance />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/duplicate-numbers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['admin', 'teamLeader']}>
                  <DuplicateNumbers />
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/targets"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['teamLeader', 'personnel']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <div className="max-w-6xl mx-auto">
                      <div className="card-modern p-8">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                            </svg>
                          </div>
                          <h2 className="text-3xl font-bold text-gradient-purple mb-4">Hedefler</h2>
                          <p className="text-xl text-gray-600 mb-8">Hedef takibi ve ilerleme yönetimi</p>
                          <div className="bg-gradient-periwinkle p-2 sm:p-4 lg:p-6 rounded-2xl">
                            <p className="text-gray-700 font-medium">Hedef yönetimi sayfası geliştirme aşamasında...</p>
                            <p className="text-sm text-gray-500 mt-2">Satış hedefleri, takip ve raporlama araçları yakında eklenecek.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RoleGuard allowedRoles={['teamLeader']}>
                  <div className="p-2 sm:p-4 lg:p-6">
                    <div className="max-w-6xl mx-auto">
                      <div className="card-modern p-8">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h2 className="text-3xl font-bold text-gradient-purple mb-4">Raporlar</h2>
                          <p className="text-xl text-gray-600 mb-8">Takım raporları ve analitik veriler</p>
                          <div className="bg-gradient-periwinkle p-2 sm:p-4 lg:p-6 rounded-2xl">
                            <p className="text-gray-700 font-medium">Raporlama sistemi geliştirme aşamasında...</p>
                            <p className="text-sm text-gray-500 mt-2">Detaylı takım raporları ve analitik araçları yakında eklenecek.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RoleGuard>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;
