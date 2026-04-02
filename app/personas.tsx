/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React, { useState } from 'react';
import {
  SafeAreaView, View, Text, FlatList, TouchableOpacity,
  Modal, Pressable, TextInput, Alert, ScrollView, Keyboard,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2, ChevronRight, Cpu } from 'lucide-react-native';
import ModelSelector from '../components/ModelSelector';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useI18n } from '../i18n/useI18n';
import { useCommonDesign } from '../hooks/useCommonDesign';
import { useHaptics } from '../hooks/useHaptics';
import { useUIScale } from '../hooks/useUIScale';
import { useChatStore } from '../store/chatStore';
import type { Persona, PersonaCreateInput } from '../types/persona';
import type { TranslationKey } from '../i18n';

// ─── Empty form state ─────────────────────────────────────────
const emptyForm: PersonaCreateInput = {
  name: '',
  description: '',
  icon: '',
  systemPrompt: '',
  params: {},
};

export default function PersonasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const styles = useCommonDesign();
  const { haptics } = useHaptics();
  const scaled22 = useUIScale(22);

  const personas = useChatStore((s) => s.personas);
  const addPersona = useChatStore((s) => s.addPersona);
  const updatePersona = useChatStore((s) => s.updatePersona);
  const deletePersona = useChatStore((s) => s.deletePersona);
  const autoPersona = useChatStore((s) => s.autoPersona);
  const setAutoPersona = useChatStore((s) => s.setAutoPersona);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PersonaCreateInput>({ ...emptyForm });
  const [viewingBuiltIn, setViewingBuiltIn] = useState<Persona | null>(null);
  const [modelSelectorVisible, setModelSelectorVisible] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  // ─── Param editing ──────────────────────────────────────────
  const [tempParam, setTempParam] = useState({ temperature: '', maxTokens: '', topK: '', topP: '' });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setSelectedModelId(undefined);
    setTempParam({ temperature: '', maxTokens: '', topK: '', topP: '' });
    setModalVisible(true);
  };

  const openEdit = (persona: Persona) => {
    if (persona.isBuiltIn) {
      setViewingBuiltIn(persona);
      return;
    }
    setEditingId(persona.id);
    setSelectedModelId(persona.modelId);
    setForm({
      name: persona.name,
      description: persona.description,
      icon: persona.icon,
      systemPrompt: persona.systemPrompt,
      params: { ...persona.params },
    });
    setTempParam({
      temperature: persona.params.temperature != null ? String(persona.params.temperature) : '',
      maxTokens: persona.params.maxTokens != null ? String(persona.params.maxTokens) : '',
      topK: persona.params.topK != null ? String(persona.params.topK) : '',
      topP: persona.params.topP != null ? String(persona.params.topP) : '',
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return;

    const params: PersonaCreateInput['params'] = {};
    const temp = parseFloat(tempParam.temperature);
    if (!isNaN(temp) && temp >= 0 && temp <= 2) params.temperature = temp;
    const maxTok = parseInt(tempParam.maxTokens);
    if (!isNaN(maxTok) && maxTok > 0) params.maxTokens = maxTok;
    const tk = parseInt(tempParam.topK);
    if (!isNaN(tk) && tk > 0) params.topK = tk;
    const tp = parseFloat(tempParam.topP);
    if (!isNaN(tp) && tp >= 0 && tp <= 1) params.topP = tp;

    const input: PersonaCreateInput = { ...form, params, modelId: selectedModelId };

    if (editingId) {
      updatePersona(editingId, input);
    } else {
      addPersona(input);
    }
    setModalVisible(false);
    haptics('light');
  };

  const handleDelete = (id: string) => {
    const persona = personas.find((p) => p.id === id);
    if (!persona) return;
    if (persona.isBuiltIn) {
      Alert.alert(t('personas'), t('personaCannotDeleteBuiltIn'));
      return;
    }
    Alert.alert(t('deletePersonaConfirm'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deletePersona'),
        style: 'destructive',
        onPress: () => {
          deletePersona(id);
          setModalVisible(false);
          haptics('light');
        },
      },
    ]);
  };

  const displayName = (p: Persona) => p.isBuiltIn ? t(p.name as TranslationKey) : p.name;
  const displayDesc = (p: Persona) => p.isBuiltIn ? t(p.description as TranslationKey) : p.description;

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 8 }}>
        <Pressable onPress={() => { haptics('light'); router.back(); }} style={styles.backButton}>
          <ChevronLeft size={scaled22} color={colors.text} strokeWidth={2.5} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{t('personas')}</Text>
        <TouchableOpacity onPress={openCreate} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Plus size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Auto-detection toggle */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.card, borderRadius: 14,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{t('autoPersona')}</Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>{t('autoPersonaDesc')}</Text>
        </View>
        <Switch
          value={autoPersona}
          onValueChange={(v) => { setAutoPersona(v); haptics('light'); }}
          trackColor={{ false: colors.border, true: '#007AFF' }}
        />
      </View>

      {/* List */}
      <FlatList
        data={personas}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openEdit(item)}
            activeOpacity={0.6}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.card, borderRadius: 16,
              padding: 16, marginBottom: 12,
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{displayName(item)}</Text>
              <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 2 }} numberOfLines={1}>
                {displayDesc(item)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Edit/Create Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setModalVisible(false); }} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
            {/* Modal header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                {editingId ? t('editPersona') : t('createPersona')}
              </Text>
              {editingId && (
                <TouchableOpacity onPress={() => handleDelete(editingId)}>
                  <Trash2 size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {/* Icon + Name row */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <TextInput
                  value={form.icon}
                  onChangeText={(v) => {
                    const emojis = [...v.matchAll(/\p{Extended_Pictographic}/gu)];
                    setForm({ ...form, icon: emojis.length > 0 ? emojis[0][0] : '' });
                  }}
                  placeholder="😀"
                  style={{
                    width: 56, height: 56, borderRadius: 14, backgroundColor: colors.bg,
                    borderWidth: 1, borderColor: colors.border,
                    textAlign: 'center', fontSize: 24, color: colors.text,
                  }}
                />
                <TextInput
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  placeholder={t('personaName')}
                  placeholderTextColor={colors.subtext}
                  style={{
                    flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.bg,
                    borderWidth: 1, borderColor: colors.border,
                    paddingHorizontal: 14, fontSize: 16, color: colors.text,
                  }}
                />
              </View>

              {/* Description */}
              <TextInput
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                placeholder={t('personaDescription')}
                placeholderTextColor={colors.subtext}
                style={{
                  borderRadius: 14, backgroundColor: colors.bg,
                  borderWidth: 1, borderColor: colors.border,
                  paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
                  color: colors.text, marginBottom: 16,
                }}
              />

              {/* System prompt */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>
                {t('personaSystemPrompt')}
              </Text>
              <TextInput
                value={form.systemPrompt}
                onChangeText={(v) => setForm({ ...form, systemPrompt: v })}
                placeholder={t('personaSystemPrompt')}
                placeholderTextColor={colors.subtext}
                multiline
                blurOnSubmit={false}
                style={{
                  borderRadius: 14, backgroundColor: colors.bg,
                  borderWidth: 1, borderColor: colors.border,
                  paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
                  color: colors.text, minHeight: 120, textAlignVertical: 'top',
                  marginBottom: 16,
                }}
              />

              {/* Model selector (optional) */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>
                {t('personaModel')}
              </Text>
              <TouchableOpacity
                onPress={() => setModelSelectorVisible(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: 14, backgroundColor: colors.bg,
                  borderWidth: 1, borderColor: colors.border,
                  paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Cpu size={16} color={colors.subtext} />
                  <Text style={{ fontSize: 15, color: selectedModelId ? colors.text : colors.subtext }}>
                    {selectedModelId || t('personaModelNone')}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.subtext} />
              </TouchableOpacity>

              {/* Optional LLM params — hidden for now
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>
                {t('personaParams')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {(['temperature', 'maxTokens', 'topK', 'topP'] as const).map((key) => (
                  <View key={key} style={{ width: '47%' }}>
                    <Text style={{ fontSize: 12, color: colors.subtext, marginBottom: 4 }}>
                      {key === 'temperature' ? 'Temperature' : key === 'maxTokens' ? 'Max Tokens' : key === 'topK' ? 'Top K' : 'Top P'}
                    </Text>
                    <TextInput
                      value={tempParam[key]}
                      onChangeText={(v) => setTempParam({ ...tempParam, [key]: v })}
                      keyboardType="numeric"
                      placeholder="-"
                      placeholderTextColor={colors.subtext}
                      style={{
                        borderRadius: 10, backgroundColor: colors.bg,
                        borderWidth: 1, borderColor: colors.border,
                        padding: 10, fontSize: 14, color: colors.text, textAlign: 'center',
                      }}
                    />
                  </View>
                ))}
              </View>
              */}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: 14,
                    backgroundColor: colors.bg, alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.subtext }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { Keyboard.dismiss(); handleSave(); }}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: 14,
                    backgroundColor: '#007AFF', alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                    {editingId ? t('generalSave') : t('createPersona')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Read-only modal for built-in persona system prompt */}
      <Modal visible={viewingBuiltIn !== null} transparent animationType="slide" onRequestClose={() => setViewingBuiltIn(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setViewingBuiltIn(null)} />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
            {viewingBuiltIn && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{viewingBuiltIn.icon}</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 }}>
                    {t(viewingBuiltIn.name as TranslationKey)}
                  </Text>
                </View>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>
                    {t('personaSystemPrompt')}
                  </Text>
                  <View style={{ borderRadius: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
                    <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>
                      {t(viewingBuiltIn.systemPrompt as TranslationKey)}
                    </Text>
                  </View>
                </ScrollView>
                <View style={{ padding: 20, paddingTop: 0 }}>
                  <TouchableOpacity
                    onPress={() => setViewingBuiltIn(null)}
                    style={{ paddingVertical: 14, borderRadius: 14, backgroundColor: '#007AFF', alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>{t('done')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Model selector modal (reused component) */}
      <ModelSelector
        visible={modelSelectorVisible}
        onClose={() => setModelSelectorVisible(false)}
        onSelect={(modelName) => {
          setSelectedModelId(modelName);
          setModelSelectorVisible(false);
        }}
        mode="switch"
        t={t}
      />
    </SafeAreaView>
  );
}
