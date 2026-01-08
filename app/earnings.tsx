import { router } from "expo-router";
import React from 'react';
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../assets/svg/arrow.svg";

const Earnings = () => {
  return (
    <SafeAreaView className="flex-1 dark:bg-black">
      <View className="flex-row items-center gap-5 px-5 mt-[0px]">
        <TouchableOpacity onPress={() => router.back()}>
          <Arrow />
        </TouchableOpacity>
        <Text className="text-bg text-xl ">Earnings</Text>
      </View>
      <View className="flex-1 justify-center items-center">
        <Text className="text-2xl font-bold text-gray-500">Coming Soon</Text>
      </View>
    </SafeAreaView>
  );
};

export default Earnings;
