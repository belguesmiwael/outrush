import './globals.css';
import { CartProvider } from '@/lib/cart/CartContext';
import CartDrawer from '@/components/shop/CartDrawer';
import { QuickLookProvider } from '@/lib/quicklook/QuickLookContext';
import QuickLookModal from '@/components/shop/QuickLookModal';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { CurrencyProvider } from '@/lib/currency/CurrencyContext';
import { FlashLiveProvider } from '@/lib/flash/FlashLiveContext';
import { getActiveFlashMap } from '@/lib/flash/active';
export const metadata = { title: 'OUTRUSH' };
export default async function RootLayout({ children }) {
  const flashMap = await getActiveFlashMap();
  const initialFlash = Object.fromEntries([...flashMap.entries()].map(([id, f]) => [id, { price: f.flashPrice, remaining: f.remaining, endsAt: f.endsAt }]));
  return (<html lang="fr"><body><CurrencyProvider currency="USD" rate={1}><FlashLiveProvider initial={initialFlash}><CartProvider><QuickLookProvider>{children}<CartDrawer /><QuickLookModal /><ServiceWorkerRegister /></QuickLookProvider></CartProvider></FlashLiveProvider></CurrencyProvider></body></html>);
}
