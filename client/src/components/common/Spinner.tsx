interface SpinnerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    text?: string;
    fullScreen?: boolean;
}

const Spinner = ({
    size = 'md',
    className = "",
    text,
    fullScreen = false
}: SpinnerProps) => {
    const sizeClasses = {
        xs: 'size-3 border-[1.5px]',
        sm: 'size-5 border-2',
        md: 'size-8 border-2',
        lg: 'size-12 border-4',
        xl: 'size-16 border-4'
    };

    const spinner = (
        <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
            <div className={`${sizeClasses[size]} border-primary/20 border-t-primary rounded-full animate-spin`}></div>
            {text && (
                <p className="text-sm font-medium animate-pulse text-slate-400">
                    {text}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-background-dark text-white font-display">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default Spinner;
