import React from 'react';

interface UserBadgeProps {
    type: 'sub' | 'mod';
}

const UserBadge: React.FC<UserBadgeProps> = ({ type }) => {
    const config = {
        sub: { label: 'Sub', color: 'bg-[#9146FF]/20 text-[#9146FF]' },
        mod: { label: 'MOD', color: 'bg-[#00AD03]/20 text-[#00AD03]' }
    };

    const { label, color } = config[type];

    return (
        <span className={`${color} text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide`}>
            {label}
        </span>
    );
};

export default UserBadge;
