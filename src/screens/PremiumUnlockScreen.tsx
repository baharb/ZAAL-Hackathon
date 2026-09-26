import React, { useContext } from 'react';
import PasswordGate from '../components/PasswordGate';
import { AppContext, Lang } from '../store/AppContext';
import { useNav } from '../store/NavContext';

const TX: Record<string, Partial<Record<Lang, string>>> = {
  title: {
    fa: 'تایید رمز والدین', en: 'Confirm Parent Passcode',
    fr: 'Confirmez le code parental', es: 'Confirma la contraseña de padres',
  },
  subtitle: {
    fa: 'برای دیدن نسخه ویژه و ادامه‌ی خرید، رمز عبور والدین را وارد کنید.',
    en: 'Enter your parent passcode to view Premium and continue.',
    fr: 'Saisissez votre code parental pour voir Premium et continuer.',
    es: 'Ingresa tu contraseña de padres para ver Premium y continuar.',
  },
  errorText: {
    fa: 'رمز عبور درست نیست.', en: 'Incorrect passcode.',
    fr: 'Code incorrect.', es: 'Contraseña incorrecta.',
  },
};

function t(lang: Lang, key: keyof typeof TX): string {
  return TX[key]?.[lang] ?? TX[key]?.en ?? '';
}

// Password checkpoint before anything premium. Reuses the same parent
// account password as Settings (a parent has already set one up), so kids
// can't reach the payment screen on their own from wherever a "Premium"
// entry point ends up living.
export default function PremiumUnlockScreen() {
  const { verifySettingsPassword, settingsLang } = useContext(AppContext);
  const { goBack, navigate } = useNav();

  return (
    <PasswordGate
      iconEmoji="👑"
      lang={settingsLang}
      title={t(settingsLang, 'title')}
      subtitle={t(settingsLang, 'subtitle')}
      errorText={t(settingsLang, 'errorText')}
      onVerify={verifySettingsPassword}
      onSuccess={() => navigate({ name: 'Premium' })}
      onClose={goBack}
    />
  );
}
