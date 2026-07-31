'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    // French is the working language of ULS Transport, so it is what the first
    // paint shows. Starting in English meant every French-speaking user — that
    // is, all of them — watched the interface change under them on load.
    const [language, setLanguageState] = useState<Language>('fr');

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (isLanguage(saved)) setLanguageState(saved);
    }, []);

    // Keep the document in sync with the chosen language: screen readers and
    // browser translation both read `lang`, and it was pinned to "fr" in the
    // root layout whatever the switcher said.
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
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
