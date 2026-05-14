/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React from 'react';
import { Dimensions, View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Switch } from 'react-native';
import { Globe, Code } from 'lucide-react-native';
import { TranslationKey } from '../i18n';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useUIScale } from '../hooks/useUIScale';

interface IntegrationsMenuProps {
    visible: boolean;
    onClose: () => void;
    webSearchEnabled: boolean;
    codeInterpreterEnabled: boolean;
    onToggleWebSearch: (value: boolean) => void;
    onToggleCodeInterpreter: (value: boolean) => void;
    t?: (key: TranslationKey) => string;
}

export default function IntegrationsMenu({
    visible,
    onClose,
    webSearchEnabled,
    codeInterpreterEnabled,
    onToggleWebSearch,
    onToggleCodeInterpreter,
    t = (k) => k,
}: IntegrationsMenuProps) {
    const themeMode = useSettingsStore((state) => state.themeMode);
    const { colors, resolved } = useResolvedTheme(themeMode);
    const isDark = resolved === 'dark';
    const scale = useUIScale(1);
    const scaled12 = useUIScale(12);
    const scaled15 = useUIScale(15);
    const scaled18 = useUIScale(18);
    const scaled32 = useUIScale(32);
    const accentSoft = isDark ? 'rgba(0,122,255,0.18)' : '#E8F0FE';
    const screenWidth = Dimensions.get('window').width;
    const horizontalMargin = 16 * scale;
    const menuWidth = Math.min(256 * scale, screenWidth - horizontalMargin * 2);
    const menuLeft = Math.min(64 * scale, screenWidth - menuWidth - horizontalMargin);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.12)' }}>
                    <View
                        style={{
                            position: 'absolute',
                            bottom: 96 * scale,
                            left: menuLeft,
                            width: menuWidth,
                            borderRadius: 18 * scale,
                            padding: 16 * scale,
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: colors.border,
                            shadowColor: '#000000',
                            shadowOpacity: isDark ? 0.22 : 0.12,
                            shadowRadius: 14,
                            shadowOffset: { width: 0, height: 8 },
                            elevation: 5,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.subtext,
                                fontSize: scaled12,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                marginBottom: 12 * scale,
                                paddingHorizontal: 4 * scale,
                            }}
                        >
                            {t('integrations')}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 * scale, paddingHorizontal: 4 * scale }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: scaled32, height: scaled32, borderRadius: 10 * scale, backgroundColor: webSearchEnabled ? accentSoft : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                                    <Globe color={webSearchEnabled ? colors.accent : colors.subtext} size={scaled18} />
                                </View>
                                <Text style={{ marginLeft: 12 * scale, color: colors.text, fontSize: scaled15, fontWeight: '500' }}>
                                    {t('webSearch')}
                                </Text>
                            </View>
                            <Switch
                                value={webSearchEnabled}
                                onValueChange={onToggleWebSearch}
                                trackColor={{ false: colors.border, true: colors.accent }}
                                thumbColor={isDark ? colors.text : '#FFFFFF'}
                                ios_backgroundColor={colors.border}
                                style={{ transform: [{ scale: Math.max(0.85, scale) }] }}
                            />
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 4 * scale }} />

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 * scale, paddingHorizontal: 4 * scale }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: scaled32, height: scaled32, borderRadius: 10 * scale, backgroundColor: codeInterpreterEnabled ? accentSoft : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                                    <Code color={codeInterpreterEnabled ? colors.accent : colors.subtext} size={scaled18} />
                                </View>
                                <Text style={{ marginLeft: 12 * scale, color: colors.text, fontSize: scaled15, fontWeight: '500' }}>
                                    {t('codeInterpreter')}
                                </Text>
                            </View>
                            <Switch
                                value={codeInterpreterEnabled}
                                onValueChange={onToggleCodeInterpreter}
                                trackColor={{ false: colors.border, true: colors.accent }}
                                thumbColor={isDark ? colors.text : '#FFFFFF'}
                                ios_backgroundColor={colors.border}
                                style={{ transform: [{ scale: Math.max(0.85, scale) }] }}
                            />
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}


