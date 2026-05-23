import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import useGameStore from '../store/useGameStore';
import { SHOP_CATALOG, ShopItem } from '../data/shopItems';
import CustomModal from '../components/CustomModal';
import ShadowShopModal from '../components/ShadowShopModal';
import { useTheme, FONT, SPACING } from '../theme';
import { useRewardedAd, AD_UNIT_GOLD, AD_UNIT_ITEM } from '../hooks/useRewardedAd';

// ── Item card ──────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  gold,
  stockRemaining,
  onBuy,
  onBuyBulk,
  C,
}: {
  item: ShopItem
  gold: number
  stockRemaining: number | undefined   // undefined = unlimited
  onBuy: () => void
  onBuyBulk?: () => void
  C: any
}) {

  const ic = getICStyles(C);
  const { t } = useTranslation('shop');

  const soldOut = stockRemaining !== undefined && stockRemaining <= 0;
  const canAfford = gold >= item.cost && !soldOut;

  return (
    <View style={[ic.card, { borderColor: item.color + '44' }, soldOut && ic.cardSoldOut]}>
      {/* Icon */}
      <View style={[ic.iconWrap, { backgroundColor: item.color + '18' }]}>
        <Icon name={item.icon} size={28} color={soldOut ? C.dimmed : item.color} />
      </View>

      {/* Info */}
      <View style={ic.info}>
        <View style={ic.nameRow}>
          <Text style={[ic.name, { color: soldOut ? C.dimmed : item.color }]}>{t(`items.${item.id}.name`, { defaultValue: item.name })}</Text>
          {item.weeklyStock !== undefined && (
            <View style={[ic.stockBadge, { borderColor: soldOut ? '#374151' : item.color + '55' }]}>
              <Icon name="refresh-circle" size={9} color={soldOut ? '#374151' : item.color} />
              <Text style={[ic.stockTxt, { color: soldOut ? '#374151' : item.color }]}>
                {' '}{soldOut ? t('ui.sold_out') : t('ui.per_week', { count: stockRemaining })}
              </Text>
            </View>
          )}
        </View>
        {item.weeklyStock !== undefined && soldOut && (
          <Text style={{ color: '#4b5563', fontFamily: FONT.orbitron, fontSize: 8, marginBottom: 2 }}>
            ↻ {t('ui.restocks_next_week')}
          </Text>
        )}
        <Text style={ic.desc}>{t(`items.${item.id}.description`, { defaultValue: item.description })}</Text>
        <Text style={ic.lore}>{t(`items.${item.id}.lore`, { defaultValue: item.lore ?? '' })}</Text>
      </View>

      {/* Buy */}
      <View style={ic.buyCol}>
        <View style={ic.costRow}>
          <Icon name="rhombus" size={12} color={soldOut ? C.dimmed : C.gold} />
          <Text style={[ic.cost, soldOut && { color: C.dimmed }]}> {item.cost}</Text>
        </View>
        <TouchableOpacity
          style={[ic.buyBtn, { borderColor: item.color }, (!canAfford || soldOut) && ic.buyBtnDisabled]}
          onPress={onBuy}
          disabled={!canAfford}
        >
          <Text style={[ic.buyTxt, { color: canAfford ? item.color : C.dimmed }]}>
            {soldOut ? t('ui.sold_out') : canAfford ? t('ui.buy') : t('ui.no_gold')}
          </Text>
        </TouchableOpacity>
        {onBuyBulk && !soldOut && gold >= item.cost * 10 && (
          <TouchableOpacity
            style={[ic.buyBtn, ic.buyBtnBulk, { borderColor: item.color + '88' }]}
            onPress={onBuyBulk}
          >
            <Text style={[ic.buyTxt, { color: item.color, fontSize: 9 }]}>×10</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Shadow card ────────────────────────────────────────────────────────────────

// ── Shadow Section Banner ─────────────────────────────────────────────────────

function ShadowRecruitmentGate({ onPress, C }: { onPress: () => void; C: any }) {
  const s = getGateStyles(C);
  const { t } = useTranslation('shop');
  return (
    <TouchableOpacity style={s.gate} onPress={onPress}>
      <View style={s.iconWrap}>
        <Icon name="ghost" size={32} color="#a855f7" />
      </View>
      <View style={s.info}>
        <Text style={s.title}>{t('ui.shadow_recruitment')}</Text>
        <Text style={s.subtitle}>{t('ui.shadow_recruitment_subtitle')}</Text>
      </View>
      <Icon name="chevron-right" size={24} color={C.dimmed} />
    </TouchableOpacity>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const C = useTheme();
  const s = getStyles(C);
  const { t } = useTranslation('shop');

  const player = useGameStore(st => st.player);
  const shopStocks = useGameStore(st => st.system.shopStocks);
  const purchaseItem = useGameStore(st => st.purchaseItem);
  const purchaseShadow = useGameStore(st => st.purchaseShadow);
  const claimAdGoldReward = useGameStore(st => st.claimAdGoldReward);
  const claimAdRandomItem = useGameStore(st => st.claimAdRandomItem);
  const goldAdsToday = useGameStore(st => st.system.goldAdsToday ?? 0);
  const adItemsToday = useGameStore(st => st.system.adItemsToday ?? 0);
  const adLastDate = useGameStore(st => st.system.adLastDate ?? '');
  const unlockedThemes = player.unlockedThemes ?? [];

  const today = new Date().toISOString().split('T')[0];
  const goldAdsCount = adLastDate === today ? goldAdsToday : 0;
  const itemAdsCount = adLastDate === today ? adItemsToday : 0;
  const MAX_GOLD_ADS = 3;
  const MAX_ITEM_ADS = 2;

  const { loaded: adLoaded, show: showAd } = useRewardedAd(AD_UNIT_GOLD);
  const { loaded: adItemLoaded, show: showItemAd } = useRewardedAd(AD_UNIT_ITEM);

  const [lastItemWon, setLastItemWon] = useState<string | null>(null);

  const [pending, setPending] = useState<(ShopItem & { amount?: number }) | null>(null);
  const [pendingShadow, setPendingShadow] = useState<any | null>(null);
  const [showShadowModal, setShowShadowModal] = useState(false);
  const [lastBought, setLastBought] = useState<string | null>(null);

  function confirmBuy() {
    if (!pending) {return;}
    const amount = pending.amount ?? 1;
    let allOk = true;
    for (let i = 0; i < amount; i++) {
      const ok = purchaseItem(pending.id, pending.cost);
      if (!ok) { allOk = false; break; }
    }
    if (allOk) {setLastBought(pending.id);}
    setPending(null);
  }

  function confirmBuyShadow() {
    if (!pendingShadow) {return;}
    const cost = pendingShadow.unlockMethod.price;
    const ok = purchaseShadow(pendingShadow.id, cost);
    if (ok) {setLastBought(pendingShadow.id);}
    setPendingShadow(null);
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* Header */}
        <View style={s.titleRow}>
          <Icon name="shopping-outline" size={16} color={C.neonBlue} />
          <Text style={s.title}> LOJA DO SISTEMA</Text>
        </View>
        <Text style={s.subtitle}>{t('ui.shop_subtitle')}</Text>

        {/* Gold balance */}
        <View style={s.goldBar}>
          <Icon name="rhombus" size={18} color={C.gold} />
          <Text style={s.goldTxt}> {t('ui.gold_available', { amount: player.gold.toLocaleString() })}</Text>
        </View>

        {/* Ad Rewards */}
        <View style={s.adCard}>
          <View style={s.adCardHeader}>
            <Icon name="television-play" size={14} color={C.gold} />
            <Text style={s.adCardTitle}> {t('ui.daily_bonus')}</Text>
            <Text style={s.adCardCount}>{goldAdsCount}/{MAX_GOLD_ADS}</Text>
          </View>
          <Text style={s.adCardDesc}>{t('ui.ad_gold_desc')}</Text>
          <TouchableOpacity
            style={[s.adBtn, (goldAdsCount >= MAX_GOLD_ADS || !adLoaded) && s.adBtnDisabled]}
            disabled={goldAdsCount >= MAX_GOLD_ADS || !adLoaded}
            onPress={() => showAd(() => { claimAdGoldReward(); })}
          >
            <Icon name={goldAdsCount >= MAX_GOLD_ADS ? 'check-circle' : 'play-circle'} size={14} color={goldAdsCount >= MAX_GOLD_ADS ? C.green : C.gold} />
            <Text style={[s.adBtnTxt, goldAdsCount >= MAX_GOLD_ADS && { color: C.green }]}>
              {goldAdsCount >= MAX_GOLD_ADS ? ` ${t('ui.limit_reached')}` : !adLoaded ? ` ${t('ui.loading')}` : ` ${t('ui.watch_ad_gold')}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.adBtn, { marginTop: 6, borderColor: C.neonBlue + '55', backgroundColor: C.neonBlue + '10' }, (itemAdsCount >= MAX_ITEM_ADS || !adItemLoaded) && s.adBtnDisabled]}
            disabled={itemAdsCount >= MAX_ITEM_ADS || !adItemLoaded}
            onPress={() => showItemAd(() => {
              const result = claimAdRandomItem();
              if (result) { setLastItemWon(result.itemName); }
            })}
          >
            <Icon name={itemAdsCount >= MAX_ITEM_ADS ? 'check-circle' : 'play-circle'} size={14} color={itemAdsCount >= MAX_ITEM_ADS ? C.green : C.neonBlue} />
            <Text style={[s.adBtnTxt, { color: itemAdsCount >= MAX_ITEM_ADS ? C.green : C.neonBlue }]}>
              {itemAdsCount >= MAX_ITEM_ADS ? ` ${t('ui.limit_reached')}` : !adItemLoaded ? ` ${t('ui.loading')}` : ` ${t('ui.watch_ad_item', { count: itemAdsCount, max: MAX_ITEM_ADS })}`}
            </Text>
          </TouchableOpacity>
          {lastItemWon && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Icon name="gift-outline" size={12} color={C.green} />
              <Text style={{ color: C.green, fontSize: 11, marginLeft: 4 }}> {t('ui.item_added_inventory', { itemName: lastItemWon })}</Text>
            </View>
          )}
        </View>

        {/* Success banner */}
        {lastBought && (
          <View style={s.successBanner}>
            <Icon name="check-circle" size={14} color={C.green} />
            <Text style={s.successTxt}> {t('ui.item_added_success')}</Text>
            <TouchableOpacity onPress={() => setLastBought(null)}>
              <Icon name="close" size={14} color={C.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Items */}
        {SHOP_CATALOG.map(item => {
          const isThemeOwned = item.effect === 'cosmetic' && unlockedThemes.includes(item.id);
          const stockRemaining = isThemeOwned
            ? 0
            : item.weeklyStock !== undefined ? (shopStocks[item.id] ?? 0) : undefined;
          return (
            <ItemCard
              key={item.id}
              item={item}
              gold={player.gold}
              stockRemaining={stockRemaining}
              onBuy={() => setPending(item)}
              onBuyBulk={item.effect !== 'cosmetic' ? () => setPending({ ...item, amount: 10 }) : undefined}
              C={C}
            />
          );
        })}

        {/* ── Shadow Section ── */}
        <View style={s.sectionHeader}>
          <Icon name="ghost" size={14} color="#a855f7" />
          <Text style={[s.sectionTitle, { color: '#a855f7' }]}> {t('ui.army_available')}</Text>
        </View>

        {player.level < 10 ? (
          <View style={s.lockedBanner}>
            <Icon name="lock-outline" size={14} color={C.dimmed} />
            <Text style={s.lockedTxt}>  {t('ui.locked_level')}</Text>
          </View>
        ) : (
          <ShadowRecruitmentGate
            C={C}
            onPress={() => setShowShadowModal(true)}
          />
        )}

      </ScrollView>

      {/* Confirm modal */}
      <CustomModal
        visible={!!pending}
        title={t('ui.confirm_purchase')}
        message={
          pending
            ? (pending.amount && pending.amount > 1
                ? t('ui.confirm_purchase_msg_bulk', { quantity: pending.amount, name: t(`items.${pending.id}.name`, { defaultValue: pending.name }), cost: pending.cost * pending.amount, description: t(`items.${pending.id}.description`, { defaultValue: pending.description }) })
                : t('ui.confirm_purchase_msg', { quantity: '', name: t(`items.${pending.id}.name`, { defaultValue: pending.name }), cost: pending.cost, description: t(`items.${pending.id}.description`, { defaultValue: pending.description }) }))
            : ''
        }
        confirmLabel={t('ui.buy')}
        confirmIcon="cart-check"
        confirmColor={pending?.color ?? C.gold}
        onConfirm={confirmBuy}
        onCancel={() => setPending(null)}
        C={C}
      />


      {/* Shadow purchase modal */}
      <CustomModal
        visible={!!pendingShadow}
        title={player.shadows.some(e => e.id === pendingShadow?.id) ? t('ui.evolve_shadow') : t('ui.recruit_shadow')}
        message={
          pendingShadow
            ? (player.shadows.some(e => e.id === pendingShadow?.id)
                ? t('ui.confirm_evolve_msg', { name: pendingShadow.name, cost: pendingShadow.unlockMethod.price, effect: pendingShadow.passiveEffect?.description ?? '' })
                : t('ui.confirm_recruit_msg', { name: pendingShadow.name, cost: pendingShadow.unlockMethod.price, effect: pendingShadow.passiveEffect?.description ?? '' }))
            : ''
        }
        confirmLabel={t('ui.confirm')}
        confirmIcon="ghost"
        confirmColor="#a855f7"
        onConfirm={confirmBuyShadow}
        onCancel={() => setPendingShadow(null)}
        C={C}
      />

      {/* Shadow Shop Modal */}
      <ShadowShopModal
        visible={showShadowModal}
        onClose={() => setShowShadowModal(false)}
        playerGold={player.gold}
        ownedShadowIds={player.shadows.map(sh => sh.id)}
        onBuy={(sh) => {
          setPendingShadow(sh);
          setShowShadowModal(false);
        }}
        C={C}
      />

    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },
  subtitle: { color: C.muted, fontSize: 11, marginBottom: SPACING.md },
  goldBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 10, borderWidth: 1, borderColor: C.gold + '44', padding: SPACING.sm, marginBottom: SPACING.md },
  goldTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '700' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#0d2a1a', borderWidth: 1, borderColor: C.green + '44', borderRadius: 8, padding: SPACING.sm, marginBottom: SPACING.md },
  successTxt: { flex: 1, color: C.green, fontSize: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionTitle: { fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 3 },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, borderColor: '#334155', padding: SPACING.md, marginBottom: SPACING.sm },
  lockedTxt: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  adCard: { backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, borderColor: C.gold + '44', padding: SPACING.md, marginBottom: SPACING.md },
  adCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  adCardTitle: { flex: 1, color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  adCardCount: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 10 },
  adCardDesc: { color: C.muted, fontSize: 11, marginBottom: SPACING.sm },
  adBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.gold + '18', borderWidth: 1, borderColor: C.gold + '66', borderRadius: 6, paddingVertical: 10 },
  adBtnDisabled: { opacity: 0.45 },
  adBtnTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
});

const getGateStyles = (C: any) => StyleSheet.create({
  gate: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 12, borderWidth: 1, borderColor: '#a855f744', padding: SPACING.md, gap: SPACING.md },
  iconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#a855f718', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { color: '#a855f7', fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  subtitle: { color: C.muted, fontSize: 10, lineHeight: 14 },
});

const getICStyles = (C: any) => StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: C.panel, borderRadius: 12, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm, alignItems: 'flex-start' },
  cardSoldOut: { opacity: 0.5 },
  iconWrap: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 3, flexWrap: 'wrap' },
  name: { fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700' },
  stockBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  stockTxt: { fontFamily: FONT.orbitron, fontSize: 8 },
  desc: { color: C.muted, fontSize: 12, lineHeight: 17, marginBottom: 3 },
  lore: { color: C.dimmed, fontSize: 10, fontStyle: 'italic', lineHeight: 15 },
  buyCol: { alignItems: 'flex-end', gap: SPACING.sm, flexShrink: 0 },
  costRow: { flexDirection: 'row', alignItems: 'center' },
  cost: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900' },
  buyBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 6 },
  buyBtnDisabled: { opacity: 0.4 },
  buyBtnBulk: {
    marginTop: 4,
    paddingVertical: 5,
  },
  buyTxt: { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
});
