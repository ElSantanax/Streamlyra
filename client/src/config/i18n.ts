import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { DetectorOptions } from 'i18next-browser-languagedetector';

import translationES from '../locales/es/translation.json';
import translationEN from '../locales/en/translation.json';

const detectionOptions: DetectorOptions = {
    order: ['localStorage', 'navigator', 'htmlTag'],
    lookupLocalStorage: 'streamlyra_lang',
    caches: ['localStorage'],
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            es: { translation: translationES },
            en: { translation: translationEN },
        },
        fallbackLng: 'es',
        debug: false,
        showSupportNotice: false,
        supportedLngs: ['es', 'en'],
        defaultNS: 'translation',
        detection: detectionOptions,
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;