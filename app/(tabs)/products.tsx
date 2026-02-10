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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllProducts, addProduct, updateProduct, deleteProduct } from '../../src/database/db';
import { Product } from '../../src/types';
import { formatPrice } from '../../src/utils/format';
import { Colors, Shadows, Radius, Spacing, shared } from '../../src/theme';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const loadProducts = useCallback(async () => {
    const data = await getAllProducts();
    setProducts(data as Product[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const openAdd = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setStock('');
    setModalVisible(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Erreur', 'Le nom et le prix sont obligatoires.');
      return;
    }
    const p = parseFloat(price);
    const s = parseInt(stock || '0', 10);
    if (isNaN(p) || p < 0) {
      Alert.alert('Erreur', 'Prix invalide.');
      return;
    }
    if (editingProduct) {
      await updateProduct(editingProduct.id, name.trim(), p, s);
    } else {
      await addProduct(name.trim(), p, s);
    }
    setModalVisible(false);
    loadProducts();
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${product.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteProduct(product.id);
            loadProducts();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Product }) => {
    const lowStock = item.stock > 0 && item.stock <= 5;
    const noStock = item.stock <= 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <View style={[styles.iconCircle, noStock && { backgroundColor: Colors.dangerLight }]}>
            <Ionicons name="cube" size={20} color={noStock ? Colors.danger : Colors.primary} />
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.stockRow}>
            <View style={[
              styles.stockBadge,
              noStock && styles.stockBadgeDanger,
              lowStock && styles.stockBadgeWarning,
            ]}>
              <Text style={[
                styles.stockText,
                noStock && styles.stockTextDanger,
                lowStock && styles.stockTextWarning,
              ]}>
                {noStock ? 'Rupture' : `Stock : ${item.stock}`}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn} activeOpacity={0.6}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn} activeOpacity={0.6}>
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={shared.screen}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCount}>{products.length} produit(s)</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color={Colors.textInverse} />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={shared.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cube-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={shared.emptyTitle}>Aucun produit</Text>
          <Text style={shared.emptySubtitle}>Appuyez sur "Ajouter" pour commencer</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={shared.modalOverlay}
        >
          <View style={shared.modalSheet}>
            <View style={shared.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </Text>

            <Text style={shared.label}>Nom du produit</Text>
            <TextInput
              style={shared.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Sac de riz 25kg"
              placeholderTextColor={Colors.textTertiary}
            />

            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={[shared.label, { marginTop: 16 }]}>Prix</Text>
                <TextInput
                  style={shared.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formCol}>
                <Text style={[shared.label, { marginTop: 16 }]}>Stock</Text>
                <TextInput
                  style={shared.input}
                  value={stock}
                  onChangeText={setStock}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                <Ionicons name="checkmark" size={20} color={Colors.textInverse} />
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  headerCount: { fontSize: 13, color: Colors.textTertiary, fontWeight: '500' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    gap: 4,
    ...Shadows.sm,
  } as any,
  addBtnText: { color: Colors.textInverse, fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: 10,
    ...Shadows.md,
  } as any,
  cardIcon: { marginRight: 14 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  productPrice: { fontSize: 17, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  stockRow: { flexDirection: 'row', marginTop: 6 },
  stockBadge: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  stockBadgeWarning: { backgroundColor: Colors.warningLight },
  stockBadgeDanger: { backgroundColor: Colors.dangerLight },
  stockText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  stockTextWarning: { color: Colors.warning },
  stockTextDanger: { color: Colors.danger },
  cardActions: { gap: 6 },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
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
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 20 },
  formRow: { flexDirection: 'row', gap: 12 },
  formCol: { flex: 1 },
  modalActions: { flexDirection: 'row', marginTop: 24, gap: 12 },
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
  saveBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    ...Shadows.sm,
  } as any,
  saveBtnText: { color: Colors.textInverse, fontWeight: '700', fontSize: 15 },
});
