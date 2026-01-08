import Contact from "@/components/Contact/Contact";
import Faqs from "@/components/Contact/Faqs";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../assets/svg/arrow.svg";

const contact = () => {
  return (
    <SafeAreaView className="flex-1 dark:bg-black">
      <View className="flex-row items-center px-5 gap-5 mt-[0px]">
        <TouchableOpacity onPress={() => router.back()}>
          <Arrow />
        </TouchableOpacity>
        <Text className="text-bg text-xl ">Services</Text>
      </View>
      <ScrollView className="dark:bg-black">
        <Text className="text-2xl text-center pt-10 dark:text-white">How can we help you?</Text>
        <Text className="text-center text-xs text-gray-400">Contact Us</Text>
        <Contact />
        <Faqs />
      </ScrollView>
    </SafeAreaView>
  );
};

export default contact;
