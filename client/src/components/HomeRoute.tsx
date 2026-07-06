import { useUIVersion } from '../hooks/useUIVersion';
import { Dashboard } from '../pages/Dashboard';
import { DashboardV2 } from '../v2/pages/DashboardV2';

export function HomeRoute() {
  const { version } = useUIVersion();
  return version === 'v2' ? <DashboardV2 /> : <Dashboard />;
}
