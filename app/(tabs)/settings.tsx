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

const CURRENCY_PRESETS = [
  { label: 'FCFA (XOF)', code: 'XOF', symbol: 'FCFA', locale: 'fr-FR' },
  { label: 'FCFA (XAF)', code: 'XAF', symbol: 'FCFA', locale: 'fr-FR' },
  { label: 'Euro (EUR)', code: 'EUR', symbol: '€', locale: 'fr-FR' },
  { label: 'Dollar (USD)', code: 'USD', symbol: '$', locale: 'en-US' },
  { label: 'Livre (GBP)', code: 'GBP', symbol: '£', locale: 'en-GB' },
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
      Alert.alert('Erreur', 'Le nom de l\'entreprise est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      await saveSettings(settings);
      clearFormatCache();
      await loadFormatSettings();
      Alert.alert('Succès', 'Paramètres enregistrés avec succès.');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres.');
    } finally {
      setSaving(false);
    }
  };

  const currentPreset = CURRENCY_PRESETS.find((p) => p.code === settings.currencyCode);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Business Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={20} color="#4A90D9" />
            <Text style={styles.sectionTitle}>Informations entreprise</Text>
          </View>

          <Text style={styles.label}>Nom de l'entreprise *</Text>
          <TextInput
            style={styles.input}
            value={settings.businessName}
            onChangeText={(v) => updateField('businessName', v)}
            placeholder="Ex: Ma Boutique"
          />

          <Text style={styles.label}>Adresse</Text>
          <TextInput
            style={styles.input}
            value={settings.address}
            onChangeText={(v) => updateField('address', v)}
            placeholder="Ex: 123 Rue du Commerce, Dakar"
          />

          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            value={settings.phone}
            onChangeText={(v) => updateField('phone', v)}
            placeholder="Ex: +221 77 000 00 00"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={settings.email}
            onChangeText={(v) => updateField('email', v)}
            placeholder="Ex: contact@maboutique.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>N° fiscal / NINEA</Text>
          <TextInput
            style={styles.input}
            value={settings.taxId}
            onChangeText={(v) => updateField('taxId', v)}
            placeholder="Ex: SN-DKR-2024-00123"
          />
        </View>

        {/* Currency Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={20} color="#27AE60" />
            <Text style={styles.sectionTitle}>Devise</Text>
          </View>

          <TouchableOpacity
            style={styles.currencySelector}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
          >
            <View>
              <Text style={styles.currencyCurrent}>
                {currentPreset?.label ?? `${settings.currencyCode} (${settings.currencySymbol})`}
              </Text>
              <Text style={styles.currencyHint}>Appuyez pour changer</Text>
            </View>
            <Ionicons
              name={showCurrencyPicker ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#999"
            />
          </TouchableOpacity>

          {showCurrencyPicker && (
            <View style={styles.currencyList}>
              {CURRENCY_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.code}
                  style={[
                    styles.currencyOption,
                    settings.currencyCode === preset.code && styles.currencyOptionActive,
                  ]}
                  onPress={() => selectCurrency(preset)}
                >
                  <Text
                    style={[
                      styles.currencyOptionText,
                      settings.currencyCode === preset.code && styles.currencyOptionTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                  {settings.currencyCode === preset.code && (
                    <Ionicons name="checkmark-circle" size={20} color="#4A90D9" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Symbole personnalisé</Text>
          <TextInput
            style={styles.input}
            value={settings.currencySymbol}
            onChangeText={(v) => updateField('currencySymbol', v)}
            placeholder="Ex: FCFA, €, $"
          />
        </View>

        {/* Footer Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#8E44AD" />
            <Text style={styles.sectionTitle}>Pied de page factures</Text>
          </View>

          <Text style={styles.label}>Message en bas des factures et tickets</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={settings.footerMessage}
            onChangeText={(v) => updateField('footerMessage', v)}
            placeholder="Ex: Merci pour votre achat !"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="save" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  content: { padding: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2C3E50' },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  currencySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#FAFAFA',
  },
  currencyCurrent: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  currencyHint: { fontSize: 12, color: '#999', marginTop: 2 },
  currencyList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  currencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currencyOptionActive: { backgroundColor: '#EBF3FC' },
  currencyOptionText: { fontSize: 15, color: '#2C3E50' },
  currencyOptionTextActive: { fontWeight: '700', color: '#4A90D9' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
    paddingVertical: 16,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
