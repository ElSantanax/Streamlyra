
interface PlatformToggleProps {
    id: string;
    label: string;
    colorClass: string;
    defaultChecked?: boolean;
    disabled?: boolean;
}

const PlatformToggle = ({
    id,
    label,
    colorClass,
    defaultChecked = false,
    disabled = false
}: PlatformToggleProps) => {
    return (
        <label className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50' : ''}`}>
            <input
                disabled={disabled}
                defaultChecked={defaultChecked}
                className={`form-checkbox rounded border-gray-600 bg-surface-dark ${colorClass} h-4 w-4`}
                type="checkbox"
                id={id}
            />
            <span className={`text-xs font-medium ${disabled ? 'text-gray-500' : 'text-gray-300'}`}>{label}</span>
        </label>
    );
};

export default PlatformToggle;
