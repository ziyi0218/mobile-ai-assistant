import useInterfaceSettingsStore from '../store/interfaceSettingsStore';
import { useEffect, useState, useCallback } from 'react';
import * as Speech from 'expo-speech';

export const useReadAloud = () => {
    const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

    const toggleSpeech = useCallback(async (msgId: string, text: string) => {
     try {
       if (speakingMsgId === msgId) { await Speech.stop(); setSpeakingMsgId(null); return speakingMsgId; }
         await Speech.stop();
         setSpeakingMsgId(msgId);
         Speech.speak(text, {
           onDone: () => setSpeakingMsgId(null),
           onStopped: () => setSpeakingMsgId(null),
           onError: () => setSpeakingMsgId(null),
           volume: 1.0,
         });
     } catch (e) { setSpeakingMsgId(null); }
   }, [speakingMsgId]);

   return {speakingMsgId, toggleSpeech };
 };