'use client';

import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n/provider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/lib/i18n/translations';

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const current = LOCALE_NAMES[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Globe className="w-4 h-4 mr-2" />
          <span className="truncate">{current.flag} {current.native}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>{t('nav.language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((l: Locale) => (
          <DropdownMenuItem key={l} onClick={() => setLocale(l)} className={l === locale ? 'font-semibold' : ''}>
            <span className="mr-2">{LOCALE_NAMES[l].flag}</span>
            {LOCALE_NAMES[l].native}
            {l === locale && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
