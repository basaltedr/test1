import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllProducts, createInvoice } from '../database/db';
import { Product, CartItem } from '../types';
import { formatPrice } from '../utils/format';
import { generateInvoiceHtml } from '../utils/print';
import * as Print from 'expo-print';

export default function SaleScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await getAllProducts();
        setProducts(data as Product[]);
      })();
    }, [])
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Alert.alert('Stock insuffisant', `Il ne reste que ${product.stock} unité(s).`);
          return prev;
        }
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      if (product.stock <= 0) {
        Alert.alert('Rupture de stock', 'Ce produit est en rupture de stock.');
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty > c.product.stock) {
            Alert.alert('Stock insuffisant', `Stock max : ${c.product.stock}`);
            return c;
          }
          return { ...c, quantity: newQty };
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez des produits au panier.');
      return;
    }
    setCheckoutVisible(true);
  };

  const confirmSale = async () => {
    const items = cart.map((c) => ({
      productId: c.product.id,
      productName: c.product.name,
      quantity: c.quantity,
      unitPrice: c.product.price,
    }));

    const invoiceId = await createInvoice(clientName.trim() || 'Client', items);

    setCheckoutVisible(false);
    setCart([]);
    setClientName('');

    // Reload products to reflect stock changes
    const data = await getAllProducts();
    setProducts(data as Product[]);

    Alert.alert('Vente enregistrée', `Facture #${invoiceId} créée.`, [
      { text: 'OK' },
      {
        text: 'Imprimer',
        onPress: async () => {
          const html = await generateInvoiceHtml(invoiceId);
          await Print.printAsync({ html });
        },
      },
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const inCart = cart.find((c) => c.product.id === item.id);
    return (
      <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
          <Text style={[styles.stockText, item.stock <= 0 && { color: '#E74C3C' }]}>
            Stock : {item.stock}
          </Text>
        </View>
        {inCart && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{inCart.quantity}</Text>
          </View>
        )}
        <Ionicons name="add-circle" size={28} color="#4A90D9" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Produits disponibles</Text>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cube-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Aucun produit disponible</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          style={styles.productList}
        />
      )}

      {/* Cart summary bar */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartCount}>
              {cart.reduce((s, c) => s + c.quantity, 0)} article(s)
            </Text>
            <Text style={styles.cartTotal}>{formatPrice(cartTotal)}</Text>
          </View>
          <View style={styles.cartActions}>
            <TouchableOpacity onPress={() => setCart([])} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
              <Ionicons name="receipt-outline" size={20} color="#fff" />
              <Text style={styles.checkoutText}>Facturer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Cart detail + checkout modal */}
      <Modal visible={checkoutVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Résumé de la vente</Text>

            <TextInput
              style={styles.input}
              placeholder="Nom du client (optionnel)"
              value={clientName}
              onChangeText={setClientName}
            />

            {cart.map((c) => (
              <View key={c.product.id} style={styles.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{c.product.name}</Text>
                  <Text style={styles.cartItemSub}>
                    {formatPrice(c.product.price)} x {c.quantity}
                  </Text>
                </View>
                <View style={styles.qtyControls}>
                  <TouchableOpacity onPress={() => updateQuantity(c.product.id, -1)}>
                    <Ionicons name="remove-circle-outline" size={26} color="#E74C3C" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{c.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(c.product.id, 1)}>
                    <Ionicons name="add-circle-outline" size={26} color="#27AE60" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>
                  {formatPrice(c.product.price * c.quantity)}
                </Text>
                <TouchableOpacity onPress={() => removeFromCart(c.product.id)}>
                  <Ionicons name="close-circle" size={22} color="#ccc" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatPrice(cartTotal)}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setCheckoutVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={confirmSale}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirmer</Text>
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
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#2C3E50', padding: 16, paddingBottom: 8 },
  productList: { flex: 1 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: '#2C3E50' },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#4A90D9', marginTop: 2 },
  stockText: { fontSize: 12, color: '#999', marginTop: 2 },
  badge: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#999', marginTop: 8 },
  cartBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cartCount: { fontSize: 13, color: '#888' },
  cartTotal: { fontSize: 20, fontWeight: '700', color: '#2C3E50' },
  cartActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clearBtn: { padding: 8 },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27AE60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  checkoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#2C3E50', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemName: { fontSize: 14, fontWeight: '600', color: '#2C3E50' },
  cartItemSub: { fontSize: 12, color: '#999' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 8 },
  qtyText: { fontSize: 16, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: '700', color: '#2C3E50', minWidth: 70, textAlign: 'right', marginRight: 8 },
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
  modalActions: { flexDirection: 'row', marginTop: 20, gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  cancelBtn: { backgroundColor: '#F0F0F0' },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  confirmBtn: { backgroundColor: '#27AE60' },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
});
