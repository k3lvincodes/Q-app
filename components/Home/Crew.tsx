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
      <Text className="font-bold text-[#1E293B] text-xl mb-6">{`Crew's  You're Part Of`}</Text>
      <View>
        {subscriptions && subscriptions.length > 0 ? (
          subscriptions.map((sub) => (
            <Text key={sub.id} className="text-center py-2">{sub.name}</Text>
          ))
        ) : (
          <Text className="text-center text-[#1E293B] text-lg py-6">{`You haven't joined any crew yet.`}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => router.push("/discover")}
        className="items-center px-10 w-max self-center py-4 bg-[#EF5323] rounded-full mt-2 shadow-lg shadow-orange-500/30"
      >
        <Text className="text-white text-lg font-medium">{`Discover Crew's`}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Crew;
