import { Text, TouchableOpacity, View } from "react-native";
import Email from "../../assets/svg/email.svg";
import Ig from "../../assets/svg/ig.svg";
import X from "../../assets/svg/x.svg";

const Contact = () => {
  return (
    <View className="flex-row justify-between mt-10 bg-white dark:bg-[#1E1E1E] rounded-3xl mx-5 py-5 px-10">
      <View className="items-center gap-3">
        <TouchableOpacity className="bg-bg/15 rounded-full p-5">
          <Email width={20} height={20} />
        </TouchableOpacity>
        <Text className="text-bg dark:text-white text-sm">Email</Text>
      </View>
      <View className="items-center gap-3">
        <TouchableOpacity className="bg-bg/15 rounded-full p-5">
          <Ig width={20} height={20} />
        </TouchableOpacity>
        <Text className="text-bg dark:text-white text-sm">Instagram</Text>
      </View>
      <View className="items-center gap-3">
        <TouchableOpacity className="bg-bg/15 rounded-full p-5">
          <X width={20} height={20} />
        </TouchableOpacity>
        <Text className="text-bg dark:text-white text-sm ">Twitter</Text>
      </View>
    </View>
  );
};

export default Contact;
