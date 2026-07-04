import { Bricolage_Grotesque, Onest } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart/CartContext';
import CartDrawer from '@/components/shop/CartDrawer';

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

export const metadata = {
  title: 'OUTRUSH — L\'outlet mondial, chronométré',
  description:
    'Marketplace outlet mondiale : prix réels vérifiés, ventes flash chronométrées, la chasse au trésor premium.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#1a1a22',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
