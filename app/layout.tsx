import type { Metadata } from 'next';
import { Space_Grotesk, Hind_Siliguri, Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';

const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' });
const noto = Noto_Sans_Bengali({ subsets: ['bengali', 'latin'], variable: '--font-noto', display: 'swap' });
const hind = Hind_Siliguri({ subsets: ['bengali', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-hind', display: 'swap' });

export const metadata: Metadata = {
  title: 'House Price AI',
  description: 'Predict the price range of a flat or house in Bangladesh.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${noto.variable} ${hind.variable}`}>
      <body>{children}</body>
    </html>
  );
}