import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Download, FileCode2, FileText, FileType2, Plus, Search, Share2, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '../../i18n/useI18n';
import { useSettingsStore } from '../../store/useSettingsStore';
import { type NoteItem, useNoteStore } from '../../store/useNoteStore';
import { useResolvedTheme } from '../../utils/theme';
import { useUIScale } from '../../hooks/useUIScale';
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
  const scaled4 = useUIScale(4);
  const scaled8 = useUIScale(8);
  const scaled10 = useUIScale(10);
  const scaled12 = useUIScale(12);
  const scaled14 = useUIScale(14);
  const scaled15 = useUIScale(15);
  const scaled16 = useUIScale(16);
  const scaled18 = useUIScale(18);
  const scaled20 = useUIScale(20);
  const scaled22 = useUIScale(22);
  const scaled28 = useUIScale(28);
  const scaled40 = useUIScale(40);
  const scaled44 = useUIScale(44);
  const scaled52 = useUIScale(52);
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
      t('notesDeleteTitle'),
      t('notesDeleteMessage').replace('{{title}}', note.title),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
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
      label: t('download'),
      icon: <Download size={scaled18} color={colors.text} />,
      onPress: () => {
        setIsExportMenuVisible(true);
      },
    },
    {
      key: 'share',
      label: t('share'),
      icon: <Share2 size={scaled18} color={colors.text} />,
      onPress: () => {},
    },
    {
      key: 'delete',
      label: t('sidebarDelete'),
      danger: true,
      icon: <Trash2 size={scaled18} color={ui.danger} />,
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
      label: t('notesExportTxt'),
      icon: <FileText size={scaled18} color={colors.text} />,
      onPress: () => {},
    },
    {
      key: 'md',
      label: t('notesExportMd'),
      icon: <FileCode2 size={scaled18} color={colors.text} />,
      onPress: () => {},
    },
    {
      key: 'pdf',
      label: t('notesExportPdf'),
      icon: <FileType2 size={scaled18} color={colors.text} />,
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { paddingHorizontal: scaled18 }]}>
        <View style={[styles.header, { paddingTop: scaled8, marginBottom: scaled20 }]}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.iconButton,
              {
                width: scaled44,
                height: scaled44,
                borderRadius: scaled22,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <ChevronLeft size={scaled22} color={colors.text} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={[styles.topRow, { marginBottom: scaled18 }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text, fontSize: scaled40 }]}>
              {t('notes')}
            </Text>
            <Text style={[styles.count, { color: colors.subtext, fontSize: scaled28, marginLeft: scaled8 }]}>
              {total}
            </Text>
          </View>

          <Pressable
            onPress={() => { void handleCreate(); }}
            style={[
              styles.newButton,
              {
                gap: scaled8,
                paddingHorizontal: scaled16,
                paddingVertical: scaled12,
                backgroundColor: colors.text,
              },
            ]}
          >
            <Plus size={scaled16} color={colors.bg} />
            <Text style={[styles.newButtonText, { color: colors.bg, fontSize: scaled15 }]}>{t('notesNewNote')}</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              height: scaled52,
              borderRadius: scaled18,
              paddingHorizontal: scaled14,
              marginBottom: scaled16,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Search size={scaled18} color={colors.subtext} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('notesSearchPlaceholder')}
            placeholderTextColor={colors.subtext}
            style={[styles.searchInput, { color: colors.text, marginLeft: scaled10, fontSize: scaled16 }]}
          />
        </View>

        <ScrollView
          style={[styles.panel, { borderRadius: scaled28, backgroundColor: colors.card, borderColor: colors.border }]}
          contentContainerStyle={{
            paddingHorizontal: scaled16,
            paddingVertical: scaled18,
            paddingBottom: scaled28,
          }}
          showsVerticalScrollIndicator={false}
        >
          {groups.length ? (
            groups.map((group) => (
              <View key={group.label} style={[styles.groupBlock, { marginBottom: scaled16 }]}>
                <Text
                  style={[
                    styles.groupLabel,
                    {
                      color: colors.subtext,
                      fontSize: scaled15,
                      marginBottom: scaled12,
                      paddingHorizontal: scaled4,
                    },
                  ]}
                >
                  {group.label}
                </Text>
                {group.items.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    relativeLabel={formatRelativeTime(ensureTimestamp(note.updatedAt), i18n.language)}
                    byLabel={t('notesBy')}
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
              <Text style={[styles.emptyText, { color: colors.subtext, fontSize: scaled15 }]}>
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
  },
  header: {
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    fontWeight: '700',
  },
  count: {
    fontWeight: '700',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    flexShrink: 0,
  },
  newButtonText: {
    fontWeight: '700',
  },
  searchBox: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
  },
  panel: {
    flex: 1,
    borderWidth: 1,
  },
  groupBlock: {
  },
  groupLabel: {
    fontWeight: '600',
  },
  emptyState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
  },
});
