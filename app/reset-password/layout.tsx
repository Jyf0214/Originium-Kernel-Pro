import { hasDatabase } from '@/lib/config';
import { FeatureDisabledView } from '@/components/ui/FeatureDisabledView';

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabase()) {
    return <FeatureDisabledView feature="密码重置" />;
  }
  return <>{children}</>;
}
