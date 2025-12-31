import { View, Text, TouchableOpacity } from "react-native";
import Contact from "../../assets/svg/contact.svg";
import Invite from "../../assets/svg/invite.svg";
import Terms from "../../assets/svg/terms.svg";
import About from "../../assets/svg/about.svg";
import Next from "../../assets/svg/next.svg";
import { router } from "expo-router";

const Others = () => {
  return (
    <View className="bg-white rounded-xl px-5 py-7 mb-10 mt-5">
      <Text className="text-gray-500 pb-10 text-lg">Others</Text>
      <View className="gap-10">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <Contact width={40} height={40} />
            <Text className="text-lg text-gray-700">Contact Us</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/contact')}>
            <Next width={25} height={25} />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <Invite width={40} height={40} />
            <Text className="text-lg text-gray-700">Invite And Earn</Text>
          </View>
          <View className="flex-row gap-2 items-center">
            <Text className="text-gray-600">0 Invites</Text>
            <TouchableOpacity onPress={() => router.push('/invite')}>
            <Next width={25} height={25} />
          </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <Terms width={40} height={40} />
            <Text className="text-lg text-gray-700">Terms Of Use</Text>
          </View>
          <Next width={25} height={25} />
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <About width={40} height={40} />
            <Text className="text-lg text-gray-700">About Us</Text>
          </View>
          <Next width={25} height={25} />
        </View>
      </View>
    </View>
  );
};

export default Others;
