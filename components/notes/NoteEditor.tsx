import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NoteToolbarAction } from './NoteToolbar';

type NoteEditorProps = {
  initialHtml: string;
  colors: {
    bg: string;
    card: string;
    border: string;
    text: string;
    subtext: string;
    accent: string;
  };
  pendingCommand: NoteToolbarAction | 'focus' | 'blur' | 'focus-end' | 'undo' | 'redo' | null;
  onCommandHandled: () => void;
  onContentChange: (payload: { html: string; text: string }) => void;
  onFocusChange?: (isFocused: boolean) => void;
};

const MIN_EDITOR_HEIGHT = 320;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildEditorDocument = ({
  initialHtml,
  colors,
}: {
  initialHtml: string;
  colors: NoteEditorProps['colors'];
}) => {
  const safeHtml = initialHtml.trim() ? initialHtml : '<p><br></p>';
  const fallbackHtml = `<p style="color:${colors.subtext};">Start writing...</p>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: ${colors.bg};
        color: ${colors.text};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #editor {
        min-height: ${MIN_EDITOR_HEIGHT}px;
        padding: 18px 16px;
        outline: none;
        font-size: 16px;
        line-height: 1.65;
        color: ${colors.text};
        word-break: break-word;
      }

      #editor:empty:before {
        content: "Start writing...";
        color: ${colors.subtext};
      }

      p, ul, ol, blockquote, pre {
        margin: 0 0 12px 0;
      }

      h1, h2, h3 {
        margin: 0 0 12px 0;
        font-weight: 700;
        color: ${colors.text};
      }

      h1 {
        font-size: 30px;
        line-height: 1.25;
      }

      h2 {
        font-size: 24px;
        line-height: 1.3;
      }

      h3 {
        font-size: 20px;
        line-height: 1.35;
      }

      ul, ol {
        padding-left: 24px;
      }

      li {
        margin-bottom: 6px;
      }

      blockquote {
        border-left: 3px solid ${colors.accent};
        padding-left: 12px;
      }

      code {
        background: ${colors.card};
        color: ${colors.accent};
        padding: 2px 6px;
        border-radius: 6px;
        font-family: Menlo, Consolas, monospace;
      }

      pre {
        background: ${colors.card};
        border-radius: 14px;
        padding: 12px;
        white-space: pre-wrap;
      }

      pre code {
        background: transparent;
        padding: 0;
        color: ${colors.text};
      }
    </style>
  </head>
  <body>
    <div id="editor" contenteditable="true" spellcheck="true">${safeHtml || fallbackHtml}</div>

    <script>
      const editor = document.getElementById('editor');

      function postMessage(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }

      function escapeInlineText(value) {
        return value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      function getEditorHeight() {
        return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, editor.scrollHeight, ${MIN_EDITOR_HEIGHT});
      }

      function getCurrentSelection() {
        const selection = window.getSelection();
        return selection && selection.rangeCount ? selection : null;
      }

      function getCurrentBlock(node) {
        let current = node;

        while (current && current !== editor) {
          if (
            current.nodeType === Node.ELEMENT_NODE &&
            /^(P|DIV|H1|H2|H3|LI|BLOCKQUOTE|PRE)$/i.test(current.tagName)
          ) {
            return current;
          }
          current = current.parentNode;
        }

        return editor.firstElementChild || editor;
      }

      function setCaretAtStart(element) {
        const selection = getCurrentSelection();
        if (!selection) return;

        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      function setCaretAtEnd(element) {
        const selection = getCurrentSelection();
        if (!selection) return;

        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      function normalizeEditor() {
        if (!editor.innerHTML.trim()) {
          editor.innerHTML = '<p><br></p>';
          setCaretAtStart(editor.firstElementChild);
        }
      }

      function extractPlainText() {
        return (editor.innerText || '')
          .replace(/\\u200B/g, '')
          .replace(/\\n{3,}/g, '\\n\\n')
          .trim();
      }

      function emitChange() {
        normalizeEditor();
        postMessage({
          type: 'change',
          html: editor.innerHTML,
          text: extractPlainText(),
          height: getEditorHeight(),
        });
      }

      function replaceCurrentBlock(tagName) {
        const selection = getCurrentSelection();
        const block = getCurrentBlock(selection ? selection.anchorNode : null);
        if (!block || block === editor || !block.parentNode) return;

        const next = document.createElement(tagName);
        next.innerHTML = '<br>';
        block.parentNode.replaceChild(next, block);
        setCaretAtStart(next);
      }

      function convertCurrentBlockToList(tagName) {
        const selection = getCurrentSelection();
        const block = getCurrentBlock(selection ? selection.anchorNode : null);
        if (!block || block === editor || !block.parentNode) return;

        const list = document.createElement(tagName);
        const item = document.createElement('li');
        item.innerHTML = '<br>';
        list.appendChild(item);
        block.parentNode.replaceChild(list, block);
        setCaretAtStart(item);
      }

      function replaceCurrentBlockInnerHtml(html) {
        const selection = getCurrentSelection();
        const block = getCurrentBlock(selection ? selection.anchorNode : null);
        if (!block || block === editor) return;

        block.innerHTML = html;
        setCaretAtEnd(block);
      }

      function insertChecklistItem() {
        document.execCommand('insertHTML', false, '<p>[ ] Task</p>');
      }

      function insertCodeSnippet() {
        document.execCommand('insertHTML', false, '<code>code</code>');
      }

      function handleToolbarCommand(command) {
        if (command === 'focus') {
          editor.focus();
          return;
        }

        if (command === 'focus-end') {
          editor.focus();
          setCaretAtEnd(editor.lastElementChild || editor);
          editor.scrollTop = editor.scrollHeight;
          window.scrollTo(0, document.body.scrollHeight);
          return;
        }

        if (command === 'blur') {
          editor.blur();
          if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
          }
          emitChange();
          return;
        }

        if (command === 'undo') {
          document.execCommand('undo', false);
          emitChange();
          return;
        }

        if (command === 'redo') {
          document.execCommand('redo', false);
          emitChange();
          return;
        }

        switch (command) {
          case 'h1':
            document.execCommand('formatBlock', false, 'H1');
            break;
          case 'h2':
            document.execCommand('formatBlock', false, 'H2');
            break;
          case 'h3':
            document.execCommand('formatBlock', false, 'H3');
            break;
          case 'bullet':
            document.execCommand('insertUnorderedList', false);
            break;
          case 'numbered':
            document.execCommand('insertOrderedList', false);
            break;
          case 'bold':
            document.execCommand('bold', false);
            break;
          case 'italic':
            document.execCommand('italic', false);
            break;
          case 'underline':
            document.execCommand('underline', false);
            break;
          case 'strike':
            document.execCommand('strikeThrough', false);
            break;
          case 'check':
            insertChecklistItem();
            break;
          case 'code':
            insertCodeSnippet();
            break;
          default:
            break;
        }

        emitChange();
      }

      function handleMarkdownShortcut(event) {
        if (event.key !== ' ' && event.key !== 'Enter') return;

        const selection = getCurrentSelection();
        const block = getCurrentBlock(selection ? selection.anchorNode : null);
        if (!block || block === editor) return;

        const blockText = (block.textContent || '').replace(/\\u00A0/g, ' ').trim();

        if (blockText === '#') {
          event.preventDefault();
          replaceCurrentBlock('h1');
          emitChange();
          return;
        }

        if (blockText === '##') {
          event.preventDefault();
          replaceCurrentBlock('h2');
          emitChange();
          return;
        }

        if (blockText === '###') {
          event.preventDefault();
          replaceCurrentBlock('h3');
          emitChange();
          return;
        }

        if (blockText === '-') {
          event.preventDefault();
          convertCurrentBlockToList('ul');
          emitChange();
          return;
        }

        if (blockText === '1.') {
          event.preventDefault();
          convertCurrentBlockToList('ol');
          emitChange();
          return;
        }

        const boldMatch = blockText.match(/^\\*\\*([^*][\\s\\S]*?)\\*\\*$/);
        if (boldMatch) {
          event.preventDefault();
          replaceCurrentBlockInnerHtml('<strong>' + escapeInlineText(boldMatch[1]) + '</strong>');
          emitChange();
          return;
        }

        const italicMatch = blockText.match(/^\\*([^*][\\s\\S]*?)\\*$/);
        if (italicMatch) {
          event.preventDefault();
          replaceCurrentBlockInnerHtml('<em>' + escapeInlineText(italicMatch[1]) + '</em>');
          emitChange();
        }
      }

      function onMessage(event) {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.type === 'command') {
            handleToolbarCommand(payload.command);
          }
        } catch (error) {
          postMessage({ type: 'error', message: String(error) });
        }
      }

      editor.addEventListener('keydown', handleMarkdownShortcut);
      editor.addEventListener('input', emitChange);
      editor.addEventListener('blur', emitChange);
      editor.addEventListener('focus', function() {
        postMessage({ type: 'focus' });
      });
      editor.addEventListener('blur', function() {
        postMessage({ type: 'blur' });
      });
      window.addEventListener('message', onMessage);
      document.addEventListener('message', onMessage);

      normalizeEditor();
      setTimeout(() => {
        setCaretAtEnd(editor.lastElementChild || editor);
        emitChange();
        postMessage({ type: 'ready', height: getEditorHeight() });
      }, 0);
    </script>
  </body>
</html>`;
};

export default function NoteEditor({
  initialHtml,
  colors,
  pendingCommand,
  onCommandHandled,
  onContentChange,
  onFocusChange,
}: NoteEditorProps) {
  const webViewRef = useRef<WebView>(null);
  const [editorHeight, setEditorHeight] = useState(MIN_EDITOR_HEIGHT);

  const documentHtml = useMemo(
    () =>
      buildEditorDocument({
        initialHtml: initialHtml.trim() ? initialHtml : `<p>${escapeHtml('')}</p>`,
        colors,
      }),
    [colors, initialHtml]
  );

  useEffect(() => {
    if (!pendingCommand) return;

    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'command',
        command: pendingCommand,
      })
    );
    onCommandHandled();
  }, [onCommandHandled, pendingCommand]);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          height: Math.max(editorHeight + 8, MIN_EDITOR_HEIGHT),
        },
      ]}
    >
      <WebView
        key={documentHtml}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: documentHtml }}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (payload?.type === 'change') {
              if (typeof payload.height === 'number' && Number.isFinite(payload.height)) {
                setEditorHeight(Math.max(payload.height, MIN_EDITOR_HEIGHT));
              }
              onContentChange({
                html: typeof payload.html === 'string' ? payload.html : '',
                text: typeof payload.text === 'string' ? payload.text : '',
              });
            }

            if (payload?.type === 'ready' && typeof payload.height === 'number' && Number.isFinite(payload.height)) {
              setEditorHeight(Math.max(payload.height, MIN_EDITOR_HEIGHT));
            }

            if (payload?.type === 'focus') {
              onFocusChange?.(true);
            }

            if (payload?.type === 'blur') {
              onFocusChange?.(false);
            }
          } catch (error) {
            console.error('Erreur parsing note editor message:', error);
          }
        }}
        scrollEnabled={false}
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
