interface LogoProps {
    className?: string;
    textSize?: string;
    showText?: boolean;
}

const Logo = ({ className = "", textSize = "text-xl", showText = true }: LogoProps) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {showText && (
                <span className={`${textSize} font-brand text-slate-900 dark:text-white uppercase tracking-widest`}>
                    Streamlyra
                </span>
            )}
        </div>
    );
};

export default Logo;
