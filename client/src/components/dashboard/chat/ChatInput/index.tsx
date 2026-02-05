import { lazy, Suspense } from 'react';
import type { Theme } from 'emoji-picker-react';
import { Categories } from 'emoji-picker-react';
import { useAuth } from '../../../../hooks/useAuth';
import { useChatInput } from './hooks/useChatInput';
import { useReplyToUser } from './hooks/useReplyToUser';
import { useEmojiPicker } from './hooks/useEmojiPicker';
import { useMessageSender } from './hooks/useMessageSender';
import EmojiPickerButton from './components/EmojiPickerButton';
import SendButton from './components/SendButton';

// Lazy load del EmojiPicker para reducir el bundle principal
const EmojiPicker = lazy(() => import('emoji-picker-react'));

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
                        <Suspense fallback={
                            <div className="w-87.5 h-112.5 bg-surface-dark border border-surface-border rounded-lg flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <span className="text-sm text-gray-400">Cargando emojis...</span>
                                </div>
                            </div>
                        }>
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                theme={'dark' as Theme}
                                width={350}
                                height={450}
                                searchPlaceHolder="Buscar emoji..."
                                categories={[
                                    { category: Categories.SMILEYS_PEOPLE, name: 'Rostros' }
                                ]}
                                skinTonesDisabled
                                previewConfig={{
                                    showPreview: false
                                }}
                            />
                        </Suspense>
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