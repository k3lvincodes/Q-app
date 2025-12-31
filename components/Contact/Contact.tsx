import { View, Text, TouchableOpacity } from "react-native";
import Email from "../../assets/svg/email.svg";
import Ig from "../../assets/svg/ig.svg";
import X from "../../assets/svg/x.svg";
import Drop from "../../assets/svg/drop.svg";

const Contact = () => {
  return (
    <View className="flex-row justify-between mt-10 bg-white rounded-3xl mx-5 py-5 px-10">
      <View className="items-center gap-3">
        <TouchableOpacity className="bg-bg/15 rounded-full p-5">
          <Email width={20} height={20}/>
        </TouchableOpacity>
        <Text className="text-bg text-sm">Email</Text>
      </View>
      <View className="items-center gap-3">
        <TouchableOpacity className="bg-bg/15 rounded-full p-5">
          <Ig width={20} height={20}/>
        </TouchableOpacity>
        <Text className="text-bg text-sm">Instagram</Text>
      </View>
      <View className="items-center gap-3">
        <TouchableOpacity className="bg-bg/15 rounded-full p-5">
          <X width={20} height={20}/>
        </TouchableOpacity>
        <Text className="text-bg text-sm ">Twitter</Text>
      </View>
    </View>
  );
};

export default Contact;
