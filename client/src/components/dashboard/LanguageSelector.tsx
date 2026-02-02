import { MdLanguage, MdKeyboardArrowDown, MdCheck } from 'react-icons/md';
import { useToggle } from '../../hooks';

interface LanguageSelectorProps {
    currentLanguage: string;
    onLanguageChange: (lang: string) => void;
    onClose: () => void;
}

const LanguageSelector = ({
    currentLanguage,
    onLanguageChange,
    onClose
}: LanguageSelectorProps) => {
    const [isOpen, toggleOpen] = useToggle(false);

    const languages = [
        { code: 'es', label: 'Español' },
        { code: 'en', label: 'English' }
    ];

    return (
        <div className="flex flex-col">
            <button
                onClick={toggleOpen}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer ${isOpen ? 'text-white bg-white/5' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <MdLanguage size={18} />
                    <span>Cambiar Idioma</span>
                </div>
                <MdKeyboardArrowDown
                    size={16}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="bg-black/20 py-1">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                onLanguageChange(lang.code);
                                onClose();
                            }}
                            className="w-full pl-12 pr-4 py-2 flex items-center justify-between text-sm hover:bg-white/5 cursor-pointer group"
                        >
                            <span className={`block ${currentLanguage === lang.code ? 'text-white font-semibold' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                {lang.label}
                            </span>
                            {currentLanguage === lang.code && <MdCheck size={14} className="text-primary" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
