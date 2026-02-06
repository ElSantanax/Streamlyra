import { memo } from 'react';
import { MdReply, MdBlock, MdDeleteOutline } from 'react-icons/md';
import { Button } from '../../../../ui/Button';
import type { PlatformKey } from '../../../../../constants/platforms';

interface MessageActionsProps {
    platform: PlatformKey;
    isOwnMessage: boolean;
    isTikTok: boolean;
    userId?: string;
    id?: string;
    onReply?: () => void;
    onDelete?: () => void;
    onBan?: () => void;
}

export const MessageActions = memo(({
    platform,
    isOwnMessage,
    isTikTok,
    userId,
    id,
    onReply,
    onDelete,
    onBan
}: MessageActionsProps) => {
    if (platform === 'system') return null;

    return (
        <div className="flex items-center gap-1 md:gap-1.5 ml-2 md:ml-4 transition-opacity shrink-0">
            <Button
                variant="ghost"
                className="size-8! p-0! border border-surface-border text-gray-400 hover:text-white"
                onClick={onReply}
                disabled={!onReply || isOwnMessage || isTikTok}
                title={isTikTok ? "TikTok es solo lectura" : (isOwnMessage ? "No puedes responderte a ti mismo" : "Responder")}
            >
                <MdReply size={18} />
            </Button>

            <Button
                variant="ghost"
                className="size-8! p-0! border border-surface-border text-gray-400 hover:text-red-500 hover:bg-red-500/5 transition-colors"
                onClick={onBan}
                disabled={!onBan || !userId || isOwnMessage || isTikTok}
                title={isTikTok ? "TikTok es solo lectura" : (isOwnMessage ? "No puedes banearte a ti mismo" : "Banear")}
            >
                <MdBlock size={18} />
            </Button>

            <Button
                variant="ghost"
                className="size-8! p-0! border border-surface-border text-gray-400 hover:text-red-500 hover:bg-red-500/5 transition-colors"
                onClick={onDelete}
                disabled={!onDelete || !id || isTikTok}
                title={isTikTok ? "TikTok es solo lectura" : "Eliminar Mensaje"}
            >
                <MdDeleteOutline size={18} />
            </Button>
        </div>
    );
});

MessageActions.displayName = 'MessageActions';
