import { Fraunces, Onest, Martian_Mono } from 'next/font/google';
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

// LA CRIÉE — Fraunces (serif chaud, axes SOFT+WONK) : la voix de la maison de ventes.
// L'anti-Inter absolu. Titres de lot, hero, cachet « ADJUGÉ ».
const display = Fraunces({
  subsets: ['latin'],
  variable: '--app-font-display',
  axes: ['SOFT', 'WONK', 'opsz'],
  display: 'swap',
});

// Corps : Onest (neutre chaude, non-réflexe).
const body = Onest({
  subsets: ['latin'],
  variable: '--app-font-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// Registre de la maison : n° de lot, prix au marteau, chrono.
const mono = Martian_Mono({
  subsets: ['latin'],
  variable: '--app-font-mono',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'OUTRUSH — La maison de ventes de l’invendu',
  description: 'L’hôtel des ventes de l’invendu de luxe. Chaque produit est un lot catalogué, chaque drop une vacation en direct — adjugé, à vous.',
  manifest: '/manifest.json',
};

export const dynamic = 'force-dynamic';

export const viewport = {
  themeColor: '#191410',
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
