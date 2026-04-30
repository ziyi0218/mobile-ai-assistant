/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { Copy, Download, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import type { DownloadBlock } from '../utils/exportDetector';
import { exportFile } from '../utils/fileExport';
import { useUIScale } from '../hooks/useUIScale';

//                                                              
// Types
//                                                              
interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  images?: string[];
  bubbleWidth?: number;
  downloadBlocks?: DownloadBlock[] | null;
}

//                                                              
// Parse content into text blocks and math blocks
// Supports: $$...$$, $...$, \[...\], \(...\)
//                                                              
interface ContentBlock {
  type: 'text' | 'math-block' | 'math-inline';
  value: string;
}

function parseContent(raw: string): ContentBlock[] {
  const scaleFactor = useUIScale(1);
  const blocks: ContentBlock[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\$)(?:\\.|[^$\\])+\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', value: raw.slice(lastIndex, match.index) });
    }

    const token = match[1] ?? match[0];
    let mathContent: string;
    let blockType: ContentBlock['type'];

    if (token.startsWith('$$') && token.endsWith('$$')) {
      mathContent = token.slice(2, -2).trim();
      blockType = 'math-block';
    } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
      mathContent = token.slice(2, -2).trim();
      blockType = 'math-block';
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      mathContent = token.slice(2, -2).trim();
      blockType = 'math-inline';
    } else {
      mathContent = token.slice(1, -1).trim();
      blockType = 'math-inline';
    }

    blocks.push({ type: blockType, value: mathContent });
    lastIndex = match.index + token.length;
  }

  if (lastIndex < raw.length) {
    blocks.push({ type: 'text', value: raw.slice(lastIndex) });
  }

  return blocks;
}

//                                                              
// Lightweight KaTeX WebView renderer (only for math blocks)
// No lodash, no native modules — just a tiny WebView with KaTeX CDN
//                                                              
function buildKatexHtml(latex: string, displayMode: boolean, textColor: string): string {
  const safeLatex = JSON.stringify(latex); // handles all escaping safely (XSS-safe)
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { color: ${textColor}; background: transparent; display: flex; justify-content: ${displayMode ? 'center' : 'flex-start'}; align-items: center; min-height: 1px; padding: ${displayMode ? '8px 4px' : '2px 0'}; overflow-x: auto; }
  .katex { font-size: ${displayMode ? '22px' : '18px'}; color: ${textColor}; }
  .katex-display { overflow-x: auto; overflow-y: hidden; padding: 4px 0; }
  .error { color: #D63384; font-family: monospace; font-size: 14px; }
</style>
</head><body>
<div id="math"></div>
<script>
try {
  katex.render(${safeLatex}, document.getElementById('math'), { displayMode: ${displayMode}, throwOnError: false, strict: false });
} catch(e) {
  document.getElementById('math').innerHTML = '<span class="error">' + ${safeLatex} + '</span>';
}
setTimeout(function() {
  window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight));
}, 50);
</script>
</body></html>`;
}

const KaTeXBlock = React.memo(({ math, block, textColor }: { math: string; block: boolean; textColor: string }) => {
  const [height, setHeight] = useState(block ? 50 : 24);
  const scaleFactor = useUIScale(1);
  const html = useMemo(() => buildKatexHtml(math, block, textColor), [math, block, textColor]);

  const onMessage = useCallback((e: any) => {
    const h = Number(e.nativeEvent.data);
    if (h > 0) setHeight(h);
  }, []);

  return (
    <View style={[block ? s.mathBlockWrap : s.mathInlineWrap, { height }]}>
      <WebView
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={true}
        originWhitelist={['*']}
        onMessage={onMessage}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
});

//
function createMdStyles(colors: any, isDark: boolean) {
    const scaleFactor = useUIScale(1);
    return StyleSheet.create({
  body: { color: colors.text, fontSize: 15*scaleFactor, lineHeight: 22 },
  heading1: { fontSize: 22*scaleFactor, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8, lineHeight: 28 },
  heading2: { fontSize: 19*scaleFactor, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 6, lineHeight: 26 },
  heading3: { fontSize: 17*scaleFactor, fontWeight: '600', color: colors.text, marginTop: 10, marginBottom: 4, lineHeight: 24 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: '700', color: colors.text },
  em: { fontStyle: 'italic', color: colors.text },
  code_block: {
    backgroundColor: isDark ? '#1A1A24' : '#1E1E2E', color: '#CDD6F4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13*scaleFactor, lineHeight: 20*scaleFactor, padding: 14, borderRadius: 10, marginVertical: 8,
  },
  fence: {
    backgroundColor: isDark ? '#1A1A24' : '#1E1E2E', color: '#CDD6F4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13*scaleFactor, lineHeight: 20*scaleFactor, padding: 14, borderRadius: 10, marginVertical: 8,
  },
  code_inline: {
    backgroundColor: isDark ? '#2B2B36' : '#F0F0F5', color: isDark ? '#FF79C6' : '#D63384',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13*scaleFactor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  blockquote: {
    backgroundColor: isDark ? '#15151C' : '#F8F9FA', borderLeftWidth: 4, borderLeftColor: '#007AFF',
    paddingHorizontal: 12, paddingVertical: 8, marginVertical: 8, borderRadius: 4,
  },
  bullet_list: { marginVertical: 4, color: colors.text },
  ordered_list: { marginVertical: 4, color: colors.text },
  list_item: { marginVertical: 2, flexDirection: 'row', color: colors.text },
  link: { color: '#007AFF', textDecorationLine: 'underline' },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, marginVertical: 8 },
  thead: { backgroundColor: isDark ? '#262633' : '#F5F5F7' },
  th: { padding: 8, fontWeight: '600', borderBottomWidth: 1, borderColor: colors.border, color: colors.text },
  td: { padding: 8, borderBottomWidth: 1, borderColor: colors.border, color: colors.text },
  tr: { borderBottomWidth: 1, borderColor: colors.border },
  hr: { backgroundColor: colors.border, height: 1, marginVertical: 12 },
  image: { borderRadius: 8, marginVertical: 6 },
});
}

//
// Code block with copy/download buttons
//
const MONO_FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const MAX_CODE_HEIGHT = 300;

function CodeBlockWithActions({ content, language, downloadBlock, isDark, colors }: {
  content: string;
  language: string;
  downloadBlock: DownloadBlock | null;
  isDark: boolean;
  colors: Record<string, string>;
}) {
  const [copied, setCopied] = useState(false);
  const scaleFactor = useUIScale(1);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = content.split('\n').length;
  const naturalHeight = lineCount * 20 + 24;
  const needsScroll = naturalHeight > MAX_CODE_HEIGHT;
  const hasDownload = downloadBlock !== null;
  const label = downloadBlock?.filename || language || 'code';

  return (
    <View style={[cb().wrapper, { borderColor: colors.border }]}>
      {/* Header bar */}
      <View style={[cb().header, { backgroundColor: isDark ? '#0D0D14' : '#E8E8ED' }]}>
        <Text style={[cb().lang, { color: colors.subtext }]} numberOfLines={1}>{label}</Text>
        <View style={cb().actions}>
          <TouchableOpacity onPress={handleCopy} style={cb().btn} activeOpacity={0.6}>
            {copied
              ? <Check color="#34C759" size={16} />
              : <Copy color={colors.subtext} size={16} />
            }
          </TouchableOpacity>
          {hasDownload && (
            <TouchableOpacity
              onPress={() => exportFile(content, downloadBlock!.filename)}
              style={cb().btn}
              activeOpacity={0.6}
            >
              <Download color="#007AFF" size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Code content — ScrollView for long blocks, plain View for short */}
      {needsScroll ? (
        <ScrollView
          style={[cb().codeScroll, { backgroundColor: isDark ? '#1A1A24' : '#1E1E2E' }]}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <Text style={cb().code} selectable>{content}</Text>
        </ScrollView>
      ) : (
        <View style={[cb().codeWrap, { backgroundColor: isDark ? '#1A1A24' : '#1E1E2E' }]}>
          <Text style={cb().code} selectable>{content}</Text>
        </View>
      )}
    </View>
  );
}

function cb() {
  const scaleFactor = useUIScale(1);
  return StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lang: {
    fontSize: 12*scaleFactor,
    fontFamily: MONO_FONT,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btn: {
    padding: 4,
  },
  codeScroll: {
    maxHeight: 300,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  codeWrap: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  code: {
    color: '#CDD6F4',
    fontFamily: MONO_FONT,
    fontSize: 13*scaleFactor,
    lineHeight: 20,
  },
});
}

//
// Main Component
//
function ImageGrid({ urls, single }: { urls: string[]; single?: boolean }) {
  const scaleFactor = useUIScale(1);
  if (single || urls.length === 1) {
    return (
      <Image source={{ uri: urls[0] }} style={s().singleImage} resizeMode="cover" />
    );
  }
  return (
    <View style={s().imageGrid}>
      {urls.map((url, i) => (
        <Image key={i} source={{ uri: url }} style={s().multiImage} resizeMode="cover" />
      ))}
    </View>
  );
}

function MessageBubble({ content, isUser, images, downloadBlocks }: MessageBubbleProps) {
  const scaleFactor = useUIScale(1);
  const themeMode = useSettingsStore(state => state.themeMode);
  const { colors, resolved } = useResolvedTheme(themeMode);
  const isDark = resolved === 'dark';
  const mdStyles = createMdStyles(colors, isDark);

  // Track which download block index we're rendering
  const blockIndexRef = React.useRef(0);

  // All code blocks get syntax highlighting + copy/download buttons
  const mdRules = useMemo(() => {
    if (isUser) return undefined;
    return {
      fence: (node: any) => {
        const codeContent = node.content || '';
        const language = node.sourceInfo || '';
        const matchingBlock = downloadBlocks?.find((b) =>
          codeContent.trim() === b.content.trim()
        ) || null;
        return (
          <CodeBlockWithActions
            key={node.key}
            content={codeContent}
            language={language}
            downloadBlock={matchingBlock}
            isDark={isDark}
            colors={colors}
          />
        );
      },
    };
  }, [isUser, downloadBlocks, isDark, colors]);

  // Hooks must be called unconditionally before any early return
  const blocks = parseContent(content || '');
  const hasMath = blocks.some(b => b.type !== 'text');
  const hasImages = images && images.length > 0;

  // User messages: images + text
  if (isUser) {
    return (
      <View>
        {hasImages && <ImageGrid urls={images} />}
        {content ? <Text style={s().userText}>{content}</Text> : null}
      </View>
    );
  }

  if (!hasMath) {
    return (
      <View style={s().aiContainer}>
        <Markdown style={mdStyles} rules={mdRules}>{content || ''}</Markdown>
      </View>
    );
  }

  return (
    <View style={s().aiContainer}>
      {blocks.map((block, i) => {
        if (block.type === 'text') {
          const trimmed = block.value.trim();
          if (!trimmed) return null;
          return <Markdown key={`md-${i}`} style={mdStyles} rules={mdRules}>{block.value}</Markdown>;
        }
        return (
          <KaTeXBlock
            key={`math-${i}`}
            math={block.value}
            block={block.type === 'math-block'}
            textColor={colors.text}
          />
        );
      })}
    </View>
  );
}


export default React.memo(MessageBubble);
function s() {
    const scaleFactor = useUIScale(1);
    return StyleSheet.create({
  userText: { color: '#FFF', fontSize: 16, lineHeight: 22 },
  aiContainer: {
    width: '100%',
    flexShrink: 1,
    alignSelf: 'stretch',
  },
  singleImage: { width: 220, height: 280, borderRadius: 14, marginBottom: 8 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  multiImage: { width: 120, height: 120, borderRadius: 10 },
  mathBlockWrap: { width: '100%', minHeight: 30, marginVertical: 6, borderRadius: 8 },
  mathInlineWrap: { minHeight: 20, marginVertical: 2 },
});
}
