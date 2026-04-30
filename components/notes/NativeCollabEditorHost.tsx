import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useUIScale } from '../../hooks/useUIScale';
import type { NoteToolbarAction } from './NoteToolbar';
import { NATIVE_COLLAB_RUNTIME } from './generated/nativeCollabRuntime.generated';

type NativeCollabCommand = NoteToolbarAction | 'focus' | 'focus-end' | 'blur' | 'undo' | 'redo';

type NativeCollabEditorHostProps = {
  noteId: string;
  initialHtml: string;
  token?: string | null;
  userId?: string;
  userName?: string;
  colors: {
    bg: string;
    card: string;
    border: string;
    text: string;
    subtext: string;
    accent: string;
  };
  onReady?: () => void;
  onContentChange?: (payload: { html: string; text: string }) => void;
  pendingCommand?: NativeCollabCommand | null;
  onCommandHandled?: () => void;
  onFocusChange?: (isFocused: boolean) => void;
  onFatalError?: (message: string) => void;
};

const MIN_EDITOR_HEIGHT = 480;

function getWebBaseUrl(apiBaseUrl?: string | null) {
  if (!apiBaseUrl?.trim()) return null;

  return apiBaseUrl
    .trim()
    .replace(/\/api\/v\d+\/?$/i, '')
    .replace(/\/$/, '');
}

function buildStandaloneDocument({
  noteId,
  initialHtml,
  token,
  userId,
  userName,
  colors,
  editorFontSize,
}: Pick<
  NativeCollabEditorHostProps,
  'noteId' | 'initialHtml' | 'token' | 'userId' | 'userName' | 'colors'
> & {
  editorFontSize: number;
}) {
  const webBaseUrl = getWebBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  const runtimeConfig = JSON.stringify({
    noteId,
    initialHtml: initialHtml.trim() ? initialHtml : '<p><br></p>',
    token: token ?? '',
    userId: userId ?? '',
    userName: userName ?? '',
    webBaseUrl: webBaseUrl ?? '',
    socketPath: '/ws/socket.io',
  });

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      :root {
        color-scheme: light only;
      }

      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background: transparent;
        color: ${colors.text};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #frame {
        min-height: 100%;
        background: transparent;
      }

      #status {
        display: none;
      }

      #editor {
        min-height: ${MIN_EDITOR_HEIGHT}px;
        padding: 0 0 28px;
        background: transparent;
      }

      .bundled-lab-editor {
        min-height: ${MIN_EDITOR_HEIGHT - 36}px;
        outline: none;
        font-size: var(--note-editor-font-size, ${editorFontSize}px);
        line-height: 1.7;
        color: ${colors.text};
        word-break: break-word;
      }

      .bundled-lab-editor p,
      .bundled-lab-editor ul,
      .bundled-lab-editor ol,
      .bundled-lab-editor blockquote,
      .bundled-lab-editor pre {
        margin: 0 0 12px 0;
      }

      .bundled-lab-editor h1,
      .bundled-lab-editor h2,
      .bundled-lab-editor h3 {
        margin: 0 0 12px 0;
        font-weight: 700;
        color: ${colors.text};
      }

      .bundled-lab-editor ul,
      .bundled-lab-editor ol {
        padding-left: 24px;
      }

      .bundled-lab-editor blockquote {
        border-left: 3px solid ${colors.accent};
        padding-left: 12px;
      }

      .bundled-lab-editor code {
        background: rgba(0, 0, 0, 0.06);
        padding: 2px 6px;
        border-radius: 6px;
        font-family: Menlo, Consolas, monospace;
      }

      .bundled-lab-editor pre {
        background: rgba(0, 0, 0, 0.04);
        border-radius: 14px;
        padding: 12px;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <div id="frame">
      <div id="status">Booting bundled runtime...</div>
      <div id="editor"></div>
    </div>

    <script>
      window.__RN_NOTE_LAB_CONFIG = ${runtimeConfig};
    </script>
    <script>
      ${NATIVE_COLLAB_RUNTIME}
    </script>
  </body>
</html>`;
}

export default function NativeCollabEditorHost({
  noteId,
  initialHtml,
  token,
  userId,
  userName,
  colors,
  onReady,
  onContentChange,
  pendingCommand,
  onCommandHandled,
  onFocusChange,
  onFatalError,
}: NativeCollabEditorHostProps) {
  const wrapRadius = useUIScale(12);
  const editorFontSize = useUIScale(16);
  const webviewRef = useRef<WebView>(null);
  const bootConfig = useMemo(
    () => ({
      noteId,
      initialHtml,
      token,
      userId,
      userName,
      colors,
      editorFontSize,
    }),
    [noteId, token, userId, userName]
  );

  const documentHtml = useMemo(
    () =>
      buildStandaloneDocument({
        noteId: bootConfig.noteId,
        initialHtml: bootConfig.initialHtml,
        token: bootConfig.token,
        userId: bootConfig.userId,
        userName: bootConfig.userName,
        colors: bootConfig.colors,
        editorFontSize: bootConfig.editorFontSize,
    }),
    [bootConfig]
  );

  useEffect(() => {
    if (!pendingCommand) return;

    webviewRef.current?.postMessage(
      JSON.stringify({
        type: 'command',
        command: pendingCommand,
      })
    );
    onCommandHandled?.();
  }, [onCommandHandled, pendingCommand]);

  useEffect(() => {
    webviewRef.current?.injectJavaScript(`
      document.documentElement.style.setProperty('--note-editor-font-size', '${editorFontSize}px');
      true;
    `);
  }, [editorFontSize]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg, borderRadius: wrapRadius }]}>
      <WebView
        ref={webviewRef}
        key={`${noteId}:${token ?? 'no-token'}`}
        originWhitelist={['*']}
        source={{ html: documentHtml }}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);

            if (payload?.type === 'ready') {
              onReady?.();
              return;
            }

            if (payload?.type === 'change') {
              onContentChange?.({
                html: typeof payload.html === 'string' ? payload.html : '',
                text: typeof payload.text === 'string' ? payload.text : '',
              });
              return;
            }

            if (payload?.type === 'focus') {
              onFocusChange?.(Boolean(payload.focused));
              return;
            }

            if (payload?.type === 'error') {
              onFatalError?.(typeof payload.message === 'string' ? payload.message : 'Bundled lab runtime failed.');
            }
          } catch (error) {
            onFatalError?.(error instanceof Error ? error.message : 'Failed to parse bundled runtime message.');
          }
        }}
        onError={(event) => {
          const description = event.nativeEvent?.description || 'Unknown webview error';
          onFatalError?.(`Bundled lab failed to load: ${description}`);
        }}
        javaScriptEnabled
        domStorageEnabled
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={true}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
