import React from 'react';
import PlatformToggle from './ChatInput/PlatformToggle';
import { PLATFORMS } from '../../constants/platforms';

const ChatInput: React.FC = () => {
    return (
        <div className="p-4 border-t border-surface-border bg-background-dark">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Enviar A:</span>
                <PlatformToggle
                    id="toggle-all"
                    label="Todos"
                    colorClass="text-primary focus:ring-primary"
                    defaultChecked
                />
                <PlatformToggle
                    id="toggle-twitch"
                    label={PLATFORMS.twitch.name}
                    colorClass={`${PLATFORMS.twitch.textColor} focus:ring-[${PLATFORMS.twitch.brandColor}]`}
                    defaultChecked
                />
                <PlatformToggle
                    id="toggle-youtube"
                    label={PLATFORMS.youtube.name}
                    colorClass={`${PLATFORMS.youtube.textColor} focus:ring-[${PLATFORMS.youtube.brandColor}]`}
                    defaultChecked
                />
                <PlatformToggle
                    id="toggle-kick"
                    label={PLATFORMS.kick.name}
                    colorClass="text-gray-500"
                    disabled
                />
            </div>

            <div className="relative flex items-center gap-2">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
                </div>
                <input
                    className="w-full bg-surface-dark border border-surface-border rounded-lg pl-10 pr-24 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    placeholder="Enviar un mensaje"
                    type="text"
                    id="chat-message-input"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button className="bg-primary hover:bg-blue-600 active:scale-95 active:bg-blue-700 text-white rounded-md px-4 py-1.5 text-sm font-bold shadow-lg shadow-blue-900/20 transition-all duration-200 flex items-center gap-1 cursor-pointer">
                        Enviar <span className="material-symbols-outlined text-[16px]">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatInput;
