import { Bricolage_Grotesque, Onest, Martian_Mono } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart/CartContext';
import CartDrawer from '@/components/shop/CartDrawer';
import { QuickLookProvider } from '@/lib/quicklook/QuickLookContext';
import QuickLookModal from '@/components/shop/QuickLookModal';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { CurrencyProvider } from '@/lib/currency/CurrencyContext';
import { FlashLiveProvider } from '@/lib/flash/FlashLiveContext';
import { getActiveFlashMap } from '@/lib/flash/active';
import { getCurrencySettings } from '@/lib/currency/server';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--app-font-display',
  weight: ['400', '600', '700', '800'],
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
  title: 'OUTRUSH — La traque chronométrée',
  description: 'La marketplace outlet mondiale. Invendus et fins de série premium, rythmés par des ventes flash.',
  manifest: '/manifest.json',
};

export const dynamic = 'force-dynamic';

export const viewport = {
  themeColor: '#14141a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }) {
  const { currency, rate } = await getCurrencySettings();
  const flashMap = await getActiveFlashMap();
  const initialFlash = Object.fromEntries(
    [...flashMap.entries()].map(([id, f]) => [id, { price: f.flashPrice, remaining: f.remaining, endsAt: f.endsAt }])
  );

  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <CurrencyProvider currency={currency} rate={rate}>
          <FlashLiveProvider initial={initialFlash}>
            <CartProvider>
              <QuickLookProvider>
                {children}
                <CartDrawer />
                <QuickLookModal />
                <ServiceWorkerRegister />
              </QuickLookProvider>
            </CartProvider>
          </FlashLiveProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
