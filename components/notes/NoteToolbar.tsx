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

const toolbarActions: Array<{ key: NoteToolbarAction; render: (color: string) => React.ReactNode }> = [
  { key: 'h1', render: (color) => <Heading1 size={18} color={color} /> },
  { key: 'h2', render: (color) => <Heading2 size={18} color={color} /> },
  { key: 'h3', render: (color) => <Heading3 size={18} color={color} /> },
  { key: 'bullet', render: (color) => <List size={18} color={color} /> },
  { key: 'numbered', render: (color) => <ListOrdered size={18} color={color} /> },
  { key: 'check', render: (color) => <ListChecks size={18} color={color} /> },
  { key: 'bold', render: (color) => <Bold size={18} color={color} /> },
  { key: 'italic', render: (color) => <Italic size={18} color={color} /> },
  { key: 'underline', render: (color) => <Underline size={18} color={color} /> },
  { key: 'strike', render: (color) => <Strikethrough size={18} color={color} /> },
  { key: 'code', render: (color) => <Code2 size={18} color={color} /> },
];

export default function NoteToolbar({ colors, onAction, actions }: NoteToolbarProps) {
  const visibleActions = actions?.length
    ? toolbarActions.filter((action) => actions.includes(action.key))
    : toolbarActions;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {visibleActions.map((action) => (
          <TouchableOpacity
            key={action.key}
            activeOpacity={0.75}
            style={styles.action}
            onPress={() => onAction(action.key)}
          >
            {action.render(colors.text)}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 4,
  },
  action: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
