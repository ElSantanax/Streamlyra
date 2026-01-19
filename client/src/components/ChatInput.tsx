import React from 'react';

const ChatInput: React.FC = () => {
    return (
        <div className="p-4 border-t border-surface-border bg-[#111318]">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Send To:</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input defaultChecked className="form-checkbox rounded border-gray-600 bg-surface-dark text-primary focus:ring-primary h-4 w-4" type="checkbox" />
                    <span className="text-xs font-medium text-gray-300">All</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input defaultChecked className="form-checkbox rounded border-gray-600 bg-surface-dark text-[#9146FF] focus:ring-[#9146FF] h-4 w-4" type="checkbox" />
                    <span className="text-xs font-medium text-gray-300">Twitch</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input defaultChecked className="form-checkbox rounded border-gray-600 bg-surface-dark text-[#FF0000] focus:ring-[#FF0000] h-4 w-4" type="checkbox" />
                    <span className="text-xs font-medium text-gray-300">YouTube</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none opacity-50">
                    <input disabled className="form-checkbox rounded border-gray-600 bg-surface-dark text-gray-500 h-4 w-4" type="checkbox" />
                    <span className="text-xs font-medium text-gray-500">Kick</span>
                </label>
            </div>

            <div className="relative flex items-center gap-2">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer">
                    <span className="material-symbols-outlined">sentiment_satisfied</span>
                </div>
                <input
                    className="w-full bg-surface-dark border border-surface-border rounded-lg pl-10 pr-24 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    placeholder="Send a message to all platforms..."
                    type="text"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="text-xs text-gray-600 mr-2">0/500</span>
                    <button className="bg-primary hover:bg-blue-600 text-white rounded-md px-4 py-1.5 text-sm font-bold shadow-lg shadow-blue-900/20 transition-colors flex items-center gap-1 cursor-pointer">
                        Send <span className="material-symbols-outlined text-[16px]">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatInput;
