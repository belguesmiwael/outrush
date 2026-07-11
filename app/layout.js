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

// Cache court des données globales (devise/flash) → le layout n'est plus rendu
// dynamiquement à chaque requête. Les pages publiques peuvent être servies en ISR
// (TTFB mobile bien plus rapide). Les pages qui le nécessitent gardent leur propre
// `dynamic`/`revalidate`.
export const revalidate = 60;

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
  let supabaseOrigin = null;
  try { supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin; } catch { /* noop */ }

  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
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
