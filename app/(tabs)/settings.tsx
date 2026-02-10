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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, saveSettings } from '../../src/database/db';
import { BusinessSettings } from '../../src/types';
import { clearFormatCache, loadFormatSettings } from '../../src/utils/format';
import { Colors, Shadows, Radius, Spacing, shared } from '../../src/theme';

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
      Alert.alert('Enregistré', 'Vos paramètres ont été mis à jour.');
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
            label="Téléphone"
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
            label="N° fiscal / NINEA"
            value={settings.taxId}
            onChange={(v) => updateField('taxId', v)}
            placeholder="SN-DKR-2024-00123"
            icon="document-outline"
          />
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: Colors.accentLight }]}>
              <Ionicons name="cash-outline" size={18} color={Colors.accent} />
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
              label="Symbole personnalisé"
              value={settings.currencySymbol}
              onChange={(v) => updateField('currencySymbol', v)}
              placeholder="FCFA"
              icon="text-outline"
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: Colors.purpleLight }]}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.purple} />
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
