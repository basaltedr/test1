import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDashboardStats } from '../../src/database/db';
import { formatPrice } from '../../src/utils/format';
import { Colors, Shadows, Radius, Spacing } from '../../src/theme';

export default function HomeScreen() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInvoices: 0,
    todaySales: 0,
    totalRevenue: 0,
  });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await getDashboardStats();
        setStats(data);
      })();
    }, [])
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Hero header */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="storefront" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.heroTitle}>GestiVente</Text>
        <Text style={styles.heroSubtitle}>Tableau de bord</Text>
      </View>

      {/* Revenue highlight card */}
      <View style={styles.revenueCard}>
        <View style={styles.revenueTop}>
          <View style={styles.revenueBadge}>
            <Ionicons name="trending-up" size={16} color={Colors.textInverse} />
          </View>
          <Text style={styles.revenueLabel}>Chiffre d'affaires total</Text>
        </View>
        <Text style={styles.revenueValue}>{formatPrice(stats.totalRevenue)}</Text>
        <View style={styles.revenueDivider} />
        <View style={styles.revenueBottom}>
          <Ionicons name="today-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.revenueTodayLabel}>Aujourd'hui</Text>
          <Text style={styles.revenueTodayValue}>{formatPrice(stats.todaySales)}</Text>
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.grid}>
        <View style={[styles.statCard, styles.statCardLeft]}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="cube-outline" size={22} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Produits</Text>
        </View>
        <View style={[styles.statCard, styles.statCardRight]}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.accentLight }]}>
            <Ionicons name="receipt-outline" size={22} color={Colors.accent} />
          </View>
          <Text style={styles.statValue}>{stats.totalInvoices}</Text>
          <Text style={styles.statLabel}>Factures</Text>
        </View>
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionLabel}>Actions rapides</Text>
      <View style={styles.actionsRow}>
        <ActionCard icon="add-circle-outline" label="Nouveau produit" color={Colors.primary} bgColor={Colors.primaryLight} />
        <ActionCard icon="cart-outline" label="Nouvelle vente" color={Colors.accent} bgColor={Colors.accentLight} />
        <ActionCard icon="print-outline" label="Imprimer" color={Colors.purple} bgColor={Colors.purpleLight} />
      </View>
    </ScrollView>
  );
}

function ActionCard({ icon, label, color, bgColor }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bgColor: string }) {
  return (
    <View style={styles.actionCard}>
      <View style={[styles.actionIconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },

  // Hero
  hero: { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: Colors.textTertiary, marginTop: 2 },

  // Revenue card
  revenueCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    ...Shadows.lg,
  } as any,
  revenueTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revenueBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  revenueValue: { fontSize: 32, fontWeight: '800', color: Colors.textInverse, marginTop: 8, letterSpacing: -0.5 },
  revenueDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 14 },
  revenueBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revenueTodayLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 },
  revenueTodayValue: { fontSize: 18, fontWeight: '700', color: Colors.textInverse },

  // Stats grid
  grid: { flexDirection: 'row', marginTop: Spacing.md, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadows.md,
  } as any,
  statCardLeft: {},
  statCardRight: {},
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },

  // Quick actions
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: 12,
  },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...Shadows.sm,
  } as any,
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
});
