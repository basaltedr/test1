import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDashboardStats } from '../../src/database/db';
import { formatPrice } from '../../src/utils/format';

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
    <View style={styles.container}>
      <Text style={styles.appName}>GestiVente</Text>
      <Text style={styles.subtitle}>Gestion des produits & factures</Text>

      <View style={styles.grid}>
        <View style={[styles.statCard, { backgroundColor: '#EBF3FC' }]}>
          <Ionicons name="cube" size={28} color="#4A90D9" />
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Produits</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E8F8EF' }]}>
          <Ionicons name="receipt" size={28} color="#27AE60" />
          <Text style={styles.statValue}>{stats.totalInvoices}</Text>
          <Text style={styles.statLabel}>Factures</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF5E7' }]}>
          <Ionicons name="today" size={28} color="#F39C12" />
          <Text style={styles.statValue}>{formatPrice(stats.todaySales)}</Text>
          <Text style={styles.statLabel}>Ventes du jour</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F5EEF8' }]}>
          <Ionicons name="trending-up" size={28} color="#8E44AD" />
          <Text style={styles.statValue}>{formatPrice(stats.totalRevenue)}</Text>
          <Text style={styles.statLabel}>Chiffre total</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA', padding: 20 },
  appName: { fontSize: 28, fontWeight: '800', color: '#2C3E50', textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 4, marginBottom: 30 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  statCard: {
    width: '47%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#2C3E50', marginTop: 10 },
  statLabel: { fontSize: 13, color: '#666', marginTop: 4 },
});
