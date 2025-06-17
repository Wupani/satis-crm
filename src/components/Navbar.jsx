import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { LogOut, User, Moon, Sun, ChevronDown, Shield, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { currentUser, userRole, userName, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <nav className="bg-white dark:bg-gray-800 shadow-modern border-b border-purple-100 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Desktop Navigation */}
          <div className="flex items-center space-x-6 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-400 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-all duration-300 icon-hover"
              title={darkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-purple-50 transition-all duration-300 group"
              >
                <div className="w-8 h-8 bg-gradient-purple rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-semibold text-gray-900">{userName || currentUser?.name || 'Kullanıcı'}</p>
                  <p className="text-xs text-gray-500">{currentUser?.email}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
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
                        <span className={`${getRoleBadgeColor(userRole)} mt-1`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {getRoleDisplayName(userRole)}
                        </span>
                      </div>
                    </div>
                  </div>

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
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-400 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-all duration-300"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-purple-100 py-4 space-y-4">
            {/* User Info Mobile */}
            <div className="flex items-center space-x-3 px-2">
              <div className="w-10 h-10 bg-gradient-purple rounded-xl flex items-center justify-center shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{userName || currentUser?.name || 'Kullanıcı'}</p>
                <p className="text-sm text-gray-500">{currentUser?.email}</p>
                <span className={`${getRoleBadgeColor(userRole)} text-xs`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleDisplayName(userRole)}
                </span>
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