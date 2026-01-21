import { Link } from 'react-router-dom';
import Logo from '../common/Logo';

const Footer = () => {
    return (
        <footer className="border-t border-gray-200 dark:border-surface-border py-12 px-6 lg:px-40 bg-white dark:bg-background-dark text-slate-500">
            <div className="mx-auto flex max-w-300 flex-col md:flex-row justify-between items-center gap-8">
                <Link to="/" className="flex items-center gap-3">
                    <Logo textSize="text-lg" />
                </Link>
                <div className="flex gap-8">
                    <a className="hover:text-primary transition-colors" href="#">Términos</a>
                    <a className="hover:text-primary transition-colors" href="#">Privacidad</a>
                    <a className="hover:text-primary transition-colors" href="#">Contacto</a>
                </div>
                <div className="text-sm">
                    © {new Date().getFullYear()} Streamlyra. Todos los derechos reservados.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
