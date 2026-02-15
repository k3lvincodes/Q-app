import { router } from "expo-router";
import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import CrewDetailsModal from "./CrewDetailsModal";

interface Subscription {
  id: number;
  name: string;
  image_url?: string;
}

interface CrewProps {
  subscriptions: Subscription[];
}

const Crew = ({ subscriptions }: CrewProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<Subscription | null>(null);

  const handleCrewPress = (sub: Subscription) => {
    setSelectedCrew(sub);
    setModalVisible(true);
  };

  return (
    <View className="pt-8">
      <Text className="font-bold text-[#1E293B] dark:text-gray-200 text-[18px] mb-6">{`Crew(s) You're Part Of`}</Text>
      <View>
        {subscriptions && subscriptions.length > 0 ? (
          subscriptions.map((sub) => (
            <TouchableOpacity
              key={sub.id}
              className="flex-row items-center bg-white dark:bg-gray-900 p-4 rounded-2xl mb-3 shadow-sm shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-gray-800"
              onPress={() => handleCrewPress(sub)}
            >
              <View className="w-10 h-10 bg-[#FFF5F2] dark:bg-gray-800 rounded-full items-center justify-center mr-4 overflow-hidden">
                {sub.image_url ? (
                  <Image source={{ uri: sub.image_url }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <Text className="text-[#EF5323] font-bold text-lg">{sub.name.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-[#1E293B] dark:text-white text-[16px]">{sub.name}</Text>
                <Text className="text-gray-400 text-xs">Tap to view details</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center py-6 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <Text className="text-center text-[#94A3B8] dark:text-gray-500 text-[14px]">You haven't joined any crew yet.</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={() => router.push("/discover")}
        className="items-center px-10 w-max self-center h-[44px] justify-center bg-white dark:bg-gray-900 rounded-full mt-4 shadow-sm shadow-gray-200 border border-gray-100 dark:border-gray-800"
      >
        <Text className="text-[#EF5323] text-[14px] font-medium">{`Discover Crews`}</Text>
      </TouchableOpacity>

      <CrewDetailsModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        subscription={selectedCrew}
      />
    </View>
  );
};

export default Crew;
