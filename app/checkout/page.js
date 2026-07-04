import SiteHeader from '@/components/shop/SiteHeader';
import SiteFooter from '@/components/shop/SiteFooter';
import CheckoutClient from '@/components/shop/CheckoutClient';

export const metadata = { title: 'Commande — OUTRUSH' };

export default function CheckoutPage() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <CheckoutClient />
      <SiteFooter />
    </main>
  );
}
