import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import type { NoteItem } from '../../store/useNoteStore';

type NoteListItemProps = {
  note: NoteItem;
  colors: {
    card: string;
    border: string;
    text: string;
    subtext: string;
  };
  relativeLabel: string;
  onPress: () => void;
  onOpenMenu: () => void;
};

export default function NoteListItem({ note, colors, relativeLabel, onPress, onOpenMenu }: NoteListItemProps) {
  const metaText = note.author ? `${relativeLabel}  By ${note.author}` : relativeLabel;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.left}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {note.title}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.subtext }]}>
          {metaText}
        </Text>
      </View>

      <Pressable onPress={onOpenMenu} hitSlop={10} style={styles.menuButton}>
        <MoreHorizontal size={18} color={colors.subtext} />
      </Pressable>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  left: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
  },
  menuButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
