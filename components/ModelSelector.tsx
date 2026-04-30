/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { chatService } from '../services/chatService';
import { TranslationKey } from '../i18n';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useUIScale } from '../hooks/useUIScale';

interface ModelInfo {
  id: string;
  name: string;
  size: string;
  vision?: boolean;
}

interface ModelSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (modelName: string, vision?: boolean) => void;
  mode?: 'add' | 'switch';
  t?: (key: TranslationKey) => string;
}

export default function ModelSelector({ visible, onClose, onSelect, mode = 'add', t = (k) => k }: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const { colors } = useResolvedTheme(themeMode);
  const scaled13 = useUIScale(13);
  const scaled15 = useUIScale(15);
  const scaled18 = useUIScale(18);

  // Fetch des modèles depuis l'API quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      const fetchModels = async () => {
        setLoading(true);
        try {
          const response = await chatService.getAvailableModels();
          if (Array.isArray(response)) {
            const modelList: ModelInfo[] = response.map((item: any, index: number) => {
              if (typeof item === 'string') {
                return { id: String(index), name: item, size: '' };
              }
              return {
                id: item.id || String(index),
                name: item.name || item.id || item,
                size: item.size || '',
                vision: item.vision ?? false,
              };
            });
            setModels(modelList);
          }
        } catch (error) {
          console.error('Erreur fetch modèles:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchModels();
    }
  }, [visible]);

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/10 items-center pt-24">
          <View
            className="rounded-2xl w-[85%] shadow-xl overflow-hidden border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >

            {/* Titre */}
            <View className="px-4 pt-4 pb-2">
              <Text className="font-bold" style={{ color: colors.text, fontSize: scaled15 }}>
                {mode === 'switch' ? t('switchModel') : t('addModel')}
              </Text>
            </View>

            {/* Barre de recherche */}
            <View className="px-4 pb-3">
              <View
                className="flex-row items-center rounded-lg px-3 py-2 border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              >
                <Search color={colors.subtext} size={scaled18} />
                <TextInput
                  placeholder={t('searchModel')}
                  placeholderTextColor={colors.subtext}
                  className="flex-1 ml-2"
                  style={{ color: colors.text, fontSize: scaled15 }}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X color={colors.subtext} size={scaled18} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Liste des modèles */}
            {loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color={colors.accent} />
                <Text className="mt-2" style={{ color: colors.subtext, fontSize: scaled13 }}>
                  {t('loadingModels')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredModels}
                keyExtractor={(item) => item.id}
                className="max-h-72"
                ListEmptyComponent={
                  <View className="py-8 items-center">
                    <Text style={{ color: colors.subtext, fontSize: scaled13 }}>{t('noModelFound')}</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="flex-row items-center justify-between p-4 border-b"
                    style={{ borderBottomColor: colors.border }}
                    onPress={() => {
                      onSelect(item.name, item.vision);
                      onClose();
                      setSearchQuery('');
                    }}
                  >
                    <Text className="flex-1" style={{ color: colors.text, fontSize: scaled15 }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.size ? (
                      <Text className="ml-2" style={{ color: colors.subtext, fontSize: scaled13 }}>
                        {item.size}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
