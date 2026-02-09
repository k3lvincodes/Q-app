import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

interface Subscription {
  id: number;
  name: string;
}

interface CrewProps {
  subscriptions: Subscription[];
}

const Crew = ({ subscriptions }: CrewProps) => {
  return (
    <View className="pt-8">
      <Text className="font-bold text-[#1E293B] dark:text-gray-200 text-[18px] mb-6">{`Crew's  You're Part Of`}</Text>
      <View>
        {subscriptions && subscriptions.length > 0 ? (
          subscriptions.map((sub) => (
            <Text key={sub.id} className="text-center py-2 dark:text-gray-400">{sub.name}</Text>
          ))
        ) : (
          <Text className="text-center text-[#1E293B] dark:text-gray-500 text-[14px] py-6">{`You haven't joined any crew yet.`}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => router.push("/discover")}
        className="items-center px-10 w-max self-center h-[44px] justify-center bg-white rounded-full mt-2 shadow-sm shadow-gray-200"
      >
        <Text className="text-[#EF5323] text-[14px] font-medium">{`Discover Crew's`}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Crew;
