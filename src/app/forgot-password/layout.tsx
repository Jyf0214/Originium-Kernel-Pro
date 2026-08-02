import { hasDatabase } from '@/lib/config';
import { FeatureDisabledView } from '@/components/ui/FeatureDisabledView';
import { getTranslate } from '@/i18n/translate';

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabase()) {
    return <FeatureDisabledView feature={getTranslate('resetPassword.title')} />;
  }
  return <>{children}</>;
}
