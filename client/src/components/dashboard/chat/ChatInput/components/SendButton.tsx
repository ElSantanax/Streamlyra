import { MdSend } from 'react-icons/md';

interface SendButtonProps {
    onClick: () => void;
    disabled: boolean;
}

const SendButton = ({ onClick, disabled }: SendButtonProps) => {
    return (
        <button
            className="bg-primary hover:bg-blue-600 active:scale-95 active:bg-blue-700 text-white rounded-md px-4 py-1.5 text-sm font-bold shadow-lg shadow-blue-900/20 transition-all duration-200 flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
            onClick={onClick}
            disabled={disabled}
        >
            Enviar <MdSend size={16} />
        </button>
    );
};

export default SendButton;
