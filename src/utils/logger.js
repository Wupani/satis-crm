// Güvenli logger utility
// Production ortamında console.log'ları devre dışı bırakır

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args) => {
    // Error logları production'da da gösterilsin ama hassas bilgi içermeyecek şekilde
    if (isDevelopment) {
      console.error(...args);
    } else {
      // Production'da sadece genel hata mesajı
      console.error('Bir hata oluştu. Detaylar için destek ekibiyle iletişime geçin.');
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  }
};

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