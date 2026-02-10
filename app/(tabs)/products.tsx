import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  ScrollView,
  Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  restockProduct,
} from '../../src/database/db';
import { Product, Category } from '../../src/types';
import { formatPrice } from '../../src/utils/format';
import { Colors, Shadows, Radius, Spacing, shared } from '../../src/theme';

const CATEGORY_PRESET_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#1B6FEE',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
  '#14B8A6',
];

export default function ProductsScreen() {
  // ── Data state ────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // ── Search & filter ───────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // ── Product modal ─────────────────────────────────────────
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [selectedProductCategoryId, setSelectedProductCategoryId] = useState<number | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // ── Category modal ────────────────────────────────────────
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(CATEGORY_PRESET_COLORS[3]);

  // ── Restock modal ─────────────────────────────────────────
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [restockProduct_target, setRestockProduct_target] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');

  // ── Focus states for inputs ───────────────────────────────
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // ── Search debounce ───────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // ── Data loading ──────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    const data = await getAllProducts(
      debouncedSearch || undefined,
      selectedCategoryId ?? undefined,
    );
    setProducts(data as Product[]);
  }, [debouncedSearch, selectedCategoryId]);

  const loadCategories = useCallback(async () => {
    const data = await getAllCategories();
    setCategories(data as Category[]);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
      loadCategories();
    }, [loadProducts, loadCategories])
  );

  // ── Product modal helpers ─────────────────────────────────
  const openAddProduct = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setStock('');
    setLowStockThreshold('5');
    setSelectedProductCategoryId(null);
    setShowCategoryPicker(false);
    setProductModalVisible(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setLowStockThreshold(product.lowStockThreshold.toString());
    setSelectedProductCategoryId(product.categoryId);
    setShowCategoryPicker(false);
    setProductModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Erreur', 'Le nom et le prix sont obligatoires.');
      return;
    }
    const p = parseFloat(price);
    const s = parseInt(stock || '0', 10);
    const t = parseInt(lowStockThreshold || '5', 10);
    if (isNaN(p) || p < 0) {
      Alert.alert('Erreur', 'Prix invalide.');
      return;
    }
    if (editingProduct) {
      await updateProduct(editingProduct.id, name.trim(), p, s, selectedProductCategoryId, t);
    } else {
      await addProduct(name.trim(), p, s, selectedProductCategoryId, t);
    }
    setProductModalVisible(false);
    loadProducts();
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Supprimer le produit',
      `Voulez-vous vraiment supprimer "${product.name}" ? Cette action est irréversible.`,
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

  // ── Restock ───────────────────────────────────────────────
  const openRestock = (product: Product) => {
    setRestockProduct_target(product);
    setRestockQty('');
    setRestockModalVisible(true);
  };

  const handleRestock = async () => {
    const qty = parseInt(restockQty, 10);
    if (!restockProduct_target || isNaN(qty) || qty <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide.');
      return;
    }
    await restockProduct(restockProduct_target.id, qty);
    setRestockModalVisible(false);
    loadProducts();
  };

  // ── Category modal helpers ────────────────────────────────
  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryColor(CATEGORY_PRESET_COLORS[3]);
    setCategoryModalVisible(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryColor(cat.color);
    setCategoryModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Erreur', 'Le nom de la catégorie est obligatoire.');
      return;
    }
    if (editingCategory) {
      await updateCategory(editingCategory.id, categoryName.trim(), categoryColor);
    } else {
      await addCategory(categoryName.trim(), categoryColor);
    }
    setCategoryModalVisible(false);
    await loadCategories();
    loadProducts();
  };

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert(
      'Supprimer la catégorie',
      `Supprimer "${cat.name}" ? Les produits associés perdront leur catégorie.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(cat.id);
            if (selectedCategoryId === cat.id) {
              setSelectedCategoryId(null);
            }
            await loadCategories();
            loadProducts();
          },
        },
      ]
    );
  };

  // ── Helpers ───────────────────────────────────────────────
  const getStockStatus = (product: Product): 'normal' | 'low' | 'rupture' => {
    if (product.stock <= 0) return 'rupture';
    if (product.stock <= product.lowStockThreshold) return 'low';
    return 'normal';
  };

  const getSelectedCategoryLabel = (): string => {
    if (selectedProductCategoryId === null) return 'Aucune catégorie';
    const cat = categories.find((c) => c.id === selectedProductCategoryId);
    return cat ? cat.name : 'Aucune catégorie';
  };

  // ── Product card renderer ─────────────────────────────────
  const renderProductItem = ({ item }: { item: Product }) => {
    const status = getStockStatus(item);
    const iconColor = item.categoryColor || Colors.primary;
    const iconBg = iconColor + '18';

    return (
      <View style={styles.card}>
        {/* Left icon */}
        <View style={styles.cardIcon}>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name="cube" size={22} color={iconColor} />
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.badgeRow}>
            {/* Stock badge */}
            <View
              style={[
                styles.stockBadge,
                status === 'low' && styles.stockBadgeWarning,
                status === 'rupture' && styles.stockBadgeDanger,
              ]}
            >
              <Ionicons
                name={
                  status === 'rupture'
                    ? 'alert-circle'
                    : status === 'low'
                    ? 'warning'
                    : 'checkmark-circle'
                }
                size={12}
                color={
                  status === 'rupture'
                    ? Colors.danger
                    : status === 'low'
                    ? Colors.warning
                    : Colors.accent
                }
                style={{ marginRight: 3 }}
              />
              <Text
                style={[
                  styles.stockText,
                  status === 'low' && styles.stockTextWarning,
                  status === 'rupture' && styles.stockTextDanger,
                  status === 'normal' && styles.stockTextNormal,
                ]}
              >
                {status === 'rupture' ? 'Rupture' : `Stock : ${item.stock}`}
              </Text>
            </View>

            {/* Category badge */}
            {item.categoryName ? (
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: (item.categoryColor || Colors.textTertiary) + '18' },
                ]}
              >
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: item.categoryColor || Colors.textTertiary },
                  ]}
                />
                <Text
                  style={[
                    styles.categoryBadgeText,
                    { color: item.categoryColor || Colors.textTertiary },
                  ]}
                  numberOfLines={1}
                >
                  {item.categoryName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => openRestock(item)}
            style={[styles.actionBtn, styles.actionBtnRestock]}
            activeOpacity={0.6}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openEditProduct(item)}
            style={styles.actionBtn}
            activeOpacity={0.6}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteProduct(item)}
            style={styles.actionBtn}
            activeOpacity={0.6}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────────
  return (
    <View style={shared.screen}>
      {/* ── Search bar ────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            focusedInput === 'search' && styles.searchBarFocused,
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={focusedInput === 'search' ? Colors.primary : Colors.textTertiary}
          />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Rechercher un produit..."
            placeholderTextColor={Colors.textTertiary}
            onFocus={() => setFocusedInput('search')}
            onBlur={() => setFocusedInput(null)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.6}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category filter chips ─────────────────────────── */}
      <View style={styles.chipContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {/* "All" chip */}
          <TouchableOpacity
            style={[
              styles.chip,
              selectedCategoryId === null && styles.chipActive,
            ]}
            onPress={() => setSelectedCategoryId(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategoryId === null && styles.chipTextActive,
              ]}
            >
              Tous
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                selectedCategoryId === cat.id && styles.chipActive,
                selectedCategoryId === cat.id && { backgroundColor: cat.color },
              ]}
              onPress={() =>
                setSelectedCategoryId(
                  selectedCategoryId === cat.id ? null : cat.id
                )
              }
              onLongPress={() => openEditCategory(cat)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.chipDot,
                  { backgroundColor: selectedCategoryId === cat.id ? Colors.textInverse : cat.color },
                ]}
              />
              <Text
                style={[
                  styles.chipText,
                  selectedCategoryId === cat.id && styles.chipTextActive,
                ]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Add category button */}
          <TouchableOpacity
            style={styles.chipAdd}
            onPress={openAddCategory}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Header bar ────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerCount}>
          {products.length} produit{products.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openAddProduct}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={Colors.textInverse} />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* ── Product list or empty state ───────────────────── */}
      {products.length === 0 ? (
        <View style={shared.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cube-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={shared.emptyTitle}>Aucun produit</Text>
          <Text style={shared.emptySubtitle}>
            {searchText || selectedCategoryId
              ? 'Aucun résultat pour cette recherche'
              : 'Appuyez sur "Ajouter" pour commencer'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ════════════════════════════════════════════════════════
           PRODUCT ADD/EDIT MODAL
         ════════════════════════════════════════════════════════ */}
      <Modal visible={productModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={shared.modalOverlay}
        >
          <View style={shared.modalSheet}>
            <View style={shared.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={shared.label}>Nom du produit</Text>
              <TextInput
                style={[
                  shared.input,
                  focusedInput === 'pName' && styles.inputFocused,
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Sac de riz 25kg"
                placeholderTextColor={Colors.textTertiary}
                onFocus={() => setFocusedInput('pName')}
                onBlur={() => setFocusedInput(null)}
              />

              {/* Price + Stock row */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={[shared.label, { marginTop: Spacing.md }]}>Prix</Text>
                  <TextInput
                    style={[
                      shared.input,
                      focusedInput === 'pPrice' && styles.inputFocused,
                    ]}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    onFocus={() => setFocusedInput('pPrice')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={[shared.label, { marginTop: Spacing.md }]}>Stock</Text>
                  <TextInput
                    style={[
                      shared.input,
                      focusedInput === 'pStock' && styles.inputFocused,
                    ]}
                    value={stock}
                    onChangeText={setStock}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    onFocus={() => setFocusedInput('pStock')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              {/* Low stock threshold */}
              <Text style={[shared.label, { marginTop: Spacing.md }]}>
                Seuil d'alerte stock
              </Text>
              <TextInput
                style={[
                  shared.input,
                  focusedInput === 'pThreshold' && styles.inputFocused,
                ]}
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                placeholder="5"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('pThreshold')}
                onBlur={() => setFocusedInput(null)}
              />

              {/* Category picker */}
              <Text style={[shared.label, { marginTop: Spacing.md }]}>Catégorie</Text>
              <TouchableOpacity
                style={[
                  styles.pickerBtn,
                  showCategoryPicker && styles.pickerBtnActive,
                ]}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                activeOpacity={0.7}
              >
                <View style={styles.pickerBtnInner}>
                  {selectedProductCategoryId !== null && (() => {
                    const cat = categories.find((c) => c.id === selectedProductCategoryId);
                    return cat ? (
                      <View
                        style={[styles.pickerDot, { backgroundColor: cat.color }]}
                      />
                    ) : null;
                  })()}
                  <Text
                    style={[
                      styles.pickerBtnText,
                      selectedProductCategoryId === null && {
                        color: Colors.textTertiary,
                      },
                    ]}
                  >
                    {getSelectedCategoryLabel()}
                  </Text>
                </View>
                <Ionicons
                  name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textTertiary}
                />
              </TouchableOpacity>

              {showCategoryPicker && (
                <View style={styles.pickerList}>
                  {/* None option */}
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      selectedProductCategoryId === null &&
                        styles.pickerItemActive,
                    ]}
                    onPress={() => {
                      setSelectedProductCategoryId(null);
                      setShowCategoryPicker(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedProductCategoryId === null &&
                          styles.pickerItemTextActive,
                      ]}
                    >
                      Aucune catégorie
                    </Text>
                    {selectedProductCategoryId === null && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>

                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.pickerItem,
                        selectedProductCategoryId === cat.id &&
                          styles.pickerItemActive,
                      ]}
                      onPress={() => {
                        setSelectedProductCategoryId(cat.id);
                        setShowCategoryPicker(false);
                      }}
                      activeOpacity={0.6}
                    >
                      <View style={styles.pickerItemLeft}>
                        <View
                          style={[
                            styles.pickerDot,
                            { backgroundColor: cat.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.pickerItemText,
                            selectedProductCategoryId === cat.id &&
                              styles.pickerItemTextActive,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </View>
                      {selectedProductCategoryId === cat.id && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={Colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setProductModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProduct}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={20} color={Colors.textInverse} />
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════════════
           CATEGORY MANAGEMENT MODAL
         ════════════════════════════════════════════════════════ */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={shared.modalOverlay}
        >
          <View style={shared.modalSheet}>
            <View style={shared.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </Text>

            {/* Category name */}
            <Text style={shared.label}>Nom de la catégorie</Text>
            <TextInput
              style={[
                shared.input,
                focusedInput === 'catName' && styles.inputFocused,
              ]}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Ex: Alimentaire"
              placeholderTextColor={Colors.textTertiary}
              onFocus={() => setFocusedInput('catName')}
              onBlur={() => setFocusedInput(null)}
            />

            {/* Color picker grid */}
            <Text style={[shared.label, { marginTop: Spacing.md }]}>Couleur</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    categoryColor === color && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setCategoryColor(color)}
                  activeOpacity={0.7}
                >
                  {categoryColor === color && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={styles.categoryPreview}>
              <View
                style={[
                  styles.categoryPreviewBadge,
                  { backgroundColor: categoryColor + '18' },
                ]}
              >
                <View
                  style={[styles.categoryDot, { backgroundColor: categoryColor }]}
                />
                <Text style={[styles.categoryPreviewText, { color: categoryColor }]}>
                  {categoryName || 'Aperçu'}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              {editingCategory && (
                <TouchableOpacity
                  style={styles.deleteCatBtn}
                  onPress={() => {
                    setCategoryModalVisible(false);
                    setTimeout(() => handleDeleteCategory(editingCategory), 300);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.cancelBtn, editingCategory && { flex: 0.8 }]}
                onPress={() => setCategoryModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveCategory}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={20} color={Colors.textInverse} />
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════════════
           RESTOCK MODAL
         ════════════════════════════════════════════════════════ */}
      <Modal visible={restockModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={shared.modalOverlay}
        >
          <View style={shared.modalSheet}>
            <View style={shared.modalHandle} />
            <Text style={styles.modalTitle}>Réapprovisionner</Text>

            {restockProduct_target && (
              <View style={styles.restockInfo}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        (restockProduct_target.categoryColor || Colors.primary) + '18',
                    },
                  ]}
                >
                  <Ionicons
                    name="cube"
                    size={22}
                    color={restockProduct_target.categoryColor || Colors.primary}
                  />
                </View>
                <View style={styles.restockInfoText}>
                  <Text style={styles.restockProductName}>
                    {restockProduct_target.name}
                  </Text>
                  <Text style={styles.restockCurrentStock}>
                    Stock actuel : {restockProduct_target.stock}
                  </Text>
                </View>
              </View>
            )}

            <Text style={[shared.label, { marginTop: Spacing.md }]}>
              Quantité à ajouter
            </Text>
            <TextInput
              style={[
                shared.input,
                styles.restockInput,
                focusedInput === 'restock' && styles.inputFocused,
              ]}
              value={restockQty}
              onChangeText={setRestockQty}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              autoFocus
              onFocus={() => setFocusedInput('restock')}
              onBlur={() => setFocusedInput(null)}
            />

            {restockQty && parseInt(restockQty, 10) > 0 && restockProduct_target && (
              <Text style={styles.restockPreview}>
                Nouveau stock :{' '}
                {restockProduct_target.stock + parseInt(restockQty, 10)}
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRestockModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: Colors.accent }]}
                onPress={handleRestock}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color={Colors.textInverse} />
                <Text style={styles.saveBtnText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...(Shadows.sm as any),
  },
  searchBarFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 10,
    paddingVertical: 0,
  },

  // Category chips
  chipContainer: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  chipScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: 100,
  },
  chipTextActive: {
    color: Colors.textInverse,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipAdd: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  headerCount: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    gap: 4,
    ...(Shadows.sm as any),
  },
  addBtnText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },

  // List
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 20,
  },

  // Product card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: 10,
    ...(Shadows.md as any),
  },
  cardIcon: {
    marginRight: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  stockBadgeWarning: {
    backgroundColor: Colors.warningLight,
  },
  stockBadgeDanger: {
    backgroundColor: Colors.dangerLight,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stockTextNormal: {
    color: Colors.accentDark,
  },
  stockTextWarning: {
    color: Colors.warning,
  },
  stockTextDanger: {
    color: Colors.danger,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 5,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 80,
  },

  // Card actions
  cardActions: {
    gap: 6,
    marginLeft: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnRestock: {
    backgroundColor: Colors.accentLight,
  },

  // Empty
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal shared
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 20,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 15,
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    ...(Shadows.sm as any),
  },
  saveBtnText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 15,
  },

  // Category picker inside product modal
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceSecondary,
  },
  pickerBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  pickerBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerBtnText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  pickerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pickerList: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: Colors.primary,
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
    backgroundColor: Colors.surface,
    maxHeight: 180,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  pickerItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  pickerItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Color picker grid for category modal
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
    transform: [{ scale: 1.1 }],
  },

  // Category preview
  categoryPreview: {
    marginTop: Spacing.md,
    alignItems: 'flex-start',
  },
  categoryPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  categoryPreviewText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Delete category button
  deleteCatBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.danger + '30',
  },

  // Restock modal
  restockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    padding: 14,
    gap: 14,
    marginBottom: 4,
  },
  restockInfoText: {
    flex: 1,
  },
  restockProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  restockCurrentStock: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  restockInput: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 16,
  },
  restockPreview: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
