import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  where,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { 
  MessageCircle, 
  Send, 
  Users, 
  X, 
  Minimize2, 
  Maximize2,
  Search,
  CheckCheck,
  Check,
  Circle
} from 'lucide-react';

const ChatSystem = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [typingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userStatuses, setUserStatuses] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Kullanıcıları ve online durumlarını dinle
  useEffect(() => {
    if (!currentUser) return;

    const usersQuery = query(
      collection(db, 'users'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersList = [];
      const onlineSet = new Set();
      const statusMap = {};
      
      snapshot.docs.forEach(doc => {
        const userData = { id: doc.id, ...doc.data() };
        if (userData.id !== currentUser?.uid) {
          usersList.push(userData);
          
          // Online durumu kontrolü
          if (userData.isOnline) {
            onlineSet.add(userData.id);
          }
          
          // Kullanıcı durumu bilgilerini kaydet
          statusMap[userData.id] = {
            isOnline: userData.isOnline || false,
            lastSeen: userData.lastSeen
          };
        }
      });
      
      setUsers(usersList);
      setOnlineUsers(onlineSet);
      setUserStatuses(statusMap);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Online kullanıcıları takip et
  useEffect(() => {
    if (!currentUser) return;

    // Kendi online durumunu güncelle
    const updateOnlineStatus = async (status) => {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isOnline: status,
          lastSeen: serverTimestamp()
        });
      } catch (error) {
        console.error('Online durum güncellenemedi:', error);
      }
    };

    updateOnlineStatus(true);

    // Periyodik olarak online durumunu güncelle (her 30 saniyede bir)
    const onlineInterval = setInterval(() => {
      updateOnlineStatus(true);
    }, 30000);

    // Bildirim izni iste
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Sayfa kapatılırken offline yap
    const handleBeforeUnload = () => updateOnlineStatus(false);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(onlineInterval);
      updateOnlineStatus(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Son görülme zamanını formatla
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Hiç görülmedi';
    
    const date = lastSeen.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce görüldü';
    if (diffMins < 60) return `${diffMins} dakika önce görüldü`;
    if (diffHours < 24) return `${diffHours} saat önce görüldü`;
    if (diffDays < 7) return `${diffDays} gün önce görüldü`;
    return date.toLocaleDateString('tr-TR') + ' tarihinde görüldü';
  };

  // Tüm chatlerden okunmamış mesajları dinle
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribes = [];
    let totalUnread = 0;
    const unreadByUser = {};

    const updateUnreadCounts = () => {
      setUnreadCounts(unreadByUser);
      setTotalUnreadCount(totalUnread);
    };

    // Her kullanıcı için chat dinleyicisi oluştur
    users.forEach(user => {
      const chatId = [currentUser.uid, user.id].sort().join('_');
      const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        where('senderId', '==', user.id),
        where('read', '==', false)
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const unreadCount = snapshot.docs.length;
        
        // Önceki sayıyı çıkar, yeni sayıyı ekle
        totalUnread -= unreadByUser[user.id] || 0;
        totalUnread += unreadCount;
        unreadByUser[user.id] = unreadCount;
        
        updateUnreadCounts();
        
        // Browser bildirim (sadece yeni mesajlar için)
        if (unreadCount > 0 && Notification.permission === 'granted') {
          const newMessages = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.timestamp && data.timestamp.toDate() > new Date(Date.now() - 5000); // Son 5 saniye
          });
          
          if (newMessages.length > 0) {
            const lastMessage = newMessages[newMessages.length - 1].data();
            new Notification(`${unreadCount} okunmamış mesajınız var`, {
              body: `${user.name || user.email?.split('@')[0]}: ${lastMessage.text}`,
              icon: '/vite.svg',
              tag: `chat-${user.id}`,
              requireInteraction: false
            });
          }
        }
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentUser, users, setUnreadCounts, setTotalUnreadCount]);

  // Aktif sohbet mesajlarını dinle
  useEffect(() => {
    if (!activeChat || !currentUser) return;

    const chatId = [currentUser.uid, activeChat.id].sort().join('_');
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(messagesList);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [activeChat, currentUser]);

  // En alta scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mesaj gönder
  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !currentUser) return;

    const chatId = [currentUser.uid, activeChat.id].sort().join('_');
    
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.name || currentUser.email?.split('@')[0],
        timestamp: serverTimestamp(),
        read: false
      });

      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Mesaj gönderilemedi:', error);
    }
  }, [newMessage, activeChat, currentUser]);

  // Chat başlat
  const startChat = useCallback(async (user) => {
    setActiveChat(user);
    setIsMinimized(false);
    
    // Bu kullanıcıdan gelen okunmamış mesajları okundu olarak işaretle
    try {
      const chatId = [currentUser.uid, user.id].sort().join('_');
      const unreadMessagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        where('senderId', '==', user.id),
        where('read', '==', false)
      );
      
      const unreadSnapshot = await getDocs(unreadMessagesQuery);
      const updatePromises = unreadSnapshot.docs.map(messageDoc => 
        updateDoc(messageDoc.ref, { read: true })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Mesajlar okundu olarak işaretlenemedi:', error);
    }
  }, [currentUser]);

  // Filtrelenmiş kullanıcılar
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Yetki sırasına göre sıralama (Admin > Team Leader > Personnel)
  const sortedUsers = filteredUsers.sort((a, b) => {
    // Role normalleştirme - farklı formatları destekle
    const normalizeRole = (role) => {
      if (role === 'admin' || role === 'Admin') return 'admin';
      if (role === 'teamLeader' || role === 'Team Leader') return 'teamLeader';
      if (role === 'personnel' || role === 'Personnel') return 'personnel';
      return role;
    };

    const roleOrder = { 'admin': 1, 'teamLeader': 2, 'personnel': 3 };
    const roleA = roleOrder[normalizeRole(a.role)] || 4;
    const roleB = roleOrder[normalizeRole(b.role)] || 4;
    
    if (roleA !== roleB) {
      return roleA - roleB;
    }
    
    // Aynı yetkideyse isme göre sırala
    const nameA = (a.name || a.email?.split('@')[0] || '').toLowerCase();
    const nameB = (b.name || b.email?.split('@')[0] || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Typing indicator'ı göster
  const showTypingIndicator = activeChat && typingUsers[activeChat.id];

  // Mesaj zamanı formatla
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}dk`;
    if (diffHours < 24) return `${diffHours}sa`;
    if (diffDays < 7) return `${diffDays}g`;
    return date.toLocaleDateString('tr-TR');
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-3 lg:p-4 bg-gradient-purple text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 ${
          isOpen ? 'rotate-45' : ''
        }`}
      >
        <MessageCircle className="h-5 w-5 lg:h-6 lg:w-6" />
        {/* Yeni mesaj bildirimi */}
        {totalUnreadCount > 0 && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {totalUnreadCount}
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 z-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-purple-100 dark:border-gray-700 transition-all duration-300 ${
          isMinimized ? 'h-16' : 'h-[500px]'
        } w-96 max-w-[calc(100vw-3rem)] lg:w-96`}>
          
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-purple-100 dark:border-gray-700 bg-gradient-purple text-white rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm">
                  {activeChat ? activeChat.name || activeChat.email?.split('@')[0] : 'Sohbet'}
                  {!activeChat && totalUnreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {totalUnreadCount} okunmamış
                    </span>
                  )}
                </h3>
                {/* Aktif sohbette online durumu göster */}
                {activeChat && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Circle className={`h-2 w-2 ${
                      onlineUsers.has(activeChat.id) ? 'text-green-400 fill-current' : 'text-gray-300 fill-current'
                    }`} />
                    <span className="text-xs text-purple-100">
                      {onlineUsers.has(activeChat.id) ? 'Çevrimiçi' : 
                       userStatuses[activeChat.id]?.lastSeen ? formatLastSeen(userStatuses[activeChat.id].lastSeen) : 'Çevrimdışı'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-purple-600 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-purple-600 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="h-[420px] flex">
              {/* Users List */}
              {!activeChat && (
                <div className="w-full p-4">
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Personel ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Users */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {sortedUsers.map(user => {
                      const isOnline = onlineUsers.has(user.id);
                      const userStatus = userStatuses[user.id];
                      
                      return (
                        <button
                          key={user.id}
                          onClick={() => startChat(user)}
                          className="w-full flex items-center space-x-3 p-3 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-purple rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {(user.name || user.email?.split('@')[0] || 'U')[0].toUpperCase()}
                            </div>
                            {/* Online durumu göstergesi */}
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                              isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="flex flex-col items-start">
                                  <div className="flex items-center space-x-2">
                                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                      {user.name || user.email?.split('@')[0]}
                                    </p>
                                    {/* Online durum metni */}
                                    <Circle className={`h-2 w-2 ${isOnline ? 'text-green-500 fill-current' : 'text-gray-400 fill-current'}`} />
                                  </div>
                                  {/* Son görülme zamanı */}
                                  {!isOnline && userStatus?.lastSeen && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatLastSeen(userStatus.lastSeen)}
                                    </p>
                                  )}
                                  {isOnline && (
                                    <p className="text-xs text-green-600 dark:text-green-400">
                                      Çevrimiçi
                                    </p>
                                  )}
                                </div>
                                {/* Yetki rozeti */}
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                  (user.role === 'admin' || user.role === 'Admin')
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                    : (user.role === 'teamLeader' || user.role === 'Team Leader')
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {(user.role === 'admin' || user.role === 'Admin') ? 'Yönetici' : 
                                   (user.role === 'teamLeader' || user.role === 'Team Leader') ? 'Takım Lideri' : 'Personel'}
                                </span>
                              </div>
                              {/* Okunmamış mesaj sayısı */}
                              {unreadCounts[user.id] > 0 && (
                                <div className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                  {unreadCounts[user.id]}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {activeChat && (
                <div className="w-full flex flex-col">
                  {/* Back to users */}
                  <button
                    onClick={() => setActiveChat(null)}
                    className="flex items-center space-x-2 p-3 text-purple-600 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Kullanıcılara Dön</span>
                  </button>

                  {/* Messages */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-2 max-h-80">
                    {messages.map((message, index) => {
                      // Önceki mesajla aynı kişiden mi kontrol et
                      const prevMessage = messages[index - 1];
                      const showSenderName = message.senderId !== currentUser.uid && 
                                           (!prevMessage || prevMessage.senderId !== message.senderId);
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs ${message.senderId === currentUser.uid ? 'text-right' : 'text-left'}`}>
                            {/* Gönderen kişinin adı (sadece başkasından gelen ve ilk mesajlarda) */}
                            {showSenderName && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-1 font-medium">
                                {message.senderName || activeChat?.name || activeChat?.email?.split('@')[0] || 'Bilinmeyen'}
                              </div>
                            )}
                            <div className={`px-4 py-2 rounded-2xl ${
                              message.senderId === currentUser.uid
                                ? 'bg-gradient-purple text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            } ${!showSenderName && message.senderId !== currentUser.uid ? 'mt-1' : ''}`}>
                              <p className="text-sm">{message.text}</p>
                              <div className={`flex items-center ${
                                message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'
                              } space-x-1 mt-1 ${
                                message.senderId === currentUser.uid ? 'text-purple-100' : 'text-gray-500'
                              }`}>
                                <span className="text-xs">{formatMessageTime(message.timestamp)}</span>
                                {message.senderId === currentUser.uid && (
                                  <div className="flex">
                                    {message.read ? (
                                      <CheckCheck className="h-3 w-3" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Typing Indicator */}
                    {showTypingIndicator && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-2xl">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Mesaj yazın..."
                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2 bg-gradient-purple text-white rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default memo(ChatSystem); 