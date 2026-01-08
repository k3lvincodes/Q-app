import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import About from "../../assets/svg/about.svg";
import Contact from "../../assets/svg/contact.svg";
import Invite from "../../assets/svg/invite.svg";
import Next from "../../assets/svg/next.svg";
import Terms from "../../assets/svg/terms.svg";

const Others = () => {
  return (
    <View className="bg-white dark:bg-[#1E1E1E] rounded-xl px-5 py-7 mb-10 mt-5">
      <Text className="text-gray-500 dark:text-gray-400 pb-10 text-lg">Others</Text>
      <View className="gap-10">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <Contact width={40} height={40} />
            <Text className="text-lg text-gray-700 dark:text-white">Contact Us</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/contact')}>
            <Next width={25} height={25} />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <Invite width={40} height={40} />
            <Text className="text-lg text-gray-700 dark:text-white">Invite And Earn</Text>
          </View>
          <View className="flex-row gap-2 items-center">
            <Text className="text-gray-600 dark:text-gray-400">0 Invites</Text>
            <TouchableOpacity onPress={() => router.push('/invite')}>
              <Next width={25} height={25} />
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <Terms width={40} height={40} />
            <Text className="text-lg text-gray-700 dark:text-white">Terms Of Use</Text>
          </View>
          <Next width={25} height={25} />
        </View>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-5">
            <About width={40} height={40} />
            <Text className="text-lg text-gray-700 dark:text-white">About Us</Text>
          </View>
          <Next width={25} height={25} />
        </View>
      </View>
    </View>
  );
};

export default Others;
