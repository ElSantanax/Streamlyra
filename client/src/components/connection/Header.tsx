import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/5 dark:bg-[#111318]/80 backdrop-blur-md sticky top-0 z-50">
            <div className="px-6 md:px-10 py-3 flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="size-8 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">hub</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Streamlyra</h1>
                </div>
                <div className="flex items-center gap-4">
                </div>
            </div>
        </header>
    );
};

export default Header;
