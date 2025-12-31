import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../utils/supabase";

type ModalType = {
  modalVisible: any;
  setModalVisible: any;
};

const LinkModal = ({ modalVisible, setModalVisible }: ModalType) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter an email");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase
        .from('profiles')
        .update({ linked_email: email }) // Assuming column exists
        .eq('id', user.id);

      if (error) throw error;
      Alert.alert("Success", "Account linked successfully");
      setModalVisible(false);
      setEmail("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to link account");
    } finally {
      setLoading(false);
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
            <View className="bg-white rounded-xl px-10 w-full mx-5 py-10">
              <View>
                <Text className="text-gray-500 font-semibold pt-2">Link Account</Text>
                <TextInput
                  placeholder="email"
                  placeholderTextColor='#374151'
                  className="border pl-3 h-[3.5rem] border-gray-300  rounded mt-2"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <Pressable
                className="bg-bg mt-10 self-end rounded-full py-5 px-7"
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">Save</Text>
                )}
              </Pressable>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black
    justifyContent: "center",
    paddingHorizontal: 20,
    alignItems: "center",
  },
});

export default LinkModal;
