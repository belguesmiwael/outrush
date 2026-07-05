import { Bricolage_Grotesque, Onest, Martian_Mono } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart/CartContext';
import CartDrawer from '@/components/shop/CartDrawer';
import { QuickLookProvider } from '@/lib/quicklook/QuickLookContext';
import QuickLookModal from '@/components/shop/QuickLookModal';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { CurrencyProvider } from '@/lib/currency/CurrencyContext';
import { getCurrencySettings } from '@/lib/currency/server';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--app-font-display',
  weight: ['500', '700', '800'],
  display: 'swap',
});

const body = Onest({
  subsets: ['latin'],
  variable: '--app-font-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const mono = Martian_Mono({
  subsets: ['latin'],
  variable: '--app-font-mono',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'OUTRUSH — L\'outlet mondial, chronométré',
  description:
    'Marketplace outlet mondiale : prix réels vérifiés, ventes flash chronométrées, la chasse au trésor premium.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'OUTRUSH' },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#1a1a22',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }) {
  const { currency, rate } = await getCurrencySettings();
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <CurrencyProvider currency={currency} rate={rate}>
          <CartProvider>
            <QuickLookProvider>
              {children}
              <CartDrawer />
              <QuickLookModal />
              <ServiceWorkerRegister />
            </QuickLookProvider>
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
