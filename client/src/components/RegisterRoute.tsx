import { useUIVersion } from '../hooks/useUIVersion';
import { Register } from '../pages/Register';
import { RegisterV2 } from '../v2/pages/RegisterV2';

export function RegisterRoute() {
  const { version } = useUIVersion();
  return version === 'v2' ? <RegisterV2 /> : <Register />;
}
