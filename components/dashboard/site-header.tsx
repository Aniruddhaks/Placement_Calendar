import { Header } from '@/components/dashboard/header';
import { getLastUpdatedServer } from '@/lib/events/queries';

export async function SiteHeader() {
  let lastUpdated: string | null = null;

  try {
    lastUpdated = await getLastUpdatedServer();
  } catch {
    lastUpdated = null;
  }

  return <Header lastUpdated={lastUpdated} />;
}
