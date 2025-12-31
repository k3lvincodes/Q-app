import { View, Text, TouchableOpacity } from "react-native";
import Change from "../../assets/svg/change.svg";
import Bank from "../../assets/svg/bank.svg";
import App from "../../assets/svg/app.svg";
import Link from "../../assets/svg/link.svg";
import Next from "../../assets/svg/next.svg";
import { useState } from "react";
import PasswordModal from "./PasswordModal";
import VerifiedModal from "./VerifiedModal";
import LinkModal from "./LinkModal";
import AppModal from "./AppModal";

const Account = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [bankVisible, setBankVisible] = useState(false);
  const [linkVisible, setLinkVisible] = useState(false);
  const [AppVisible, setAppVisible] = useState(false);

  return (
    <View className="bg-white rounded-xl px-5 py-7 mt-5">
      <Text className="text-gray-500 pb-10 text-lg">Account</Text>
      <View className="gap-10">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <Change width={40} height={40} />
            <Text className="text-lg text-gray-700">Change Password</Text>
          </View>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Next width={25} height={25} />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <Bank width={40} height={40} />
            <Text className="text-lg text-gray-700">Bank Account </Text>
          </View>
          <TouchableOpacity onPress={() => setBankVisible(true)}>
            <Next width={25} height={25} />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <App width={40} height={40} />
            <Text className="text-lg text-gray-700"> App Settings </Text>
          </View>
          <TouchableOpacity onPress={() => setAppVisible(true)}>
            <Next width={25} height={25} />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <Link width={40} height={40} />
            <Text className="text-lg text-gray-700"> Linked Accounts </Text>
          </View>
          <TouchableOpacity onPress={() => setLinkVisible(true)}>
            <Next width={25} height={25} />
          </TouchableOpacity>
        </View>
      </View>
      <PasswordModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
      />
      <VerifiedModal
        modalVisible={bankVisible}
        setModalVisible={setBankVisible}
      />
      <LinkModal
        modalVisible={linkVisible}
        setModalVisible={setLinkVisible}
      />
      <AppModal
        modalVisible={AppVisible}
        setModalVisible={setAppVisible}
      />
    </View>
  );
};

export default Account;
