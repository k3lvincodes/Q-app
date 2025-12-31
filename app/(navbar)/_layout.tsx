import { Stack } from 'expo-router';

import { ActivityIndicator, View } from 'react-native';
import { useAuthProtection } from '../../hooks/useAuthProtection';

export default function NavbarLayout() {
  const { isLoading, isAuthorized } = useAuthProtection({ requiredContext: 'user' });

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#F6F4F1] items-center justify-center">
        <ActivityIndicator size="large" color="#EB4219" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="join" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="support" />
      <Stack.Screen name="logout" />
    </Stack>
  );
}
