import {create} from 'zustand';
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingOption {
  textKey: string;
  type: 'separator' | 'NumberInput' | 'switch' | 'action-sheet' | 'PLACEHOLDER';
  value: any;
  validValues?: string[];
}


interface InterfaceSettingsState {
  optionsList: Record<string, SettingOption>;
  setOptionValue: (id: string, newValue: any) => void;
}

const initialOptionsList: Record<string, SettingOption> = {
  '0': { textKey: 'iface_sep_ui', type: 'separator', value: null },
  '1': { textKey: 'iface_ui_scale', type: 'NumberInput', value: 100 },
  '3': { textKey: 'iface_allow_location', type: 'switch', value: false },
  '4': { textKey: 'iface_haptic', type: 'switch', value: true },
  '6': { textKey: 'iface_sep_chat', type: 'separator', value: null },
  '12': { textKey: 'iface_title_gen', type: 'switch', value: true },
  '15': { textKey: 'iface_autocopy_response', type: 'switch', value: false },
  '25': { textKey: 'iface_web_search_always', type: 'switch', value: false },
  '26': { textKey: 'iface_sep_input', type: 'separator', value: null },
  '27': { textKey: 'iface_enter_is_send', type: 'switch', value: false },
  '35': { textKey: 'iface_sep_voice', type: 'separator', value: null },
  '40': { textKey: 'iface_auto_tts', type: 'switch', value: false }
};

const useInterfaceSettingsStore = create<InterfaceSettingsState>()(
    persist(
        (set) => ({
             optionsList: initialOptionsList,
             setOptionsList: (id, newValue) => {
                set((state) => ({
                    optionsList: {
                        ...state.optionsList,
                        [id]: {
                            ...state.optionsList[id],
                            value: newValue,
                        },
                    },
                })
                )
             }}),
             {
                name: "interface-settings-store",
                version: 1,
                storage: createJSONStorage(() => AsyncStorage),
                migrate: (persistedState, version) => {
                    if (version > persistedState.version) {
                        return initialOptionsList; //This is inelegant.
                    }
                  },
            }
    )
);

export default useInterfaceSettingsStore;