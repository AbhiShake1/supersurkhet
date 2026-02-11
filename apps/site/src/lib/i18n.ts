import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// Define translation resources at the code level
export const resources = {
  en: {
    translation: {
      // Basic translations
      welcome: 'welcome',
      hello: 'hello',
      goodbye: 'goodbye',
      save: 'save',
      cancel: 'cancel',
      delete: 'delete',
      edit: 'edit',
      add: 'add',
      search: 'search',
      settings: 'settings',
      profile: 'profile',
      logout: 'logout',
      login: 'login',
      signup: 'signup',
      dashboard: 'dashboard',
      home: 'home',
      about: 'about',
      contact: 'contact',
      help: 'help',
      more: 'more',
      back: 'back',
      next: 'next',
      previous: 'previous',
      yes: 'yes',
      no: 'no',
      ok: 'ok',
      close: 'close',
      confirm: 'confirm',
      error: 'error',
      success: 'success',
      warning: 'warning',
      info: 'info',
      loading: 'loading',
      retry: 'retry',
      refresh: 'refresh',

      // SuperSurkhet specific
      superSurkhet: 'SuperSurkhet',
      digitalHub: 'Digital Hub',
      surkhetValley: 'Surkhet Valley',
      connect: 'Connect',
      discover: 'Discover',
      thrive: 'Thrive',
      localBusiness: 'Local Business',
      community: 'Community',
      services: 'Services',
      directory: 'Directory',
      marketplace: 'Marketplace',
      events: 'Events',
      nepaleseRupee: 'Nepalese Rupee',
      usDollar: 'US Dollar',
    },
  },
  ne: {
    translation: {
      // Basic translations in Nepali
      welcome: 'स्वागत छ',
      hello: 'नमस्कार',
      goodbye: 'फेरि भेटौला',
      save: 'बचत गर्नुहोस्',
      cancel: 'रद्द गर्नुहोस्',
      delete: 'मेटाउनुहोस्',
      edit: 'सम्पादन गर्नुहोस्',
      add: 'थप्नुहोस्',
      search: 'खोज्नुहोस्',
      settings: 'सेटिंग्स',
      profile: 'प्रोफाइल',
      logout: 'लग आउट',
      login: 'लग इन',
      signup: 'साइन अप',
      dashboard: 'ड्यासबोर्ड',
      home: 'गृह',
      about: 'हाम्रो बारे',
      contact: 'सम्पर्क',
      help: 'मद्दत',
      more: 'थप',
      back: 'पछाडि',
      next: 'अर्को',
      previous: 'अघिल्लो',
      yes: 'हो',
      no: 'होइन',
      ok: 'ठीक छ',
      close: 'बन्द गर्नुहोस्',
      confirm: 'पुष्टि गर्नुहोस्',
      error: 'त्रुटि',
      success: 'सफलता',
      warning: 'चेतावनी',
      info: 'जानकारी',
      loading: 'लोड हुँदै...',
      retry: 'पुन: प्रयास गर्नुहोस्',
      refresh: 'ताजा गर्नुहोस्',

      // SuperSurkhet specific in Nepali
      superSurkhet: 'सुपर सुर्खेत',
      digitalHub: 'डिजिटल हब',
      surkhetValley: 'सुर्खेत उपत्यका',
      connect: 'जडान गर्नुहोस्',
      discover: 'खोज्नुहोस्',
      thrive: 'समृद्धि प्राप्त गर्नुहोस्',
      localBusiness: 'स्थानीय व्यवसाय',
      community: 'समुदाय',
      services: 'सेवाहरू',
      directory: 'निर्देशिका',
      marketplace: 'बजार',
      events: 'कार्यक्रमहरू',
      nepaleseRupee: 'नेपाली रूपैया',
      usDollar: 'अमेरिकी डलर',
    },
  },
} as const;

// Type for available languages
export type Language = keyof typeof resources;

// Default language
export const DEFAULT_LANGUAGE: Language = 'en';

// Available languages
export const AVAILABLE_LANGUAGES = Object.keys(resources) as Language[];

// Initialize i18next
i18next.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE, // Default language
  fallbackLng: DEFAULT_LANGUAGE, // Fallback language
  interpolation: {
    escapeValue: false, // React already safes from XSS
  },
  // Disable key separator to allow dots in keys
  keySeparator: false,
  // Allow nested translations
  nsSeparator: false,
});

export default i18next;
