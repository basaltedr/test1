import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, saveSettings } from '../../src/database/db';
import { BusinessSettings } from '../../src/types';
import { clearFormatCache, loadFormatSettings } from '../../src/utils/format';
import { Colors, Shadows, Radius, Spacing, shared } from '../../src/theme';
import * as ImagePicker from 'expo-image-picker';

const CURRENCY_PRESETS = [
  { label: 'FCFA (XOF)', code: 'XOF', symbol: 'FCFA', locale: 'fr-FR' },
  { label: 'FCFA (XAF)', code: 'XAF', symbol: 'FCFA', locale: 'fr-FR' },
  { label: 'Euro (EUR)', code: 'EUR', symbol: '\u20AC', locale: 'fr-FR' },
  { label: 'Dollar (USD)', code: 'USD', symbol: '$', locale: 'en-US' },
  { label: 'Livre (GBP)', code: 'GBP', symbol: '\u00A3', locale: 'en-GB' },
  { label: 'Dirham (MAD)', code: 'MAD', symbol: 'DH', locale: 'fr-MA' },
  { label: 'Dinar (TND)', code: 'TND', symbol: 'DT', locale: 'fr-TN' },
  { label: 'Ariary (MGA)', code: 'MGA', symbol: 'Ar', locale: 'fr-MG' },
  { label: 'Franc (GNF)', code: 'GNF', symbol: 'FG', locale: 'fr-GN' },
  { label: 'Franc (CDF)', code: 'CDF', symbol: 'FC', locale: 'fr-CD' },
];

const TEMPLATE_OPTIONS: { key: BusinessSettings['invoiceTemplate']; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'modern', label: 'Moderne', desc: 'Clean et color\u00E9', icon: 'flash-outline' },
  { key: 'classic', label: 'Classique', desc: 'Formel et traditionnel', icon: 'document-text-outline' },
  { key: 'minimal', label: 'Minimaliste', desc: 'Epure et sobre', icon: 'remove-outline' },
  { key: 'elegant', label: 'Elegant', desc: 'Premium et raffin\u00E9', icon: 'diamond-outline' },
];

const COLOR_PRESETS = [
  '#1B6FEE', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B',
  '#EC4899', '#06B6D4', '#14B8A6', '#6366F1', '#F97316',
  '#84CC16', '#2563EB', '#1F2937', '#7C3AED', '#DC2626',
];

export default function SettingsScreen() {
  const [settings, setSettings] = useState<BusinessSettings>({
    businessName: '',
    address: '',
    phone: '',
    email: '',
    taxId: '',
    footerMessage: '',
    currencyCode: 'XOF',
    currencySymbol: 'FCFA',
    currencyLocale: 'fr-FR',
    invoiceTemplate: 'modern',
    invoiceColor: '#1B6FEE',
    logoBase64: '',
  });
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await getSettings();
        setSettings(data);
      })();
    }, [])
  );

  const updateField = (key: keyof BusinessSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const selectCurrency = (preset: typeof CURRENCY_PRESETS[number]) => {
    setSettings((prev) => ({
      ...prev,
      currencyCode: preset.code,
      currencySymbol: preset.symbol,
      currencyLocale: preset.locale,
    }));
    setShowCurrencyPicker(false);
  };

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'acces a la galerie est necessaire pour choisir un logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mimeType = result.assets[0].mimeType || 'image/png';
      const base64Uri = `data:${mimeType};base64,${result.assets[0].base64}`;
      setSettings((prev) => ({ ...prev, logoBase64: base64Uri }));
    }
  };

  const removeLogo = () => {
    setSettings((prev) => ({ ...prev, logoBase64: '' }));
  };

  const handleSave = async () => {
    if (!settings.businessName.trim()) {
      Alert.alert('Erreur', "Le nom de l'entreprise est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      await saveSettings(settings);
      clearFormatCache();
      await loadFormatSettings();
      Alert.alert('Enregistre', 'Vos parametres ont ete mis a jour.');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  const currentPreset = CURRENCY_PRESETS.find((p) => p.code === settings.currencyCode);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Business Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Entreprise</Text>
          </View>

          <SettingField
            label="Nom *"
            value={settings.businessName}
            onChange={(v) => updateField('businessName', v)}
            placeholder="Ma Boutique"
            icon="business-outline"
          />
          <SettingField
            label="Adresse"
            value={settings.address}
            onChange={(v) => updateField('address', v)}
            placeholder="123 Rue du Commerce, Dakar"
            icon="location-outline"
          />
          <SettingField
            label="Telephone"
            value={settings.phone}
            onChange={(v) => updateField('phone', v)}
            placeholder="+221 77 000 00 00"
            icon="call-outline"
            keyboard="phone-pad"
          />
          <SettingField
            label="Email"
            value={settings.email}
            onChange={(v) => updateField('email', v)}
            placeholder="contact@maboutique.com"
            icon="mail-outline"
            keyboard="email-address"
            autoCapitalize="none"
          />
          <SettingField
            label="N\u00B0 fiscal / NINEA"
            value={settings.taxId}
            onChange={(v) => updateField('taxId', v)}
            placeholder="SN-DKR-2024-00123"
            icon="document-outline"
          />
        </View>

        {/* Logo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: Colors.purpleLight }]}>
              <Ionicons name="image-outline" size={18} color={Colors.purple} />
            </View>
            <Text style={styles.sectionTitle}>Logo</Text>
          </View>

          {settings.logoBase64 ? (
            <View style={styles.logoPreviewWrap}>
              <Image
                source={{ uri: settings.logoBase64 }}
                style={styles.logoPreview}
                resizeMode="contain"
              />
              <View style={styles.logoActions}>
                <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} activeOpacity={0.7}>
                  <Ionicons name="swap-horizontal-outline" size={16} color={Colors.primary} />
                  <Text style={styles.logoBtnText}>Changer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.logoBtn, styles.logoBtnDanger]} onPress={removeLogo} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  <Text style={[styles.logoBtnText, { color: Colors.danger }]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.logoUpload} onPress={pickLogo} activeOpacity={0.7}>
              <View style={styles.logoUploadIcon}>
                <Ionicons name="cloud-upload-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.logoUploadTitle}>Ajouter un logo</Text>
              <Text style={styles.logoUploadHint}>PNG, JPG - Ratio 3:1 recommande</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Invoice Template */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: Colors.accentLight }]}>
              <Ionicons name="document-outline" size={18} color={Colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>Modele de facture</Text>
          </View>

          <View style={styles.templateGrid}>
            {TEMPLATE_OPTIONS.map((tpl) => {
              const active = settings.invoiceTemplate === tpl.key;
              return (
                <TouchableOpacity
                  key={tpl.key}
                  style={[styles.templateCard, active && { borderColor: settings.invoiceColor, backgroundColor: settings.invoiceColor + '08' }]}
                  onPress={() => setSettings((prev) => ({ ...prev, invoiceTemplate: tpl.key }))}
                  activeOpacity={0.7}
                >
                  <View style={[styles.templateIconWrap, active && { backgroundColor: settings.invoiceColor + '18' }]}>
                    <Ionicons name={tpl.icon} size={22} color={active ? settings.invoiceColor : Colors.textTertiary} />
                  </View>
                  <Text style={[styles.templateLabel, active && { color: settings.invoiceColor, fontWeight: '800' }]}>
                    {tpl.label}
                  </Text>
                  <Text style={styles.templateDesc}>{tpl.desc}</Text>
                  {active && (
                    <View style={[styles.templateCheck, { backgroundColor: settings.invoiceColor }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Invoice Color */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: settings.invoiceColor + '20' }]}>
              <Ionicons name="color-palette-outline" size={18} color={settings.invoiceColor} />
            </View>
            <Text style={styles.sectionTitle}>Couleur des factures</Text>
          </View>

          <View style={styles.colorGrid}>
            {COLOR_PRESETS.map((color) => {
              const active = settings.invoiceColor === color;
              return (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorDot, { backgroundColor: color }, active && styles.colorDotActive]}
                  onPress={() => setSettings((prev) => ({ ...prev, invoiceColor: color }))}
                  activeOpacity={0.7}
                >
                  {active && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.customColorRow}>
            <Text style={styles.customColorLabel}>Code couleur :</Text>
            <View style={[styles.customColorPreview, { backgroundColor: settings.invoiceColor }]} />
            <TextInput
              style={styles.customColorInput}
              value={settings.invoiceColor}
              onChangeText={(v) => {
                if (v.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                  setSettings((prev) => ({ ...prev, invoiceColor: v }));
                }
              }}
              placeholder="#1B6FEE"
              placeholderTextColor={Colors.textTertiary}
              maxLength={7}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="cash-outline" size={18} color={Colors.warning} />
            </View>
            <Text style={styles.sectionTitle}>Devise</Text>
          </View>

          <TouchableOpacity
            style={styles.currencySelector}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            activeOpacity={0.7}
          >
            <View style={styles.currencyLeft}>
              <Text style={styles.currencySymbolDisplay}>{settings.currencySymbol}</Text>
              <View>
                <Text style={styles.currencyCurrent}>
                  {currentPreset?.label ?? settings.currencyCode}
                </Text>
                <Text style={styles.currencyHint}>Appuyez pour changer</Text>
              </View>
            </View>
            <Ionicons
              name={showCurrencyPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>

          {showCurrencyPicker && (
            <View style={styles.currencyList}>
              {CURRENCY_PRESETS.map((preset) => {
                const active = settings.currencyCode === preset.code;
                return (
                  <TouchableOpacity
                    key={preset.code}
                    style={[styles.currencyOption, active && styles.currencyOptionActive]}
                    onPress={() => selectCurrency(preset)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.currencyOptionIcon, active && styles.currencyOptionIconActive]}>
                      <Text style={[styles.currencyOptionSymbol, active && { color: Colors.primary }]}>
                        {preset.symbol}
                      </Text>
                    </View>
                    <Text style={[styles.currencyOptionText, active && styles.currencyOptionTextActive]}>
                      {preset.label}
                    </Text>
                    {active && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ marginTop: 12 }}>
            <SettingField
              label="Symbole personnalise"
              value={settings.currencySymbol}
              onChange={(v) => updateField('currencySymbol', v)}
              placeholder="FCFA"
              icon="text-outline"
            />
          </View>
        </View>

        {/* Footer message */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.danger} />
            </View>
            <Text style={styles.sectionTitle}>Message factures</Text>
          </View>

          <Text style={shared.label}>Pied de page des factures et tickets</Text>
          <TextInput
            style={[shared.input, styles.textArea]}
            value={settings.footerMessage}
            onChangeText={(v) => updateField('footerMessage', v)}
            placeholder="Merci pour votre achat !"
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-circle'} size={22} color={Colors.textInverse} />
          <Text style={styles.saveBtnText}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SettingField({
  label, value, onChange, placeholder, icon, keyboard, autoCapitalize,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: keyof typeof Ionicons.glyphMap;
  keyboard?: 'default' | 'phone-pad' | 'email-address'; autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={shared.label}>{label}</Text>
      <View style={styles.fieldRow}>
        <Ionicons name={icon} size={18} color={Colors.textTertiary} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          keyboardType={keyboard}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingTop: 8 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: 14,
    ...Shadows.md,
  } as any,
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },

  // Fields
  fieldWrap: { marginTop: 6 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: Colors.surfaceSecondary,
  },
  fieldInput: { flex: 1, fontSize: 15, color: Colors.text, padding: 0 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  // Logo section
  logoPreviewWrap: {
    alignItems: 'center',
    gap: 12,
  },
  logoPreview: {
    width: '100%',
    height: 80,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
  },
  logoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  logoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
  },
  logoBtnDanger: {
    backgroundColor: Colors.dangerLight,
  },
  logoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  logoUpload: {
    alignItems: 'center',
    paddingVertical: 28,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
  },
  logoUploadIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoUploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  logoUploadHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 3,
  },

  // Template picker
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  templateCard: {
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  templateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  templateDesc: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  templateCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Color picker
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  customColorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  customColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customColorInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Currency selector
  currencySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: 14,
    backgroundColor: Colors.surfaceSecondary,
  },
  currencyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currencySymbolDisplay: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.accent,
    backgroundColor: Colors.accentLight,
    width: 40,
    height: 40,
    lineHeight: 40,
    textAlign: 'center',
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  currencyCurrent: { fontSize: 15, fontWeight: '700', color: Colors.text },
  currencyHint: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },

  // Currency list
  currencyList: {
    marginTop: 8,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  currencyOptionActive: { backgroundColor: Colors.primaryLight },
  currencyOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyOptionIconActive: { backgroundColor: 'rgba(27,111,238,0.12)' },
  currencyOptionSymbol: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  currencyOptionText: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  currencyOptionTextActive: { fontWeight: '700', color: Colors.primary },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.sm,
    gap: 8,
    marginTop: 6,
    ...Shadows.md,
  } as any,
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Colors.textInverse, fontSize: 16, fontWeight: '700' },
});
