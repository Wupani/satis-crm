import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, Mail, Lock, AlertCircle, Send, X } from 'lucide-react';
import logger from '../utils/logger';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Reset password modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { login, resetPassword } = useAuth();

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
      
      // Başarılı giriş logla
      if (userCredential?.user) {
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
      
      // Başarısız giriş denemesini logla
      await logger.logFailedLogin(email, errorReason);
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      setError('Lütfen e-posta adresinizi girin');
      return;
    }

    try {
      setError('');
      setResetLoading(true);
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.');
      } else {
        setError('Şifre sıfırlama e-postası gönderilirken hata oluştu.');
      }
    }
    setResetLoading(false);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetEmail('');
    setError('');
    setResetSuccess(false);
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-periwinkle-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 float-animation"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-lavender-200 to-lavender-300 rounded-full opacity-20 float-animation" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-periwinkle-200 to-periwinkle-300 rounded-full opacity-10 float-animation" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="w-full max-w-lg mx-auto">
        {/* Login Form */}
        <div className="card-modern p-10 shadow-modern-hover">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gradient-purple mb-2">Hoş Geldiniz</h2>
            <p className="text-gray-600 font-medium">Hesabınıza giriş yapın</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 animate-pulse">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                E-posta Adresi
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-modern"
                  placeholder=""
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-modern pr-12"
                  placeholder=""
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-purple-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 font-medium">
                  Beni hatırla
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                Şifremi unuttum
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spin-smooth"></div>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Giriş Yap</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card-modern p-6 w-full max-w-md relative">
            <button
              onClick={closeResetModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {!resetSuccess ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Send className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Şifre Sıfırlama</h3>
                  <p className="text-sm text-gray-600">
                    E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta Adresi
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="input-modern pl-16"
                        placeholder=""
                        required
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={closeResetModal}
                      className="btn-secondary flex-1"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="btn-primary flex-1 flex items-center justify-center space-x-2"
                    >
                      {resetLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin-smooth"></div>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Gönder</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Send className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">E-posta Gönderildi!</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. 
                  Lütfen e-postanızı kontrol edin.
                </p>
                <button
                  onClick={closeResetModal}
                  className="btn-primary w-full"
                >
                  Tamam
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login; 