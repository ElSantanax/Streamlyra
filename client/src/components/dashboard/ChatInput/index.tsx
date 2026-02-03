import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useAuth } from '../../../hooks/useAuth';
import { useChatInput } from './hooks/useChatInput';
import { useReplyToUser } from './hooks/useReplyToUser';
import { useEmojiPicker } from './hooks/useEmojiPicker';
import { useMessageSender } from './hooks/useMessageSender';
import EmojiPickerButton from './components/EmojiPickerButton';
import SendButton from './components/SendButton';

const ChatInput = () => {
    const { user } = useAuth();
    const chatInput = useChatInput();
    const { message, setMessage, inputRef, clearMessage, focusInput } = chatInput;
    
    const emojiPicker = useEmojiPicker(message, setMessage, inputRef);
    const { showEmojiPicker, emojiPickerRef, handleEmojiClick, toggleEmojiPicker } = emojiPicker;
    
    const messageSender = useMessageSender(user, message, clearMessage, focusInput);
    const { isSending, handleSendMessage } = messageSender;

    useReplyToUser(setMessage, inputRef);

    return (
        <div className="p-4 border-t border-surface-border bg-background-dark">
            <div className="relative flex items-center gap-2">
                <EmojiPickerButton onClick={toggleEmojiPicker} />

                {showEmojiPicker && (
                    <div
                        ref={emojiPickerRef}
                        className="absolute left-0 bottom-full mb-2 z-50 emoji-picker-custom"
                    >
                        <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            theme={Theme.DARK}
                            width={350}
                            height={450}
                            searchPlaceHolder="Buscar emoji..."
                            previewConfig={{
                                showPreview: false
                            }}
                        />
                    </div>
                )}

                <input
                    ref={inputRef}
                    className="w-full bg-surface-dark border border-surface-border rounded-lg pl-10 pr-32 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all shadow-sm"
                    placeholder="Enviar un mensaje"
                    type="text"
                    id="chat-message-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSending) {
                            handleSendMessage();
                        }
                    }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <SendButton onClick={handleSendMessage} disabled={isSending} />
                </div>
            </div>
        </div>
    );
};

export default ChatInput;