import React, { useState } from 'react';
import { View, TouchableOpacity, Text, TextInput, StyleSheet } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useI18n } from '../i18n/useI18n';
import type { ClarificationOption, ClarificationMode } from '../utils/clarificationParser';

interface ClarificationButtonsProps {
  mode: ClarificationMode;
  options: ClarificationOption[];
  onSelect: (text: string) => void;
}

export function ClarificationButtons({ mode, options, onSelect }: ClarificationButtonsProps) {
  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState('');

  const handleOptionPress = (opt: ClarificationOption) => {
    if (mode === 'single') {
      onSelect(opt.label);
      return;
    }
    // Multi mode: toggle selection
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(opt.id)) next.delete(opt.id);
      else next.add(opt.id);
      return next;
    });
  };

  const handleSubmitMulti = () => {
    const labels = options
      .filter((o) => selected.has(o.id))
      .map((o) => o.label);
    if (labels.length > 0) {
      onSelect(labels.join(', '));
    }
  };

  const handleSubmitOther = () => {
    const trimmed = otherText.trim();
    if (trimmed) {
      onSelect(trimmed);
      setShowOtherInput(false);
      setOtherText('');
    }
  };

  const isSelected = (id: string) => selected.has(id);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.subtext }]}>
        {t('clarificationTitle')}
      </Text>
      <View style={styles.buttonsRow}>
        {options.map((opt) => {
          const active = mode === 'multi' && isSelected(opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.button,
                { borderColor: '#007AFF', backgroundColor: active ? '#007AFF' : colors.card },
              ]}
              onPress={() => handleOptionPress(opt)}
              activeOpacity={0.7}
            >
              {mode === 'multi' && (
                <Text style={[styles.checkmark, { color: active ? '#FFF' : '#007AFF' }]}>
                  {active ? '✓ ' : '☐ '}
                </Text>
              )}
              <Text style={[styles.buttonText, { color: active ? '#FFF' : '#007AFF' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Bouton "Autre" */}
        <TouchableOpacity
          style={[styles.button, { borderColor: colors.subtext, backgroundColor: colors.card }]}
          onPress={() => setShowOtherInput(!showOtherInput)}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.subtext }]}>
            {t('clarificationOther')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Champ texte libre pour "Autre" */}
      {showOtherInput && (
        <View style={[styles.otherRow, { borderColor: colors.border }]}>
          <TextInput
            style={[styles.otherInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder={t('clarificationOtherPlaceholder')}
            placeholderTextColor={colors.subtext}
            value={otherText}
            onChangeText={setOtherText}
            onSubmitEditing={handleSubmitOther}
            returnKeyType="send"
            autoFocus
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: otherText.trim() ? '#007AFF' : colors.border }]}
            onPress={handleSubmitOther}
            disabled={!otherText.trim()}
          >
            <Text style={styles.sendText}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bouton "Envoyer" pour le mode multi */}
      {mode === 'multi' && selected.size > 0 && !showOtherInput && (
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: '#007AFF' }]}
          onPress={handleSubmitMulti}
          activeOpacity={0.7}
        >
          <Text style={styles.submitText}>
            {t('clarificationSubmit')} ({selected.size})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginHorizontal: 4 },
  title: { fontSize: 12, marginBottom: 6, fontStyle: 'italic' },
  buttonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  buttonText: { fontSize: 14, fontWeight: '500' },
  checkmark: { fontSize: 14 },
  otherRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  otherInput: { flex: 1, height: 40, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  submitBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
