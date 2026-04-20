import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { checkAuthStatus } from '../services/authService';

export default function Index() {
  useEffect(() => {
    checkAuthStatus().then((isValid) => {
      router.replace(isValid ? '/chat' : '/sign-in');
    });
  }, []);

  return <View style={{ flex: 1 }} />;
}
