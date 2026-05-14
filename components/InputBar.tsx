/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Keyboard, Platform, Image, ScrollView, Text, Alert, StyleSheet, Modal, ActivityIndicator, FlatList } from 'react-native';
import { Plus, Mic, Send, ChevronUp, ChevronDown, LayoutGrid, Square, X, MessageSquare } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import IntegrationsMenu from './IntegrationsMenu';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { TranslationKey } from '../i18n';
import { useChatStore, Attachment } from '../store/chatStore';
import { chatService } from '../services/chatService';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useLocation } from '../hooks/useLocation';
import useInterfaceSettingsStore from '../store/interfaceSettingsStore';
import { useUIScale } from '../hooks/useUIScale';
import { useHaptics } from '../hooks/useHaptics';

interface InputBarProps {
  t?: (key: TranslationKey) => string;
}

export default function InputBar({ t = (k) => k }: InputBarProps) {
  const [inputText, setInputText] = useState('');
  const [isIntegrationsVisible, setIsIntegrationsVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const [isChatPickerVisible, setIsChatPickerVisible] = useState(false);
  const [chatList, setChatList] = useState<any[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  const expandedInputRef = useRef<TextInput>(null);
  const normalInputRef = useRef<TextInput>(null);
  const isExpandingRef = useRef(false);

  const sendMessage = useChatStore((state) => state.sendMessage);
  const isTyping = useChatStore((state) => state.isTyping);
  const stopGeneration = useChatStore((state) => state.stopGeneration);
  const webSearchEnabled = useChatStore((state) => state.webSearchEnabled);
  const codeInterpreterEnabled = useChatStore((state) => state.codeInterpreterEnabled);
  const setWebSearchEnabled = useChatStore((state) => state.setWebSearchEnabled);
  const setCodeInterpreterEnabled = useChatStore((state) => state.setCodeInterpreterEnabled);
  const attachments = useChatStore((state) => state.attachments);
  const addAttachment = useChatStore((state) => state.addAttachment);
  const removeAttachment = useChatStore((state) => state.removeAttachment);
  const themeMode = useSettingsStore(state => state.themeMode);
  const { colors, resolved } = useResolvedTheme(themeMode);
  const isDark = resolved === 'dark';
  const { showActionSheetWithOptions } = useActionSheet();
  const location = useLocation();
  const enterSends = useInterfaceSettingsStore(state => state.optionsList['27'].value); //iface_enter_is_send
  const scaleFactor = useUIScale(1);
  const styles = createInputBarStyles(scaleFactor);
  const { haptics } = useHaptics();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (isExpandingRef.current) {
        isExpandingRef.current = false;
        return;
      }
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      setIsExpanded(false);
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleExpand = () => {
    haptics('light');
    isExpandingRef.current = true;
    setIsExpanded(true);
    setTimeout(() => expandedInputRef.current?.focus(), 100);
  };

  const handleCollapse = () => {
    haptics('light');
    isExpandingRef.current = true;
    setIsExpanded(false);
    setTimeout(() => normalInputRef.current?.focus(), 100);
  };

  const handleAction = () => {
    if (isTyping) {
      haptics('medium');
      stopGeneration();
    } else if (inputText.trim().length > 0 || attachments.length > 0) {
      haptics('light');
      sendMessage(inputText.trim(), location);
      setInputText('');
      if (isExpanded) handleCollapse();
    }
  };

  const handlePlusPress = () => {
    haptics('light');
    const options = [t('actionCamera'), t('actionPhoto'), t('actionFile'), t('actionReferenceChat'), t('cancel')];
    showActionSheetWithOptions(
      { options, cancelButtonIndex: 4 },
      (index) => {
        if (typeof index === 'number' && index !== 4) haptics('light');
        switch (index) {
          case 0: handleCamera(); break;
          case 1: handlePickImage(); break;
          case 2: handlePickFile(); break;
          case 3: handleReferenceChat(); break;
        }
      }
    );
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { haptics('warning'); Alert.alert(t('permissionRequired'), t('cameraPermission')); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      if (!result.canceled && result.assets[0]) {
        const a = result.assets[0];
        addAttachment({ type: 'image', uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', base64: a.base64 || undefined });
        haptics('success');
      }
    } catch (e) { console.error('Erreur camera:', e); }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { haptics('warning'); Alert.alert(t('permissionRequired'), t('galleryPermission')); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true, allowsMultipleSelection: true, selectionLimit: 5 });
      if (!result.canceled) {
        result.assets.forEach((a) => {
          addAttachment({ type: 'image', uri: a.uri, name: a.fileName || `image_${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', base64: a.base64 || undefined });
        });
        haptics('success');
      }
    } catch (e) { console.error('Erreur galerie:', e); }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true });
      if (!result.canceled && result.assets) {
        result.assets.forEach((a) => {
          addAttachment({ type: 'file', uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream' });
        });
        haptics('success');
      }
    } catch (e) { console.error('Erreur fichier:', e); }
  };

  const handleReferenceChat = async () => {
    haptics('light');
    setLoadingModal(true);
    setIsChatPickerVisible(true);
    try {
      const data = await chatService.getHistory(1);
      setChatList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur history:', e);
      setChatList([]);
    }
    setLoadingModal(false);
  };

  const handleSelectChat = (chat: any) => {
    haptics('medium');
    setIsChatPickerVisible(false);
    useChatStore.getState().setCurrentChatId(chat.id);
  };

  //     Expanded mode    
  if (isExpanded) {
    return (
      <View style={[styles.expandedContainer, { paddingBottom: keyboardHeight, backgroundColor: colors.bg }]}>
        {attachments.length > 0 && <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />}
        <TextInput
          ref={expandedInputRef}
          placeholder={t('expandedPlaceholder')}
          placeholderTextColor={colors.subtext}
          multiline scrollEnabled
          style={[styles.expandedInput, { color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
          submitBehavior={enterSends?'submit':'newline'}
                    onSubmitEditing={() => {
                        if (enterSends && !isTyping) {
                          handleAction();
                        }
                      }}
        />
        <View style={[styles.expandedActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={handleCollapse} style={[styles.collapseBtn, { backgroundColor: colors.card }]}>
            <ChevronDown color={colors.subtext} size={20*scaleFactor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAction}
            style={[styles.sendBtnExpanded, (inputText.trim().length > 0 || attachments.length > 0) ? styles.sendActive : isTyping ? styles.sendStop : styles.sendInactive]}
          >
            {isTyping ? <Square color="#FFF" fill="#FFF" size={18*scaleFactor} /> : <Send color={(inputText.trim().length > 0 || attachments.length > 0) ? "#fff" : "#999"} size={20*scaleFactor} />}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  //     Normal mode    
  return (
    <View style={[styles.container, { paddingBottom: isKeyboardVisible ? 4*scaleFactor : 32*scaleFactor, backgroundColor: colors.bg }]}>
      <IntegrationsMenu
        visible={isIntegrationsVisible}
        onClose={() => setIsIntegrationsVisible(false)}
        webSearchEnabled={webSearchEnabled}
        codeInterpreterEnabled={codeInterpreterEnabled}
        onToggleWebSearch={setWebSearchEnabled}
        onToggleCodeInterpreter={setCodeInterpreterEnabled}
        t={t}
      />

      {/* Modal Reference Chat */}
      <ListPickerModal
        visible={isChatPickerVisible}
        title={t('selectConversation')}
        loading={loadingModal}
        items={chatList}
        emptyText={t('noConversation')}
        onSelect={handleSelectChat}
        onClose={() => setIsChatPickerVisible(false)}
        renderLabel={(item) => item.title || t('untitledConversation')}
        icon={<MessageSquare color={colors.accent} size={18*scaleFactor} />}
      />

      {attachments.length > 0 && <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />}
      <View style={[styles.inputRow, { backgroundColor: isDark ? '#1C1C23' : '#F7F7F7', borderColor: colors.border }]}>
        <TouchableOpacity onPress={handlePlusPress} style={[styles.plusBtn, { backgroundColor: isDark ? '#2C2C35' : '#E5E5E5' }]}>
          <Plus color={colors.text} size={22*scaleFactor} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            haptics('light');
            setIsIntegrationsVisible(true);
          }}
          style={[styles.integBtn, (webSearchEnabled || codeInterpreterEnabled) && (isDark ? styles.integActiveDark : styles.integActive)]}
        >
          <LayoutGrid color={(webSearchEnabled || codeInterpreterEnabled) ? '#007AFF' : colors.subtext} size={20*scaleFactor} />
        </TouchableOpacity>
        <TextInput
          ref={normalInputRef}
          placeholder={t('placeholder')}
          ellipsizeMode='tail'
          placeholderTextColor={colors.subtext}
          multiline
          numberOfLines={3}
          style={[styles.textInput, { color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
          submitBehavior={enterSends?'submit':'newline'}
          onSubmitEditing={() => {
              if (enterSends && !isTyping) {
                handleAction();
              }
            }}
        />
        {isKeyboardVisible && (
          <TouchableOpacity onPress={handleExpand} style={{ padding: 4, marginBottom: 2, marginRight: 4 }}>
            <ChevronUp color={colors.subtext} size={20*scaleFactor} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, isTyping && styles.stopBtn]} onPress={handleAction}>
          {isTyping ? (
            <Square color="#FFF" fill="#FFF" size={18*scaleFactor} />
          ) : (inputText.trim().length > 0 || attachments.length > 0) ? (
            <Send color="#007AFF" size={22*scaleFactor} />
          ) : (
            <Mic color={colors.subtext} size={22*scaleFactor} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ListPickerModal({ visible, title, loading, items, emptyText, onSelect, onClose, renderLabel, icon }: {
  visible: boolean; title: string; loading: boolean; items: any[]; emptyText: string;
  onSelect: (item: any) => void; onClose: () => void; renderLabel: (item: any) => string; icon: React.ReactNode;
}) {
  const scaleFactor = useUIScale(1);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const { colors, resolved } = useResolvedTheme(themeMode);
  const { haptics } = useHaptics();
  const isDark = resolved === 'dark';
  const scaled8 = useUIScale(8);
  const scaled10 = useUIScale(10);
  const scaled12 = useUIScale(12);
  const scaled14 = useUIScale(14);
  const scaled15 = useUIScale(15);
  const scaled16 = useUIScale(16);
  const scaled18 = useUIScale(18);
  const scaled20 = useUIScale(20);
  const scaled24 = useUIScale(24);
  const scaled32 = useUIScale(32);
  const scaled34 = useUIScale(34);
  const scaled36 = useUIScale(36);
  const overlay = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.28)';
  const iconBg = isDark ? 'rgba(0,122,255,0.18)' : '#E8F0FE';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: scaled24, borderTopRightRadius: scaled24, maxHeight: '70%', paddingBottom: scaled34 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scaled20, paddingTop: scaled20, paddingBottom: scaled12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: scaled18, fontWeight: '700', color: colors.text }}>{title}</Text>
            <TouchableOpacity onPress={() => { haptics('light'); onClose(); }} style={{ width: scaled32, height: scaled32, borderRadius: scaled16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
              <X color={colors.subtext} size={scaled18} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40 * scaleFactor, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : items.length === 0 ? (
            <View style={{ paddingVertical: 40 * scaleFactor, alignItems: 'center' }}>
              <Text style={{ fontSize: scaled15, color: colors.subtext }}>{emptyText}</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item, i) => item.id || String(i)}
              contentContainerStyle={{ paddingHorizontal: scaled16, paddingVertical: scaled8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { haptics('medium'); onSelect(item); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: scaled14, paddingHorizontal: scaled8, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <View style={{ width: scaled36, height: scaled36, borderRadius: scaled10, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', marginRight: scaled12 }}>
                    {icon}
                  </View>
                  <Text style={{ flex: 1, fontSize: scaled15, color: colors.text }} numberOfLines={2}>{renderLabel(item)}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

//     Attachment Preview    
function AttachmentPreview({ attachments, onRemove }: { attachments: Attachment[]; onRemove: (uri: string) => void }) {
  const scaleFactor = useUIScale(1);
  const styles = createInputBarStyles(scaleFactor);
  const { haptics } = useHaptics();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8, paddingHorizontal: 4 }} contentContainerStyle={{ gap: 8 }}>
      {attachments.map((att, i) => (
        <View key={att.uri + i} style={{ position: 'relative' }}>
          {att.type === 'image' ? (
            <View style={styles.thumbWrap}>
              <Image source={{ uri: att.uri }} style={styles.thumbImg} resizeMode="cover" />
            </View>
          ) : (
            <View style={styles.filePreview}>
              <Text style={styles.fileName} numberOfLines={2}>{att.name}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => { haptics('light'); onRemove(att.uri); }} style={styles.removeBtn}>
            <X color="#FFF" size={10*scaleFactor} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

function createInputBarStyles(scaleFactor: number) {
  return StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1
  },
  plusBtn: {
    width: 36*scaleFactor,
    height: 36*scaleFactor,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  integBtn: {
    width: 36*scaleFactor,
    height: 36*scaleFactor,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: 4
  },
  integActive: {
    backgroundColor: '#E8F0FE'
  },
  integActiveDark: {
    backgroundColor: 'rgba(0,122,255,0.2)'
  },
  textInput: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16*scaleFactor,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 36*scaleFactor,
    maxHeight: 80*scaleFactor,
    textAlignVertical: 'center' as any
  },
  actionBtn: {
    width: 36*scaleFactor,
    height: 36*scaleFactor,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  stopBtn: {
    backgroundColor: '#EF4444'
  },
  expandedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50
  },
  expandedInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    fontSize: 16*scaleFactor,
    lineHeight: 26*scaleFactor,
    textAlignVertical: 'top' as any
  },
  expandedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20
  },
  sendBtnExpanded: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20
  },
  sendActive: {
    backgroundColor: '#007AFF'
  },
  sendStop: {
    backgroundColor: '#EF4444'
  },
  sendInactive: {
    backgroundColor: '#E5E5E5'
  },
  thumbWrap: {
    width: 64*scaleFactor,
    height: 64*scaleFactor,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5'
  },
  thumbImg: {
    width: '100%',
    height: '100%'
  },
  filePreview: {
    height: 64*scaleFactor,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileName: {
    fontSize: 11*scaleFactor,
    color: '#666',
    maxWidth: 80*scaleFactor
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20*scaleFactor,
    height: 20*scaleFactor,
    borderRadius: 10*scaleFactor,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },
});
}
