import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { PACKAGE_TYPE, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import TopBar from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { isRevenueCatConfigured } from '../config/revenuecat';
import { buyPackage, fetchCurrentOffering, restorePurchases } from '../services/purchases';

// Placeholder plans shown until a real RevenueCat Offering is configured
// (see src/config/revenuecat.ts). Once real API keys + products exist,
// this screen automatically switches to the live prices below.
const PLACEHOLDER_PLANS = [
  { id: 'yearly', price: '$29.99', period: { fa: 'در سال', en: '/ year' }, badge: { fa: 'بهترین ارزش', en: 'Best value' } },
  { id: 'monthly', price: '$4.99', period: { fa: 'در ماه', en: '/ month' } },
];

const BENEFITS: { emoji: string; fa: string; en: string }[] = [
  { emoji: '🔓', fa: 'دسترسی به همه‌ی درس‌ها و بازی‌ها', en: 'Unlock every lesson and game' },
  { emoji: '📚', fa: 'داستان‌ها و کتاب‌های صوتی جدید هر ماه', en: 'New stories & audiobooks every month' },
  { emoji: '🚫', fa: 'بدون تبلیغات', en: 'No ads' },
  { emoji: '👨‍👩‍👧', fa: 'برای همه‌ی بچه‌های خانواده', en: 'Use with every child in the family' },
];

function periodLabel(type: PACKAGE_TYPE, isFa: boolean): string {
  switch (type) {
    case PACKAGE_TYPE.ANNUAL:     return isFa ? 'در سال' : '/ year';
    case PACKAGE_TYPE.SIX_MONTH:  return isFa ? 'در ۶ ماه' : '/ 6 months';
    case PACKAGE_TYPE.THREE_MONTH:return isFa ? 'در ۳ ماه' : '/ 3 months';
    case PACKAGE_TYPE.TWO_MONTH:  return isFa ? 'در ۲ ماه' : '/ 2 months';
    case PACKAGE_TYPE.MONTHLY:    return isFa ? 'در ماه' : '/ month';
    case PACKAGE_TYPE.WEEKLY:     return isFa ? 'در هفته' : '/ week';
    case PACKAGE_TYPE.LIFETIME:   return isFa ? 'یک‌بار' : 'one-time';
    default:                      return '';
  }
}

interface DisplayPlan {
  key: string;
  price: string;
  period: string;
  badge?: string;
  pkg?: PurchasesPackage; // present only for real (live) plans
}

// The single payment/paywall destination for the whole app. Any "Premium"
// entry point (see usePremiumGate) lands here after the password check.
// It fetches the live Offering from RevenueCat when configured; until then
// (or if fetching fails — no network, no products set up yet) it falls
// back to the placeholder plans above so the screen still looks right.
export default function PremiumScreen() {
  const { settingsLang, setIsPremium } = useContext(AppContext);
  const { goBack, navigate } = useNav();
  const { width, height } = useWindowDimensions();
  const ui = Math.min(width / 390, height / 844);
  const isFa = settingsLang === 'fa';

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [offeringLoading, setOfferingLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const live = isRevenueCatConfigured();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (live) {
        const current = await fetchCurrentOffering();
        if (!cancelled) setOffering(current);
      }
      if (!cancelled) setOfferingLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayPlans: DisplayPlan[] = useMemo(() => {
    if (offering && offering.availablePackages.length > 0) {
      return offering.availablePackages.map(pkg => ({
        key: pkg.identifier,
        price: pkg.product.priceString,
        period: periodLabel(pkg.packageType, isFa),
        badge: pkg.packageType === PACKAGE_TYPE.ANNUAL ? (isFa ? 'بهترین ارزش' : 'Best value') : undefined,
        pkg,
      }));
    }
    return PLACEHOLDER_PLANS.map(p => ({
      key: p.id,
      price: p.price,
      period: isFa ? p.period.fa : p.period.en,
      badge: p.badge ? (isFa ? p.badge.fa : p.badge.en) : undefined,
    }));
  }, [offering, isFa]);

  useEffect(() => {
    if (displayPlans.length === 0) return;
    if (displayPlans.some(p => p.key === selectedKey)) return;
    const preferred = displayPlans.find(p => p.badge) ?? displayPlans[0];
    setSelectedKey(preferred.key);
  }, [displayPlans, selectedKey]);

  const selectedPlan = displayPlans.find(p => p.key === selectedKey);

  const startPurchase = async () => {
    setMessage(null);
    if (!selectedPlan) return;

    if (!selectedPlan.pkg) {
      // Preview mode — RevenueCat isn't configured with real products yet.
      setMessage({
        type: 'info',
        text: isFa ? 'پرداخت هنوز فعال نشده است. به‌زودی!' : "Payment isn't connected yet — coming soon!",
      });
      return;
    }

    setPurchasing(true);
    const result = await buyPackage(selectedPlan.pkg);
    setPurchasing(false);

    if (result.cancelled) return;
    if (result.success) {
      setIsPremium(true);
      navigate({ name: 'Main', tab: 'Profile' });
      return;
    }
    setMessage({
      type: 'error',
      text: result.error || (isFa ? 'خرید انجام نشد. دوباره تلاش کنید.' : 'Purchase failed. Please try again.'),
    });
  };

  const onRestore = async () => {
    setMessage(null);
    if (!live) {
      setMessage({
        type: 'info',
        text: isFa ? 'پرداخت هنوز فعال نشده است. به‌زودی!' : "Payment isn't connected yet — coming soon!",
      });
      return;
    }
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.success) {
      setIsPremium(true);
      navigate({ name: 'Main', tab: 'Profile' });
      return;
    }
    setMessage({
      type: result.error ? 'error' : 'info',
      text: result.error || (isFa ? 'خریدی برای بازیابی پیدا نشد.' : 'No previous purchase found to restore.'),
    });
  };

  return (
    <View style={styles.root}>
      <TopBar title="Premium" titleFa="نسخه ویژه" displayLang={settingsLang} showClose onBack={goBack} dark />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Math.max(14, Math.round(16 * ui)), paddingBottom: Math.max(28, Math.round(34 * ui)) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.crown}>👑</Text>
          <Text style={[styles.heroTitle, { fontFamily: ff(settingsLang, 'black') }, dir(settingsLang)]}>
            {isFa ? 'زبان کوچولو ویژه' : 'Little Persian Premium'}
          </Text>
          <Text style={[styles.heroSub, { fontFamily: ff(settingsLang, 'regular') }, dir(settingsLang)]}>
            {isFa ? 'همه‌چیز را برای یادگیری فارسی باز کن.' : 'Unlock everything for learning Persian.'}
          </Text>
        </View>

        <View style={styles.panel}>
          {BENEFITS.map(b => (
            <View key={b.en} style={[styles.benefitRow, isFa && styles.benefitRowRtl]}>
              <Text style={styles.benefitEmoji}>{b.emoji}</Text>
              <Text style={[styles.benefitText, { fontFamily: ff(settingsLang, 'bold') }, dir(settingsLang)]}>
                {isFa ? b.fa : b.en}
              </Text>
            </View>
          ))}
        </View>

        {offeringLoading ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
        ) : (
          <View style={styles.plans}>
            {displayPlans.map(plan => {
              const active = selectedKey === plan.key;
              return (
                <TouchableOpacity
                  key={plan.key}
                  style={[styles.planCard, active && styles.planCardActive]}
                  onPress={() => setSelectedKey(plan.key)}
                  activeOpacity={0.86}
                >
                  {plan.badge ? (
                    <View style={styles.planBadge}>
                      <Text style={[styles.planBadgeText, { fontFamily: ff(settingsLang, 'black') }]}>{plan.badge}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.planPrice, { fontFamily: ff(settingsLang, 'black') }]}>{plan.price}</Text>
                  <Text style={[styles.planPeriod, { fontFamily: ff(settingsLang, 'regular') }]}>{plan.period}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.ctaButton} onPress={startPurchase} activeOpacity={0.88} disabled={purchasing || offeringLoading}>
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.ctaText, { fontFamily: ff(settingsLang, 'black') }]}>
              {isFa ? 'شروع نسخه ویژه' : 'Start Premium'}
            </Text>
          )}
        </TouchableOpacity>

        {message ? (
          <Text style={[styles.notice, message.type === 'error' && styles.noticeError, { fontFamily: ff(settingsLang, 'regular') }, dir(settingsLang)]}>
            {message.text}
          </Text>
        ) : null}

        <TouchableOpacity onPress={onRestore} disabled={restoring}>
          <Text style={[styles.restore, { fontFamily: ff(settingsLang, 'bold') }]}>
            {restoring ? (isFa ? 'در حال بازیابی…' : 'Restoring…') : (isFa ? 'بازیابی خرید' : 'Restore purchase')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1E135E' },
  scroll: { gap: 14 },
  hero: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  crown: { fontSize: 54, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 24, textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center' },
  panel: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 26, padding: 16, gap: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitRowRtl: { flexDirection: 'row-reverse' },
  benefitEmoji: { fontSize: 22 },
  benefitText: { flex: 1, color: '#221044', fontSize: 14 },
  plans: { flexDirection: 'row', gap: 10 },
  planCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 22, paddingVertical: 18, alignItems: 'center', borderWidth: 3, borderColor: 'transparent' },
  planCardActive: { borderColor: '#FFD93D', backgroundColor: '#FFF8E0' },
  planBadge: { position: 'absolute', top: -12, backgroundColor: '#FFD93D', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  planBadgeText: { color: '#4A2D00', fontSize: 11 },
  planPrice: { color: '#221044', fontSize: 22 },
  planPeriod: { color: '#6B5A89', fontSize: 12, marginTop: 2 },
  ctaButton: { height: 58, borderRadius: 19, backgroundColor: '#FF7A1A', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 17 },
  notice: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'center' },
  noticeError: { color: '#FFB4B4' },
  restore: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginTop: 2 },
});
