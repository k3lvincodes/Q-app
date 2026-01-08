import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Display from "../../assets/svg/display.svg";

type ModalType = {
  modalVisible: any;
  setModalVisible: any;
};

const AppModal = ({ modalVisible, setModalVisible }: ModalType) => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    checkSupport();
    checkStatus();
  }, []);

  const checkSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setIsSupported(compatible && enrolled);
  };

  const checkStatus = async () => {
    if (Platform.OS !== 'web') {
      const enabled = await SecureStore.getItemAsync('biometric_enabled');
      setBiometricEnabled(enabled === 'true');
    }
  };

  const toggleSwitch = async (value: boolean) => {
    if (Platform.OS === 'web') return;

    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable Biometrics',
      });
      if (result.success) {
        await SecureStore.setItemAsync('biometric_enabled', 'true');
        setBiometricEnabled(true);
      } else {
        Alert.alert("Authentication failed", "Could not enable biometrics.");
        setBiometricEnabled(false);
      }
    } else {
      await SecureStore.deleteItemAsync('biometric_enabled');
      setBiometricEnabled(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.centeredView} className="bg-black/0.5">
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
          }}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setModalVisible(false)}
          >
            <View className="bg-white rounded-3xl h-[18rem] px-10 w-full mx-5 py-10">

              {/* Display Settings */}
              <View className="flex-row items-center justify-between mb-8">
                <View className="flex-row gap-2 items-center">
                  <Display />
                  <Text className="text-gray-600">Display</Text>
                </View>
                <View className="flex-row gap-5 items-center">
                  <Text className="text-gray-400 capitalize">{colorScheme}</Text>
                  <Switch
                    value={colorScheme === 'dark'}
                    onValueChange={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
                    trackColor={{ false: "#767577", true: "#EB4219" }}
                    thumbColor={colorScheme === 'dark' ? "#fff" : "#f4f3f4"}
                  />
                </View>
              </View>

              {/* Biometric Settings */}
              {isSupported && (
                <View className="flex-row items-center justify-between">
                  <View className="flex-row gap-2 items-center">
                    <MaterialCommunityIcons name="fingerprint" size={24} color="gray" />
                    <Text className="text-gray-600">Biometric Login</Text>
                  </View>
                  <Switch
                    trackColor={{ false: "#767577", true: "#EB4219" }}
                    thumbColor={biometricEnabled ? "#fff" : "#f4f3f4"}
                    onValueChange={toggleSwitch}
                    value={biometricEnabled}
                  />
                </View>
              )}

            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
    alignItems: "center",
  },
});

export default AppModal;
