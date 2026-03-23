import { MdHelpOutline, MdKeyboardArrowDown } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useToggle } from '../../../hooks';

interface HelpSelectorProps {
    onViewGuide: () => void;
    onClose: () => void;
}

const HelpSelector = ({ onViewGuide, onClose }: HelpSelectorProps) => {
    const [isOpen, toggleOpen] = useToggle(false);
    const { t } = useTranslation();

    const discordLink = "https://discord.gg/streamlyra"; 

    return (
        <div className="flex flex-col">
            <button
                onClick={toggleOpen}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer ${isOpen ? 'text-white bg-white/5' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <MdHelpOutline size={18} />
                    <span>{t('dashboard.header.helpAndSupport')}</span>
                </div>
                <MdKeyboardArrowDown
                    size={16}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="bg-black/20 py-1">
                    <button
                        onClick={() => {
                            onViewGuide();
                            onClose();
                        }}
                        className="w-full pl-12 pr-4 py-2 flex items-center text-sm text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all"
                    >
                        <span>{t('dashboard.header.viewGuide')}</span>
                    </button>

                    <a
                        href={discordLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full pl-12 pr-4 py-2 flex items-center text-sm text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all"
                        onClick={onClose}
                    >
                        <span>{t('dashboard.header.discord')}</span>
                    </a>
                </div>
            )}
        </div>
    );
};

export default HelpSelector;
