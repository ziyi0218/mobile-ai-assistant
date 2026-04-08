import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, ChevronUp, MessageCircle, Undo2, Redo2 } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NoteEditor from '../../components/notes/NoteEditor';
import NoteToolbar, { type NoteToolbarAction } from '../../components/notes/NoteToolbar';
import { useI18n } from '../../i18n/useI18n';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNoteStore } from '../../store/useNoteStore';
import { useResolvedTheme } from '../../utils/theme';

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
  const note = useNoteStore((state) => state.notes.find((item) => item.id === id));
  const isLoading = useNoteStore((state) => state.isLoading);
  const fetchNotes = useNoteStore((state) => state.fetchNotes);
  const updateNoteLocal = useNoteStore((state) => state.updateNoteLocal);
  const updateNoteTitle = useNoteStore((state) => state.updateNoteTitle);
  const titleInputRef = useRef<TextInput>(null);
  const [title, setTitle] = useState(note?.title ?? '');
  const [contentText, setContentText] = useState(note?.content ?? '');
  const [contentHtml, setContentHtml] = useState(note?.contentHtml ?? '');
  const [editorSeedHtml, setEditorSeedHtml] = useState(note?.contentHtml ?? '');
  const [pendingCommand, setPendingCommand] = useState<NoteToolbarAction | 'focus' | 'focus-end' | 'blur' | 'undo' | 'redo' | null>(null);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [toolbarTop, setToolbarTop] = useState(180);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContentText(note.content);
    setContentHtml(note.contentHtml ?? '');
    setEditorSeedHtml(note.contentHtml ?? '');
  }, [note?.id]);

  useEffect(() => {
    if (note || !id) return;
    void fetchNotes('', 1);
  }, [fetchNotes, id, note]);

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

  const applyAction = (action: NoteToolbarAction) => {
    setPendingCommand(action);
    setIsToolbarExpanded(true);
  };

  const handleTitleEndEditing = async () => {
    if (!note) return;
    const normalizedTitle = title.trim() || t('notesUntitled');
    if (normalizedTitle === note.title) return;

    try {
      await updateNoteTitle(note.id, normalizedTitle);
      setTitle(normalizedTitle);
    } catch (error) {
      console.error('Erreur update note title:', error);
      setTitle(note.title);
    }
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
        <View style={styles.missingWrap}>
          <Text style={[styles.missingText, { color: colors.text }]}>{t('notesEmpty')}</Text>
          {isLoading ? <Text style={{ color: colors.subtext, marginBottom: 16 }}>{t('connecting')}</Text> : null}
          <Pressable
            onPress={() => router.replace('/notes')}
            style={[styles.backToListButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text }}>{t('notes')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ChevronLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setPendingCommand('undo')}
              style={styles.headerActionButton}
              hitSlop={8}
            >
              <Undo2 size={18} color={colors.subtext} strokeWidth={2.2} />
            </Pressable>

            <Pressable
              onPress={() => setPendingCommand('redo')}
              style={styles.headerActionButton}
              hitSlop={8}
            >
              <Redo2 size={18} color={colors.subtext} strokeWidth={2.2} />
            </Pressable>

            <Pressable style={styles.headerActionButton} hitSlop={8}>
              <MessageCircle size={18} color={colors.subtext} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setToolbarTop(Math.max(148, y + height - 12));
            }}
          >
            <TextInput
              ref={titleInputRef}
              value={title}
              onChangeText={setTitle}
              onFocus={() => {
                setKeyboardVisible(true);
              }}
              onEndEditing={() => {
                void handleTitleEndEditing();
              }}
              placeholder={t('notesUntitled')}
              placeholderTextColor={colors.subtext}
              style={[styles.titleInput, { color: colors.text }]}
            />

            <Text style={[styles.meta, { color: colors.subtext }]}>
              {formatUpdatedLabel(note.updatedAt, i18n.language)}   {t('notesPrivate')}   {wordCount} {t('notesWords')}   {characterCount} {t('notesCharacters')}
            </Text>
          </View>

          <View style={styles.editorWrap}>
            <NoteEditor
              initialHtml={editorSeedHtml}
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
            />
          </View>
        </ScrollView>

        <View pointerEvents="box-none" style={[styles.floatingToolbarLayer, { top: toolbarTop }]}>
          {isToolbarExpanded ? (
            <View style={styles.floatingToolbarWrap}>
              <View style={[styles.floatingToolbarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <NoteToolbar colors={colors} onAction={applyAction} />
              </View>

              <Pressable
                onPress={() => setIsToolbarExpanded(false)}
                style={[styles.toolbarDockExpanded, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.toolbarDockText, { color: colors.text }]}>›</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setIsToolbarExpanded(true)}
              style={[styles.toolbarDockCollapsed, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.toolbarDockText, { color: colors.text }]}>‹</Text>
            </Pressable>
          )}
        </View>

        {keyboardVisible ? (
          <View
            style={[
              styles.keyboardBar,
              {
                backgroundColor: colors.bg,
                borderColor: colors.border,
                bottom: Platform.OS === 'ios' ? Math.max(keyboardHeight - insets.bottom, 0) : 0,
              },
            ]}
          >
            <View style={styles.keyboardBarLeft}>
              <Pressable onPress={handleJumpToTitle} style={styles.keyboardBarButton}>
                <ChevronUp size={22} color={colors.text} />
              </Pressable>
            </View>

            <Pressable onPress={handleDismissKeyboard} style={styles.keyboardBarButton}>
              <Check size={24} color={colors.text} strokeWidth={2.4} />
            </Pressable>
          </View>
        ) : null}
      </View>
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
  scrollContent: {
    paddingBottom: 180,
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
  editorWrap: {
    marginTop: 14,
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
