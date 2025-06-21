import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import logger from '../utils/logger';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const userCredential = await login(email, password);
      
      // Başarılı giriş logla (admin hesabı hariç)
      if (userCredential?.user && email !== 'wupaniyazilim@gmail.com') {
        await logger.logUserLogin(
          userCredential.user.uid,
          userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Kullanıcı',
          email
        );
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      
      // Başarısız giriş logla
      let errorReason = 'Bilinmeyen hata';
      if (error.message.includes('Hesabınız pasif')) {
        setError('Hesabınız pasif durumda. Lütfen yöneticinizle iletişime geçin.');
        errorReason = 'Hesap pasif durumda';
      } else if (error.code === 'auth/user-not-found') {
        setError('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.');
        errorReason = 'Kullanıcı bulunamadı';
      } else if (error.code === 'auth/wrong-password') {
        setError('Hatalı şifre.');
        errorReason = 'Hatalı şifre';
      } else if (error.code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi.');
        errorReason = 'Geçersiz e-posta';
      } else if (error.code === 'auth/invalid-credential') {
        setError('Geçersiz e-posta veya şifre.');
        errorReason = 'Geçersiz bilgiler';
      } else {
        setError('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
        errorReason = error.message || 'Giriş hatası';
      }
      
      // Başarısız giriş denemesini logla (admin hesabı hariç)
      if (email !== 'wupaniyazilim@gmail.com') {
        await logger.logFailedLogin(email, errorReason);
      }
    }
    setLoading(false);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 float-animation"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-lavender-200 to-lavender-300 rounded-full opacity-20 float-animation" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-periwinkle-200 to-periwinkle-300 rounded-full opacity-10 float-animation" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="w-full max-w-lg mx-auto">
        {/* Login Form */}
        <div className="card-modern p-6 sm:p-8 lg:p-10 shadow-modern-hover">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-purple rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
              <LogIn className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gradient-purple mb-1 sm:mb-2">Hoş Geldiniz</h2>
            <p className="text-sm sm:text-base text-gray-600 font-medium">Hesabınıza giriş yapın</p>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl flex items-center space-x-2 sm:space-x-3 animate-pulse">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-xs sm:text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                E-posta Adresi
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-modern text-sm sm:text-base"
                  placeholder=""
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-modern pr-10 sm:pr-12 text-sm sm:text-base"
                  placeholder=""
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 focus:ring-purple-500 border-purple-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-gray-700 font-medium">
                Beni hatırla
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center space-x-2 text-sm sm:text-base py-2.5 sm:py-3"
            >
              {loading ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full spin-smooth"></div>
              ) : (
                <>
                  <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Giriş Yap</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>


    </div>
  );
};

export default Login; 