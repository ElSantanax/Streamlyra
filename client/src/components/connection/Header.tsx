import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaGlobe } from 'react-icons/fa';
import Logo from '../common/Logo';

const Header = () => {
    const [lang, setLang] = useState<'es' | 'en'>('es');

    return (
        <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/5 dark:bg-[#111318]/80 backdrop-blur-md sticky top-0 z-50">
            <div className="px-6 md:px-10 py-3 flex items-center justify-between max-w-7xl mx-auto">
                <Link to="/" className="transition-opacity hover:opacity-80">
                    <Logo textSize="text-xl" showText={false} />
                </Link>
                <div className="flex items-center gap-6">
                    <a href="#" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                        Comunidad
                    </a>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setLang(prev => prev === 'es' ? 'en' : 'es')}
                            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors cursor-pointer"
                        >
                            <span>{lang === 'es' ? 'EN' : 'ES'}</span>
                            <FaGlobe className="size-4" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
