'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'bm';

const translations = {
    en: {
        welcome: 'Welcome',
        checkInTitle: 'Check in',
        checkInSubtitle: 'Please enter your details.',
        fullName: 'Full Name',
        icNumber: 'MyKad / Passport ID',
        phone: 'Phone Number (Optional)',
        submit: 'Submit',
        success: 'Checked In Successfully',
        pleaseWait: 'Please wait for your number.',
        queueNumber: 'Your Queue Number',
        // Admin
        dashboard: 'Dashboard',
        queue: 'Queue',
        history: 'History',
        settings: 'Settings',
        login: 'Login',
        passcode: 'Passcode',
        enterPasscode: 'Enter Admin Passcode',
        waiting: 'Waiting',
        inProgress: 'In Progress',
        completed: 'Completed',
        save: 'Save',
        generateCert: 'Generate Certificate',
        back: 'Back',
        // Common
        mykad: 'MyKad',
        required: 'Required',
        secureFooter: 'Secure & Private • Local Data',
        logout: 'Logout'
    },
    bm: {
        welcome: 'Selamat Datang',
        checkInTitle: 'Daftar Masuk',
        checkInSubtitle: 'Sila masukkan butiran anda.',
        fullName: 'Nama Penuh',
        icNumber: 'MyKad / Pasport',
        phone: 'Nombor Telefon (Pilihan)',
        submit: 'Hantar',
        success: 'Daftar Masuk Berjaya',
        pleaseWait: 'Sila tunggu nombor anda dipanggil.',
        queueNumber: 'Nombor Giliran Anda',
        // Admin
        dashboard: 'Papan Utama',
        queue: 'Giliran',
        history: 'Sejarah',
        settings: 'Tetapan',
        login: 'Log Masuk',
        passcode: 'Kod Laluan',
        enterPasscode: 'Masukkan Kod Laluan Admin',
        waiting: 'Menunggu',
        inProgress: 'Sedang Dirawat',
        completed: 'Selesai',
        save: 'Simpan',
        generateCert: 'Jana Sijil',
        back: 'Kembali',
        // Common
        mykad: 'MyKad',
        required: 'Diperlukan',
        secureFooter: 'Selamat & Peribadi • Data Tempatan',
        logout: 'Log Keluar'
    }
};

type Translations = typeof translations.en;

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    // Load from localStorage on mount (client only)
    useEffect(() => {
        const saved = localStorage.getItem('appLanguage') as Language;
        if (saved && (saved === 'en' || saved === 'bm')) {
            setLanguage(saved);
        } else {
            setLanguage('en');
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('appLanguage', lang);
    };

    const t = translations[language] || translations.en;

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
    return context;
}
