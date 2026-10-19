import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { characterAssets } from '../assets/characterAssets';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { AppContext, isRTL, Lang, LANGUAGES } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { DetectedContact, detectContact, isIranianPhone, sendVerificationCode, verifyCode, SendCodeError, VerifyCodeError } from '../services/accountActivation';

const KEY_TAP = require('../../assets/audio/key-tap.wav');

type Country = { code: string; dial: string; name: string };

// Dial codes the parents of this app actually have. Iran first, then the
// countries the Iranian diaspora is concentrated in. Each name is written in
// the country's own language, the way a picker like this normally reads.
const COUNTRIES: Country[] = [
  { code: 'US', dial: '+1', name: 'United States' },
  { code: 'IR', dial: '+98', name: 'ایران' },
  { code: 'CA', dial: '+1', name: 'Canada' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' },
  { code: 'DE', dial: '+49', name: 'Deutschland' },
  { code: 'FR', dial: '+33', name: 'France' },
  { code: 'NL', dial: '+31', name: 'Nederland' },
  { code: 'SE', dial: '+46', name: 'Sverige' },
  { code: 'NO', dial: '+47', name: 'Norge' },
  { code: 'DK', dial: '+45', name: 'Danmark' },
  { code: 'ES', dial: '+34', name: 'España' },
  { code: 'IT', dial: '+39', name: 'Italia' },
  { code: 'CH', dial: '+41', name: 'Schweiz' },
  { code: 'AT', dial: '+43', name: 'Österreich' },
  { code: 'BE', dial: '+32', name: 'België' },
  { code: 'TR', dial: '+90', name: 'Türkiye' },
  { code: 'AE', dial: '+971', name: 'الإمارات' },
  { code: 'QA', dial: '+974', name: 'قطر' },
  { code: 'OM', dial: '+968', name: 'عُمان' },
  { code: 'GE', dial: '+995', name: 'საქართველო' },
  { code: 'AM', dial: '+374', name: 'Հայաստան' },
  { code: 'AU', dial: '+61', name: 'Australia' },
  { code: 'NZ', dial: '+64', name: 'New Zealand' },
  { code: 'JP', dial: '+81', name: '日本' },
  { code: 'MY', dial: '+60', name: 'Malaysia' },
];

// Default to +1. SMS can't reach +98 at all (see errIranSms), so opening on
// Iran would start most parents in a dead end; the diaspora this app serves
// is largely on North American numbers anyway.
const DEFAULT_DIAL = 'US';
const defaultCountry = (): Country =>
  COUNTRIES.find(c => c.code === DEFAULT_DIAL) ?? COUNTRIES[0];

// A national number is written with a trunk "0" in most of the world
// (09121234567) but E.164 never carries it, so strip it as they type.
const toNational = (raw: string) => raw.replace(/\D/g, '').replace(/^0+/, '');

type Step = 'contact' | 'code' | 'password';

const RESEND_COOLDOWN_SECONDS = 60;

// Every user-facing string on this screen, in the 4 languages a parent can
// pick from. Games and other kid-facing content stay Persian regardless —
// this only covers the parent-facing sign-in/passcode flow.
const TX: Record<string, Partial<Record<Lang, string>>> = {
  welcomeTitle: {
    fa: 'به زال خوش آمدید', en: 'Welcome to ZAAL',
    fr: 'Bienvenue sur ZAAL', es: 'Bienvenido a ZAAL',
  },
  welcomeCopy: {
    fa: 'این رمز، تنظیمات والدین را از دسترس کودک دور نگه می‌دارد.',
    en: 'This passcode keeps parent settings safely out of your child’s reach.',
    fr: 'Ce code garde les paramètres parentaux hors de portée de votre enfant.',
    es: 'Este código mantiene los ajustes de los padres fuera del alcance de tu hijo.',
  },
  contactTitle: {
    fa: 'ورود والدین', en: 'Parent Sign-In',
    fr: 'Connexion parent', es: 'Acceso de padres',
  },
  contactSubtitle: {
    fa: 'برای محافظت از تنظیمات، ایمیل یا شماره همراه‌تان را وارد کنید تا کد تایید برایتان بفرستیم.',
    en: 'To protect your settings, enter your email or phone number and we’ll send you a verification code.',
    fr: 'Pour protéger vos paramètres, saisissez votre e-mail ou numéro de téléphone afin de recevoir un code de vérification.',
    es: 'Para proteger tus ajustes, ingresa tu correo o número de teléfono y te enviaremos un código de verificación.',
  },
  codeTitle: {
    fa: 'کد تایید را وارد کنید', en: 'Enter Verification Code',
    fr: 'Saisissez le code de vérification', es: 'Ingresa el código de verificación',
  },
  passwordTitle: {
    fa: 'رمز والدین را تنظیم کنید', en: 'Set Your Parent Passcode',
    fr: 'Définissez votre code parental', es: 'Configura tu contraseña de padres',
  },
  passwordSubtitle: {
    fa: 'سال تولدتان را وارد کنید (میلادی یا شمسی). این عدد از این پس رمز ورود به تنظیمات والدین خواهد بود.',
    en: 'Enter your birth year. From now on, this will be your passcode for parent settings.',
    fr: 'Saisissez votre année de naissance. Ce sera désormais votre code d’accès aux paramètres parentaux.',
    es: 'Ingresa tu año de nacimiento. A partir de ahora, este será tu código de acceso a los ajustes de padres.',
  },
  contactPlaceholder: {
    fa: 'ایمیل یا شماره تلفن (با کد کشور، مثلاً +1...)',
    en: 'Email or phone number (with country code, e.g. +1...)',
    fr: 'E-mail ou numéro de téléphone (avec indicatif, ex. +1...)',
    es: 'Correo o número de teléfono (con código de país, ej. +1...)',
  },
  sendCode: { fa: 'ارسال کد', en: 'Send Code', fr: 'Envoyer le code', es: 'Enviar código' },
  confirmCode: { fa: 'تایید کد', en: 'Confirm Code', fr: 'Confirmer le code', es: 'Confirmar código' },
  resendCode: { fa: 'ارسال دوباره کد', en: 'Resend Code', fr: 'Renvoyer le code', es: 'Reenviar código' },
  changeContact: {
    fa: 'تغییر ایمیل یا شماره تلفن', en: 'Change Email or Phone Number',
    fr: 'Changer d’e-mail ou de numéro', es: 'Cambiar correo o número de teléfono',
  },
  birthYearLabel: {
    fa: 'سال تولد شما', en: 'Your Birth Year',
    fr: 'Votre année de naissance', es: 'Tu año de nacimiento',
  },
  saveAndStart: {
    fa: 'ذخیره رمز و شروع', en: 'Save & Get Started',
    fr: 'Enregistrer et commencer', es: 'Guardar y comenzar',
  },
  note: {
    fa: 'اطلاعات ورود شما فقط روی همین دستگاه ذخیره می‌شود.',
    en: 'Your sign-in details are stored only on this device.',
    fr: 'Vos informations de connexion sont stockées uniquement sur cet appareil.',
    es: 'Tus datos de acceso se guardan solo en este dispositivo.',
  },
  tabEmail: { fa: 'ایمیل', en: 'Email', fr: 'E-mail', es: 'Correo' },
  tabPhone: { fa: 'شماره تلفن', en: 'Phone', fr: 'Téléphone', es: 'Teléfono' },
  emailPlaceholder: { fa: 'ایمیل شما', en: 'Your email', fr: 'Votre e-mail', es: 'Tu correo' },
  phonePlaceholder: { fa: 'شماره تلفن', en: 'Phone number', fr: 'Numéro de téléphone', es: 'Número de teléfono' },
  countryLabel: { fa: 'کشور', en: 'Country', fr: 'Pays', es: 'País' },
  chooseCountry: { fa: 'کشور را انتخاب کنید', en: 'Choose your country', fr: 'Choisissez votre pays', es: 'Elige tu país' },
  useEmailInstead: { fa: 'به جای آن از ایمیل استفاده کنید', en: 'Use email instead', fr: 'Utiliser un e-mail', es: 'Usar correo' },
  languageLabel: { fa: 'زبان', en: 'Language', fr: 'Langue', es: 'Idioma' },
  errInvalidContact: {
    fa: 'ایمیل یا شماره تلفن معتبر وارد کنید (شماره باید با + و کد کشور باشد).',
    en: 'Please enter a valid email or phone number (numbers need a + and country code).',
    fr: 'Saisissez un e-mail ou un numéro valide (le numéro doit inclure + et l’indicatif du pays).',
    es: 'Ingresa un correo o número válido (el número debe incluir + y el código de país).',
  },
  errIranSms: {
    fa: 'ارسال پیامک به شماره‌های ایران به دلیل محدودیت‌های تحریمی امکان‌پذیر نیست. لطفاً ایمیل وارد کنید.',
    en: 'SMS delivery to Iranian phone numbers isn’t available due to sanctions restrictions. Please use an email instead.',
    fr: 'L’envoi de SMS vers les numéros iraniens est impossible en raison des restrictions liées aux sanctions. Veuillez utiliser un e-mail.',
    es: 'No es posible enviar SMS a números de Irán debido a restricciones de sanciones. Usa un correo electrónico.',
  },
  errInvalidBirthYear: {
    fa: 'سال تولد والد را درست وارد کنید.', en: 'Please enter a valid parent birth year.',
    fr: 'Saisissez une année de naissance valide.', es: 'Ingresa un año de nacimiento válido.',
  },
  errSendNotConfigured: {
    fa: 'سرویس ارسال کد هنوز راه‌اندازی نشده است.', en: 'The code delivery service isn’t set up yet.',
    fr: 'Le service d’envoi de code n’est pas encore configuré.', es: 'El servicio de envío de códigos aún no está configurado.',
  },
  errSendGeneric: {
    fa: 'ارسال کد انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
    en: 'We couldn’t send the code. Check your connection and try again.',
    fr: 'Impossible d’envoyer le code. Vérifiez votre connexion et réessayez.',
    es: 'No pudimos enviar el código. Revisa tu conexión e inténtalo de nuevo.',
  },
  errCodeIncomplete: {
    fa: 'کد ۶ رقمی را کامل وارد کنید.', en: 'Please enter the full 6-digit code.',
    fr: 'Saisissez le code à 6 chiffres complet.', es: 'Ingresa el código completo de 6 dígitos.',
  },
  errVerifyGeneric: {
    fa: 'کد نادرست یا منقضی‌شده است. دوباره تلاش کنید.', en: 'That code is incorrect or expired. Please try again.',
    fr: 'Ce code est incorrect ou expiré. Réessayez.', es: 'Ese código es incorrecto o expiró. Inténtalo de nuevo.',
  },
  errPasswordIncomplete: {
    fa: 'سال تولدتان را کامل، در ۴ رقم، وارد کنید.', en: 'Please enter your full 4-digit birth year.',
    fr: 'Saisissez votre année de naissance complète (4 chiffres).', es: 'Ingresa tu año de nacimiento completo (4 dígitos).',
  },
  errSaveFailed: {
    fa: 'ذخیره رمز عبور انجام نشد. دوباره تلاش کنید.', en: 'We couldn’t save your passcode. Please try again.',
    fr: 'Impossible d’enregistrer votre code. Réessayez.', es: 'No pudimos guardar tu contraseña. Inténtalo de nuevo.',
  },
};

function t(lang: Lang, key: keyof typeof TX): string {
  return TX[key]?.[lang] ?? TX[key]?.en ?? '';
}

function codeSubtitle(lang: Lang, contactValue: string): string {
  switch (lang) {
    case 'fr': return `Saisissez le code à 6 chiffres envoyé à « ${contactValue} ».`;
    case 'es': return `Ingresa el código de 6 dígitos que enviamos a "${contactValue}".`;
    case 'en': return `Enter the 6-digit code we sent to "${contactValue}".`;
    default: return `کد ۶ رقمی‌ای که به «${contactValue}» فرستادیم را وارد کنید.`;
  }
}

function resendLabel(lang: Lang, cooldown: number): string {
  if (cooldown <= 0) return t(lang, 'resendCode');
  return `${t(lang, 'resendCode')} (${cooldown})`;
}

function sendCodeErrorMessage(lang: Lang, err: unknown): string {
  if (err instanceof SendCodeError && err.message === 'SUPABASE_NOT_CONFIGURED') {
    return t(lang, 'errSendNotConfigured');
  }
  return t(lang, 'errSendGeneric');
}

function verifyCodeErrorMessage(lang: Lang, err: unknown): string {
  if (err instanceof VerifyCodeError && err.message === 'SUPABASE_NOT_CONFIGURED') {
    return t(lang, 'errSendNotConfigured');
  }
  return t(lang, 'errVerifyGeneric');
}

/** A row of N circles that mirrors a numeric value, with an invisible input
 *  on top so tapping anywhere in the row opens the keyboard. Digits show
 *  plainly for the OTP code; for the parent PIN they show as a filled dot. */
function CodeCircles({
  length,
  value,
  onChangeText,
  secure,
  autoFocus,
  onSubmitEditing,
  oneTimeCode,
  lang,
}: {
  length: number;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  oneTimeCode?: boolean;
  lang: Lang;
}) {
  const inputRef = useRef<TextInput>(null);
  const focused = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={styles.circleRow}
    >
      {Array.from({ length }).map((_, i) => {
        const digit = value[i];
        const filled = digit !== undefined;
        const isCursor = isFocused && i === value.length && value.length < length;
        return (
          <View
            key={i}
            style={[
              styles.circle,
              filled && styles.circleFilled,
              isCursor && styles.circleCursor,
            ]}
          >
            {filled && !secure && (
              <Text style={[styles.circleDigit, { fontFamily: ff(lang, 'black') }]}>{digit}</Text>
            )}
            {filled && secure && <View style={styles.circleDot} />}
          </View>
        );
      })}
      <TextInput
        disableFullscreenUI
        ref={inputRef}
        value={value}
        onChangeText={text => onChangeText(text.replace(/\D/g, '').slice(0, length))}
        onFocus={() => { focused.current = true; setIsFocused(true); }}
        onBlur={() => { focused.current = false; setIsFocused(false); }}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        textContentType={oneTimeCode ? 'oneTimeCode' : (secure ? 'newPassword' : 'oneTimeCode')}
        autoComplete={oneTimeCode ? 'sms-otp' : 'off'}
        style={styles.hiddenInput}
        caretHidden
      />
    </TouchableOpacity>
  );
}

/** Compact language dropdown: a pill showing the current language, opening a
 *  small list of the 4 supported parent-facing languages, each shown in its
 *  own script. Selecting one persists immediately via settingsLang. */
function LanguageDropdown({ lang, onSelect, rtl }: { lang: Lang; onSelect: (l: Lang) => void; rtl: boolean }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <View style={[styles.langWrap, rtl ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }]}>
      <TouchableOpacity style={styles.langButton} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[styles.langButtonText, { fontFamily: ff(lang, 'bold') }]}>{current.nativeLabel}</Text>
        <Text style={styles.langChevron}>▼</Text>
      </TouchableOpacity>
      {/* A Modal rather than an absolutely-positioned menu: inside a
          ScrollView an absolute menu is painted under later siblings (the
          title) and clipped by the scroll container. A modal always sits on
          top and can never be cut off. */}
      <PickerSheet visible={open} title={t(lang, 'languageLabel')} lang={lang} onClose={() => setOpen(false)}>
        {LANGUAGES.map(language => (
          <TouchableOpacity
            key={language.code}
            style={[styles.sheetRow, { flexDirection: 'row' }, language.code === lang && styles.sheetRowActive]}
            onPress={() => { onSelect(language.code); setOpen(false); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.sheetLabel, { fontFamily: ff(language.code, 'bold') }]}>{language.nativeLabel}</Text>
          </TouchableOpacity>
        ))}
      </PickerSheet>
    </View>
  );
}

/** Centred sheet used by both pickers. Rendered in a Modal so it floats above
 *  the form instead of fighting the ScrollView for stacking order. */
function PickerSheet({
  visible, title, lang, onClose, children, scroll,
}: {
  visible: boolean; title: string; lang: Lang; onClose: () => void;
  children: React.ReactNode; scroll?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['landscape']}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
          <Text style={[styles.sheetTitle, { fontFamily: ff(lang, 'black') }]}>{title}</Text>
          {scroll
            ? <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">{children}</ScrollView>
            : children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function AccountSetupScreen() {
  const { activateAccount, settingsLang, setSettingsLang } = useContext(AppContext);
  const { reset, goBack, canGoBack } = useNav();
  const { width, height } = useWindowDimensions();
  // Lay out from the shape we actually got, not from an assumed
  // orientation: phones land here in portrait, tablets stay landscape,
  // and either can be any size.
  const portrait = height > width;
  const compact = height < 600;
  // A landscape phone gives ~360-440pt of height for the whole card, so
  // the vertical rhythm that suits a tablet has to tighten right down.
  const short = height < 470;
  const lang = settingsLang;
  const rtl = isRTL(lang);
  const textDir = dir(lang);

  const [step, setStep] = useState<Step>('contact');
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(defaultCountry);
  const [national, setNational] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);

  // One canonical value for the rest of the flow, assembled from whichever
  // half of the form is showing. Everything downstream (detectContact,
  // sendVerificationCode, verifyCode) keeps working unchanged.
  const contact = mode === 'email' ? email.trim() : `${country.dial}${national}`;
  const iranSms = mode === 'phone' && country.dial === '+98';
  const [detected, setDetected] = useState<DetectedContact | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateBirthYear = (value: string) => {
    if (!/^\d{4}$/.test(value)) return false;
    const birthYearNum = Number(value);
    const currentYear = new Date().getFullYear();
    const validGregorian = birthYearNum >= currentYear - 100 && birthYearNum <= currentYear - 13;
    // Shamsi (Jalali) runs ~621-622 years behind Gregorian — plenty of
    // parents know their own birth year only in Shamsi. This is a plausible-
    // range check for a passcode, not an exact calendar conversion, so a
    // wide ±2 buffer on the offset is fine.
    const approxShamsiNow = currentYear - 621;
    const validShamsi = birthYearNum >= approxShamsiNow - 102 && birthYearNum <= approxShamsiNow - 11;
    return validGregorian || validShamsi;
  };

  const sendCode = async () => {
    const found = detectContact(contact);
    if (!found) {
      setError(t(lang, 'errInvalidContact'));
      return;
    }
    if (found.channel === 'sms' && isIranianPhone(found.value)) {
      setError(t(lang, 'errIranSms'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sendVerificationCode(found);
      setDetected(found);
      setCode('');
      setStep('code');
      startCooldown();
    } catch (err) {
      setError(sendCodeErrorMessage(lang, err));
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (!detected || cooldown > 0) return;
    setBusy(true);
    setError('');
    setCode('');
    try {
      await sendVerificationCode(detected);
      startCooldown();
    } catch (err) {
      setError(sendCodeErrorMessage(lang, err));
    } finally {
      setBusy(false);
    }
  };

  // A ref, not `busy`: the auto-submit below fires from onChangeText, before
  // a re-render could disable anything, so state alone can't stop a second
  // verify (e.g. SMS autofill followed by the keyboard's Done key).
  const verifying = useRef(false);
  const confirmCode = async (value: string = code) => {
    if (!detected || verifying.current) return;
    if (!/^\d{6}$/.test(value)) {
      setError(t(lang, 'errCodeIncomplete'));
      return;
    }
    verifying.current = true;
    setBusy(true);
    setError('');
    try {
      await verifyCode(detected, value);
      setPassword('');
      setStep('password');
    } catch (err) {
      // Empty the circles so the parent can type the code again straight
      // away; the error stays up until they start typing.
      setCode('');
      setError(verifyCodeErrorMessage(lang, err));
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  };

  // No button press needed: the sixth digit submits the code by itself.
  const onCodeChange = (value: string) => {
    tick(code, value);
    setCode(value);
    setError('');
    if (value.length === 6 && code.length < 6) confirmCode(value);
  };

  const finish = async () => {
    if (!/^\d{4}$/.test(password)) {
      setError(t(lang, 'errPasswordIncomplete'));
      return;
    }
    if (!validateBirthYear(password)) {
      setError(t(lang, 'errInvalidBirthYear'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const birthYearNum = Number(password);
      await activateAccount(contact.trim(), password, birthYearNum);
      reset({ name: 'Home' });
    } catch {
      setError(t(lang, 'errSaveFailed'));
    } finally {
      setBusy(false);
    }
  };

  // A phone number here has to carry its country code — the verification API
  // rejects a bare national number — and people reliably leave the + off. So
  // the moment what they're typing reads as a number rather than an email, a
  // single leading + is pinned in place and can't be deleted or duplicated.
  // Anything containing a letter or @ is left completely alone.
  // One short tick per character added — the same Light impact the rest of
  // the app uses on tap, plus a quiet blip. Deliberately silent on delete, so
  // holding backspace doesn't machine-gun.
  const tapPlayer = useRef<AudioPlayer | null>(null);
  useEffect(() => {
    try {
      const player = createAudioPlayer(KEY_TAP);
      player.volume = 0.22;
      tapPlayer.current = player;
    } catch {
      // Sound is a nice-to-have; never let it break the sign-in form.
    }
    return () => {
      try { tapPlayer.current?.remove(); } catch {}
      tapPlayer.current = null;
    };
  }, []);

  const tick = (before: string, after: string) => {
    if (after.length <= before.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Separate try blocks: seekTo() throws on a player that hasn't finished
    // loading, and sharing one block meant play() was skipped entirely.
    const player = tapPlayer.current;
    if (!player) return;
    try { player.seekTo(0); } catch {}
    try { player.play(); } catch {}
  };

  // Parsed on every keystroke so the button can stay disabled until what's
  // typed is actually a reachable email or a +country phone number.
  const parsedContact = useMemo(() => detectContact(contact), [contact]);

  const onEmailChange = (raw: string) => { tick(email, raw); setEmail(raw); setError(''); };
  const onNationalChange = (raw: string) => {
    const next = toNational(raw);
    tick(national, next);
    setNational(next);
    setError('');
  };

  const backToContact = () => {
    setStep('contact');
    setDetected(null);
    setCode('');
    setError('');
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setCooldown(0);
  };

  const stepCopy: Record<Step, { title: string; subtitle: string }> = {
    contact: {
      title: t(lang, 'contactTitle'),
      subtitle: t(lang, 'contactSubtitle'),
    },
    code: {
      title: t(lang, 'codeTitle'),
      subtitle: codeSubtitle(lang, contact.trim()),
    },
    password: {
      title: t(lang, 'passwordTitle'),
      subtitle: t(lang, 'passwordSubtitle'),
    },
  };

  return (
    // No KeyboardAvoidingView: PortraitFallback lifts the app clear of the keyboard for every screen.
    <View style={styles.root}>
      {/* A sibling backdrop behind everything else, not a wrapper around it —
          wrapping the whole screen in a Touchable put every nested
          TouchableOpacity/Modal trigger inside its responder subtree, and
          some of them (the small ones especially) silently stopped
          receiving taps. As a sibling painted first, it only ever catches
          taps that nothing on top of it claims. */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      <View style={styles.sun} />
      <View style={styles.cloud} />
      {canGoBack && (
        // Only reachable now: this screen used to be first-run only (no way
        // to leave), but "forgot password" (SettingsUnlockScreen) pushes it
        // on top of that screen too — without a close button, cancelling out
        // of a password reset would be a dead end.
        <TouchableOpacity style={styles.closeButton} onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Image source={neliWorldAssets.ui.close} style={styles.closeIcon} resizeMode="contain" />
        </TouchableOpacity>
      )}
      <View
        style={[
          styles.shell,
          portrait
            ? { width: Math.min(width - 24, 520), maxHeight: height - 24, flexDirection: 'column' }
            : { width: Math.min(width - 36, 980), minHeight: Math.min(height - 32, 570), maxHeight: height - 20, flexDirection: rtl ? 'row-reverse' : 'row' },
        ]}
      >
        <View
          style={[
            styles.artPane,
            portrait && styles.artPanePortrait,
            portrait && { flexDirection: rtl ? 'row-reverse' : 'row' },
          ]}
        >
          <Image
            source={characterAssets.neli.poses.waving}
            style={[
              styles.character,
              portrait ? styles.characterPortrait : { height: Math.max(110, Math.min(270, height * 0.46)) },
            ]}
            resizeMode="contain"
          />
          <View style={portrait ? styles.artTextPortrait : styles.artTextLandscape}>
            <Text style={[styles.artTitle, portrait && styles.artTitlePortrait, { fontFamily: ff(lang, 'black') }, textDir]}>{t(lang, 'welcomeTitle')}</Text>
            <Text style={[styles.artCopy, portrait && styles.artCopyPortrait, { fontFamily: ff(lang, 'regular') }, textDir]}>{t(lang, 'welcomeCopy')}</Text>
          </View>
        </View>

        <ScrollView
          // In portrait the shell has only a maxHeight, no height, so
          // `flex: 1` (basis 0) collapses the form to nothing — App Review
          // saw just the welcome banner on an iPad and called it
          // unresponsive. Size to content there and shrink to fit instead.
          style={portrait ? styles.formPanePortrait : styles.formPane}
          contentContainerStyle={[styles.formContent, portrait && styles.formContentPortrait, short && styles.formContentShort]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.topRow, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <LanguageDropdown lang={lang} onSelect={setSettingsLang} rtl={rtl} />
          </View>
          <Text style={[styles.title, short && styles.titleShort, { fontFamily: ff(lang, 'black') }, textDir]}>{stepCopy[step].title}</Text>
          <Text style={[styles.subtitle, short && styles.subtitleShort, { fontFamily: ff(lang, 'regular') }, textDir]}>{stepCopy[step].subtitle}</Text>

          {step === 'contact' && (
            <>
              {/* Email and phone are different kinds of input and deserve
                  different controls. Splitting them removes the guesswork that
                  a single combined field forces on both sides. */}
              <View style={[styles.tabs, short && styles.tabsShort]}>
                {(['email', 'phone'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.tab, short && styles.tabShort, mode === m && styles.tabActive]}
                    onPress={() => { setMode(m); setError(''); }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.tabText, mode === m && styles.tabTextActive, { fontFamily: ff(lang, 'bold') }]}>
                      {t(lang, m === 'email' ? 'tabEmail' : 'tabPhone')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {mode === 'email' ? (
                <TextInput
                  disableFullscreenUI
                  value={email}
                  onChangeText={onEmailChange}
                  placeholder={t(lang, 'emailPlaceholder')}
                  placeholderTextColor="#8B80A8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  // An address reads left-to-right whatever the interface
                  // language is, so this field opts out of `textDir`.
                  style={[styles.input, styles.inputLtr, { fontFamily: ff(lang, 'regular') }]}
                  onBlur={() => { if (email.trim() && !parsedContact) setError(t(lang, 'errInvalidContact')); }}
                  onSubmitEditing={sendCode}
                />
              ) : (
                <View style={styles.phoneRow}>
                  <TouchableOpacity style={styles.countryButton} onPress={() => setCountryOpen(true)} activeOpacity={0.85}>
                    <Text style={[styles.countryCode, { fontFamily: ff(lang, 'bold') }]}>{country.code}</Text>
                    <Text style={[styles.countryDial, { fontFamily: ff(lang, 'bold') }]}>{country.dial}</Text>
                    <Text style={styles.langChevron}>▼</Text>
                  </TouchableOpacity>
                  <TextInput
                    disableFullscreenUI
                    value={national}
                    onChangeText={onNationalChange}
                    placeholder={t(lang, 'phonePlaceholder')}
                    placeholderTextColor="#8B80A8"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    style={[styles.input, styles.inputLtr, styles.phoneInput, { fontFamily: ff(lang, 'regular') }]}
                    onSubmitEditing={sendCode}
                  />
                </View>
              )}

              <PickerSheet
                visible={countryOpen}
                title={t(lang, 'chooseCountry')}
                lang={lang}
                onClose={() => setCountryOpen(false)}
                scroll
              >
                {COUNTRIES.map(c => (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.sheetRow, { flexDirection: 'row' }, c.code === country.code && styles.sheetRowActive]}
                    onPress={() => { setCountry(c); setCountryOpen(false); setError(''); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sheetCode, { fontFamily: ff(lang, 'bold') }]}>{c.code}</Text>
                    <Text style={[styles.sheetLabel, { fontFamily: ff(lang, 'bold') }]}>{c.name}</Text>
                    <Text style={[styles.sheetDial, { fontFamily: ff(lang, 'regular') }]}>{c.dial}</Text>
                  </TouchableOpacity>
                ))}
              </PickerSheet>

              {/* Twilio stopped delivering SMS to +98 in March 2025. Say so the
                  moment Iran is picked, instead of after they tap Send. */}
              {iranSms && (
                <View style={styles.notice}>
                  <Text style={[styles.noticeText, { fontFamily: ff(lang, 'regular') }, textDir]}>{t(lang, 'errIranSms')}</Text>
                  <TouchableOpacity onPress={() => { setMode('email'); setError(''); }} activeOpacity={0.7}>
                    <Text style={[styles.link, { fontFamily: ff(lang, 'bold') }]}>{t(lang, 'useEmailInstead')}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {error ? <Text style={[styles.error, { fontFamily: ff(lang, 'bold') }, textDir]}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.primaryButton, (!parsedContact || iranSms) && styles.primaryButtonDisabled]}
                onPress={sendCode}
                disabled={busy || !parsedContact || iranSms}
                activeOpacity={0.86}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.primaryText, { fontFamily: ff(lang, 'black') }]}>{t(lang, 'sendCode')}</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'code' && (
            <>
              <CodeCircles
                length={6}
                value={code}
                onChangeText={onCodeChange}
                autoFocus
                oneTimeCode
                onSubmitEditing={() => confirmCode()}
                lang={lang}
              />
              {error ? <Text style={[styles.error, { fontFamily: ff(lang, 'bold') }, textDir]}>{error}</Text> : null}
              <TouchableOpacity style={styles.primaryButton} onPress={() => confirmCode()} disabled={busy} activeOpacity={0.86}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.primaryText, { fontFamily: ff(lang, 'black') }]}>{t(lang, 'confirmCode')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={resendCode} disabled={busy || cooldown > 0} activeOpacity={0.7} style={styles.linkRow}>
                <Text style={[styles.link, cooldown > 0 && styles.linkDisabled, { fontFamily: ff(lang, 'bold') }]}>
                  {resendLabel(lang, cooldown)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={backToContact} disabled={busy} activeOpacity={0.7}>
                <Text style={[styles.link, { fontFamily: ff(lang, 'regular') }]}>{t(lang, 'changeContact')}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'password' && (
            <>
              <Text style={[styles.fieldLabel, { fontFamily: ff(lang, 'bold') }, textDir]}>{t(lang, 'birthYearLabel')}</Text>
              <CodeCircles
                length={4}
                value={password}
                onChangeText={value => { tick(password, value); setPassword(value); setError(''); }}
                secure
                autoFocus
                onSubmitEditing={finish}
                lang={lang}
              />
              {error ? <Text style={[styles.error, { fontFamily: ff(lang, 'bold') }, textDir]}>{error}</Text> : null}
              <TouchableOpacity style={styles.primaryButton} onPress={finish} disabled={busy} activeOpacity={0.86}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.primaryText, { fontFamily: ff(lang, 'black') }]}>{t(lang, 'saveAndStart')}</Text>}
              </TouchableOpacity>
            </>
          )}

          <Text style={[styles.note, { fontFamily: ff(lang, 'regular') }]}>{t(lang, 'note')}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#64D8A4', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sun: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#FFE16A', top: -100, right: -55 },
  cloud: { position: 'absolute', width: 360, height: 180, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.34)', bottom: -80, left: -70 },
  closeButton: { position: 'absolute', top: 12, left: 12, width: 50, height: 50, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  closeIcon: { width: 46, height: 46 },
  shell: { borderRadius: 34, backgroundColor: '#FFFFFF', overflow: 'visible', borderWidth: 7, borderColor: 'rgba(255,255,255,0.75)', elevation: 12, shadowColor: '#174B3A', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  artPane: { width: '43%', backgroundColor: '#FFF3B0', alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 27, overflow: 'hidden' },
  artPanePortrait: { width: '100%', paddingVertical: 14, paddingHorizontal: 18, gap: 14, justifyContent: 'flex-start' },
  character: { width: '82%', height: 270 },
  characterCompact: { height: 200 },
  characterPortrait: { width: 74, height: 74, flexShrink: 0 },
  artTextLandscape: { width: '100%' },
  artTextPortrait: { flex: 1, minWidth: 0 },
  artTitle: { color: '#321E63', fontSize: 27, textAlign: 'center' },
  artTitlePortrait: { fontSize: 19, textAlign: 'left' },
  artCopy: { color: '#66577F', fontSize: 14, lineHeight: 23, textAlign: 'center', marginTop: 8 },
  artCopyPortrait: { fontSize: 12.5, lineHeight: 19, textAlign: 'left', marginTop: 3 },
  formPane: { flex: 1 },
  formPanePortrait: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
  formContent: { flexGrow: 1, paddingHorizontal: 42, paddingVertical: 30, justifyContent: 'center' },
  formContentPortrait: { paddingHorizontal: 22, paddingVertical: 20 },
  topRow: { alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 },
  langWrap: { position: 'relative', zIndex: 20 },
  langButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F1FA', borderWidth: 2, borderColor: '#E1D9EE', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, gap: 6 },
  langButtonText: { color: '#2C175D', fontSize: 13 },
  langChevron: { color: '#8B80A8', fontSize: 10, marginLeft: 2 },
  langMenu: { position: 'absolute', top: 46, minWidth: 150, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#E1D9EE', paddingVertical: 6, elevation: 16, shadowColor: '#174B3A', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, zIndex: 30 },
  langMenuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  langMenuItemActive: { backgroundColor: '#FFF0C8' },
  langMenuText: { color: '#2C175D', fontSize: 14 },
  title: { color: '#2C175D', fontSize: 29 },
  subtitle: { color: '#776B91', fontSize: 14, lineHeight: 23, marginTop: 6, marginBottom: 20 },
  inputLtr: { textAlign: 'left', writingDirection: 'ltr' },
  formContentShort: { paddingHorizontal: 28, paddingVertical: 14 },
  titleShort: { fontSize: 22 },
  subtitleShort: { fontSize: 12.5, lineHeight: 19, marginTop: 4, marginBottom: 12 },
  tabsShort: { marginBottom: 9, padding: 3 },
  tabShort: { paddingVertical: 7 },
  tabs: { flexDirection: 'row', backgroundColor: '#F4F1FA', borderRadius: 16, padding: 4, marginBottom: 14, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#174B3A', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { color: '#8B80A8', fontSize: 14 },
  tabTextActive: { color: '#2C175D' },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryButton: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#F4F1FA', borderWidth: 2, borderColor: '#E1D9EE' },
  countryCode: { color: '#8B80A8', fontSize: 12, writingDirection: 'ltr' },
  countryDial: { color: '#2C175D', fontSize: 15, writingDirection: 'ltr' },
  phoneInput: { flex: 1 },
  notice: { backgroundColor: '#FFF0C8', borderRadius: 16, padding: 12, marginBottom: 12 },
  noticeText: { color: '#7A5B12', fontSize: 12.5, lineHeight: 20 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(26,12,48,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 420, maxHeight: '82%', backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 8 },
  sheetScroll: { flexGrow: 0 },
  sheetTitle: { color: '#2C175D', fontSize: 16, textAlign: 'center', marginBottom: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  sheetRowActive: { backgroundColor: '#FFF0C8' },
  // Three fixed columns, all pinned LTR: the ISO code and the dial code are
  // Latin runs that render backwards ("98+") inside an RTL screen, and they
  // only read as columns if every row starts and ends at the same x.
  sheetCode: { color: '#8B80A8', fontSize: 12, width: 30, textAlign: 'left', writingDirection: 'ltr' },
  sheetLabel: { color: '#2C175D', fontSize: 15, flex: 1, textAlign: 'left', writingDirection: 'ltr' },
  // Pinned LTR with a fixed column width: a dial code is Latin text and
  // renders as "98+" inside an RTL screen, and the codes only read as a
  // column if they all end at the same x.
  sheetDial: { color: '#8B80A8', fontSize: 13, minWidth: 52, textAlign: 'right', writingDirection: 'ltr' },
  input: { height: 54, borderRadius: 18, backgroundColor: '#F4F1FA', borderWidth: 2, borderColor: '#E1D9EE', paddingHorizontal: 17, color: '#2C175D', fontSize: 15, marginBottom: 13 },
  fieldLabel: { color: '#2C175D', fontSize: 14, marginBottom: 10 },
  circleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, position: 'relative' },
  circle: {
    width: 46, height: 46, borderRadius: 23, marginHorizontal: 6,
    backgroundColor: '#F4F1FA', borderWidth: 2, borderColor: '#E1D9EE',
    alignItems: 'center', justifyContent: 'center',
  },
  circleFilled: { backgroundColor: '#FF7A1A', borderColor: '#FF7A1A' },
  circleCursor: { borderColor: '#FF7A1A' },
  circleDigit: { color: '#FFFFFF', fontSize: 20 },
  circleDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF' },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
  error: { color: '#D73737', marginBottom: 8, fontSize: 12 },
  primaryButton: { height: 54, borderRadius: 19, backgroundColor: '#FF7A1A', alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryText: { color: '#FFFFFF', fontSize: 16 },
  linkRow: { marginTop: 14 },
  link: { color: '#6B21A8', textAlign: 'center', fontSize: 13, marginTop: 6 },
  linkDisabled: { color: '#B7AECB' },
  note: { color: '#9488AD', textAlign: 'center', fontSize: 11, marginTop: 11 },
});
