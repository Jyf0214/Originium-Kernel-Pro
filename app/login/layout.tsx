import { hasDatabase } from '@/lib/config';
import { FeatureDisabledView } from '@/components/ui/FeatureDisabledView';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabase()) {
    return <FeatureDisabledView feature="登录系统" />;
  }
  return <>{children}</>;
}
