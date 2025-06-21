import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { LogOut, User, Moon, Sun, ChevronDown, Shield, Menu, X, Clock } from 'lucide-react';

const Navbar = () => {
  const { currentUser, userRole, userName, logout, sessionTimeout, lastActivity } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Kalan süreyi hesapla
  useEffect(() => {
    if (!currentUser || !sessionTimeout || !lastActivity) return;

    const updateTimeLeft = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const timeoutMs = sessionTimeout * 60 * 1000;
      const remaining = Math.max(0, timeoutMs - timeSinceLastActivity);
      setTimeLeft(remaining);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [currentUser, sessionTimeout, lastActivity]);

  // Süreyi formatla
  const formatTimeLeft = (ms) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}s ${minutes}dk`;
    }
    return `${minutes}dk`;
  };

  // Süre durumuna göre renk
  const getTimeColor = (ms) => {
    const minutes = Math.floor(ms / (1000 * 60));
    if (minutes <= 5) return 'text-red-600';
    if (minutes <= 15) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Çıkış yapma hatası:', error);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'Yönetici';
      case 'teamLeader': return 'Takım Lideri';
      case 'personnel': return 'Personel';
      default: return 'Kullanıcı';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'badge-purple';
      case 'teamLeader': return 'badge-success';
      case 'personnel': return 'badge-warning';
      default: return 'badge-purple';
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-modern border-b border-purple-100 dark:border-gray-700 sticky top-0 z-[55]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 sm:space-x-6 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 rounded-lg sm:rounded-xl hover:bg-purple-50 transition-all duration-300 icon-hover"
              title={darkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
            >
              {darkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-purple-50 transition-all duration-300 group"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-purple rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-semibold text-gray-900">{userName || currentUser?.name || 'Kullanıcı'}</p>
                  <p className="text-xs text-gray-500">{currentUser?.email}</p>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-modern-hover border border-purple-100 dark:border-gray-700 py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-purple rounded-xl flex items-center justify-center shadow-lg">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{userName || currentUser?.name || 'Kullanıcı'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`${getRoleBadgeColor(userRole)}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {getRoleDisplayName(userRole)}
                          </span>
                          {currentUser?.isSwitched && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                              Geçiş Modu
                            </span>
                          )}
                        </div>
                        {/* Oturum Zaman Aşımı Göstergesi */}
                        {currentUser && sessionTimeout && (
                          <div className="flex items-center space-x-1 mt-2 text-xs">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-500">Oturum:</span>
                            <span className={getTimeColor(timeLeft)}>
                              {formatTimeLeft(timeLeft)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Hesabına Dön (Geçiş modundayken) */}
                  {currentUser?.isSwitched && (
                    <div className="border-t border-gray-100 pt-2">
                      <button
                        onClick={() => {
                          sessionStorage.removeItem('originalAdmin');
                          sessionStorage.removeItem('switchedUser');
                          window.location.reload();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-purple-600 hover:bg-purple-50 transition-colors text-left font-medium"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Admin Hesabına Dön</span>
                      </button>
                    </div>
                  )}

                  {/* Logout */}
                  <div className="border-t border-gray-100 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700"></div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-all duration-300 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={darkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-all duration-300 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-purple-100 py-3 space-y-3">
            {/* User Info Mobile */}
            <div className="flex items-center space-x-3 px-3">
              <div className="w-10 h-10 bg-gradient-purple rounded-xl flex items-center justify-center shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{userName || currentUser?.name || 'Kullanıcı'}</p>
                <p className="text-xs text-gray-500">{currentUser?.email}</p>
                <div className="flex items-center space-x-2">
                  <span className={`${getRoleBadgeColor(userRole)} text-xs`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleDisplayName(userRole)}
                  </span>
                  {currentUser?.isSwitched && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                      Geçiş
                    </span>
                  )}
                </div>
                {/* Oturum Zaman Aşımı - Mobile */}
                {currentUser && sessionTimeout && (
                  <div className="flex items-center space-x-1 mt-1 text-xs">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-500">Oturum:</span>
                    <span className={getTimeColor(timeLeft)}>
                      {formatTimeLeft(timeLeft)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="space-y-2 px-2">
              <button 
                onClick={toggleDarkMode}
                className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors text-left"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="font-medium">{darkMode ? 'Açık Tema' : 'Koyu Tema'}</span>
              </button>

              {/* Admin Hesabına Dön - Mobile */}
              {currentUser?.isSwitched && (
                <button
                  onClick={() => {
                    sessionStorage.removeItem('originalAdmin');
                    sessionStorage.removeItem('switchedUser');
                    window.location.reload();
                  }}
                  className="w-full flex items-center space-x-3 p-3 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors text-left font-medium"
                >
                  <Shield className="h-5 w-5" />
                  <span>Admin Hesabına Dön</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left font-medium"
              >
                <LogOut className="h-5 w-5" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-25" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
};

export default Navbar; 