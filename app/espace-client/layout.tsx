import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Espace client — ULS Transport',
    description: 'Suivez vos expéditions ULS Transport dans un espace sécurisé.',
    robots: { index: false, follow: false },
};

export default function ClientAreaLayout({ children }: { children: React.ReactNode }) {
    return children;
}
