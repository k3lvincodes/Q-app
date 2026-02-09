import { router } from "expo-router";
import React from 'react';
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../assets/svg/arrow.svg";

const Invite = () => {
  return (
    <SafeAreaView className="flex-1 dark:bg-black">
      <View className="px-5">
        <View className="flex-row items-center gap-5 pb-10 mt-[5px]">
          <TouchableOpacity onPress={() => router.back()}>
            <Arrow />
          </TouchableOpacity>
          <Text className="text-bg text-[14px]">Invite and earn</Text>
        </View>
        <View className="flex-1 justify-center items-center mt-20">
          <Text className="text-2xl font-bold text-gray-500">Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Invite;
