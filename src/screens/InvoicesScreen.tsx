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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllInvoices, getInvoiceWithItems } from '../database/db';
import { Invoice, InvoiceItem } from '../types';
import { formatPrice, formatDate } from '../utils/format';
import { generateInvoiceHtml, generateTicketHtml } from '../utils/print';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { printToFileAsync } from 'expo-print';

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
    <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
      <View style={styles.cardLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name="receipt" size={20} color="#4A90D9" />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.invoiceNumber}>{item.number}</Text>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.invoiceTotal}>{formatPrice(item.total)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Factures</Text>
        <Text style={styles.count}>{invoices.length} facture(s)</Text>
      </View>

      {invoices.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Aucune facture</Text>
          <Text style={styles.emptySubText}>Les factures apparaîtront ici après une vente</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInvoice}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Invoice detail modal */}
      <Modal visible={detailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedInvoice?.number}</Text>
                  <Text style={styles.modalClient}>{selectedInvoice?.clientName}</Text>
                  <Text style={styles.modalDate}>
                    {selectedInvoice ? formatDate(selectedInvoice.date) : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDetailVisible(false)}>
                  <Ionicons name="close-circle" size={28} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Items table */}
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2 }]}>Produit</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Qté</Text>
                  <Text style={[styles.th, { flex: 1 }]}>P.U.</Text>
                  <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Total</Text>
                </View>
                {selectedItems.map((item) => (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 2 }]}>{item.productName}</Text>
                    <Text style={[styles.td, { flex: 1 }]}>{item.quantity}</Text>
                    <Text style={[styles.td, { flex: 1 }]}>{formatPrice(item.unitPrice)}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>
                      {formatPrice(item.total)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>
                  {selectedInvoice ? formatPrice(selectedInvoice.total) : ''}
                </Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handlePrintTicket}>
                <Ionicons name="receipt-outline" size={22} color="#fff" />
                <Text style={styles.actionText}>Ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4A90D9' }]} onPress={handlePrintInvoice}>
                <Ionicons name="print" size={22} color="#fff" />
                <Text style={styles.actionText}>Facture</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#8E44AD' }]} onPress={handleSharePDF}>
                <Ionicons name="share-outline" size={22} color="#fff" />
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
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#2C3E50' },
  count: { fontSize: 14, color: '#888' },
  list: { padding: 16, paddingTop: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLeft: { marginRight: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF3FC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  invoiceNumber: { fontSize: 15, fontWeight: '700', color: '#2C3E50' },
  clientName: { fontSize: 13, color: '#666', marginTop: 2 },
  dateText: { fontSize: 12, color: '#999', marginTop: 2 },
  invoiceTotal: { fontSize: 16, fontWeight: '700', color: '#27AE60' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#999', marginTop: 12 },
  emptySubText: { fontSize: 13, color: '#bbb', marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#2C3E50' },
  modalClient: { fontSize: 15, color: '#666', marginTop: 4 },
  modalDate: { fontSize: 13, color: '#999', marginTop: 2 },
  table: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F6FA',
    padding: 10,
  },
  th: { fontSize: 12, fontWeight: '700', color: '#666', textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  td: { fontSize: 14, color: '#2C3E50' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#2C3E50',
  },
  totalLabel: { fontSize: 18, fontWeight: '700', color: '#2C3E50' },
  totalValue: { fontSize: 22, fontWeight: '700', color: '#27AE60' },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
