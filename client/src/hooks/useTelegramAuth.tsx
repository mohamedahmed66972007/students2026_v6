
import { createContext, useState, useContext, useEffect, ReactNode } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  uid: string;
  isAdmin: boolean;
  isMainAdmin: boolean;
}

interface TelegramAuthContextType {
  user: TelegramUser | null;
  isAdmin: boolean;
  isMainAdmin: boolean;
  uid: string;
  login: () => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  sendFriendRequest: (friendUid: string) => Promise<boolean>;
  acceptFriendRequest: (requesterUid: string) => Promise<boolean>;
  rejectFriendRequest: (requesterUid: string) => Promise<boolean>;
  getFriendRequests: () => Promise<any[]>;
  getFriends: () => Promise<any[]>;
  getFriendSchedule: (friendUid: string) => Promise<any[]>;
  updateStudySessions: (sessions: any[]) => Promise<boolean>;
  getStudySessions: () => Promise<any[]>;
}

const TelegramAuthContext = createContext<TelegramAuthContextType | undefined>(undefined);

export function TelegramAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      // Auto-login when component mounts
      login();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (): Promise<boolean> => {
    try {
      const initData = window.Telegram?.WebApp?.initData;
      
      if (!initData) {
        // For development/testing
        setUser({
          id: 123456789,
          first_name: "Test",
          last_name: "User",
          username: "testuser",
          uid: "12345678",
          isAdmin: true,
          isMainAdmin: true
        });
        setIsLoading(false);
        return true;
      }

      const response = await fetch('/api/telegram/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const sendFriendRequest = async (friendUid: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({ friendUid }),
      });

      return response.ok;
    } catch (error) {
      console.error('Send friend request error:', error);
      return false;
    }
  };

  const acceptFriendRequest = async (requesterUid: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({ requesterUid }),
      });

      return response.ok;
    } catch (error) {
      console.error('Accept friend request error:', error);
      return false;
    }
  };

  const rejectFriendRequest = async (requesterUid: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({ requesterUid }),
      });

      return response.ok;
    } catch (error) {
      console.error('Reject friend request error:', error);
      return false;
    }
  };

  const getFriendRequests = async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/friends/requests', {
        headers: {
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || '',
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Get friend requests error:', error);
      return [];
    }
  };

  const getFriends = async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/friends', {
        headers: {
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || '',
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Get friends error:', error);
      return [];
    }
  };

  const getFriendSchedule = async (friendUid: string): Promise<any[]> => {
    try {
      const response = await fetch(`/api/friends/${friendUid}/schedule`, {
        headers: {
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || '',
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Get friend schedule error:', error);
      return [];
    }
  };

  const updateStudySessions = async (sessions: any[]): Promise<boolean> => {
    try {
      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify(sessions),
      });

      return response.ok;
    } catch (error) {
      console.error('Update study sessions error:', error);
      return false;
    }
  };

  const getStudySessions = async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/study-sessions', {
        headers: {
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || '',
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Get study sessions error:', error);
      return [];
    }
  };

  const value: TelegramAuthContextType = {
    user,
    isAdmin: user?.isAdmin || false,
    isMainAdmin: user?.isMainAdmin || false,
    uid: user?.uid || '',
    login,
    logout,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriendRequests,
    getFriends,
    getFriendSchedule,
    updateStudySessions,
    getStudySessions,
  };

  return (
    <TelegramAuthContext.Provider value={value}>
      {children}
    </TelegramAuthContext.Provider>
  );
}

export function useTelegramAuth() {
  const context = useContext(TelegramAuthContext);
  if (context === undefined) {
    throw new Error('useTelegramAuth must be used within a TelegramAuthProvider');
  }
  return context;
}

// إضافة نوع Telegram WebApp للنافذة
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        MainButton: any;
        BackButton: any;
        close: () => void;
      };
    };
  }
}
