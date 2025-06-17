import React, { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext();

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

export const DarkModeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    // Local storage'dan dark mode durumunu al
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      return JSON.parse(savedDarkMode);
    }
    // Varsayılan olarak sistem tercihini kullan
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Dark mode durumunu local storage'a kaydet
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    
    // HTML'e dark class'ını ekle/çıkar
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const value = {
    darkMode,
    toggleDarkMode
  };

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
}; 