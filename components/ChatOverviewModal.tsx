import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Minus, Plus, X } from 'lucide-react-native';
import { chatService } from '../services/chatService';
import type { ChatData } from '../types/api';
import type { TranslationKey } from '../i18n';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { buildChatOverview, type OverviewNode } from '../utils/chatOverview';

interface ChatOverviewModalProps {
  visible: boolean;
  chatId: string | null;
  onClose: () => void;
  t: (key: TranslationKey) => string;
}

const MIN_SCALE = 0.7;
const MAX_SCALE = 1.8;
const SCALE_STEP = 0.15;

function clampScale(value: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

function buildOrthogonalPath(
  from: OverviewNode,
  to: OverviewNode,
  scale: number,
  isFollowUp: boolean,
) {
  const startX = (from.x + from.width / 2) * scale;
  const startY = (from.y + from.height) * scale;
  const endX = (to.x + to.width / 2) * scale;
  const endY = to.y * scale;
  const bendY = isFollowUp
    ? startY + Math.max((endY - startY) * 0.55, 14)
    : startY + Math.max((endY - startY) * 0.45, 14);

  return `M ${startX} ${startY} L ${startX} ${bendY} L ${endX} ${bendY} L ${endX} ${endY}`;
}

export default function ChatOverviewModal({
  visible,
  chatId,
  onClose,
  t,
}: ChatOverviewModalProps) {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const { colors, resolved } = useResolvedTheme(themeMode);
  const isDark = resolved === 'dark';
  const overviewCopy = useMemo(() => {
    return {
      title: t('chatOverview'),
      openFirst: t('overviewOpenChatFirst'),
      empty: t('chatOverviewEmpty'),
      hint: t('overviewTapHint'),
      you: t('overviewYou'),
      assistant: t('overviewAssistant'),
      latest: t('overviewLatest'),
      mediaOnly: t('overviewMediaOnly'),
    };
  }, [t]);

  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState<OverviewNode | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedNode(null);
      setScale(1);
      setLoading(false);
      return;
    }

    if (!chatId) {
      setChatData(null);
      setError(overviewCopy.openFirst);
      setLoading(false);
      return;
    }

    let active = true;
    setChatData(null);
    setLoading(true);
    setError(null);

    chatService
      .getChatDetails(chatId)
      .then((data) => {
        if (!active) return;
        setChatData(data);
      })
      .catch((loadError) => {
        console.error('Error loading chat overview:', loadError);
        if (!active) return;
        setChatData(null);
        setError(t('errorTitle'));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [chatId, overviewCopy.openFirst, t, visible]);

  const graph = useMemo(() => buildChatOverview(chatData), [chatData]);
  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );

  const canvasWidth = Math.max(graph.width * scale, 360);
  const canvasHeight = Math.max(graph.height * scale, 240);
  const headerTitle = chatData?.title?.trim() || overviewCopy.title;

  const latestRing = isDark ? '#FFFFFF' : '#111111';
  const userCardBg = isDark ? '#17335A' : '#EFF5FF';
  const assistantCardBg = colors.card;
  const assistantBorder = isDark ? '#5B616B' : '#C9D0DA';
  const linkColor = isDark ? '#8B949E' : '#9AA3AF';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            paddingTop: 52,
            paddingHorizontal: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.card,
              }}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ color: colors.text, fontSize: 19, fontWeight: '700' }}
              >
                {headerTitle}
              </Text>
              <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>
                {overviewCopy.hint}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setScale((value) => clampScale(value - SCALE_STEP))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Minus size={18} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setScale(1)}
              style={{
                minWidth: 58,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>{Math.round(scale * 100)}%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setScale((value) => clampScale(value + SCALE_STEP))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Plus size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.text} />
            <Text style={{ color: colors.subtext }}>{t('loadingModels')}</Text>
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        ) : graph.nodes.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              {overviewCopy.empty}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal bounces={false}>
            <ScrollView
              bounces={false}
              contentContainerStyle={{ padding: 16, alignItems: 'flex-start' }}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  backgroundColor: isDark ? '#0F1115' : '#FAFBFD',
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                }}
              >
                <Svg
                  width={canvasWidth}
                  height={canvasHeight}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  {graph.edges.map((edge, index) => {
                    const from = nodeMap.get(edge.from);
                    const to = nodeMap.get(edge.to);

                    if (!from || !to) return null;

                    return (
                      <Path
                        key={`${edge.id || 'edge'}-${index}`}
                        d={buildOrthogonalPath(from, to, scale, edge.kind === 'followUp')}
                        stroke={linkColor}
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        fill="none"
                      />
                    );
                  })}
                </Svg>

                {graph.nodes.map((node, index) => {
                  const isUser = node.role === 'user';
                  const cardBg = isUser ? userCardBg : assistantCardBg;
                  const borderColor = node.isLatest ? latestRing : isUser ? 'transparent' : assistantBorder;

                  return (
                    <Pressable
                      key={`${node.id || 'node'}-${index}`}
                      onPress={() => setSelectedNode(node)}
                      style={{
                        position: 'absolute',
                        left: node.x * scale,
                        top: node.y * scale,
                        width: node.width * scale,
                        minHeight: node.height * scale,
                        backgroundColor: cardBg,
                        borderRadius: 16 * scale,
                        borderWidth: node.isLatest ? 2 : 1,
                        borderColor,
                        paddingHorizontal: 12 * scale,
                        paddingVertical: 10 * scale,
                        shadowColor: '#000000',
                        shadowOpacity: isDark ? 0.24 : 0.08,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: 2,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: colors.text,
                            fontSize: 11 * scale,
                            fontWeight: '700',
                            flex: 1,
                            marginRight: 8,
                          }}
                        >
                          {isUser ? overviewCopy.you : node.title}
                        </Text>
                        {node.isLatest && (
                          <Text style={{ color: colors.subtext, fontSize: 10 * scale, fontWeight: '700' }}>
                            {overviewCopy.latest}
                          </Text>
                        )}
                      </View>

                      <Text
                        numberOfLines={3}
                        style={{
                          color: colors.subtext,
                          fontSize: 10.5 * scale,
                          lineHeight: 14 * scale,
                          marginTop: 6 * scale,
                        }}
                      >
                        {node.preview || overviewCopy.mediaOnly}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </ScrollView>
        )}

        {selectedNode && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.38)',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 18,
            }}
          >
            <Pressable
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              onPress={() => setSelectedNode(null)}
            />

            <View
              style={{
                width: '100%',
                maxWidth: 560,
                maxHeight: '72%',
                borderRadius: 24,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                    {selectedNode.role === 'user' ? overviewCopy.you : selectedNode.title}
                  </Text>
                  <Text style={{ color: colors.subtext, marginTop: 4 }}>
                    {selectedNode.role === 'user' ? overviewCopy.title : overviewCopy.assistant}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedNode(null)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? '#1C2128' : '#F1F3F6',
                  }}
                >
                  <X size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    lineHeight: 23,
                  }}
                >
                  {selectedNode.fullText || overviewCopy.mediaOnly}
                </Text>
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
