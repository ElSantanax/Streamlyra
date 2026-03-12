import LegalPageLayout from '../components/legal/LegalPageLayout';

const Privacy = () => {
    const sections = [
        'data',
        'storage',
        'noSharing'
    ];

    return <LegalPageLayout type="privacy" sections={sections} />;
};

export default Privacy;
