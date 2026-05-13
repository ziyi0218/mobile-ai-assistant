/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Plus, XCircle } from 'lucide-react-native';
import type { Persona } from '../types/persona';
import type { TranslationKey } from '../i18n';
import type { useResolvedTheme } from '../utils/theme';

type ThemeColors = ReturnType<typeof useResolvedTheme>['colors'];

interface PersonaSelectorProps {
  personas: Persona[];
  activePersonaId: string | null;
  onSelect: (id: string | null) => void;
  onCreatePress: () => void;
  t: (key: TranslationKey) => string;
  colors: ThemeColors;
}

export default function PersonaSelector({
  personas,
  activePersonaId,
  onSelect,
  onCreatePress,
  t,
  colors,
}: PersonaSelectorProps) {
  const isNoneActive = activePersonaId === null;
  const selectedColor = '#007AFF';

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="gap-3">
        {/* No persona card */}
        <TouchableOpacity
          onPress={() => onSelect(null)}
          className="rounded-[16px] p-4 flex-row items-center gap-3"
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: isNoneActive ? selectedColor : colors.border,
          }}
        >
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.bg }}>
            <XCircle color={colors.subtext} size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-semibold" style={{ color: colors.text }}>
              {t('noPersonaSelected')}
            </Text>
          </View>
          {isNoneActive && (
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedColor }} />
          )}
        </TouchableOpacity>

        {/* Persona cards */}
        {personas.map((persona) => {
          const isActive = activePersonaId === persona.id;
          const displayName = persona.isBuiltIn ? t(persona.name as TranslationKey) : persona.name;
          const displayDesc = persona.isBuiltIn ? t(persona.description as TranslationKey) : persona.description;

          return (
            <TouchableOpacity
              key={persona.id}
              onPress={() => onSelect(persona.id)}
              className="rounded-[16px] p-4 flex-row items-center gap-3"
              style={{
                backgroundColor: colors.card,
                borderWidth: 2,
                borderColor: isActive ? selectedColor : colors.border,
              }}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.bg }}>
                <Text className="text-[20px]">{persona.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold" style={{ color: colors.text }}>
                  {displayName}
                </Text>
                <Text className="text-[13px] mt-0.5" style={{ color: colors.subtext }} numberOfLines={1}>
                  {displayDesc}
                </Text>
              </View>
              {isActive && (
                <View className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedColor }} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Create button */}
        <TouchableOpacity
          onPress={onCreatePress}
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: selectedColor,
            minHeight: 56,
          }}
        >
          <Plus color={selectedColor} size={18} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: selectedColor }}>
            {t('createPersona')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
