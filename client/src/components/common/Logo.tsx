import React from 'react';

interface LogoProps {
    className?: string;
    iconSize?: string;
    textSize?: string;
    showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({
    className = "",
    iconSize = "size-8",
    textSize = "text-xl",
    showText = true
}) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className={`${iconSize} rounded-lg bg-primary/20 flex items-center justify-center text-primary`}>
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 'inherit' }}>hub</span>
            </div>
            {showText && (
                <h1 className={`${textSize} font-bold text-slate-900 dark:text-white uppercase tracking-widest`}>
                    Streamlyra
                </h1>
            )}
        </div>
    );
};

export default Logo;
