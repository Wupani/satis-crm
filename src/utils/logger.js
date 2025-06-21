// Güvenli logger utility
// Production ortamında console.log'ları devre dışı bırakır

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';

const isDevelopment = import.meta.env.MODE === 'development';

// Log seviyeleri
export const LOG_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
  SECURITY: 'security'
};

// Log kategorileri
export const LOG_CATEGORIES = {
  AUTH: 'authentication',
  USER_MANAGEMENT: 'user_management',
  SALES: 'sales',
  SYSTEM: 'system',
  DATA: 'data',
  SECURITY: 'security',
  NAVIGATION: 'navigation',
  UI_INTERACTION: 'ui_interaction',
  FORM: 'form_interaction',
  FILTER: 'filter_search',
  EXPORT: 'export_download'
};

class Logger {
  constructor() {
    this.isEnabled = true;
  }

  async log(level, category, action, details = {}, userId = null, userName = null) {
    if (!this.isEnabled) return;

    // Admin hesabını (wupaniyazilim@gmail.com) loglamayı atla
    const email = details?.email || '';
    if (
      userId === 'wupaniyazilim@gmail.com' ||
      email === 'wupaniyazilim@gmail.com' ||
      userName === 'Admin User' ||
      email.includes('wupaniyazilim@gmail.com')
    ) {
      // Sadece console'a yazdır, Firebase'e kaydetme
      if (isDevelopment) {
        const consoleMethod = this.getConsoleMethod(level);
        consoleMethod(`[${level.toUpperCase()}] ${category}: ${action} (Admin - Not logged)`, details);
      }
      return;
    }

    try {
      const logEntry = {
        level,
        category,
        action,
        details: typeof details === 'object' ? details : { message: details },
        userId: userId || 'system',
        userName: userName || 'System',
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ip: await this.getClientIP()
      };

      // Console'a da yazdır (development için)
      if (isDevelopment) {
        const consoleMethod = this.getConsoleMethod(level);
        consoleMethod(`[${level.toUpperCase()}] ${category}: ${action}`, details);
      }

      // Firebase'e kaydet
      await addDoc(collection(db, 'system_logs'), logEntry);
    } catch (error) {
      console.error('Log kaydedilirken hata:', error);
    }
  }

  getConsoleMethod(level) {
    switch (level) {
      case LOG_LEVELS.ERROR:
        return console.error;
      case LOG_LEVELS.WARNING:
        return console.warn;
      case LOG_LEVELS.SUCCESS:
      case LOG_LEVELS.INFO:
        return console.info;
      case LOG_LEVELS.SECURITY:
        return console.warn;
      default:
        return console.log;
    }
  }

  async getClientIP() {
    try {
      // Basit IP alma (production'da daha güvenli yöntemler kullanılabilir)
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  // Kolay kullanım methodları
  async info(category, action, details, userId, userName) {
    return this.log(LOG_LEVELS.INFO, category, action, details, userId, userName);
  }

  async warning(category, action, details, userId, userName) {
    return this.log(LOG_LEVELS.WARNING, category, action, details, userId, userName);
  }

  async error(category, action, details, userId, userName) {
    return this.log(LOG_LEVELS.ERROR, category, action, details, userId, userName);
  }

  async success(category, action, details, userId, userName) {
    return this.log(LOG_LEVELS.SUCCESS, category, action, details, userId, userName);
  }

  async security(category, action, details, userId, userName) {
    return this.log(LOG_LEVELS.SECURITY, category, action, details, userId, userName);
  }

  // Özel log methodları
  async logUserLogin(userId, userName, email) {
    // IP değişikliği kontrolü yap
    await this.checkIPChange(userId, userName, email);
    
    return this.success(
      LOG_CATEGORIES.AUTH,
      'User Login',
      {
        email,
        loginTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  // IP değişikliği kontrol fonksiyonu
  async checkIPChange(userId, userName, email) {
    try {
      const currentIP = await this.getClientIP();
      
      // Son 30 gün içindeki giriş loglarını kontrol et
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Firebase'den son giriş loglarını çek
      const { query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
      const logsRef = collection(db, 'system_logs');
      const recentLoginsQuery = query(
        logsRef,
        where('userId', '==', userId),
        where('action', '==', 'User Login'),
        where('timestamp', '>=', thirtyDaysAgo),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const recentLogins = await getDocs(recentLoginsQuery);
      const previousIPs = new Set();
      
      recentLogins.forEach(doc => {
        const data = doc.data();
        if (data.ip && data.ip !== 'unknown') {
          previousIPs.add(data.ip);
        }
      });
      
      // Eğer bu IP daha önce kullanılmamışsa alert oluştur
      if (previousIPs.size > 0 && !previousIPs.has(currentIP)) {
        await this.createSecurityAlert(userId, userName, email, currentIP, Array.from(previousIPs));
      }
      
    } catch (error) {
      console.error('IP değişikliği kontrolü sırasında hata:', error);
    }
  }

  // Güvenlik alerti oluştur
  async createSecurityAlert(userId, userName, email, newIP, previousIPs) {
    try {
      const alertData = {
        type: 'ip_change_alert',
        severity: 'medium',
        userId,
        userName,
        email,
        newIP,
        previousIPs,
        timestamp: serverTimestamp(),
        isRead: false,
        details: {
          message: `${userName} (${email}) farklı bir IP adresinden giriş yaptı`,
          newIP,
          previousIPs: previousIPs.join(', '),
          userAgent: navigator.userAgent,
          loginTime: new Date().toISOString()
        }
      };

      // Alerts collection'ına kaydet
      await addDoc(collection(db, 'security_alerts'), alertData);
      
      // Güvenlik logu da kaydet
      await this.security(
        LOG_CATEGORIES.SECURITY,
        'Suspicious IP Login',
        {
          email,
          newIP,
          previousIPs: previousIPs.join(', '),
          alertCreated: true
        },
        userId,
        userName
      );
      
      console.warn(`🚨 Güvenlik Alerti: ${userName} farklı IP'den giriş yaptı - Yeni IP: ${newIP}`);
      
    } catch (error) {
      console.error('Güvenlik alerti oluşturulurken hata:', error);
    }
  }

  async logUserLogout(userId, userName, email) {
    return this.info(
      LOG_CATEGORIES.AUTH,
      'User Logout',
      {
        email,
        logoutTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  async logFailedLogin(email, reason) {
    return this.warning(
      LOG_CATEGORIES.SECURITY,
      'Failed Login Attempt',
      {
        email,
        reason,
        attemptTime: new Date().toISOString()
      }
    );
  }

  async logUserCreated(adminUserId, adminUserName, newUserEmail, newUserRole) {
    return this.success(
      LOG_CATEGORIES.USER_MANAGEMENT,
      'User Created',
      {
        newUserEmail,
        newUserRole,
        createdBy: adminUserName
      },
      adminUserId,
      adminUserName
    );
  }

  async logUserUpdated(adminUserId, adminUserName, targetUserEmail, changes) {
    return this.info(
      LOG_CATEGORIES.USER_MANAGEMENT,
      'User Updated',
      {
        targetUserEmail,
        changes,
        updatedBy: adminUserName
      },
      adminUserId,
      adminUserName
    );
  }

  async logUserDeleted(adminUserId, adminUserName, deletedUserEmail) {
    return this.warning(
      LOG_CATEGORIES.USER_MANAGEMENT,
      'User Deleted',
      {
        deletedUserEmail,
        deletedBy: adminUserName
      },
      adminUserId,
      adminUserName
    );
  }

  async logUserActivated(adminUserId, adminUserName, targetUserEmail) {
    return this.success(
      LOG_CATEGORIES.USER_MANAGEMENT,
      'User Activated',
      {
        targetUserEmail,
        activatedBy: adminUserName
      },
      adminUserId,
      adminUserName
    );
  }

  async logUserDeactivated(adminUserId, adminUserName, targetUserEmail) {
    return this.warning(
      LOG_CATEGORIES.USER_MANAGEMENT,
      'User Deactivated',
      {
        targetUserEmail,
        deactivatedBy: adminUserName
      },
      adminUserId,
      adminUserName
    );
  }

  async logSalesRecordCreated(userId, userName, recordDetails) {
    return this.success(
      LOG_CATEGORIES.SALES,
      'Sales Record Created',
      {
        customerPhone: recordDetails.telefon,
        channel: recordDetails.kanal,
        status: recordDetails.durum
      },
      userId,
      userName
    );
  }

  async logSalesRecordUpdated(userId, userName, recordId, changes) {
    return this.info(
      LOG_CATEGORIES.SALES,
      'Sales Record Updated',
      {
        recordId,
        changes
      },
      userId,
      userName
    );
  }

  async logSalesRecordDeleted(userId, userName, recordId) {
    return this.warning(
      LOG_CATEGORIES.SALES,
      'Sales Record Deleted',
      {
        recordId
      },
      userId,
      userName
    );
  }

  async logSystemSettingsChanged(adminUserId, adminUserName, settingType, changes) {
    return this.info(
      LOG_CATEGORIES.SYSTEM,
      'System Settings Changed',
      {
        settingType,
        changes,
        changedBy: adminUserName
      },
      adminUserId,
      adminUserName
    );
  }

  async logDataExport(userId, userName, exportType, recordCount) {
    return this.info(
      LOG_CATEGORIES.DATA,
      'Data Export',
      {
        exportType,
        recordCount,
        exportTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  async logUnauthorizedAccess(userId, userName, attemptedAction, resource) {
    return this.security(
      LOG_CATEGORIES.SECURITY,
      'Unauthorized Access Attempt',
      {
        attemptedAction,
        resource,
        attemptTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  // Detaylı navigasyon logları
  async logPageNavigation(userId, userName, fromPage, toPage) {
    return this.info(
      LOG_CATEGORIES.NAVIGATION,
      'Page Navigation',
      {
        fromPage,
        toPage,
        navigationTime: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`
      },
      userId,
      userName
    );
  }

  async logSidebarMenuClick(userId, userName, menuItem, menuPath) {
    return this.info(
      LOG_CATEGORIES.UI_INTERACTION,
      'Sidebar Menu Click',
      {
        menuItem,
        menuPath,
        clickTime: new Date().toISOString(),
        windowSize: `${window.innerWidth}x${window.innerHeight}`
      },
      userId,
      userName
    );
  }

  async logButtonClick(userId, userName, buttonName, buttonAction, pageContext) {
    return this.info(
      LOG_CATEGORIES.UI_INTERACTION,
      'Button Click',
      {
        buttonName,
        buttonAction,
        pageContext,
        clickTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  async logFormSubmission(userId, userName, formName, formData, isSuccess) {
    return this.info(
      LOG_CATEGORIES.FORM,
      'Form Submission',
      {
        formName,
        fieldCount: Object.keys(formData).length,
        isSuccess,
        submissionTime: new Date().toISOString(),
        // Hassas verileri loglamayalım, sadece field isimlerini
        fields: Object.keys(formData)
      },
      userId,
      userName
    );
  }

  async logSearchFilter(userId, userName, filterType, filterValue, resultCount, pageContext) {
    return this.info(
      LOG_CATEGORIES.FILTER,
      'Search/Filter Applied',
      {
        filterType,
        filterValue,
        resultCount,
        pageContext,
        searchTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  async logDataExportDetailed(userId, userName, exportType, dataType, recordCount, filters) {
    return this.info(
      LOG_CATEGORIES.EXPORT,
      'Data Export',
      {
        exportType, // CSV, PDF, Excel
        dataType, // sales_records, users, logs
        recordCount,
        appliedFilters: filters,
        exportTime: new Date().toISOString(),
        fileSize: 'calculated_after_export'
      },
      userId,
      userName
    );
  }

  async logModalInteraction(userId, userName, modalName, action, modalData) {
    return this.info(
      LOG_CATEGORIES.UI_INTERACTION,
      'Modal Interaction',
      {
        modalName,
        action, // open, close, submit, cancel
        modalData,
        interactionTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  async logTableInteraction(userId, userName, tableName, action, details) {
    return this.info(
      LOG_CATEGORIES.UI_INTERACTION,
      'Table Interaction',
      {
        tableName,
        action, // sort, paginate, row_click, select
        details,
        interactionTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  async logSettingsChange(userId, userName, settingName, oldValue, newValue, settingCategory) {
    return this.info(
      LOG_CATEGORIES.SYSTEM,
      'Settings Changed',
      {
        settingName,
        oldValue,
        newValue,
        settingCategory,
        changeTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  async logFileUpload(userId, userName, fileName, fileSize, fileType, uploadContext) {
    return this.info(
      LOG_CATEGORIES.DATA,
      'File Upload',
      {
        fileName,
        fileSize,
        fileType,
        uploadContext,
        uploadTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  async logAPICall(userId, userName, endpoint, method, responseStatus, responseTime) {
    return this.info(
      LOG_CATEGORIES.SYSTEM,
      'API Call',
      {
        endpoint,
        method,
        responseStatus,
        responseTime,
        callTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  async logUserSessionActivity(userId, userName, activity, duration, pageContext) {
    return this.info(
      LOG_CATEGORIES.AUTH,
      'Session Activity',
      {
        activity, // page_view, idle, active, focus, blur
        duration,
        pageContext,
        activityTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }

  // Oturum zaman aşımı logu
  async logSessionTimeout(userId, userName, email, timeoutMinutes) {
    return this.info(
      LOG_CATEGORIES.AUTH,
      'Session Timeout',
      {
        email,
        timeoutMinutes,
        reason: 'Inactivity timeout',
        timeoutTime: new Date().toISOString()
      },
      userId,
      userName
    );
  }
}

// Singleton instance
const logger = new Logger();

export default logger;

// Development ortamında console'u override etmek için
export const setupSecureLogging = () => {
  if (!isDevelopment) {
    // Production'da console.log'ları devre dışı bırak
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    
    // console.error'ı güvenli hale getir
    const originalError = console.error;
    console.error = (...args) => {
      // Hassas bilgi içeren hataları filtrele
      const safeArgs = args.map(arg => {
        if (typeof arg === 'string') {
          // Email, telefon, ID gibi hassas bilgileri gizle
          return arg
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_HIDDEN]')
            .replace(/\b0[0-9]{10}\b/g, '[PHONE_HIDDEN]')
            .replace(/\b[A-Za-z0-9]{20,}\b/g, '[ID_HIDDEN]');
        }
        return arg;
      });
      originalError(...safeArgs);
    };
  }
}; 