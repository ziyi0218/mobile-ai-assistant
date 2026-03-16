import { SafeAreaView, View, Text, Pressable, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useI18n } from "../i18n/useI18n";
import { useUIScale } from '../utils/useUIScale'
import { useHaptics } from '../utils/useHaptics'


const optionsList = [
  { id: '0', text: 'General', icon: 'settings-outline', color: '#000', route: '/general' },
  { id: '1', text: 'Interface', icon: 'apps-outline', color: '#000', route: '/interfaceScreen' },
  { id: '2', text: 'Personalization', icon: 'person-circle-outline', color: '#000', route: '/' },
  { id: '3', text: 'Data Controls', icon: 'database-cog-outline', lib: 'MaterialCommunityIcons', color: '#000', route: '/data_controls' },
  { id: '4', text: 'About', icon: 'information-circle-outline', color: '#000', route: '/' },
  { id: '5', text: 'Log out', icon: 'log-out-outline', color: '#FF0000', route: '/' }
];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { themeMode } = useSettingsStore()
  const { colors } = useResolvedTheme(themeMode);
  const scaledFontSize = useUIScale(24);
  const scaled48 = useUIScale(48);
  const scaleFactor = useUIScale(1);
  const { haptics } = useHaptics();

  return (
    <SafeAreaView className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.bg }}>
      <View className="flex-1" style={{backgroundColor: colors.bg}}>
        {/* Back button */}
        <View className="flex-row items-center px-2.5">
          <Pressable onPress={() => {haptics('light'); router.back()}}>
            <Ionicons name="chevron-back" size={scaled48} color={colors.text} />
          </Pressable>
        </View>

        {/* List of options */}
        <View className="flex-row">
          <FlatList
            className="px-5 pt-5"
            data={optionsList}
            keyExtractor={item => item.id}
            /* Archived Chats and visual separator */
            ListHeaderComponent={
              <View>
                <Pressable
                  className="flex-row items-center py-5 mb-1"
                  onPress={() => {haptics('light'); router.push({ pathname: '/' })}}
                >
                  <Ionicons name="archive-outline" size={scaled48} color={colors.text} className="mr-5 text-center" style={{width: scaled48, height: scaled48}}/>
                  <Text minimumFontScale={0.8} ellipsizeMode="tail" className="font-bold text-center" style={{color: colors.text, fontSize: scaledFontSize, marginRight:10}}>Archived Chats</Text>
                </Pressable>

                <View className="items-center mt-2.5 mb-2.5">
                  <Text minimumFontScale={0.8} ellipsizeMode="tail" className="font-bold text-center" style={{color: colors.text, fontSize: scaledFontSize, marginRight:10}}>— Settings —</Text>
                </View>
              </View>
            }
            /* One of the icons is from a different library, doing the declaration this way ensures they are rendered the same way. */
            renderItem={({ item }) => {
              const IconComponent = item.lib === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;

              return (
                <Pressable
                  className="flex-row items-center py-5 mb-1"
                  onPress={() => {haptics('light'); router.push({ pathname: item.route })}}
                >
                  <IconComponent
                    name={item.icon}
                    size={scaled48}
                    color={item.color == '#FF0000'?item.color:colors.text}
                    className="mr-5 text-center"
                    style={{fontSize: scaled48}}
                  />
                  <Text minimumFontScale={0.8} ellipsizeMode="tail" className={`font-bold text-center`} style={{color: item.color=='#FF0000'?item.color:colors.text, fontSize: scaledFontSize, marginRight:10}}>
                    {item.text}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

