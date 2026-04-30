import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Strikethrough,
  Underline,
} from 'lucide-react-native';
import { useUIScale } from '../../hooks/useUIScale';

export type NoteToolbarAction =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'check'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code';

type NoteToolbarProps = {
  colors: {
    card: string;
    border: string;
    text: string;
  };
  onAction: (action: NoteToolbarAction) => void;
  actions?: NoteToolbarAction[];
};

const toolbarActions: Array<{ key: NoteToolbarAction; render: (color: string, size: number) => React.ReactNode }> = [
  { key: 'h1', render: (color, size) => <Heading1 size={size} color={color} /> },
  { key: 'h2', render: (color, size) => <Heading2 size={size} color={color} /> },
  { key: 'h3', render: (color, size) => <Heading3 size={size} color={color} /> },
  { key: 'bullet', render: (color, size) => <List size={size} color={color} /> },
  { key: 'numbered', render: (color, size) => <ListOrdered size={size} color={color} /> },
  { key: 'check', render: (color, size) => <ListChecks size={size} color={color} /> },
  { key: 'bold', render: (color, size) => <Bold size={size} color={color} /> },
  { key: 'italic', render: (color, size) => <Italic size={size} color={color} /> },
  { key: 'underline', render: (color, size) => <Underline size={size} color={color} /> },
  { key: 'strike', render: (color, size) => <Strikethrough size={size} color={color} /> },
  { key: 'code', render: (color, size) => <Code2 size={size} color={color} /> },
];

export default function NoteToolbar({ colors, onAction, actions }: NoteToolbarProps) {
  const iconSize = useUIScale(18);
  const actionSize = useUIScale(34);
  const actionRadius = useUIScale(10);
  const wrapRadius = useUIScale(18);
  const verticalPadding = useUIScale(8);
  const horizontalPadding = useUIScale(6);
  const contentPadding = useUIScale(2);
  const contentGap = useUIScale(4);
  const visibleActions = actions?.length
    ? toolbarActions.filter((action) => actions.includes(action.key))
    : toolbarActions;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: wrapRadius,
          paddingVertical: verticalPadding,
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingHorizontal: contentPadding, gap: contentGap }]}
      >
        {visibleActions.map((action) => (
          <TouchableOpacity
            key={action.key}
            activeOpacity={0.75}
            style={[styles.action, { width: actionSize, height: actionSize, borderRadius: actionRadius }]}
            onPress={() => onAction(action.key)}
          >
            {action.render(colors.text, iconSize)}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
  },
  content: {
    alignItems: 'center',
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
