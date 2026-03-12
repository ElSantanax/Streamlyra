import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from '../common/Logo';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className="border-t border-surface-border py-8 md:py-12 px-6 lg:px-40 bg-background-dark text-slate-400">
            <div className="mx-auto flex max-w-300 flex-col md:flex-row justify-between items-center gap-8">
                <Link to="/" className="flex items-center gap-3">
                    <Logo textSize="text-lg" />
                </Link>
                <div className="flex gap-8">
                    <Link className="hover:text-primary transition-colors" to="/terms">{t('footer.terms')}</Link>
                    <Link className="hover:text-primary transition-colors" to="/privacy">{t('footer.privacy')}</Link>
                </div>
                <div className="text-sm">
                    © {new Date().getFullYear()} Streamlyra. {t('footer.license')}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
