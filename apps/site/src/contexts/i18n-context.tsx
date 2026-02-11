import React, { createContext, useContext, type ReactNode } from 'react';
import i18n, {
  type Language,
  DEFAULT_LANGUAGE,
  AVAILABLE_LANGUAGES,
} from '../lib/i18n';

// Define the context type
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  availableLanguages: Language[];
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  t: (key: string, options?: any) => string;
  changeLanguage: (lang: Language) => Promise<void>;
}

// Create the context with default values
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Provider component
interface I18nProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  // Hydrate language from localStorage or use provided initial language or default
  const getInitialLanguage = (): Language => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem(
        'i18n-language',
      ) as Language | null;
      if (savedLanguage && AVAILABLE_LANGUAGES.includes(savedLanguage)) {
        return savedLanguage;
      }
    }

    return DEFAULT_LANGUAGE;
  };

  // Set the initial language
  const [language, setLanguageState] =
    React.useState<Language>(getInitialLanguage);

  // Function to change language
  const changeLanguage = async (lang: Language) => {
    if (AVAILABLE_LANGUAGES.includes(lang)) {
      await i18n.changeLanguage(lang);
      setLanguageState(lang);
      // Persist language preference in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('i18n-language', lang);
      }
    }
  };

  // Set initial language on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: lint debt cleanup
    React.useEffect(() => {
    const initialLang = getInitialLanguage();
    if (AVAILABLE_LANGUAGES.includes(initialLang)) {
      i18n.changeLanguage(initialLang);
      setLanguageState(initialLang);
    }
  }, []);

  // Memoize the context value
  // biome-ignore lint/correctness/useExhaustiveDependencies: lint debt cleanup
    const contextValue = React.useMemo(
    () => ({
      language,
      setLanguage: changeLanguage,
      availableLanguages: AVAILABLE_LANGUAGES,
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      t: (key: string, options?: any) => i18n.t(key, options),
      changeLanguage,
    }),
    [language],
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
};

// Custom hook to use the i18n context
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Higher-order component for class components
export const withI18n = <P extends object>(
  Component: React.ComponentType<P & I18nContextType>,
): React.FC<Omit<P, keyof I18nContextType>> => {
  return (props: Omit<P, keyof I18nContextType>) => (
    <I18nContext.Consumer>
      {/** biome-ignore lint/style/noNonNullAssertion: lint debt cleanup */}
      {(context) => <Component {...(props as P)} {...context!} />}
    </I18nContext.Consumer>
  );
};
