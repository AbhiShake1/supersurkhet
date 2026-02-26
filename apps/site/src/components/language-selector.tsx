import { Languages } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/contexts/i18n-context';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, availableLanguages } = useI18n();

  // Language display names
  const languageNames: Record<string, string> = {
    en: 'English',
    ne: 'नेपाली ',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-24">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline-block">
            {languageNames[language] || language}
          </span>
          <span className="sm:hidden">{language.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={lang === language ? 'bg-accent' : ''}
          >
            {languageNames[lang] || lang}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
