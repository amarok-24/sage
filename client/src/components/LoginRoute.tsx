import { useUIVersion } from '../hooks/useUIVersion';
import { Login } from '../pages/Login';
import { LoginV2 } from '../v2/pages/LoginV2';

export function LoginRoute() {
  const { version } = useUIVersion();
  return version === 'v2' ? <LoginV2 /> : <Login />;
}
