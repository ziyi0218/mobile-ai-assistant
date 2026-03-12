/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import { SafeAreaView, View, Text, Pressable, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const optionsList = [
  { id: '0', text: 'General', icon: 'settings-outline', color: '#000', route: '/' },
  { id: '1', text: 'Interface', icon: 'apps-outline', color: '#000', route: '/' },
  { id: '2', text: 'Personalization', icon: 'person-circle-outline', color: '#000', route: '/' },
  { id: '3', text: 'Data Controls', icon: 'database-cog-outline', lib: 'MaterialCommunityIcons', color: '#000', route: '/data_controls' },
  { id: '4', text: 'About', icon: 'information-circle-outline', color: '#000', route: '/' },
  { id: '5', text: 'Log out', icon: 'log-out-outline', color: '#FF0000', route: '/' }
];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="bg-white flex-1">
        {/* Back button */}
        <View className="flex-row items-center px-2.5">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={48} color="black" />
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
                  onPress={() => router.push({ pathname: '/' })}
                >
                  <Ionicons name="archive-outline" size={48} color="black" className="mr-5 w-12 h-12 text-center" />
                  <Text className="text-2xl font-bold text-center">Archived Chats</Text>
                </Pressable>

                <View className="items-center mt-2.5 mb-2.5">
                  <Text className="text-2xl font-bold text-center">— Settings —</Text>
                </View>
              </View>
            }
            /* One of the icons is from a different library, doing the declaration this way ensures they are rendered the same way. */
            renderItem={({ item }) => {
              const IconComponent = item.lib === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;

              return (
                <Pressable
                  className="flex-row items-center py-5 mb-1"
                  onPress={() => router.push({ pathname: item.route })}
                >
                  <IconComponent
                    name={item.icon}
                    size={48}
                    color={item.color}
                    className="mr-5 w-12 h-12 text-center"
                  />
                  <Text className={`text-2xl font-bold text-center ${item.color === '#FF0000' ? 'text-red-500' : 'text-black'}`}>
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

