// "Delete account" panel for the parent Settings screen — required by App
// Store guideline 5.1.1(v) (apps that create accounts must let users delete
// them in-app). Deliberately inline steps, not a <Modal> (see CLAUDE.md on
// Modal + landscape crashes on iOS release builds).
//
// Flow: Delete account -> confirm -> [re-enter emailed/SMS code, only when
// there's no Supabase session to authorize the server-side delete] ->
// server record deleted -> device data wiped -> "Account deleted" -> OK
// returns to first-run AccountSetup.
import React, { useContext, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppContext, Lang } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { supabaseConfigured } from '../services/supabaseClient';
import {
  DeleteAccountError, DetectedContact, deleteRemoteAccount, detectContact,
  hasRemoteSession, sendDeletionCode, verifyCode,
} from '../services/accountActivation';

const TX: Record<string, Partial<Record<Lang, string>>> = {
  title: { fa: 'حذف حساب', en: 'Delete account', fr: 'Supprimer le compte', es: 'Eliminar cuenta' },
  intro: {
    fa: 'حساب والدین و همه داده‌های این دستگاه برای همیشه حذف می‌شود.',
    en: 'Permanently deletes the parent account and all data on this device.',
    fr: 'Supprime définitivement le compte parent et toutes les données de cet appareil.',
    es: 'Elimina para siempre la cuenta de padres y todos los datos de este dispositivo.',
  },
  button: { fa: 'حذف حساب', en: 'Delete account', fr: 'Supprimer le compte', es: 'Eliminar cuenta' },
  confirmTitle: { fa: 'مطمئن هستید؟', en: 'Are you sure?', fr: 'Êtes-vous sûr ?', es: '¿Estás seguro?' },
  confirmBody: {
    fa: 'این کار برگشت‌پذیر نیست. اطلاعات تماس شما از سرور ما حذف می‌شود و پیشرفت کودک، رمز عبور و تنظیمات از این دستگاه پاک می‌شوند.',
    en: 'This cannot be undone. Your contact record is deleted from our server, and your child\'s progress, the passcode and all settings are erased from this device.',
    fr: 'Action irréversible. Vos coordonnées sont supprimées de notre serveur, et la progression, le code et les paramètres sont effacés de cet appareil.',
    es: 'No se puede deshacer. Tus datos de contacto se eliminan de nuestro servidor, y el progreso, la contraseña y los ajustes se borran de este dispositivo.',
  },
  confirmYes: { fa: 'بله، برای همیشه حذف کن', en: 'Yes, delete permanently', fr: 'Oui, supprimer définitivement', es: 'Sí, eliminar para siempre' },
  cancel: { fa: 'انصراف', en: 'Cancel', fr: 'Annuler', es: 'Cancelar' },
  codeBody: {
    fa: 'برای تأیید، کد ۶ رقمی ارسال‌شده به این آدرس را وارد کنید:',
    en: 'To confirm, enter the 6-digit code we just sent to:',
    fr: 'Pour confirmer, saisissez le code à 6 chiffres envoyé à :',
    es: 'Para confirmar, ingresa el código de 6 dígitos que enviamos a:',
  },
  codePlaceholder: { fa: 'کد ۶ رقمی', en: '6-digit code', fr: 'Code à 6 chiffres', es: 'Código de 6 dígitos' },
  codeConfirm: { fa: 'تأیید و حذف حساب', en: 'Confirm & delete account', fr: 'Confirmer et supprimer', es: 'Confirmar y eliminar' },
  doneTitle: { fa: 'حساب حذف شد', en: 'Account deleted', fr: 'Compte supprimé', es: 'Cuenta eliminada' },
  doneBody: {
    fa: 'حساب والدین و همه داده‌های آن حذف شد.',
    en: 'The parent account and all of its data have been deleted.',
    fr: 'Le compte parent et toutes ses données ont été supprimés.',
    es: 'La cuenta de padres y todos sus datos han sido eliminados.',
  },
  ok: { fa: 'باشه', en: 'OK', fr: 'OK', es: 'OK' },
  errCode: { fa: 'کد درست نیست یا منقضی شده است.', en: 'That code is incorrect or has expired.', fr: 'Code incorrect ou expiré.', es: 'El código es incorrecto o ha caducado.' },
  errNetwork: {
    fa: 'اتصال به سرور ممکن نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.',
    en: 'Couldn\'t reach the server. Check your internet connection and try again.',
    fr: 'Serveur injoignable. Vérifiez votre connexion et réessayez.',
    es: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  },
};

function t(lang: Lang, key: keyof typeof TX): string {
  return TX[key]?.[lang] ?? TX[key]?.en ?? '';
}

type Step = 'idle' | 'confirm' | 'code' | 'done';

export default function DeleteAccountCard({ lang, ui }: { lang: Lang; ui: number }) {
  const { accountContact, deleteLocalAccount } = useContext(AppContext);
  const { reset } = useNav();
  const [step, setStep] = useState<Step>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [contact, setContact] = useState<DetectedContact | null>(null);
  const isFa = lang === 'fa';

  const finish = async () => {
    await deleteLocalAccount();
    setStep('done');
  };

  // Server delete if we're authorized; otherwise ask for a fresh code.
  const startDeletion = async () => {
    setBusy(true);
    setError('');
    try {
      if (!supabaseConfigured) { await finish(); return; }
      if (await hasRemoteSession()) {
        try {
          await deleteRemoteAccount();
          await finish();
          return;
        } catch (err) {
          if (!(err instanceof DeleteAccountError && err.needsReverify)) throw err;
        }
      }
      const detected = detectContact(accountContact ?? '');
      // Every account was created through detectContact, so an unparseable
      // contact can't have a server record behind it.
      if (!detected) { await finish(); return; }
      const sent = await sendDeletionCode(detected);
      if (sent === 'no-remote-account') { await finish(); return; }
      setContact(detected);
      setCode('');
      setStep('code');
    } catch {
      setError(t(lang, 'errNetwork'));
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    if (!contact || code.length < 6 || busy) return;
    setBusy(true);
    setError('');
    try {
      try {
        await verifyCode(contact, code);
      } catch {
        setError(t(lang, 'errCode'));
        return;
      }
      await deleteRemoteAccount();
      await finish();
    } catch {
      setError(t(lang, 'errNetwork'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => { setStep('idle'); setError(''); setCode(''); };

  const radius = Math.max(22, Math.round(26 * ui));
  const pad = Math.max(14, Math.round(16 * ui));
  const titleSize = Math.max(16, Math.round(18 * ui));

  if (step === 'done') {
    return (
      <View style={[styles.panel, { borderRadius: radius, padding: pad }]}>
        <Text style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: titleSize }, dir(lang)]}>{t(lang, 'doneTitle')}</Text>
        <Text style={[styles.body, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>{t(lang, 'doneBody')}</Text>
        <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => reset({ name: 'AccountSetup' })} activeOpacity={0.84}>
          <Text style={[styles.buttonText, { fontFamily: ff(lang, 'black') }]}>{t(lang, 'ok')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.panel, { borderRadius: radius, padding: pad }]}>
      <Text style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: titleSize }, dir(lang)]}>
        {step === 'idle' ? t(lang, 'title') : t(lang, 'confirmTitle')}
      </Text>

      {step === 'idle' && (
        <>
          <Text style={[styles.body, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>{t(lang, 'intro')}</Text>
          <TouchableOpacity style={[styles.button, styles.danger]} onPress={() => setStep('confirm')} activeOpacity={0.84}>
            <Text style={[styles.buttonText, { fontFamily: ff(lang, 'black') }]}>{t(lang, 'button')}</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'confirm' && (
        <>
          <Text style={[styles.body, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>{t(lang, 'confirmBody')}</Text>
          {!!accountContact && <Text style={[styles.contact, { fontFamily: ff(lang, 'bold') }]}>{accountContact}</Text>}
          <View style={[styles.row, isFa && styles.rowRtl]}>
            <TouchableOpacity style={[styles.button, styles.secondary, styles.half]} onPress={cancel} disabled={busy} activeOpacity={0.84}>
              <Text style={[styles.buttonText, styles.secondaryText, { fontFamily: ff(lang, 'black') }]}>{t(lang, 'cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.danger, styles.half]} onPress={startDeletion} disabled={busy} activeOpacity={0.84}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.buttonText, { fontFamily: ff(lang, 'black') }]}>{t(lang, 'confirmYes')}</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {step === 'code' && (
        <>
          <Text style={[styles.body, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>{t(lang, 'codeBody')}</Text>
          <Text style={[styles.contact, { fontFamily: ff(lang, 'bold') }]}>{contact?.value}</Text>
          <TextInput
            disableFullscreenUI
            value={code}
            onChangeText={value => { setCode(value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            placeholder={t(lang, 'codePlaceholder')}
            placeholderTextColor="#8B80A8"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            onSubmitEditing={confirmCode}
            style={[styles.input, { fontFamily: ff(lang, 'bold') }]}
          />
          <View style={[styles.row, isFa && styles.rowRtl]}>
            <TouchableOpacity style={[styles.button, styles.secondary, styles.half]} onPress={cancel} disabled={busy} activeOpacity={0.84}>
              <Text style={[styles.buttonText, styles.secondaryText, { fontFamily: ff(lang, 'black') }]}>{t(lang, 'cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.danger, styles.half, (code.length < 6) && styles.disabled]}
              onPress={confirmCode}
              disabled={busy || code.length < 6}
              activeOpacity={0.84}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.buttonText, { fontFamily: ff(lang, 'black') }]}>{t(lang, 'codeConfirm')}</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {!!error && <Text style={[styles.error, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: 'rgba(255,255,255,0.95)', gap: 10 },
  title: { color: '#221044' },
  body: { color: '#5C4B78', fontSize: 12.5, lineHeight: 20 },
  contact: { color: '#7C3AED', fontSize: 13, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 9 },
  rowRtl: { flexDirection: 'row-reverse' },
  half: { flex: 1 },
  button: { minHeight: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  danger: { backgroundColor: '#D73737' },
  primary: { backgroundColor: '#7C3AED' },
  secondary: { backgroundColor: '#F0EBFF' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
  secondaryText: { color: '#4A2D8A' },
  input: { height: 52, borderRadius: 16, backgroundColor: '#F3F0F8', borderWidth: 2, borderColor: '#DED7EA', paddingHorizontal: 14, color: '#2D1B69', textAlign: 'center', fontSize: 18, letterSpacing: 6 },
  error: { color: '#D73737', fontSize: 12 },
});
