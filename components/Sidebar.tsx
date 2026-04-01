/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,
  StyleSheet,
  Animated,
  Easing,
  Modal
} from 'react-native';
import { compteService } from '../services/compteService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  FileText,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  MessageSquare,
  Edit3,
  Settings,
  User
} from 'lucide-react-native';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useRouter } from 'expo-router';
import { TranslationKey } from '../i18n';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.82;

export default function Sidebar({ visible, onClose, t = (k: string) => k }: { visible: boolean; onClose: () => void; t?: (key: TranslationKey) => string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // --- THEME ---
  const themeMode = useSettingsStore(state => state.themeMode);
  const { colors, resolved } = useResolvedTheme(themeMode);
  const isDark = resolved === 'dark';

  // --- ANIMATION (RN Animated API) ---
  const animValue = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.spring(animValue, {
        toValue: 1,
        damping: 22,
        stiffness: 200,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    } else if (shouldRender) {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShouldRender(false);
      });
    }
  }, [visible]);

  const overlayOpacity = animValue;

  const drawerTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-SIDEBAR_WIDTH, 0],
  });

  // --- LOGIQUE ZUSTAND ---
  const history = useChatStore((state) => state.history);
  const fetchHistory = useChatStore((state) => state.fetchHistory);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);

  // --- ETATS LOCAUX ---
  const [expandedFolders, setExpandedFolders] = useState({ maths: true, prog: false });
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (visible) {
      const load = async () => {
        setLoading(true);
        try {
          await fetchHistory();
          const profile = await compteService.getProfile();
          setAvatarUrl(profile.avatarUrl);
          setDisplayName(profile.username || '');
        } catch {
          setAvatarUrl(null);
          setDisplayName('');
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [visible, fetchHistory]);

  const toggleFolder = (folder: keyof typeof expandedFolders) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleSearchPress = () => {
    setIsSearching(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    onClose();
  };

  const handleOpenSettings = () => {
    onClose();
    setTimeout(() => router.push('/accountScreen'), 300);
  };

  if (!shouldRender && !visible) return null;

  // --- COULEURS THEME ---
  const bg = isDark ? colors.card : '#FBFBFB';
  const searchBg = isDark ? colors.bg : '#F0F0F0';
  const newChatBg = isDark ? colors.subaccent : '#111';
  const newChatText = '#FFF';
  const sectionLabel = colors.subtext;
  const folderIcon = isDark ? '#555' : '#CCC';
  const folderText = colors.text;
  const chatText = colors.subtext;
  const chatActiveBg = isDark ? '#1E1E2A' : '#EAEAEF';
  const chatActiveIcon = colors.subaccent;
  const chatIconBg = isDark ? colors.bg : '#F0F0F0';
  const chatActiveIconBg = isDark ? '#262640' : '#FFF';
  const divider = colors.border;
  const iconBg = isDark ? '#222230' : '#EFEFEF';
  const avatarBg = isDark ? '#222230' : '#ECECEC';
  const addFolderBg = isDark ? colors.bg : '#F0F0F0';
  const addFolderText = colors.subtext;

  return (
    <Modal visible={shouldRender || visible} transparent animationType="none" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* OVERLAY */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>

        {/* DRAWER */}
        <Animated.View
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          backgroundColor: bg,
          borderTopRightRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 20,
          overflow: 'hidden',
          transform: [{ translateX: drawerTranslateX }],
        }}
      >
        {/* HEADER : New Chat */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 14 }}>
          <TouchableOpacity
            onPress={async () => { await startNewChat(); onClose(); }}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: newChatBg,
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 16,
            }}
          >
            <Edit3 size={17} color={newChatText} />
            <Text style={{ marginLeft: 12, fontSize: 15.5, fontWeight: '600', color: newChatText, letterSpacing: 0.3 }}>
              {t('newChatSidebar')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          <TouchableOpacity
            onPress={handleSearchPress}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: searchBg,
              paddingVertical: 11,
              paddingHorizontal: 14,
              borderRadius: 13,
            }}
          >
            <Search size={17} color={colors.subtext} />
            {isSearching ? (
              <TextInput
                ref={searchInputRef}
                placeholder={t('searchConversations')}
                placeholderTextColor={colors.subtext}
                style={{ marginLeft: 10, flex: 1, fontSize: 14.5, color: colors.text, padding: 0 }}
                onBlur={() => setIsSearching(false)}
                autoCapitalize="none"
              />
            ) : (
              <Text style={{ marginLeft: 10, fontSize: 14.5, color: colors.subtext }}>{t('searchConversations')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
        >
          {/* Quick Access */}
          <TouchableOpacity activeOpacity={0.6} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 4 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} color={colors.subtext} />
            </View>
            <Text style={{ marginLeft: 14, fontSize: 15.5, color: folderText, fontWeight: '500' }}>{t('notes')}</Text>
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: divider, marginVertical: 6 }} />

          {/* SECTION : FOLDERS */}
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
              <Text style={{ color: sectionLabel, fontWeight: '700', fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' }}>{t('folders')}</Text>
              <TouchableOpacity activeOpacity={0.6} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: addFolderBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                <FolderPlus size={12} color={addFolderText} />
                <Text style={{ marginLeft: 5, fontSize: 11, color: addFolderText, fontWeight: '600' }}>{t('addFolder')}</Text>
              </TouchableOpacity>
            </View>

            {/* Dossier Maths */}
            <View style={{ marginBottom: 2 }}>
              <TouchableOpacity onPress={() => toggleFolder('maths')} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 }}>
                {expandedFolders.maths ? <ChevronDown size={15} color={folderIcon} /> : <ChevronRight size={15} color={folderIcon} />}
                <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: '600', color: folderText }}>Maths</Text>
              </TouchableOpacity>
              {expandedFolders.maths && (
                <View style={{ marginLeft: 12, borderLeftWidth: 1.5, borderLeftColor: divider, paddingLeft: 16, marginTop: 2 }}>
                  <Text style={{ color: colors.subtext, fontSize: 14, paddingVertical: 10 }}>Gradient Descent...</Text>
                </View>
              )}
            </View>

            {/* Dossier Prog */}
            <View style={{ marginBottom: 2 }}>
              <TouchableOpacity onPress={() => toggleFolder('prog')} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 }}>
                {expandedFolders.prog ? <ChevronDown size={15} color={folderIcon} /> : <ChevronRight size={15} color={folderIcon} />}
                <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: '600', color: folderText }}>Programmation</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: divider, marginVertical: 10 }} />

          {/* SECTION : RECENT CHATS */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
              <Text style={{ color: sectionLabel, fontWeight: '700', fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' }}>{t('recentChats')}</Text>
              {loading && <ActivityIndicator size="small" color={colors.subtext} />}
            </View>

            {history.map((chat) => {
              const isActive = currentChatId === chat.id;
              return (
                <TouchableOpacity
                  key={chat.id}
                  onPress={() => handleSelectChat(chat.id)}
                  activeOpacity={0.6}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 11,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: isActive ? chatActiveBg : 'transparent',
                  }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 9,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isActive ? chatActiveIconBg : chatIconBg,
                  }}>
                    <MessageSquare size={14} color={isActive ? chatActiveIcon : colors.subtext} />
                  </View>
                  <Text
                    style={{
                      marginLeft: 12, fontSize: 14, flex: 1,
                      color: isActive ? colors.text : chatText,
                      fontWeight: isActive ? '600' : '400',
                    }}
                    numberOfLines={1}
                  >
                    {chat.title || t('noTitle')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* FOOTER */}
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 14),
            borderTopWidth: 1,
            borderTopColor: divider,
            paddingHorizontal: 20,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: bg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <User size={17} color={colors.subtext} />
              )}
            </View>
            <Text style={{ marginLeft: 12, fontSize: 14.5, fontWeight: '600', color: folderText }}>
              {displayName || 'User'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleOpenSettings} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Settings size={19} color={colors.subtext} />
          </TouchableOpacity>
        </View>
      </Animated.View>
      </View>
    </Modal>
  );
}
