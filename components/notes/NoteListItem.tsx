import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import type { NoteItem } from '../../store/useNoteStore';
import { useUIScale } from '../../hooks/useUIScale';
import { useHaptics } from '../../hooks/useHaptics';

type NoteListItemProps = {
  note: NoteItem;
  colors: {
    card: string;
    border: string;
    text: string;
    subtext: string;
  };
  relativeLabel: string;
  byLabel: string;
  onPress: () => void;
  onOpenMenu: () => void;
};

export default function NoteListItem({ note, colors, relativeLabel, byLabel, onPress, onOpenMenu }: NoteListItemProps) {
  const scaled12 = useUIScale(12);
  const scaled13 = useUIScale(13);
  const scaled14 = useUIScale(14);
  const scaled16 = useUIScale(16);
  const scaled18 = useUIScale(18);
  const scaled22 = useUIScale(22);
  const scaled28 = useUIScale(28);
  const scaled72 = useUIScale(72);
  const scaled8 = useUIScale(8);
  const { haptics } = useHaptics();
  const metaText = note.author ? `${relativeLabel}  ${byLabel} ${note.author}` : relativeLabel;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        haptics('light');
        onPress();
      }}
      style={[
        styles.row,
        {
          minHeight: scaled72,
          borderRadius: scaled22,
          paddingHorizontal: scaled16,
          paddingVertical: scaled14,
          marginBottom: scaled12,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.left, { paddingRight: scaled12 }]}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text, fontSize: scaled18, marginBottom: scaled8 }]}>
          {note.title}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.subtext, fontSize: scaled13 }]}>
          {metaText}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          haptics('light');
          onOpenMenu();
        }}
        hitSlop={10}
        style={[styles.menuButton, { width: scaled28, height: scaled28, marginLeft: scaled8 }]}
      >
        <MoreHorizontal size={scaled18} color={colors.subtext} />
      </Pressable>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
  },
  meta: {
  },
  menuButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
