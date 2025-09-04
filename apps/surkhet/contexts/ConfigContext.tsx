import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConfigContextType {
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  isConfigDialogVisible: boolean;
  showConfigDialog: () => void;
  hideConfigDialog: () => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [websiteUrl, setWebsiteUrl] = useState('https://surkhet.pages.dev');
  const [isConfigDialogVisible, setIsConfigDialogVisible] = useState(false);

  // Load saved URL from storage on mount
  useEffect(() => {
    if (!__DEV__) return
    const loadSavedUrl = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem('websiteUrl');
        if (savedUrl) {
          setWebsiteUrl(savedUrl);
        }
      } catch (error) {
        console.error('Failed to load saved URL:', error);
      }
    };

    loadSavedUrl();
  }, []);

  // Save URL to storage when it changes
  useEffect(() => {
    if (!__DEV__) return
    const saveUrl = async () => {
      try {
        await AsyncStorage.setItem('websiteUrl', websiteUrl);
      } catch (error) {
        console.error('Failed to save URL:', error);
      }
    };

    saveUrl();
  }, [websiteUrl]);

  const showConfigDialog = () => setIsConfigDialogVisible(true);
  const hideConfigDialog = () => setIsConfigDialogVisible(false);

  return (
    <ConfigContext.Provider
      value={{
        websiteUrl,
        setWebsiteUrl,
        isConfigDialogVisible,
        showConfigDialog,
        hideConfigDialog,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}