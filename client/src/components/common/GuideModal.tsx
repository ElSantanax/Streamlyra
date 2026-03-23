import { Modal } from '../ui/Modal';
import { useTranslation } from 'react-i18next';
import { FaTwitch, FaYoutube, FaTiktok, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';

interface GuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GuideModal = ({ isOpen, onClose }: GuideModalProps) => {
    const { t } = useTranslation();

    const platforms = [
        {
            name: 'Twitch',
            icon: FaTwitch,
            color: '#9146FF',
            features: [true, true, true, true, true, true]
        },
        {
            name: 'YouTube',
            icon: FaYoutube,
            color: '#FF0000',
            features: [true, true, true, true, false, false]
        },
        {
            name: 'Kick',
            icon: SiKick,
            color: '#53FC18',
            features: [true, true, true, true, true, false]
        },
        {
            name: 'TikTok',
            icon: FaTiktok,
            color: '#FE2C55',
            features: [true, false, false, true, true, false]
        }
    ];

    const featureKeys = [
        'read',
        'send',
        'moderation',
        'subsGifts',
        'followers',
        'raids'
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('guide.title')}
            size="2xl"
        >
            <div className="space-y-6">
                <p className="text-gray-400 text-sm">
                    {t('guide.subtitle')}
                </p>

                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-black/20">
                    <table className="w-full text-left border-collapse min-w-150">
                        <thead>
                            <tr className="border-b border-gray-800 bg-gray-900/50">
                                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                    {t('guide.table.platform')}
                                </th>
                                {featureKeys.map((key) => (
                                    <th key={key} className="p-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">
                                        {t(`guide.table.${key}`)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {platforms.map((platform) => (
                                <tr key={platform.name} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                                    <td className="p-3 flex items-center gap-2">
                                        <platform.icon style={{ color: platform.color }} size={16} />
                                        <span className="font-semibold text-gray-200 text-sm whitespace-nowrap">{platform.name}</span>
                                    </td>
                                    {platform.features.map((hasFeature, idx) => (
                                        <td key={idx} className="p-3 text-center">
                                            {hasFeature ? (
                                                <FaCheck className="text-green-500 mx-auto" size={12} />
                                            ) : (
                                                <FaTimes className="text-gray-700 mx-auto" size={12} />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="space-y-2 bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <div className="flex items-start gap-3">
                        <FaInfoCircle className="text-primary mt-1 shrink-0" size={14} />
                        <div className="space-y-1.5 text-xs text-gray-400 italic font-medium">
                            <p>• {t('guide.notes.kick')}</p>
                            <p>• {t('guide.notes.tiktok')}</p>
                            <p>• {t('guide.notes.youtube')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default GuideModal;
