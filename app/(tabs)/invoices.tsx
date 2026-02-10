import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllInvoices, getInvoiceWithItems } from '../../src/database/db';
import { Invoice, InvoiceItem } from '../../src/types';
import { formatPrice, formatDate } from '../../src/utils/format';
import { generateInvoiceHtml, generateTicketHtml } from '../../src/utils/print';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { printToFileAsync } from 'expo-print';
import { Colors, Shadows, Radius, Spacing, shared } from '../../src/theme';

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await getAllInvoices();
        setInvoices(data as Invoice[]);
      })();
    }, [])
  );

  const openDetail = async (invoice: Invoice) => {
    const { invoice: inv, items } = await getInvoiceWithItems(invoice.id);
    setSelectedInvoice(inv as Invoice);
    setSelectedItems(items as InvoiceItem[]);
    setDetailVisible(true);
  };

  const handlePrintInvoice = async () => {
    if (!selectedInvoice) return;
    const html = await generateInvoiceHtml(selectedInvoice.id);
    await Print.printAsync({ html });
  };

  const handlePrintTicket = async () => {
    if (!selectedInvoice) return;
    const html = await generateTicketHtml(selectedInvoice.id);
    await Print.printAsync({ html });
  };

  const handleSharePDF = async () => {
    if (!selectedInvoice) return;
    const html = await generateInvoiceHtml(selectedInvoice.id);
    const { uri } = await printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Partager la facture' });
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.7}>
      <View style={styles.cardIconWrap}>
        <Ionicons name="document-text" size={20} color={Colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.invoiceNumber}>{item.number}</Text>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.invoiceTotal}>{formatPrice(item.total)}</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={shared.screen}>
      <View style={styles.header}>
        <Text style={styles.headerCount}>{invoices.length} facture(s)</Text>
      </View>

      {invoices.length === 0 ? (
        <View style={shared.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={shared.emptyTitle}>Aucune facture</Text>
          <Text style={shared.emptySubtitle}>Les factures apparaîtront ici après une vente</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInvoice}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Invoice detail modal */}
      <Modal visible={detailVisible} animationType="slide" transparent>
        <View style={shared.modalOverlay}>
          <View style={[shared.modalSheet, { maxHeight: '88%' }]}>
            <View style={shared.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalInvoiceNum}>{selectedInvoice?.number}</Text>
                <View style={styles.modalMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={14} color={Colors.textTertiary} />
                    <Text style={styles.metaText}>{selectedInvoice?.clientName}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
                    <Text style={styles.metaText}>
                      {selectedInvoice ? formatDate(selectedInvoice.date) : ''}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Items table */}
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2 }]}>Produit</Text>
                  <Text style={[styles.th, { flex: 0.7, textAlign: 'center' }]}>Qté</Text>
                  <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>P.U.</Text>
                  <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Total</Text>
                </View>
                {selectedItems.map((item, idx) => (
                  <View key={item.id} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                    <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{item.productName}</Text>
                    <Text style={[styles.td, { flex: 0.7, textAlign: 'center' }]}>{item.quantity}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{formatPrice(item.unitPrice)}</Text>
                    <Text style={[styles.td, styles.tdBold, { flex: 1, textAlign: 'right' }]}>
                      {formatPrice(item.total)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalBar}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>
                  {selectedInvoice ? formatPrice(selectedInvoice.total) : ''}
                </Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.accent }]} onPress={handlePrintTicket} activeOpacity={0.8}>
                <Ionicons name="receipt-outline" size={18} color={Colors.textInverse} />
                <Text style={styles.actionText}>Ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primary }]} onPress={handlePrintInvoice} activeOpacity={0.8}>
                <Ionicons name="print-outline" size={18} color={Colors.textInverse} />
                <Text style={styles.actionText}>Facture</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.purple }]} onPress={handleSharePDF} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={18} color={Colors.textInverse} />
                <Text style={styles.actionText}>PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  headerCount: { fontSize: 13, color: Colors.textTertiary, fontWeight: '500' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 8,
    ...Shadows.sm,
  } as any,
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  invoiceNumber: { fontSize: 14, fontWeight: '700', color: Colors.text },
  clientName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  dateText: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  invoiceTotal: { fontSize: 16, fontWeight: '800', color: Colors.accent },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalInvoiceNum: { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalMeta: { marginTop: 8, gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: Colors.textSecondary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Table
  table: { borderRadius: Radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  th: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  tableRowAlt: { backgroundColor: Colors.surfaceSecondary },
  td: { fontSize: 13, color: Colors.text },
  tdBold: { fontWeight: '700' },

  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.text,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: Colors.text, letterSpacing: 1 },
  totalValue: { fontSize: 24, fontWeight: '800', color: Colors.accent },

  actionRow: { flexDirection: 'row', marginTop: 20, gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.sm,
    gap: 6,
    ...Shadows.sm,
  } as any,
  actionText: { color: Colors.textInverse, fontWeight: '700', fontSize: 13 },
});
