import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  BarChart3,
  Target,
  TrendingUp,
  UserCheck,
  Calendar,
  FileSpreadsheet,
  Plus,
  List,
  ChevronDown,
  ChevronUp,
  Building2,
  Shield,
  RefreshCw
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Genel'])); // Anasayfa kategorisi default açık

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const roleSpecificCategories = {
      admin: [
        {
          title: 'Genel',
          items: [
            {
              path: '/dashboard',
              icon: LayoutDashboard,
              label: 'Anasayfa',
              description: 'Genel bakış ve istatistikler'
            }
          ]
        },
        {
          title: 'Satış İşlemleri',
          items: [
            {
              path: '/records',
              icon: FileText,
              label: 'Satış Kayıtları',
              description: 'Tüm satış verilerini görüntüle'
            },
            {
              path: '/add-record',
              icon: Plus,
              label: 'Yeni Kayıt Ekle',
              description: 'Yeni satış kaydı oluştur'
            }
          ]
        },
        {
          title: 'Analitik & Raporlar',
          items: [
            {
              path: '/analytics',
              icon: BarChart3,
              label: 'Analitik',
              description: 'Detaylı performans analizleri'
            },
            {
              path: '/monthly-comparison',
              icon: Calendar,
              label: 'Aylık Karşılaştırma',
              description: 'Aylara göre performans kıyaslaması'
            },
            {
              path: '/team-performance',
              icon: TrendingUp,
              label: 'Takım Performansı',
              description: 'Takım performansı karşılaştırması'
            }
          ]
        },
        {
          title: 'Yönetim',
          items: [
            {
              path: '/user-management',
              icon: Users,
              label: 'Kullanıcı Yönetimi',
              description: 'Personel ve yetki yönetimi'
            },
            {
              path: '/user-switcher',
              icon: Shield,
              label: 'Hesap Geçişi',
              description: 'Kullanıcı hesaplarına geçiş yap'
            },
            {
              path: '/team-management',
              icon: UserCheck,
              label: 'Takım Yönetimi',
              description: 'Takım liderlerini ve personelleri yönet'
            },
            {
              path: '/target-management',
              icon: Target,
              label: 'Hedef Yönetimi',
              description: 'Satış hedeflerini belirle'
            },
            {
              path: '/dropdown-settings',
              icon: List,
              label: 'Dropdown Ayarları',
              description: 'Form seçeneklerini yönet'
            }
          ]
        },
        {
          title: 'Veri Yönetimi',
          items: [
            {
              path: '/data-import',
              icon: FileSpreadsheet,
              label: 'Veri İçe Aktarma',
              description: 'Excel dosyalarından toplu veri aktarımı'
            },
            {
              path: '/data-update',
              icon: RefreshCw,
              label: 'Veri Güncelleme',
              description: 'Mevcut kayıtları doğru personellerle eşleştir'
            }
          ]
        },
        {
          title: 'Sistem',
          items: [
            {
              path: '/settings',
              icon: Settings,
              label: 'Sistem Ayarları',
              description: 'Uygulama konfigürasyonu'
            },
            {
              path: '/system-logs',
              icon: Shield,
              label: 'Sistem Log Kayıtları',
              description: 'Güvenlik ve aktivite logları'
            }
          ]
        }
      ],
      teamLeader: [
        {
          title: 'Genel',
          items: [
            {
              path: '/dashboard',
              icon: LayoutDashboard,
              label: 'Anasayfa',
              description: 'Genel bakış ve istatistikler'
            }
          ]
        },
        {
          title: 'Satış İşlemleri',
          items: [
            {
              path: '/records',
              icon: FileText,
              label: 'Satış Kayıtları',
              description: 'Takım satış verilerini görüntüle'
            },
            {
              path: '/add-record',
              icon: Plus,
              label: 'Yeni Kayıt Ekle',
              description: 'Yeni satış kaydı oluştur'
            }
          ]
        },
        {
          title: 'Analitik & Raporlar',
          items: [
            {
              path: '/analytics',
              icon: BarChart3,
              label: 'Analitik',
              description: 'Detaylı performans analizleri'
            },
            {
              path: '/monthly-comparison',
              icon: Calendar,
              label: 'Aylık Karşılaştırma',
              description: 'Aylara göre performans kıyaslaması'
            }
          ]
        },
        {
          title: 'Takım Yönetimi',
          items: [
            {
              path: '/team-performance',
              icon: TrendingUp,
              label: 'Takım Performansı',
              description: 'Ekip performans metrikleri'
            },
            {
              path: '/target-management',
              icon: Target,
              label: 'Hedef Yönetimi',
              description: 'Takım hedeflerini belirle'
            }
          ]
        }
      ],
      personnel: [
        {
          title: 'Genel',
          items: [
            {
              path: '/dashboard',
              icon: LayoutDashboard,
              label: 'Anasayfa',
              description: 'Genel bakış ve istatistikler'
            }
          ]
        },
        {
          title: 'Satış İşlemleri',
          items: [
            {
              path: '/records',
              icon: FileText,
              label: 'Satış Kayıtlarım',
              description: 'Kişisel satış verileriniz'
            },
            {
              path: '/add-record',
              icon: Plus,
              label: 'Yeni Kayıt Ekle',
              description: 'Yeni satış kaydı oluştur'
            }
          ]
        },

      ]
    };

    return roleSpecificCategories[currentUser?.role] || roleSpecificCategories.personnel;
  };

  const navigationCategories = getNavigationItems();

  const isActive = (path) => location.pathname === path;

  const handleMenuClick = async (item) => {
    // Menu tıklamasını logla
    if (currentUser && currentUser.uid !== 'wupaniyazilim@gmail.com') {
      try {
        await logger.logSidebarMenuClick(
          currentUser.uid,
          currentUser.name || currentUser.email?.split('@')[0] || 'Kullanıcı',
          item.label,
          item.path
        );
      } catch (error) {
        console.error('Menu click log hatası:', error);
      }
    }
    setIsMobileOpen(false);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const toggleCategory = (categoryTitle) => {
    if (isCollapsed) return; // Collapsed modda kategoriler açılmasın
    
    setExpandedCategories(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(categoryTitle)) {
        newExpanded.delete(categoryTitle);
      } else {
        newExpanded.add(categoryTitle);
      }
      return newExpanded;
    });
  };

  const isCategoryExpanded = (categoryTitle) => {
    return isCollapsed || expandedCategories.has(categoryTitle);
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-gradient-purple text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative top-0 left-0 z-40 h-full bg-white dark:bg-gray-800 border-r border-purple-100 dark:border-gray-700 shadow-modern
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-72'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`flex items-center border-b border-purple-100 ${isCollapsed ? 'p-4 justify-center' : 'p-6 justify-between'}`}>
            {/* Logo and Brand */}
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-purple rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gradient-purple">Satış CRM</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Profesyonel Satış Sistemi</p>
                </div>
              </div>
            )}
            
            {/* Collapsed state logo */}
            {isCollapsed && (
              <div className="w-10 h-10 bg-gradient-purple rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}

            {/* Desktop Collapse Button */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-300 icon-hover"
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 py-6 overflow-y-auto">
            <div className={`space-y-2 ${isCollapsed ? 'px-3' : 'px-6'}`}>
              {navigationCategories.map((category, categoryIndex) => {
                const isExpanded = isCategoryExpanded(category.title);
                
                return (
                  <div key={categoryIndex} className="mb-2">
                    {/* Category Header */}
                    {!isCollapsed ? (
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className="w-full flex items-center justify-between p-2 text-left hover:bg-purple-50 rounded-lg transition-colors duration-200"
                      >
                        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          {category.title}
                        </h3>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    ) : null}
                    
                    {/* Category Items */}
                    <div className={`overflow-hidden transition-all duration-300 ${
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    } ${!isCollapsed ? 'mt-1' : ''}`}>
                      <ul className="space-y-1">
                        {category.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.path);
                          
                          return (
                            <li key={item.path}>
                              <Link
                                to={item.path}
                                onClick={() => handleMenuClick(item)}
                                className={`
                                  group flex items-center rounded-xl transition-all duration-300 transform hover:-translate-y-0.5
                                  ${isCollapsed ? 'p-3 justify-center' : 'p-3 ml-2'}
                                  ${active 
                                    ? 'bg-gradient-purple text-white shadow-lg' 
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-700'
                                  }
                                `}
                                title={isCollapsed ? item.label : ''}
                              >
                                <Icon className={`
                                  flex-shrink-0 transition-all duration-300
                                  ${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'}
                                  ${active ? 'text-white' : 'text-gray-400 group-hover:text-purple-600'}
                                `} />
                                
                                {!isCollapsed && (
                                  <div className="ml-3 flex-1">
                                    <span className="font-medium text-sm">{item.label}</span>
                                                                    <p className={`text-xs mt-0.5 ${
                                  active ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-500'
                                }`}>
                                      {item.description}
                                    </p>
                                  </div>
                                )}

                                {!isCollapsed && active && (
                                  <div className="w-2 h-2 bg-white rounded-full opacity-75"></div>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className={`p-4 border-t border-purple-100 ${isCollapsed ? 'text-center' : ''}`}>
            {isCollapsed ? (
              <div className="w-8 h-8 bg-gradient-purple rounded-lg flex items-center justify-center mx-auto">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Satış Takip CRM v2.0</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">© 2024 Tüm hakları saklıdır</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 