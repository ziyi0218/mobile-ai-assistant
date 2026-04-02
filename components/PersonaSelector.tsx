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

interface PersonaSelectorProps {
  personas: Persona[];
  activePersonaId: string | null;
  onSelect: (id: string | null) => void;
  onCreatePress: () => void;
  t: (key: TranslationKey) => string;
}

export default function PersonaSelector({
  personas,
  activePersonaId,
  onSelect,
  onCreatePress,
  t,
}: PersonaSelectorProps) {
  const isNoneActive = activePersonaId === null;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="gap-3">
        {/* No persona card */}
        <TouchableOpacity
          onPress={() => onSelect(null)}
          className="bg-[#F9F9F9] rounded-[16px] p-4 flex-row items-center gap-3"
          style={{
            borderWidth: 2,
            borderColor: isNoneActive ? '#007AFF' : '#EAEAEA',
          }}
        >
          <View className="w-10 h-10 rounded-xl bg-[#F0F0F0] items-center justify-center">
            <XCircle color="#999" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-[#333]">
              {t('noPersonaSelected')}
            </Text>
          </View>
          {isNoneActive && (
            <View className="w-3 h-3 rounded-full bg-[#007AFF]" />
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
              className="bg-[#F9F9F9] rounded-[16px] p-4 flex-row items-center gap-3"
              style={{
                borderWidth: 2,
                borderColor: isActive ? '#007AFF' : '#EAEAEA',
              }}
            >
              <View className="w-10 h-10 rounded-xl bg-[#F0F0F0] items-center justify-center">
                <Text className="text-[20px]">{persona.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#333]">
                  {displayName}
                </Text>
                <Text className="text-[13px] text-[#666] mt-0.5" numberOfLines={1}>
                  {displayDesc}
                </Text>
              </View>
              {isActive && (
                <View className="w-3 h-3 rounded-full bg-[#007AFF]" />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Create button */}
        <TouchableOpacity
          onPress={onCreatePress}
          style={{
            backgroundColor: '#F0F7FF',
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: '#007AFF',
            minHeight: 56,
          }}
        >
          <Plus color="#007AFF" size={18} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#007AFF' }}>
            {t('createPersona')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
