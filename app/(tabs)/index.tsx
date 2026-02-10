import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getDashboardStats,
  getLowStockProducts,
  getSalesByPeriod,
  getTopProducts,
  exportProductsCSV,
  exportInvoicesCSV,
  exportSalesDetailCSV,
} from '../../src/database/db';
import { Product, SalesPeriodStats, TopProduct } from '../../src/types';
import { formatPrice } from '../../src/utils/format';
import { Colors, Shadows, Radius, Spacing } from '../../src/theme';
import { File as FSFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type Period = 'day' | 'week' | 'month' | 'year';
const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Sem.' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
];

export default function HomeScreen() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInvoices: 0,
    todaySales: 0,
    totalRevenue: 0,
    lowStockCount: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [salesData, setSalesData] = useState<SalesPeriodStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('day');
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    const [dashStats, lowStock, sales, topProds] = await Promise.all([
      getDashboardStats(),
      getLowStockProducts(),
      getSalesByPeriod(selectedPeriod),
      getTopProducts(5),
    ]);
    setStats(dashStats);
    setLowStockProducts(lowStock as Product[]);
    setSalesData(sales);
    setTopProducts(topProds);
  }, [selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handlePeriodChange = async (period: Period) => {
    setSelectedPeriod(period);
    const sales = await getSalesByPeriod(period);
    setSalesData(sales);
  };

  const handleExport = async (type: 'products' | 'invoices' | 'sales') => {
    setExporting(true);
    try {
      let csv: string;
      let filename: string;
      switch (type) {
        case 'products':
          csv = await exportProductsCSV();
          filename = 'produits.csv';
          break;
        case 'invoices':
          csv = await exportInvoicesCSV();
          filename = 'factures.csv';
          break;
        case 'sales':
          csv = await exportSalesDetailCSV();
          filename = 'ventes_detail.csv';
          break;
      }
      const file = new FSFile(Paths.document, filename);
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: `Exporter ${filename}` });
    } catch {
      Alert.alert('Erreur', "Impossible d'exporter les données.");
    } finally {
      setExporting(false);
    }
  };

  // Calculate max for chart bars
  const maxSales = Math.max(...salesData.map((s) => s.total), 1);

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
        <StatCard
          icon="cube-outline"
          iconColor={Colors.primary}
          iconBg={Colors.primaryLight}
          value={stats.totalProducts}
          label="Produits"
        />
        <StatCard
          icon="receipt-outline"
          iconColor={Colors.accent}
          iconBg={Colors.accentLight}
          value={stats.totalInvoices}
          label="Factures"
        />
        <StatCard
          icon="alert-circle-outline"
          iconColor={Colors.warning}
          iconBg={Colors.warningLight}
          value={stats.lowStockCount}
          label="Stock bas"
        />
      </View>

      {/* Low stock alerts */}
      {lowStockProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="warning" size={16} color={Colors.danger} />
            </View>
            <Text style={styles.sectionTitle}>Alertes stock</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{lowStockProducts.length}</Text>
            </View>
          </View>
          {lowStockProducts.slice(0, 5).map((p) => (
            <View key={p.id} style={styles.alertRow}>
              <View style={[styles.alertDot, p.stock <= 0 ? { backgroundColor: Colors.danger } : { backgroundColor: Colors.warning }]} />
              <Text style={styles.alertName} numberOfLines={1}>{p.name}</Text>
              <Text style={[styles.alertStock, p.stock <= 0 && { color: Colors.danger }]}>
                {p.stock <= 0 ? 'Rupture' : `${p.stock} restant(s)`}
              </Text>
            </View>
          ))}
          {lowStockProducts.length > 5 && (
            <Text style={styles.moreText}>+ {lowStockProducts.length - 5} autres...</Text>
          )}
        </View>
      )}

      {/* Sales history chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="bar-chart" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Historique ventes</Text>
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIOD_LABELS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, selectedPeriod === p.key && styles.periodBtnActive]}
              onPress={() => handlePeriodChange(p.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, selectedPeriod === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bar chart */}
        {salesData.length === 0 ? (
          <View style={styles.chartEmpty}>
            <Ionicons name="analytics-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.chartEmptyText}>Aucune donnée pour cette période</Text>
          </View>
        ) : (
          <View style={styles.chart}>
            {salesData.slice().reverse().map((item, idx) => {
              const heightPct = Math.max((item.total / maxSales) * 100, 4);
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={styles.barValue} numberOfLines={1}>
                    {item.count}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height: `${heightPct}%` },
                        idx === salesData.length - 1 && { backgroundColor: Colors.accent },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {item.periodLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Top products */}
      {topProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: Colors.purpleLight }]}>
              <Ionicons name="trophy" size={16} color={Colors.purple} />
            </View>
            <Text style={styles.sectionTitle}>Top produits</Text>
          </View>
          {topProducts.map((tp, idx) => (
            <View key={idx} style={styles.topRow}>
              <View style={[styles.topRank, idx === 0 && { backgroundColor: Colors.warning + '20' }]}>
                <Text style={[styles.topRankText, idx === 0 && { color: Colors.warning }]}>
                  {idx + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topName} numberOfLines={1}>{tp.productName}</Text>
                <Text style={styles.topQty}>{tp.totalQty} vendu(s)</Text>
              </View>
              <Text style={styles.topRevenue}>{formatPrice(tp.totalRevenue)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Export section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: Colors.accentLight }]}>
            <Ionicons name="download-outline" size={16} color={Colors.accent} />
          </View>
          <Text style={styles.sectionTitle}>Exporter (CSV)</Text>
        </View>
        <View style={styles.exportRow}>
          <ExportButton
            icon="cube-outline"
            label="Produits"
            color={Colors.primary}
            onPress={() => handleExport('products')}
            disabled={exporting}
          />
          <ExportButton
            icon="receipt-outline"
            label="Factures"
            color={Colors.accent}
            onPress={() => handleExport('invoices')}
            disabled={exporting}
          />
          <ExportButton
            icon="analytics-outline"
            label="Ventes"
            color={Colors.purple}
            onPress={() => handleExport('sales')}
            disabled={exporting}
          />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatCard({ icon, iconColor, iconBg, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ExportButton({ icon, label, color, onPress, disabled }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.exportBtn, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.exportIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.exportLabel}>{label}</Text>
    </TouchableOpacity>
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
  grid: { flexDirection: 'row', marginTop: Spacing.md, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    alignItems: 'center',
    ...Shadows.sm,
  } as any,
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },

  // Sections
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: 14,
    ...Shadows.sm,
  } as any,
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  sectionBadge: {
    backgroundColor: Colors.danger,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: { color: Colors.textInverse, fontSize: 11, fontWeight: '700' },

  // Low stock alerts
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
  alertStock: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  moreText: { fontSize: 12, color: Colors.textTertiary, marginTop: 8, textAlign: 'center' },

  // Period selector
  periodRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    padding: 3,
    marginBottom: 14,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.sm - 2,
  },
  periodBtnActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  } as any,
  periodText: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary },
  periodTextActive: { color: Colors.primary, fontWeight: '700' },

  // Bar chart
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barValue: { fontSize: 9, fontWeight: '600', color: Colors.textTertiary, marginBottom: 4 },
  barTrack: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceSecondary,
  },
  bar: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: { fontSize: 9, fontWeight: '500', color: Colors.textTertiary, marginTop: 4 },
  chartEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  chartEmptyText: { fontSize: 12, color: Colors.textTertiary },

  // Top products
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  topRank: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRankText: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary },
  topName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  topQty: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  topRevenue: { fontSize: 14, fontWeight: '700', color: Colors.accent },

  // Export section
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  exportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  exportLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
});
