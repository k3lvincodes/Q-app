import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { performLogoutCleanup } from '../../utils/authCleanup';

const Logout = () => {
  useEffect(() => {
    const logoutUser = async () => {
      await performLogoutCleanup();
      router.replace('/(auth)/login');
    };

    logoutUser();
  }, []);

  return (
    <View>
      <Text>Logging out...</Text>
    </View>
  );
};

export default Logout;