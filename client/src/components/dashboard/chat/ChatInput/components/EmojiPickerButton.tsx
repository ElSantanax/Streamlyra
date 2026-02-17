import { MdOutlineEmojiEmotions } from 'react-icons/md';

interface EmojiPickerButtonProps {
    onClick: () => void;
}

const EmojiPickerButton = ({ onClick }: EmojiPickerButtonProps) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors cursor-pointer z-10"
            title="Seleccionar emoji"
        >
            <MdOutlineEmojiEmotions size={20} />
        </button>
    );
};

export default EmojiPickerButton;
