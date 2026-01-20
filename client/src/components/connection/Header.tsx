import Logo from '../common/Logo';

const Header: React.FC = () => {
    return (
        <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/5 dark:bg-[#111318]/80 backdrop-blur-md sticky top-0 z-50">
            <div className="px-6 md:px-10 py-3 flex items-center justify-between max-w-7xl mx-auto">
                <Logo textSize="text-xl" showText={true} />
                <div className="flex items-center gap-4">
                </div>
            </div>
        </header>
    );
};

export default Header;
