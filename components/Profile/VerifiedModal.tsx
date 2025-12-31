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

const VerifiedModal = ({ modalVisible, setModalVisible }: ModalType) => {
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase
        .from('profiles')
        .update({
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName
        })
        .eq('id', user.id);

      if (error) throw error;
      Alert.alert("Success", "Bank details saved successfully");
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save bank details");
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
                <Text className="text-gray-700 font-semibold pt-2">
                  Bank Name
                </Text>
                <TextInput
                  className="border h-[3.5rem] border-gray-300  rounded mt-2 px-3"
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Enter Bank Name"
                />
              </View>
              <View className="pt-5">
                <Text className="text-gray-700 font-semibold pt-2">
                  Account Number
                </Text>
                <TextInput
                  className="border h-[3.5rem] border-gray-300  rounded mt-2 px-3"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                  placeholder="Enter Account Number"
                />
              </View>
              <View className="pt-5">
                <Text className="text-gray-700 font-semibold pt-2">
                  Account Name
                </Text>
                <TextInput
                  className="border h-[3.5rem] border-gray-300  rounded mt-2 px-3"
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="Enter Account Name"
                />
              </View>
              <Pressable
                className="bg-bg mt-10 self-end rounded-full py-5 px-10"
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

export default VerifiedModal;
