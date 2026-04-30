import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, ChevronUp, MessageCircle, Undo2, Redo2 } from 'lucide-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import NativeCollabEditorHost from '../../components/notes/NativeCollabEditorHost';
import NoteToolbar, { type NoteToolbarAction } from '../../components/notes/NoteToolbar';
import NoteChatModal from '../../components/notes/NoteChatModal';
import { useI18n } from '../../i18n/useI18n';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNoteStore } from '../../store/useNoteStore';
import { useResolvedTheme } from '../../utils/theme';
import { useUIScale } from '../../hooks/useUIScale';

const LAB_TOOLBAR_ACTIONS: NoteToolbarAction[] = ['h1', 'h2', 'h3', 'bullet', 'numbered', 'bold', 'italic', 'strike', 'code'];
const TITLE_SAVE_DEBOUNCE_MS = 500;

function normalizeNoteTitle(value: string, fallback: string) {
  return value.trim() || fallback;
}

function formatUpdatedLabel(timestamp: number, language: string) {
  const safeTimestamp = Number.isFinite(timestamp)
    ? timestamp >= 1e17
      ? Math.floor(timestamp / 1e6)
      : timestamp >= 1e14
        ? Math.floor(timestamp / 1e3)
        : timestamp < 1e12
          ? timestamp * 1000
          : timestamp
    : Date.now();
  return new Intl.DateTimeFormat(language.startsWith('fr') ? 'fr-FR' : language.startsWith('zh') ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(safeTimestamp));
}

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const insets = useSafeAreaInsets();
  const s8 = useUIScale(8);
  const s12 = useUIScale(12);
  const s13 = useUIScale(13);
  const s14 = useUIScale(14);
  const s16 = useUIScale(16);
  const s18 = useUIScale(18);
  const s22 = useUIScale(22);
  const s24 = useUIScale(24);
  const s32 = useUIScale(32);
  const s36 = useUIScale(36);
  const s38 = useUIScale(38);
  const s44 = useUIScale(44);
  const s48 = useUIScale(48);
  const s64 = useUIScale(64);
  const s72 = useUIScale(72);
  const s148 = useUIScale(148);
  const s180 = useUIScale(180);
  const note = useNoteStore((state) => state.notes.find((item) => item.id === id));
  const isLoading = useNoteStore((state) => state.isLoading);
  const fetchNotes = useNoteStore((state) => state.fetchNotes);
  const fetchNoteById = useNoteStore((state) => state.fetchNoteById);
  const updateNoteLocal = useNoteStore((state) => state.updateNoteLocal);
  const updateNoteTitle = useNoteStore((state) => state.updateNoteTitle);
  const titleInputRef = useRef<TextInput>(null);
  const titleSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleSaveInFlightRef = useRef(false);
  const queuedTitleRef = useRef<string | null>(null);
  const lastSyncedTitleRef = useRef(note?.title ?? '');
  const [title, setTitle] = useState(note?.title ?? '');
  const [contentText, setContentText] = useState(note?.content ?? '');
  const [contentHtml, setContentHtml] = useState(note?.contentHtml ?? '');
  const [editorSeedHtml, setEditorSeedHtml] = useState(note?.contentHtml ?? '');
  const [pendingCommand, setPendingCommand] = useState<NoteToolbarAction | 'focus' | 'focus-end' | 'blur' | 'undo' | 'redo' | null>(null);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [toolbarTop, setToolbarTop] = useState(s180);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [isTokenResolved, setIsTokenResolved] = useState(Platform.OS === 'web');
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [editorErrorMessage, setEditorErrorMessage] = useState<string | null>(null);
  const [isDetailHydrated, setIsDetailHydrated] = useState(false);

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContentText(note.content);
    setContentHtml(note.contentHtml ?? '');
    setEditorSeedHtml(note.contentHtml ?? '');
    lastSyncedTitleRef.current = note.title;
    queuedTitleRef.current = null;
    titleSaveInFlightRef.current = false;
    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
      titleSaveTimeoutRef.current = null;
    }
    setPendingCommand(null);
    setIsToolbarExpanded(false);
    setIsTitleFocused(false);
    setEditorErrorMessage(null);
    setIsDetailHydrated(false);
  }, [note?.id]);

  useEffect(() => {
    if (!note || isDetailHydrated) return;

    setContentText(note.content);
    setContentHtml(note.contentHtml ?? '');
    setEditorSeedHtml(note.contentHtml ?? '');
  }, [isDetailHydrated, note?.content, note?.contentHtml]);

  useEffect(() => {
    if (!id) return;

    let isActive = true;
    setIsDetailHydrated(false);

    fetchNoteById(id)
      .catch((error) => {
        console.error('Erreur hydrate note detail:', error);
      })
      .finally(() => {
        if (isActive) {
          setIsDetailHydrated(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fetchNoteById, id]);

  useEffect(() => {
    if (!note) return;

    lastSyncedTitleRef.current = note.title;
    if (!isTitleFocused) {
      setTitle(note.title);
    }
  }, [isTitleFocused, note?.id, note?.title]);

  useEffect(() => {
    if (note || !id) return;
    void fetchNotes('', 1);
  }, [fetchNotes, id, note]);

  useEffect(() => {
    let isMounted = true;

    SecureStore.getItemAsync('token')
      .then((storedToken) => {
        if (isMounted) {
          setToken(storedToken);
        }
      })
      .catch((error) => {
        console.error('Erreur lecture token note editor:', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsTokenResolved(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!note) return;
    if (note.content === contentText && note.contentHtml === contentHtml) return;

    const timeout = setTimeout(() => {
      updateNoteLocal(note.id, {
        content: contentText,
        contentHtml,
      });
    }, 180);

    return () => clearTimeout(timeout);
  }, [contentHtml, contentText, note, updateNoteLocal]);

  const wordCount = useMemo(() => {
    const matches = contentText.trim().match(/\S+/g);
    return matches ? matches.length : 0;
  }, [contentText]);

  const characterCount = contentText.length;
  const shouldShowKeyboardBar = keyboardVisible && keyboardHeight > 0;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
        titleSaveTimeoutRef.current = null;
      }
    };
  }, []);

  const applyAction = (action: NoteToolbarAction) => {
    setPendingCommand(action);
    setIsToolbarExpanded(true);
  };

  const persistTitle = async (rawTitle: string) => {
    if (!note) return;

    const normalizedTitle = normalizeNoteTitle(rawTitle, t('notesUntitled'));
    if (normalizedTitle === lastSyncedTitleRef.current) return;

    if (titleSaveInFlightRef.current) {
      queuedTitleRef.current = normalizedTitle;
      return;
    }

    titleSaveInFlightRef.current = true;
    queuedTitleRef.current = null;

    try {
      await updateNoteTitle(note.id, normalizedTitle);
    } catch (error) {
      console.error('Erreur sync note title:', error);
    } finally {
      titleSaveInFlightRef.current = false;

      const queuedTitle = queuedTitleRef.current;
      queuedTitleRef.current = null;

      if (queuedTitle && queuedTitle !== lastSyncedTitleRef.current) {
        void persistTitle(queuedTitle);
      }
    }
  };

  const scheduleTitleSave = (rawTitle: string) => {
    if (!note) return;

    const normalizedTitle = normalizeNoteTitle(rawTitle, t('notesUntitled'));
    if (normalizedTitle === lastSyncedTitleRef.current) return;

    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
    }

    titleSaveTimeoutRef.current = setTimeout(() => {
      titleSaveTimeoutRef.current = null;
      void persistTitle(normalizedTitle);
    }, TITLE_SAVE_DEBOUNCE_MS);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    scheduleTitleSave(value);
  };

  const handleTitleEndEditing = async () => {
    const normalizedTitle = normalizeNoteTitle(title, t('notesUntitled'));
    setIsTitleFocused(false);
    setTitle(normalizedTitle);

    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
      titleSaveTimeoutRef.current = null;
    }

    await persistTitle(normalizedTitle);
  };

  const handleDismissKeyboard = () => {
    setPendingCommand('blur');
    setIsToolbarExpanded(false);
    Keyboard.dismiss();
  };

  const handleJumpToTitle = () => {
    titleInputRef.current?.focus();
    const cursor = title.length;
    setKeyboardVisible(true);
    titleInputRef.current?.setNativeProps({
      selection: { start: cursor, end: cursor },
    });
  };

  if (!note) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
        <View style={[styles.missingWrap, { paddingHorizontal: s24 }]}>
          <Text style={[styles.missingText, { color: colors.text, fontSize: s16, marginBottom: s16 }]}>{t('notesEmpty')}</Text>
          {isLoading ? <Text style={{ color: colors.subtext, marginBottom: s16, fontSize: s14 }}>{t('connecting')}</Text> : null}
          <Pressable
            onPress={() => router.replace('/notes')}
            style={[
              styles.backToListButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingHorizontal: s16,
                paddingVertical: s12,
              },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: s14 }}>{t('notes')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { paddingHorizontal: s18 }]}>
        <View style={[styles.header, { paddingTop: s8, marginBottom: s18 }]}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                width: s44,
                height: s44,
                borderRadius: s22,
              },
            ]}
          >
            <ChevronLeft size={s22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={[styles.headerActions, { gap: s12 }]}>
            <Pressable
              onPress={() => setPendingCommand('undo')}
              style={[styles.headerActionButton, { width: s24, height: s24 }]}
              hitSlop={8}
            >
              <Undo2 size={s18} color={colors.subtext} strokeWidth={2.2} />
            </Pressable>

            <Pressable
              onPress={() => setPendingCommand('redo')}
              style={[styles.headerActionButton, { width: s24, height: s24 }]}
              hitSlop={8}
            >
              <Redo2 size={s18} color={colors.subtext} strokeWidth={2.2} />
            </Pressable>

            <Pressable
              onPress={() => setIsChatVisible(true)}
              style={[styles.headerActionButton, { width: s24, height: s24 }]}
              hitSlop={8}
            >
              <MessageCircle size={s18} color={colors.subtext} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        {editorErrorMessage ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: s18, paddingHorizontal: s14, paddingVertical: s12, marginBottom: s14 }]}>
            <Text style={[styles.noticeText, { color: colors.subtext, fontSize: s13, lineHeight: s18 }]}>{editorErrorMessage}</Text>
          </View>
        ) : null}

        <View
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            setToolbarTop(Math.max(s148, y + height - s12));
          }}
        >
          <TextInput
            ref={titleInputRef}
            value={title}
            onChangeText={handleTitleChange}
            onFocus={() => {
              setIsTitleFocused(true);
              setKeyboardVisible(true);
            }}
            onEndEditing={() => {
              void handleTitleEndEditing();
            }}
            placeholder={t('notesUntitled')}
            placeholderTextColor={colors.subtext}
            style={[styles.titleInput, { color: colors.text, fontSize: s38, marginBottom: s8 }]}
          />

          <Text style={[styles.meta, { color: colors.subtext, fontSize: s14, marginBottom: s18 }]}>
            {formatUpdatedLabel(note.updatedAt, i18n.language)}   {t('notesPrivate')}   {wordCount} {t('notesWords')}   {characterCount} {t('notesCharacters')}
          </Text>
        </View>

        {Platform.OS === 'web' ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: s18, paddingHorizontal: s14, paddingVertical: s12, marginBottom: s14 }]}>
            <Text style={[styles.noticeText, { color: colors.subtext, fontSize: s13, lineHeight: s18 }]}>
              Native collaborative note editing is currently available in the mobile app only.
            </Text>
          </View>
        ) : !isDetailHydrated ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: s18, paddingHorizontal: s14, paddingVertical: s12, marginBottom: s14 }]}>
            <Text style={[styles.noticeText, { color: colors.subtext, fontSize: s13, lineHeight: s18 }]}>
              Preparing note content...
            </Text>
          </View>
        ) : !isTokenResolved ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: s18, paddingHorizontal: s14, paddingVertical: s12, marginBottom: s14 }]}>
            <Text style={[styles.noticeText, { color: colors.subtext, fontSize: s13, lineHeight: s18 }]}>
              Preparing collaborative editor...
            </Text>
          </View>
        ) : !token ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: s18, paddingHorizontal: s14, paddingVertical: s12, marginBottom: s14 }]}>
            <Text style={[styles.noticeText, { color: colors.subtext, fontSize: s13, lineHeight: s18 }]}>
              Unable to load your session token. Collaborative note sync is temporarily unavailable.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.labEditorWrap, { marginTop: s14, paddingBottom: s12 }]}>
              <NativeCollabEditorHost
                noteId={note.id}
                initialHtml={contentHtml || editorSeedHtml}
                token={token}
                userId={note.userId}
                userName={note.author}
                colors={colors}
                pendingCommand={pendingCommand}
                onCommandHandled={() => setPendingCommand(null)}
                onContentChange={({ html, text }) => {
                  setContentHtml(html);
                  setContentText(text);
                }}
                onFocusChange={(isFocused) => {
                  if (isFocused) {
                    setPendingCommand(null);
                    setKeyboardVisible(true);
                  }
                }}
                onFatalError={(message) => {
                  setEditorErrorMessage(message);
                }}
              />
            </View>

            <View pointerEvents="box-none" style={[styles.floatingToolbarLayer, { top: toolbarTop }]}>
              {isToolbarExpanded ? (
                <View style={styles.floatingToolbarWrap}>
                  <View
                    style={[
                      styles.floatingToolbarCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: s22,
                        paddingHorizontal: s8,
                        paddingVertical: s8,
                      },
                    ]}
                  >
                    <NoteToolbar colors={colors} onAction={applyAction} actions={LAB_TOOLBAR_ACTIONS} />
                  </View>

                  <Pressable
                    onPress={() => setIsToolbarExpanded(false)}
                    style={[
                      styles.toolbarDockExpanded,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        width: s36,
                        height: s64,
                        marginLeft: s8,
                        borderTopLeftRadius: s18,
                        borderBottomLeftRadius: s18,
                      },
                    ]}
                  >
                    <Text style={[styles.toolbarDockText, { color: colors.text, fontSize: s24, lineHeight: s24 }]}>...</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setIsToolbarExpanded(true)}
                  style={[
                    styles.toolbarDockCollapsed,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      width: s36,
                      height: s72,
                      borderTopLeftRadius: s18,
                      borderBottomLeftRadius: s18,
                    },
                  ]}
                >
                  <MaterialIcons name="format-size" size={s24} color={colors.text} />
                </Pressable>
              )}
            </View>

            {shouldShowKeyboardBar ? (
              <View
                style={[
                  styles.keyboardBar,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    bottom: Platform.OS === 'ios' ? Math.max(keyboardHeight - insets.bottom, 0) : 0,
                    left: s18,
                    right: s18,
                    minHeight: s48,
                    borderRadius: s24,
                    paddingHorizontal: s18,
                  },
                ]}
              >
                <View style={[styles.keyboardBarLeft, { gap: s8 }]}>
                  <Pressable onPress={handleJumpToTitle} style={[styles.keyboardBarButton, { width: s32, height: s32 }]}>
                    <ChevronUp size={s22} color={colors.text} />
                  </Pressable>
                </View>

                <Pressable onPress={handleDismissKeyboard} style={[styles.keyboardBarButton, { width: s32, height: s32 }]}>
                  <Check size={s24} color={colors.text} strokeWidth={2.4} />
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </View>

      <NoteChatModal
        visible={isChatVisible}
        noteTitle={title.trim() || t('notesUntitled')}
        noteContent={contentText}
        onClose={() => setIsChatVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  header: {
    paddingTop: 8,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  noticeCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  titleInput: {
    fontSize: 38,
    fontWeight: '700',
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    marginBottom: 18,
  },
  labEditorWrap: {
    flex: 1,
    marginTop: 14,
    paddingBottom: 12,
  },
  floatingToolbarLayer: {
    position: 'absolute',
    right: 0,
    alignItems: 'flex-end',
  },
  floatingToolbarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingToolbarCard: {
    maxWidth: 320,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  toolbarDockExpanded: {
    width: 36,
    height: 64,
    marginLeft: 8,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRightWidth: 0,
  },
  toolbarDockCollapsed: {
    width: 36,
    height: 72,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  toolbarDockText: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 24,
  },
  keyboardBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  keyboardBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyboardBarButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  missingText: {
    fontSize: 16,
    marginBottom: 16,
  },
  backToListButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
});
