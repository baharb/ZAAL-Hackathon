import React, { useContext } from 'react';
import PasswordGate from '../components/PasswordGate';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { AppContext, Lang } from '../store/AppContext';
import { useNav } from '../store/NavContext';

const TX: Record<string, Partial<Record<Lang, string>>> = {
  title: {
    fa: 'ورود به تنظیمات', en: 'Enter Settings',
    fr: 'Accéder aux paramètres', es: 'Entrar a ajustes',
  },
  subtitle: {
    fa: 'برای باز کردن تنظیمات والدین، رمز عبور را وارد کنید.',
    en: 'Enter your passcode to open parent settings.',
    fr: 'Saisissez votre code pour ouvrir les paramètres parentaux.',
    es: 'Ingresa tu contraseña para abrir los ajustes de padres.',
  },
  errorText: {
    fa: 'رمز عبور درست نیست.', en: 'Incorrect passcode.',
    fr: 'Code incorrect.', es: 'Contraseña incorrecta.',
  },
  forgotPassword: {
    fa: 'رمز عبور را فراموش کرده‌اید؟', en: 'Forgot your passcode?',
    fr: 'Mot de passe oublié ?', es: '¿Olvidaste tu contraseña?',
  },
};

function t(lang: Lang, key: keyof typeof TX): string {
  return TX[key]?.[lang] ?? TX[key]?.en ?? '';
}

export default function SettingsUnlockScreen() {
  const { verifySettingsPassword, settingsLang } = useContext(AppContext);
  const { goBack, navigate } = useNav();

  return (
    <PasswordGate
      iconSource={neliWorldAssets.ui.settingsIcon}
      iconBg="#6549C7"
      iconTint="#FFFFFF"
      iconRound
      lang={settingsLang}
      title={t(settingsLang, 'title')}
      subtitle={t(settingsLang, 'subtitle')}
      errorText={t(settingsLang, 'errorText')}
      onVerify={verifySettingsPassword}
      onSuccess={() => navigate({ name: 'Main', tab: 'Profile' })}
      onClose={goBack}
      forgotPasswordLabel={t(settingsLang, 'forgotPassword')}
      onForgotPassword={() => navigate({ name: 'AccountSetup' })}
    />
  );
}
