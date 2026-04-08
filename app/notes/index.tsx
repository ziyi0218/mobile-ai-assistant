import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Download, FileCode2, FileText, FileType2, Plus, Search, Share2, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '../../i18n/useI18n';
import { useSettingsStore } from '../../store/useSettingsStore';
import { type NoteItem, useNoteStore } from '../../store/useNoteStore';
import { useResolvedTheme } from '../../utils/theme';
import NoteListItem from '../../components/notes/NoteListItem';
import { SidebarActionSheet } from '../../components/sidebar/SidebarModals';
import { buildSidebarUi, type SidebarAction } from '../../components/sidebar/SidebarUtils';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDayDiff(timestamp: number) {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(timestamp));
  return Math.floor((today.getTime() - target.getTime()) / 86400000);
}

function ensureTimestamp(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 1e17) return Math.floor(value / 1e6);
    if (value >= 1e14) return Math.floor(value / 1e3);
    if (value < 1e12) return value * 1000;
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      if (numeric >= 1e17) return Math.floor(numeric / 1e6);
      if (numeric >= 1e14) return Math.floor(numeric / 1e3);
      if (numeric < 1e12) return numeric * 1000;
      return numeric;
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }
  return Date.now();
}

function formatRelativeTime(timestamp: number, language: string) {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (language.startsWith('zh')) {
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} 天前`;
  }

  if (language.startsWith('fr')) {
    if (diffMinutes < 60) return diffMinutes <= 1 ? 'il y a 1 minute' : `il y a ${diffMinutes} minutes`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return diffHours <= 1 ? 'il y a 1 heure' : `il y a ${diffHours} heures`;
    const diffDays = Math.round(diffHours / 24);
    return diffDays <= 1 ? 'il y a 1 jour' : `il y a ${diffDays} jours`;
  }

  if (diffMinutes < 60) return diffMinutes <= 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return diffHours <= 1 ? '1 hour ago' : `${diffHours} hours ago`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays <= 1 ? '1 day ago' : `${diffDays} days ago`;
}

export default function NotesScreen() {
  const router = useRouter();
  const { t, i18n } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors, resolved } = useResolvedTheme(themeMode);
  const ui = useMemo(() => buildSidebarUi(colors, resolved === 'dark'), [colors, resolved]);
  const notes = useNoteStore((state) => state.notes);
  const isLoading = useNoteStore((state) => state.isLoading);
  const total = useNoteStore((state) => state.total);
  const fetchNotes = useNoteStore((state) => state.fetchNotes);
  const createNote = useNoteStore((state) => state.createNote);
  const deleteNote = useNoteStore((state) => state.deleteNote);
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [isNoteMenuVisible, setIsNoteMenuVisible] = useState(false);
  const [isExportMenuVisible, setIsExportMenuVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchNotes(search, 1);
    }, 220);

    return () => clearTimeout(timeout);
  }, [fetchNotes, search]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;

    return notes.filter((note) => {
      const haystack = `${note.title}\n${note.content}\n${note.author}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [notes, search]);

  const groups = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat(
      i18n.language.startsWith('fr') ? 'fr-FR' : i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US',
      { month: 'long', year: 'numeric' }
    );

    const sections: Array<{ label: string; items: NoteItem[] }> = [];
    const map = new Map<string, NoteItem[]>();

    filteredNotes.forEach((note) => {
      const safeUpdatedAt = ensureTimestamp(note.updatedAt);
      const diff = getDayDiff(safeUpdatedAt);
      let label = monthFormatter.format(new Date(safeUpdatedAt));

      if (diff === 0) label = t('notesToday');
      else if (diff === 1) label = t('notesYesterday');
      else if (diff <= 7) label = t('notesLast7Days');
      else if (diff <= 30) label = t('notesLast30Days');

      if (!map.has(label)) {
        const items: NoteItem[] = [];
        map.set(label, items);
        sections.push({ label, items });
      }

      map.get(label)?.push(note);
    });

    return sections;
  }, [filteredNotes, i18n.language, t]);

  const handleCreate = async () => {
    try {
      const note = await createNote();
      router.push(`/notes/${note.id}`);
    } catch (error) {
      console.error('Erreur create note:', error);
    }
  };

  const handleDeleteNote = (note: NoteItem) => {
    Alert.alert(
      'Delete note?',
      `This will delete ${note.title}.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            void deleteNote(note.id);
          },
        },
      ]
    );
  };

  const noteActions: SidebarAction[] = [
    {
      key: 'download',
      label: 'Download',
      icon: <Download size={18} color={colors.text} />,
      onPress: () => {
        setIsExportMenuVisible(true);
      },
    },
    {
      key: 'share',
      label: 'Share',
      icon: <Share2 size={18} color={colors.text} />,
      onPress: () => {},
    },
    {
      key: 'delete',
      label: t('sidebarDelete'),
      danger: true,
      icon: <Trash2 size={18} color={ui.danger} />,
      onPress: () => {
        if (selectedNote) {
          handleDeleteNote(selectedNote);
        }
      },
    },
  ];

  const exportActions: SidebarAction[] = [
    {
      key: 'txt',
      label: 'Plain text (.txt)',
      icon: <FileText size={18} color={colors.text} />,
      onPress: () => {},
    },
    {
      key: 'md',
      label: 'Plain text (.md)',
      icon: <FileCode2 size={18} color={colors.text} />,
      onPress: () => {},
    },
    {
      key: 'pdf',
      label: 'PDF document (.pdf)',
      icon: <FileType2 size={18} color={colors.text} />,
      onPress: () => {},
    },
  ];

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
        </View>

        <View style={styles.topRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.subtext }]}>{t('notes')}</Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('notes')} {total}
            </Text>
          </View>

          <Pressable onPress={() => { void handleCreate(); }} style={[styles.newButton, { backgroundColor: colors.text }]}>
            <Plus size={16} color={colors.bg} />
            <Text style={[styles.newButtonText, { color: colors.bg }]}>{t('notesNewNote')}</Text>
          </Pressable>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.subtext} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('notesSearchPlaceholder')}
            placeholderTextColor={colors.subtext}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <ScrollView
          style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={false}
        >
          {groups.length ? (
            groups.map((group) => (
              <View key={group.label} style={styles.groupBlock}>
                <Text style={[styles.groupLabel, { color: colors.subtext }]}>{group.label}</Text>
                {group.items.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    relativeLabel={formatRelativeTime(ensureTimestamp(note.updatedAt), i18n.language)}
                    colors={colors}
                    onPress={() => router.push(`/notes/${note.id}`)}
                    onOpenMenu={() => {
                      setSelectedNote(note);
                      setIsNoteMenuVisible(true);
                    }}
                  />
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                {isLoading ? t('connecting') : t('notesEmpty')}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <SidebarActionSheet
        visible={isNoteMenuVisible}
        title={selectedNote?.title}
        actions={noteActions}
        onClose={() => setIsNoteMenuVisible(false)}
        colors={colors}
        ui={ui}
      />

      <SidebarActionSheet
        visible={isExportMenuVisible}
        title={selectedNote?.title}
        actions={exportActions}
        onClose={() => setIsExportMenuVisible(false)}
        colors={colors}
        ui={ui}
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
    marginBottom: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  newButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  searchBox: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  panel: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
  },
  panelContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    paddingBottom: 28,
  },
  groupBlock: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  emptyState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
