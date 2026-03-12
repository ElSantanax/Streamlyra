import LegalPageLayout from '../components/legal/LegalPageLayout';

const Terms = () => {
    const sections = [
        'acceptance',
        'openSource',
        'disclaimer',
        'tiktok'
    ];

    return <LegalPageLayout type="terms" sections={sections} />;
};

export default Terms;
