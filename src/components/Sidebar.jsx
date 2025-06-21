import React, { useState, useMemo, useCallback, memo } from 'react';
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
  RefreshCw,
  Loader2,
  Phone,
  UserPlus
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Genel'])); // Anasayfa kategorisi default açık
  const [isNavigating, setIsNavigating] = useState(false);
  const [loadingPath, setLoadingPath] = useState(null);

  // Memoize navigation items to prevent recalculation on every render
  const navigationCategories = useMemo(() => {
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
              path: '/personnel-development',
              icon: UserPlus,
              label: 'Personel Gelişimi',
              description: 'Personel analizi ve gelişim önerileri'
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
            },
            {
              path: '/duplicate-numbers',
              icon: Phone,
              label: 'Mükerrer Numaralar',
              description: 'Aynı numaradan gelen çoklu aramalar'
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
              path: '/personnel-development',
              icon: UserPlus,
              label: 'Personel Gelişimi',
              description: 'Takım analizi ve gelişim önerileri'
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
            },
            {
              path: '/duplicate-numbers',
              icon: Phone,
              label: 'Mükerrer Numaralar',
              description: 'Aynı numaradan gelen çoklu aramalar'
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
  }, [currentUser?.role]);

  const isActive = (path) => location.pathname === path;

  const handleMenuClick = useCallback(async (item, event) => {
    // Eğer zaten navigasyon yapılıyorsa, tıklamayı engelle
    if (isNavigating) {
      event.preventDefault();
      return;
    }

    // Loading state'i aktifleştir
    setIsNavigating(true);
    setLoadingPath(item.path);
    
    // Önce UI'ı güncelle (hızlı)
    setIsMobileOpen(false);
    
    // Navigasyon sonrası loading state'i temizle
    setTimeout(() => {
      setIsNavigating(false);
      setLoadingPath(null);
    }, 1000); // 1 saniye sonra tekrar tıklayabilir
    
    // Logging'i arka planda yap (non-blocking)
    if (currentUser && currentUser.uid !== 'wupaniyazilim@gmail.com') {
      // setTimeout ile async işlemi arka plana at
      setTimeout(async () => {
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
      }, 0);
    }
  }, [currentUser, isNavigating]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen(prev => !prev);
  }, []);

  const toggleCategory = useCallback((categoryTitle) => {
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
  }, [isCollapsed]);

  const isCategoryExpanded = useCallback((categoryTitle) => {
    return isCollapsed || expandedCategories.has(categoryTitle);
  }, [isCollapsed, expandedCategories]);

  // Optimize edilmiş CategoryHeader component
  const CategoryHeader = useCallback(({ category, isExpanded, onToggle }) => (
    <button
      onClick={() => onToggle(category.title)}
      className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-purple-50 rounded-lg transition-colors duration-150"
    >
      <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
        {category.title}
      </h3>
      {isExpanded ? (
        <ChevronUp className="h-3 w-3 text-gray-400" />
      ) : (
        <ChevronDown className="h-3 w-3 text-gray-400" />
      )}
    </button>
  ), []);

  // Optimize edilmiş MenuItem component
  const MenuItem = useCallback(({ item, isCollapsed, active, onMenuClick }) => {
    const Icon = item.icon;
    const isLoading = loadingPath === item.path;
    const isDisabled = isNavigating && !isLoading;
    
    return (
      <li>
        <Link
          to={item.path}
          onClick={(e) => onMenuClick(item, e)}
          className={`
            group flex items-center rounded-xl transition-colors duration-150 relative
            ${isCollapsed ? 'p-2 justify-center' : 'px-2 py-2 ml-2'}
            ${active 
              ? 'bg-gradient-purple text-white shadow-lg' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-700'
            }
            ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
          `}
          title={isCollapsed ? item.label : ''}
        >
          {isLoading ? (
            <Loader2 className={`
              flex-shrink-0 animate-spin transition-colors duration-150
              ${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}
              ${active ? 'text-white' : 'text-purple-600'}
            `} />
          ) : (
            <Icon className={`
              flex-shrink-0 transition-colors duration-150
              ${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}
              ${active ? 'text-white' : 'text-gray-400 group-hover:text-purple-600'}
            `} />
          )}
          
          {!isCollapsed && (
            <div className="ml-2 flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">{item.label}</span>
                {isLoading && (
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    Yükleniyor...
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0 ${
                active ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-500'
              }`}>
                {item.description}
              </p>
            </div>
          )}

          {!isCollapsed && active && !isLoading && (
            <div className="w-2 h-2 bg-white rounded-full opacity-75"></div>
          )}
        </Link>
      </li>
    );
  }, [loadingPath, isNavigating]);

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed top-20 left-4 z-[60] p-3 bg-gradient-purple text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[45] touch-manipulation"
          onClick={toggleMobileSidebar}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative top-0 left-0 z-[50] h-full bg-white dark:bg-gray-800 border-r border-purple-100 dark:border-gray-700 shadow-modern
        transition-transform duration-200 ease-out transform-gpu
        ${isCollapsed ? 'w-20' : 'w-72'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`flex items-center border-b border-purple-100 ${isCollapsed ? 'p-3 justify-center' : 'p-4 justify-between'}`}>
            {/* Logo and Brand */}
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-purple rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gradient-purple">Satış CRM</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Profesyonel Satış Sistemi</p>
                </div>
              </div>
            )}
            
            {/* Collapsed state logo */}
            {isCollapsed && (
              <div className="w-8 h-8 bg-gradient-purple rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            )}

            {/* Desktop Collapse Button */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors duration-200 icon-hover"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent hover:scrollbar-thumb-purple-300">
            <div className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-4'}`}>
              {navigationCategories.map((category, categoryIndex) => {
                const isExpanded = isCategoryExpanded(category.title);
                
                return (
                  <div key={categoryIndex} className="mb-1">
                    {/* Category Header */}
                    {!isCollapsed ? (
                      <CategoryHeader category={category} isExpanded={isExpanded} onToggle={toggleCategory} />
                    ) : null}
                    
                    {/* Category Items */}
                    <div className={`overflow-hidden transition-all duration-200 will-change-transform transform-gpu ${
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    } ${!isCollapsed ? 'mt-0.5' : ''}`}>
                      <ul className="space-y-0.5">
                        {category.items.map((item) => {
                          const active = isActive(item.path);
                          
                          return (
                            <MenuItem key={item.path} item={item} isCollapsed={isCollapsed} active={active} onMenuClick={handleMenuClick} />
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
          <div className={`p-3 border-t border-purple-100 ${isCollapsed ? 'text-center' : ''}`}>
            {isCollapsed ? (
              <div className="w-6 h-6 bg-gradient-purple rounded-lg flex items-center justify-center mx-auto">
                <LayoutDashboard className="h-3 w-3 text-white" />
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Satış Takip CRM v2.0</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">© 2024 Tüm hakları saklıdır</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar); 