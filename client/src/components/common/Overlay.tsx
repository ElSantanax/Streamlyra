interface OverlayProps {
    isVisible: boolean;
    onClose: () => void;
    zIndex?: number;
    className?: string;
}

const Overlay = ({
    isVisible,
    onClose,
    zIndex = 40,
    className = ""
}: OverlayProps) => {
    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 ${className}`}
            style={{ zIndex }}
            onClick={onClose}
        />
    );
};

export default Overlay;
