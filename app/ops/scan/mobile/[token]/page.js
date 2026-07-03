import { notFound } from 'next/navigation';
import MobileScanner from '@/components/ops/MobileScanner';

export const dynamic = 'force-dynamic';

export default async function MobileScanPage({ params }) {
  const { token } = await params;
  // Le token est un base64url de 24 octets → ~32 caractères
  if (!token || token.length < 10 || token.length > 64) notFound();

  return <MobileScanner token={token} />;
}
