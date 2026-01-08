import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import App from "../../assets/svg/app.svg";

import Next from "../../assets/svg/next.svg";
import AppModal from "./AppModal";


const Account = () => {


  const [AppVisible, setAppVisible] = useState(false);

  return (
    <View className="bg-white dark:bg-[#1E1E1E] rounded-xl px-5 py-7 mt-5">
      <Text className="text-gray-500 dark:text-gray-400 pb-10 text-lg">Account</Text>
      <View className="gap-10">

        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <App width={40} height={40} />
            <Text className="text-lg text-gray-700 dark:text-white"> App Settings </Text>
          </View>
          <TouchableOpacity onPress={() => setAppVisible(true)}>
            <Next width={25} height={25} />
          </TouchableOpacity>
        </View>

      </View>


      <AppModal
        modalVisible={AppVisible}
        setModalVisible={setAppVisible}
      />
    </View>
  );
};

export default Account;
