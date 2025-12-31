import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type ModalType = {
  modalVisible: any;
  setModalVisible: any;
};

const PasswordModal = ({ modalVisible, setModalVisible }: ModalType) => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.centeredView} className="bg-black/0.5">
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            Alert.alert("Modal has been closed.");
            setModalVisible(false);
          }}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setModalVisible(false)}
          >
            <View className="bg-white rounded-xl px-10 w-full mx-5 py-10">
              <View>
                <Text className="text-gray-700 font-semibold pt-2">Current Password</Text>
                <TextInput className="border h-[3.5rem] border-gray-300  rounded mt-2" />
              </View>
              <View className="pt-5">
                <Text className="text-gray-700 font-semibold pt-2">New Password</Text>
                <TextInput className="border h-[3.5rem] border-gray-300  rounded mt-2" />
              </View>
              <View className="pt-5">
                <Text className="text-gray-700 font-semibold pt-2">Confirm Password</Text>
                <TextInput className="border h-[3.5rem] border-gray-300  rounded mt-2" />
              </View>
              <Pressable
                className="bg-bg mt-10 self-end rounded-full py-5 px-10"
                onPress={() => ""}
              >
                <Text className="text-white font-bold">Change Password</Text>
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

export default PasswordModal;
