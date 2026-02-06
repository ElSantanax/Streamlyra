import { MdError } from 'react-icons/md';
import type { MessageStatus } from '../../../../../types';

interface StatusIndicatorProps {
    status?: MessageStatus;
    errorMessage?: string;
}

export const StatusIndicator = ({ status, errorMessage }: StatusIndicatorProps) => {
    if (status !== 'error') return null;
    return (
        <div className="flex items-center gap-1 text-red-500" title={errorMessage || 'Error al enviar'}>
            <MdError size={14} />
            <span className="text-xs">Error</span>
        </div>
    );
};
