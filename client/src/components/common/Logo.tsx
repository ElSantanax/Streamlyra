interface LogoProps {
    className?: string;
    textSize?: string;
    showText?: boolean;
}

const Logo = ({ className = "", textSize = "text-xl", showText = true }: LogoProps) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">hub</span>
            </div>
            {showText && (
                <span className={`${textSize} font-brand text-white uppercase tracking-widest`}>
                    Streamlyra
                </span>
            )}
        </div>
    );
};

export default Logo;
