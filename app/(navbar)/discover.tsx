import Subscription from "@/components/Services/Subscription";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Arrow from "../../assets/svg/arrow.svg";
import { supabase } from "../../utils/supabase";

interface Service {
  id: number;
  name: string;
  slots_available: number;
  price: number;
  category: string;
}

const Discover = () => {
  const [activeItem, setActiveItem] = useState('All');
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase.from('subscription_services').select('*');
        if (error) throw error;
        setServices(data as any || []);
        setFilteredServices(data as any || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    if (activeItem === 'All') {
      setFilteredServices(services);
    } else {
      // Mapping "Dev" to "Education" or "Tools" if needed, or ensuring categories match DB
      // Assuming 'Dev' might map to 'Tools' or 'Education' in DB, or strictly matching exact string
      // DB Categories: 'Streaming', 'Education', 'Tools', 'Gaming', 'Music', 'Other'
      // UI Tabs: "All", "Streaming", "Dev", "Tools"

      // Handling loose mapping for "Dev" -> "Tools" or keeping as is if DB has "Dev"
      let categoryFilter = activeItem;
      if (activeItem === 'Dev') categoryFilter = 'Tools'; // Example mapping

      setFilteredServices(services.filter(service => service.category === categoryFilter));
    }
  }, [activeItem, services]);

  if (loading) {
    return (
      <SafeAreaView className="h-full justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="h-full justify-center items-center">
        <Text>Error: {error.message}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="px-5">
      <View className="flex-row items-center gap-5 mt-[0px]">
        <TouchableOpacity onPress={() => router.back()}>
          <Arrow />
        </TouchableOpacity>
        <Text className="text-bg text-xl ">Services</Text>
      </View>
      <FlatList
        className="mt-10"
        data={["All", "Streaming", "Education", "Tools", "Music"]} // Updated to match likely DB categories
        renderItem={({ item }) => {
          const isActive = item === activeItem;
          return (
            <TouchableOpacity onPress={() => setActiveItem(item)} className={`rounded-full px-10 py-5 ${isActive ? 'bg-bg text-white' : 'bg-bg/20 text-bg'}`}>
              <Text className="text-white">{item}</Text>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
      />

      <Subscription services={filteredServices} />
    </SafeAreaView>
  );
};

export default Discover;
