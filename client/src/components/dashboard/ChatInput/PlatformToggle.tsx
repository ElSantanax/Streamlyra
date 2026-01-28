
interface PlatformToggleProps {
    id: string;
    label: string;
    colorClass: string;
    checked?: boolean;
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
}

const PlatformToggle = ({
    id,
    label,
    colorClass,
    checked = false,
    disabled = false,
    onChange
}: PlatformToggleProps) => {
    return (
        <label className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50' : ''}`}>
            <input
                disabled={disabled}
                checked={checked}
                className={`form-checkbox rounded border-gray-600 bg-surface-dark ${colorClass} h-4 w-4`}
                type="checkbox"
                id={id}
                onChange={(e) => onChange?.(e.target.checked)}
            />
            <span className={`text-xs font-medium ${disabled ? 'text-gray-500' : 'text-gray-300'}`}>{label}</span>
        </label>
    );
};

export default PlatformToggle;
