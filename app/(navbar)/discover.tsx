import Subscription from "@/components/Services/Subscription";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Arrow from "../../assets/svg/arrow.svg";
import { supabase } from "../../utils/supabase";

interface Service {
  id: number;
  name: string;
  slots_available: number;
  price: number;
  category: string;
  subscription_plans?: { price_per_member: number }[];
}

const Discover = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase.from('subscription_services').select('*, subscription_plans(price_per_member)');
        if (error) throw error;
        setServices(data as any || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="h-full justify-center items-center dark:bg-black">
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="h-full justify-center items-center dark:bg-black">
        <Text className="dark:text-white">Error: {error.message}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="px-5 h-full dark:bg-black">
      <View className="flex-row items-center gap-5 mt-[0px]">
        <TouchableOpacity onPress={() => router.back()}>
          <Arrow />
        </TouchableOpacity>
        <Text className="text-bg text-xl ">Services</Text>
      </View>

      <Subscription services={services} />
    </SafeAreaView>
  );
};

export default Discover;
