const BackgroundDecorations = () => {
    return (
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-1/4 left-1/4 w-125 h-125 bg-primary/5 rounded-full blur-3xl opacity-50 mix-blend-screen"></div>
            <div className="absolute bottom-1/4 right-1/4 w-100 h-100 bg-purple-500/5 rounded-full blur-3xl opacity-50 mix-blend-screen"></div>
        </div>
    );
};

export default BackgroundDecorations;
