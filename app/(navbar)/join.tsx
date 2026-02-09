import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../../assets/svg/arrow.svg";
import Family from "../../assets/svg/family.svg";
import Prime from "../../assets/svg/prime.svg"; // Fallback icon
import User from "../../assets/svg/profile.svg";
import Renewal from "../../assets/svg/renewal.svg";
import Status from "../../assets/svg/status.svg";
import { supabase } from "../../utils/supabase";

interface SubscriptionService {
  name: string;
  renewal_day: number;
  image_url?: string;
}

interface UserSubscription {
  id: number;
  status: string;
  created_at: string;
  subscription_services: SubscriptionService;
}

const Join = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [autoRenewEnabled, setAutoRenewEnabled] = useState(false); // Can be made dynamic per sub later

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_services(*)')
          .eq('user_id', user.id);

        if (error) throw error;
        setSubscriptions(data as any || []);
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderDetails = (sub: UserSubscription) => {
    const details = [
      {
        key: 1,
        icon: Family,
        name: "Family Name",
        text: sub.subscription_services?.name || "Unknown",
      },
      {
        key: 2,
        icon: User,
        name: "Owner",
        text: "System Admin", // Placeholder
      },
      {
        key: 3,
        icon: Renewal,
        name: "Renewal",
        text: sub.subscription_services?.renewal_day ? `Day ${sub.subscription_services.renewal_day}` : "Monthly",
      },
      {
        key: 4,
        icon: Status,
        name: "Status",
        text: sub.status || "Active",
      },
    ];

    return (
      <View className="bg-gray-200 dark:bg-gray-800 rounded-xl mt-2 p-3">
        <View className="flex-row justify-between items-center pt-2">
          <View className="flex-col items-start ">
            <View className="flex-row items-center">
              <Switch
                value={autoRenewEnabled}
                onValueChange={() => setAutoRenewEnabled(!autoRenewEnabled)}
                trackColor={{ true: "#EB4219" }}
                thumbColor={autoRenewEnabled ? "#ffff" : "#f4f3f4"}
              />
              <Text className="ml-2 text-xs text-gray-600 dark:text-gray-300">Auto Renewal</Text>
            </View>
          </View>
          <Pressable className="bg-bg rounded-full px-4 py-2">
            <Text className="text-white text-xs">View Details</Text>
          </Pressable>
        </View>

        <View className="bg-white dark:bg-gray-700 mt-4 py-2 rounded-xl">
          {details.map((item, index) => (
            <View key={item.key}>
              <View className="flex-row items-center px-4 py-3 justify-between">
                <View className="flex-row items-center gap-3">
                  <item.icon width={18} height={18} />
                  <Text className="text-gray-700 dark:text-gray-200 text-sm">{item.name}</Text>
                </View>
                <Text
                  className={`text-gray-600 dark:text-gray-300 text-sm ${item.name === "Status" && item.text === "active" ? "bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium" : ""}`}
                >
                  {item.text}
                </Text>
              </View>
              {index < details.length - 1 && <View className="w-full h-[1px] bg-gray-100 dark:bg-gray-600" />}
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-[#F6F4F1] dark:bg-black">
        <ActivityIndicator size="large" color="#EB4219" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F4F1] dark:bg-black">
      <ScrollView className="px-5">
        <View className="flex-row pb-6 items-center gap-5 mt-[5px]">
          <TouchableOpacity onPress={() => router.back()}>
            <Arrow />
          </TouchableOpacity>
          <Text className="text-bg text-xl font-bold">Jointhequeue</Text>
        </View>

        <Text className="text-2xl font-semibold text-black dark:text-white">Crew</Text>
        <Text className="text-gray-500 mb-6">Crew you are a part of</Text>

        {subscriptions.length === 0 ? (
          <View className="items-center justify-center mt-10">
            <Text className="text-gray-500 text-lg">You haven't joined any crews yet.</Text>
          </View>
        ) : (
          subscriptions.map((sub) => (
            <View key={sub.id} className="mb-4">
              <TouchableOpacity
                onPress={() => toggleExpand(sub.id)}
                className="bg-bg flex-row items-center gap-4 rounded-xl p-4 shadow-sm"
              >
                {/* Fallback Icon or Logic for Icon */}
                {sub.subscription_services?.image_url ? (
                  <Image
                    source={{ uri: sub.subscription_services.image_url }}
                    className="w-8 h-8 rounded-full bg-white"
                    resizeMode="cover"
                  />
                ) : (
                  <Prime width={24} height={24} />
                )}
                <Text className="text-xl text-white font-bold">{sub.subscription_services?.name || 'Service'}</Text>
              </TouchableOpacity>

              {expandedId === sub.id && renderDetails(sub)}
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

export default Join;
