// Güvenli logger utility - Sadece Login/Logout kayıtları
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

// Log kategorileri - Sadece auth ve security
export const LOG_CATEGORIES = {
  AUTH: 'authentication',
  SECURITY: 'security'
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

      // Firebase'e kaydet
      await addDoc(collection(db, 'system_logs'), logEntry);
    } catch (error) {
      console.error('Log kaydedilirken hata:', error);
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
  async success(category, action, details, userId, userName) {
    return this.log(LOG_LEVELS.SUCCESS, category, action, details, userId, userName);
  }

  async warning(category, action, details, userId, userName) {
    return this.log(LOG_LEVELS.WARNING, category, action, details, userId, userName);
  }

  // Sadece Login/Logout kayıtları
  async logUserLogin(userId, userName, email) {
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

  async logUserLogout(userId, userName, email) {
    return this.success(
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

  // Boş methodlar - Geriye uyumluluk için (hiçbir şey yapmaz)
  async logUserCreated() { return Promise.resolve(); }
  async logUserUpdated() { return Promise.resolve(); }
  async logUserDeleted() { return Promise.resolve(); }
  async logUserDeactivated() { return Promise.resolve(); }
  async logSalesRecordCreated() { return Promise.resolve(); }
  async logSalesRecordUpdated() { return Promise.resolve(); }
  async logSalesRecordDeleted() { return Promise.resolve(); }
  async logSystemSettingsChanged() { return Promise.resolve(); }
  async logDataExport() { return Promise.resolve(); }
  async logUnauthorizedAccess() { return Promise.resolve(); }
  async logPageNavigation() { return Promise.resolve(); }
  async logSidebarMenuClick() { return Promise.resolve(); }
  async logButtonClick() { return Promise.resolve(); }
  async logFormSubmission() { return Promise.resolve(); }
  async logSearchFilter() { return Promise.resolve(); }
  async logDataExportDetailed() { return Promise.resolve(); }
  async logModalInteraction() { return Promise.resolve(); }
  async logTableInteraction() { return Promise.resolve(); }
  async logSettingsChange() { return Promise.resolve(); }
  async logFileUpload() { return Promise.resolve(); }
  async logAPICall() { return Promise.resolve(); }
  async logUserSessionActivity() { return Promise.resolve(); }
  async logSessionTimeout() { return Promise.resolve(); }
}

// Singleton instance
const logger = new Logger();

// Development'ta console log etkinken production'da kapalı
export const setupSecureLogging = () => {
  if (!isDevelopment) {
    // Production'da console methodlarını override et
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
    
    // Kritik errorlar için exception bırak
    window.addEventListener('error', (event) => {
      // Sadece kritik hataları logla
      logger.log('error', 'system', 'Critical Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }
};

export default logger; 