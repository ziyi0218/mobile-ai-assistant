import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import useInterfaceSettingsStore from '../store/interfaceSettingsStore'; // Assuming you store scale here

type size = 'default' | 'small' | 'large' | number
export const useUIScale = (calledSize:size = 'default') => {
  const uiScale = useInterfaceSettingsStore(state => state.optionsList?.['1'].value);

  let baseSize = 16
  switch (calledSize) {
      case 'default':{
          baseSize = 16;
          break;
          }
      case 'small':{
          baseSize = 14;
          break;
          }
      case 'large':{
          baseSize = 22;
          break;
          }
      default :{
          baseSize = calledSize;
          break;
          }
      }

  return useMemo(() => {
    return uiScale? baseSize * (uiScale/100) : baseSize; //Otherwise an 'undefined' can propagate. //UI Scale is stored as a percentage value
  }, [uiScale, baseSize]);
};