'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { translations, Language } from './translations';

type LanguageContextType = {
    language: Language;
    
    setLanguage: (lang: Language) => void;
    t: (typeof translations)['fr'];
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'language';

function isLanguage(value: unknown): value is Language {
    return value === 'fr' || value === 'en';
}

/**
 * The stored choice, read straight from localStorage.
 *
 * `useSyncExternalStore` takes this as the client snapshot and `'fr'` as the
 * server one, which is what makes it safe: localStorage does not exist during
 * SSR, so the server renders French and the client corrects to the stored
 * language as part of hydration. Seeding it from a mount effect instead cost an
 * extra render on every load.
 */
function storedLanguage(): Language {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isLanguage(saved) ? saved : 'fr';
}

/** Re-read on cross-tab changes, so a switch in one tab reaches the others. */
function subscribeToLanguage(onChange: () => void): () => void {
    window.addEventListener('storage', onChange);
    return () => window.removeEventListener('storage', onChange);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    // French is the working language of ULS Transport, so it is what the first
    // paint shows. Starting in English meant every French-speaking user — that
    // is, all of them — watched the interface change under them on load.
    const stored = useSyncExternalStore(subscribeToLanguage, storedLanguage, () => 'fr' as Language);
    // A switch in this tab takes effect immediately; `null` means "no local
    // override yet", so the stored value still wins.
    const [override, setOverride] = useState<Language | null>(null);
    const language = override ?? stored;

    // Keep the document in sync with the chosen language: screen readers and
    // browser translation both read `lang`, and it was pinned to "fr" in the
    // root layout whatever the switcher said.
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const setLanguage = (lang: Language) => {
        setOverride(lang);
        localStorage.setItem(STORAGE_KEY, lang);
    };

    return (
        <LanguageContext.Provider
            value={{ language, setLanguage, t: translations[language] }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
