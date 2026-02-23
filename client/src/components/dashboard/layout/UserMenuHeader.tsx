import type { User } from '../../../types/user.types';
import { Badge } from '../../ui';

interface UserMenuHeaderProps {
    user: User | null;
    isConnected: boolean;
}

const UserMenuHeader = ({ user, isConnected }: UserMenuHeaderProps) => (
    <div className="px-4 py-3 border-b border-surface-border mb-1">
        <div className="flex items-center gap-3">
            <div className="size-10 rounded-full border border-surface-border overflow-hidden shrink-0">
                <img
                    src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                    alt="User Avatar"
                    className="size-full object-cover"
                    width={40}
                    height={40}
                />
            </div>
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">
                        {user?.displayName || user?.username || "Usuario"}
                    </span>
                    <Badge
                        variant={isConnected ? 'success' : 'error'}
                        size="xs"
                        withDot
                        animated={isConnected}
                    >
                        {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </Badge>
                </div>
                {user?.username && (
                    <span className="text-xs text-gray-500 truncate">@{user.username}</span>
                )}
            </div>
        </div>
    </div>
);

export default UserMenuHeader;
