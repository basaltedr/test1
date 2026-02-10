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
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllProducts, createInvoice } from '../../src/database/db';
import { Product, CartItem } from '../../src/types';
import { formatPrice } from '../../src/utils/format';
import { generateInvoiceHtml } from '../../src/utils/print';
import * as Print from 'expo-print';
import { Colors, Shadows, Radius, Spacing, shared } from '../../src/theme';

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
  const cartItemCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleCheckout = () => {
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
    const disabled = item.stock <= 0;
    return (
      <TouchableOpacity
        style={[styles.productCard, disabled && styles.productCardDisabled]}
        onPress={() => addToCart(item)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.productBody}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
          <Text style={[styles.stockLabel, disabled && { color: Colors.danger }]}>
            {disabled ? 'Rupture' : `Stock : ${item.stock}`}
          </Text>
        </View>
        {inCart && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{inCart.quantity}</Text>
          </View>
        )}
        {!disabled && (
          <View style={styles.addIcon}>
            <Ionicons name="add" size={20} color={Colors.textInverse} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={shared.screen}>
      {products.length === 0 ? (
        <View style={shared.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="storefront-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={shared.emptyTitle}>Aucun produit disponible</Text>
          <Text style={shared.emptySubtitle}>Ajoutez des produits d'abord</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating cart bar */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <TouchableOpacity onPress={() => setCart([])} style={styles.clearBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{cartItemCount} article(s)</Text>
            <Text style={styles.cartTotal}>{formatPrice(cartTotal)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} activeOpacity={0.8}>
            <Text style={styles.checkoutText}>Facturer</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}

      {/* Checkout modal */}
      <Modal visible={checkoutVisible} animationType="slide" transparent>
        <View style={shared.modalOverlay}>
          <View style={[shared.modalSheet, { maxHeight: '85%' }]}>
            <View style={shared.modalHandle} />
            <Text style={styles.modalTitle}>Finaliser la vente</Text>

            <View style={styles.clientInputWrap}>
              <Ionicons name="person-outline" size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.clientInput}
                placeholder="Nom du client (optionnel)"
                placeholderTextColor={Colors.textTertiary}
                value={clientName}
                onChangeText={setClientName}
              />
            </View>

            <ScrollView style={styles.cartScroll} showsVerticalScrollIndicator={false}>
              {cart.map((c) => (
                <View key={c.product.id} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{c.product.name}</Text>
                    <Text style={styles.cartItemSub}>
                      {formatPrice(c.product.price)} x {c.quantity}
                    </Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => updateQuantity(c.product.id, -1)} style={styles.qtyBtn} activeOpacity={0.7}>
                      <Ionicons name="remove" size={16} color={Colors.danger} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{c.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(c.product.id, 1)} style={styles.qtyBtn} activeOpacity={0.7}>
                      <Ionicons name="add" size={16} color={Colors.accent} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemTotal}>{formatPrice(c.product.price * c.quantity)}</Text>
                  <TouchableOpacity onPress={() => removeFromCart(c.product.id)} activeOpacity={0.6}>
                    <Ionicons name="close" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.totalBar}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatPrice(cartTotal)}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckoutVisible(false)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmSale} activeOpacity={0.8}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.textInverse} />
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
  productList: { paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 100 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 8,
    ...Shadows.sm,
  } as any,
  productCardDisabled: { opacity: 0.5 },
  productBody: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  productPrice: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  stockLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 3, fontWeight: '500' },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  badgeText: { color: Colors.textInverse, fontSize: 12, fontWeight: '800' },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cart bar
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    ...Shadows.lg,
  } as any,
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cartInfo: { flex: 1 },
  cartCount: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500' },
  cartTotal: { fontSize: 20, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: Radius.sm,
    gap: 6,
    ...Shadows.sm,
  } as any,
  checkoutText: { color: Colors.textInverse, fontWeight: '700', fontSize: 16 },

  // Modal
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 16 },
  clientInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceSecondary,
    gap: 10,
    marginBottom: 12,
  },
  clientInput: { flex: 1, fontSize: 15, color: Colors.text },
  cartScroll: { maxHeight: 280 },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cartItemName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cartItemSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: { fontSize: 15, fontWeight: '700', minWidth: 22, textAlign: 'center', color: Colors.text },
  cartItemTotal: { fontSize: 14, fontWeight: '800', color: Colors.text, minWidth: 70, textAlign: 'right', marginRight: 10 },

  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.text,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: Colors.text, letterSpacing: 1 },
  totalValue: { fontSize: 24, fontWeight: '800', color: Colors.accent },

  modalActions: { flexDirection: 'row', marginTop: 20, gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  confirmBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    ...Shadows.sm,
  } as any,
  confirmBtnText: { color: Colors.textInverse, fontWeight: '700', fontSize: 15 },
});
