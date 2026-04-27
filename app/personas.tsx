/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  Keyboard,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Cpu, Plus, Trash2 } from 'lucide-react-native';
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

const emptyForm: PersonaCreateInput = {
  name: '',
  description: '',
  icon: '',
  systemPrompt: '',
  params: {},
};

export default function PersonasScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const styles = useCommonDesign();
  const { haptics } = useHaptics();
  const scaled10 = useUIScale(10);
  const scaled12 = useUIScale(12);
  const scaled13 = useUIScale(13);
  const scaled14 = useUIScale(14);
  const scaled15 = useUIScale(15);
  const scaled16 = useUIScale(16);
  const scaled18 = useUIScale(18);
  const scaled20 = useUIScale(20);
  const scaled22 = useUIScale(22);
  const scaled24 = useUIScale(24);
  const scaleFactor = useUIScale(1);

  const pageStyles = useMemo(
    () =>
      StyleSheet.create({
        headerButton: {
          width: 40 * scaleFactor,
          height: 40 * scaleFactor,
          borderRadius: 20 * scaleFactor,
          backgroundColor: colors.card,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 3,
        },
        title: {
          color: colors.text,
          fontSize: scaled22,
          fontWeight: '600',
          marginTop: 20,
          marginBottom: 24,
          textAlign: 'center',
        },
        card: {
          borderRadius: 16,
          paddingHorizontal: 18,
          paddingVertical: 18,
          marginBottom: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.card,
        },
        cardLabel: {
          fontSize: scaled16,
          fontWeight: '500',
          textAlign: 'left',
          color: colors.text,
        },
        footer: {
          paddingBottom: 20,
          alignItems: 'center',
        },
        saveButton: {
          paddingVertical: 14,
          paddingHorizontal: 40,
          borderRadius: 999,
          borderWidth: 1,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        saveButtonText: {
          fontSize: scaled16,
          fontWeight: '700',
          color: colors.text,
        },
      }),
    [colors, scaled16, scaled22, scaleFactor]
  );

  const personas = useChatStore((s) => s.personas);
  const setPersonas = useChatStore((s) => s.setPersonas);
  const autoPersona = useChatStore((s) => s.autoPersona);
  const setAutoPersona = useChatStore((s) => s.setAutoPersona);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PersonaCreateInput>({ ...emptyForm });
  const [viewingBuiltIn, setViewingBuiltIn] = useState<Persona | null>(null);
  const [modelSelectorVisible, setModelSelectorVisible] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [draftPersonas, setDraftPersonas] = useState<Persona[]>(personas);
  const [draftAutoPersona, setDraftAutoPersona] = useState(autoPersona);
  const [isDirty, setIsDirty] = useState(false);
  const [tempParam, setTempParam] = useState({
    temperature: '',
    maxTokens: '',
    topK: '',
    topP: '',
  });

  useEffect(() => {
    if (isDirty) return;
    setDraftPersonas(personas);
    setDraftAutoPersona(autoPersona);
  }, [personas, autoPersona, isDirty]);

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
      modelId: persona.modelId,
    });
    setTempParam({
      temperature: persona.params.temperature != null ? String(persona.params.temperature) : '',
      maxTokens: persona.params.maxTokens != null ? String(persona.params.maxTokens) : '',
      topK: persona.params.topK != null ? String(persona.params.topK) : '',
      topP: persona.params.topP != null ? String(persona.params.topP) : '',
    });
    setModalVisible(true);
  };

  const handleModalSave = () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return;

    const params: PersonaCreateInput['params'] = {};
    const temp = parseFloat(tempParam.temperature);
    if (!Number.isNaN(temp) && temp >= 0 && temp <= 2) params.temperature = temp;
    const maxTok = parseInt(tempParam.maxTokens, 10);
    if (!Number.isNaN(maxTok) && maxTok > 0) params.maxTokens = maxTok;
    const tk = parseInt(tempParam.topK, 10);
    if (!Number.isNaN(tk) && tk > 0) params.topK = tk;
    const tp = parseFloat(tempParam.topP);
    if (!Number.isNaN(tp) && tp >= 0 && tp <= 1) params.topP = tp;

    const input: PersonaCreateInput = { ...form, params, modelId: selectedModelId };

    if (editingId) {
      setDraftPersonas((prev) =>
        prev.map((persona) => {
          if (persona.id !== editingId) return persona;
          if (persona.isBuiltIn) return persona;
          return { ...persona, ...input, updatedAt: Date.now() };
        })
      );
    } else {
      const now = Date.now();
      const persona: Persona = {
        ...input,
        id: `draft-${now}-${Math.random().toString(16).slice(2)}`,
        isBuiltIn: false,
        createdAt: now,
        updatedAt: now,
      };
      setDraftPersonas((prev) => [...prev, persona]);
    }

    setIsDirty(true);
    setModalVisible(false);
    haptics('light');
  };

  const handleDelete = (id: string) => {
    const persona = draftPersonas.find((p) => p.id === id);
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
          setDraftPersonas((prev) => prev.filter((personaItem) => personaItem.id !== id));
          setIsDirty(true);
          setModalVisible(false);
          haptics('light');
        },
      },
    ]);
  };

  const handleSaveChanges = () => {
    setPersonas(draftPersonas);
    setAutoPersona(draftAutoPersona);
    setIsDirty(false);
    haptics('light');
    Alert.alert(t('generalSave'), t('personasSaveMessage'));
  };

  const displayName = (persona: Persona) =>
    persona.isBuiltIn ? t(persona.name as TranslationKey) : persona.name;
  const displayDesc = (persona: Persona) =>
    persona.isBuiltIn ? t(persona.description as TranslationKey) : persona.description;

  return (
    <View style={[personaStyles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <View style={personaStyles.headerRow}>
          <Pressable
            onPress={() => {
              haptics('light');
              router.back();
            }}
            style={pageStyles.headerButton}
          >
            <ChevronLeft size={scaled22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            onPress={openCreate}
            style={pageStyles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={scaled22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <Text style={pageStyles.title}>— {t('personas')} —</Text>

        <View style={personaStyles.content}>
          <View style={[pageStyles.card, personaStyles.autoPersonaCard]}>
            <View style={personaStyles.autoPersonaTextWrap}>
              <Text style={pageStyles.cardLabel}>{t('autoPersona')}</Text>
              <Text
                style={[
                  personaStyles.descriptionText,
                  { color: colors.subtext, fontSize: scaled13 },
                ]}
              >
                {t('autoPersonaDesc')}
              </Text>
            </View>
            <Switch
              value={draftAutoPersona}
              onValueChange={(value) => {
                setDraftAutoPersona(value);
                setIsDirty(true);
                haptics('light');
              }}
              trackColor={{ false: colors.border, true: '#007AFF' }}
              style={{ transform: [{ scale: scaleFactor }] }}
            />
          </View>

          <FlatList
            data={draftPersonas}
            keyExtractor={(item) => item.id}
            contentContainerStyle={personaStyles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => openEdit(item)}
                activeOpacity={0.6}
                style={pageStyles.card}
              >
                <View style={personaStyles.cardStart}>
                  <View style={[personaStyles.iconBox, { backgroundColor: colors.bg }]}>
                    <Text style={[personaStyles.iconText, { fontSize: scaled20 }]}>
                      {item.icon}
                    </Text>
                  </View>

                  <View style={personaStyles.cardTextWrap}>
                    <View style={personaStyles.nameRow}>
                      <Text
                        style={[pageStyles.cardLabel, personaStyles.nameText]}
                        numberOfLines={1}
                      >
                        {displayName(item)}
                      </Text>

                      {item.isBuiltIn && (
                        <View style={personaStyles.badge}>
                          <Text style={[personaStyles.badgeText, { fontSize: scaled10 }]}>
                            {t('builtInPersona')}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        personaStyles.descriptionText,
                        { color: colors.subtext, fontSize: scaled13 },
                      ]}
                      numberOfLines={1}
                    >
                      {displayDesc(item)}
                    </Text>
                  </View>
                </View>

                <ChevronRight size={scaled18} color={colors.subtext} />
              </TouchableOpacity>
            )}
          />

          <View style={pageStyles.footer}>
            <Pressable
              style={[
                pageStyles.saveButton,
                {
                  opacity: isDirty ? 1 : 0.6,
                },
              ]}
              onPress={handleSaveChanges}
              disabled={!isDirty}
            >
              <Text style={pageStyles.saveButtonText}>{t('generalSave')}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              Keyboard.dismiss();
              setModalVisible(false);
            }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '85%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: scaled18, fontWeight: '700', color: colors.text }}>
                {editingId ? t('editPersona') : t('createPersona')}
              </Text>
              {editingId && (
                <TouchableOpacity onPress={() => handleDelete(editingId)}>
                  <Trash2 size={scaled20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <TextInput
                  value={form.icon}
                  onChangeText={(value) => {
                    const emojis = [...value.matchAll(/\p{Extended_Pictographic}/gu)];
                    setForm({ ...form, icon: emojis[0]?.[0] ?? '' });
                  }}
                  placeholder="😀"
                  placeholderTextColor={colors.subtext}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    textAlign: 'center',
                    fontSize: scaled24,
                    color: colors.text,
                  }}
                />

                <TextInput
                  value={form.name}
                  onChangeText={(value) => setForm({ ...form, name: value })}
                  placeholder={t('personaName')}
                  placeholderTextColor={colors.subtext}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 14,
                    fontSize: scaled16,
                    color: colors.text,
                  }}
                />
              </View>

              <TextInput
                value={form.description}
                onChangeText={(value) => setForm({ ...form, description: value })}
                placeholder={t('personaDescription')}
                placeholderTextColor={colors.subtext}
                style={{
                  borderRadius: 14,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: scaled15,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text
                style={{
                  fontSize: scaled13,
                  fontWeight: '600',
                  color: colors.subtext,
                  marginBottom: 8,
                }}
              >
                {t('personaSystemPrompt')}
              </Text>
              <TextInput
                value={form.systemPrompt}
                onChangeText={(value) => setForm({ ...form, systemPrompt: value })}
                placeholder={t('personaSystemPrompt')}
                placeholderTextColor={colors.subtext}
                multiline
                blurOnSubmit={false}
                style={{
                  borderRadius: 14,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: scaled15,
                  color: colors.text,
                  minHeight: 120,
                  textAlignVertical: 'top',
                  marginBottom: 16,
                }}
              />

              <Text
                style={{
                  fontSize: scaled13,
                  fontWeight: '600',
                  color: colors.subtext,
                  marginBottom: 8,
                }}
              >
                {t('personaModel')}
              </Text>
              <TouchableOpacity
                onPress={() => setModelSelectorVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 14,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Cpu size={scaled16} color={colors.subtext} />
                  <Text
                    style={{
                      fontSize: scaled15,
                      color: selectedModelId ? colors.text : colors.subtext,
                    }}
                  >
                    {selectedModelId || t('personaModelNone')}
                  </Text>
                </View>
                <ChevronRight size={scaled16} color={colors.subtext} />
              </TouchableOpacity>

              <Text
                style={{
                  fontSize: scaled13,
                  fontWeight: '600',
                  color: colors.subtext,
                  marginBottom: 8,
                }}
              >
                {t('personaParams')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {(['temperature', 'maxTokens', 'topK', 'topP'] as const).map((key) => (
                  <View key={key} style={{ width: '47%' }}>
                    <Text style={{ fontSize: scaled12, color: colors.subtext, marginBottom: 4 }}>
                      {key === 'temperature'
                        ? 'Temperature'
                        : key === 'maxTokens'
                          ? 'Max Tokens'
                          : key === 'topK'
                            ? 'Top K'
                            : 'Top P'}
                    </Text>
                    <TextInput
                      value={tempParam[key]}
                      onChangeText={(value) => setTempParam({ ...tempParam, [key]: value })}
                      keyboardType="numeric"
                      placeholder="-"
                      placeholderTextColor={colors.subtext}
                      style={{
                        borderRadius: 10,
                        backgroundColor: colors.bg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 10,
                        fontSize: scaled14,
                        color: colors.text,
                        textAlign: 'center',
                      }}
                    />
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: colors.bg,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: scaled16, fontWeight: '600', color: colors.subtext }}>
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    handleModalSave();
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: '#007AFF',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: scaled16, fontWeight: '600', color: '#fff' }}>
                    {editingId ? t('generalSave') : t('createPersona')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={viewingBuiltIn !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingBuiltIn(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setViewingBuiltIn(null)} />
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '70%',
            }}
          >
            {viewingBuiltIn && (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: colors.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: scaled22 }}>{viewingBuiltIn.icon}</Text>
                  </View>
                  <Text
                    style={{ fontSize: scaled18, fontWeight: '700', color: colors.text, flex: 1 }}
                  >
                    {t(viewingBuiltIn.name as TranslationKey)}
                  </Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <Text
                    style={{
                      fontSize: scaled13,
                      fontWeight: '600',
                      color: colors.subtext,
                      marginBottom: 8,
                    }}
                  >
                    {t('personaSystemPrompt')}
                  </Text>
                  <View
                    style={{
                      borderRadius: 14,
                      backgroundColor: colors.bg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 14,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: scaled15,
                        color: colors.text,
                        lineHeight: scaled15 * 1.47,
                      }}
                    >
                      {t(viewingBuiltIn.systemPrompt as TranslationKey)}
                    </Text>
                  </View>
                </ScrollView>

                <View style={{ padding: 20, paddingTop: 0 }}>
                  <TouchableOpacity
                    onPress={() => setViewingBuiltIn(null)}
                    style={{
                      paddingVertical: 14,
                      borderRadius: 14,
                      backgroundColor: '#007AFF',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: scaled16, fontWeight: '600', color: '#fff' }}>
                      {t('done')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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
    </View>
  );
}

const personaStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  autoPersonaCard: {
    marginBottom: 14,
  },
  autoPersonaTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  listContent: {
    paddingTop: 6,
    paddingBottom: 24,
  },
  cardStart: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
  },
  cardTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    flexShrink: 1,
  },
  descriptionText: {
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontWeight: '600',
    color: '#007AFF',
  },
});
