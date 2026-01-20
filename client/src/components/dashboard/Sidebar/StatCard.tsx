import React from 'react';

interface StatCardProps {
    label: string;
    value: string;
    valueColor?: string;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, valueColor = "text-white", className = "" }) => {
    return (
        <div className={`p-4 rounded-lg bg-surface-dark border border-surface-border flex flex-col gap-1 ${className}`}>
            <span className="text-xs text-gray-400">{label}</span>
            <span className={`${value.length > 6 ? 'text-xl' : 'text-2xl'} font-bold ${valueColor}`}>{value}</span>
        </div>
    );
};

export default StatCard;
