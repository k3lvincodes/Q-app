import { router } from "expo-router";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import Container from "../../assets/svg/Container.svg";

interface Service {
  id: number;
  name: string;
  slots_available: number;
  price: number;
  subscription_plans?: { price_per_member: number }[];
}

interface SubscriptionProps {
  services: Service[];
}

const getPriceDisplay = (service: Service) => {
  if (!service.subscription_plans || service.subscription_plans.length === 0) {
    return service.price ? `₦${service.price.toLocaleString()}` : "₦/A";
  }

  const prices = service.subscription_plans.map(p => p.price_per_member);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (minPrice === maxPrice) {
    return `₦${minPrice.toLocaleString()}`;
  }

  return `₦${minPrice.toLocaleString()} - ₦${maxPrice.toLocaleString()}`;
};

const Subscription = ({ services }: SubscriptionProps) => {
  return (
    <View className="pt-10">
      <TextInput
        placeholder="Search subscription"
        placeholderTextColor={"#EB4219"}
        className="border border-bg pl-5 h-[3.5rem] rounded-full"
      />
      <FlatList
        className="pt-10"
        data={services}
        renderItem={({ item }) => {
          return (
            <View className="flex-row justify-between">
              <TouchableOpacity onPress={() => router.push(`/sub_details/${item.id}`)} className="gap-3 flex-row">
                {/* Assuming you have a generic image for services, or you can add image_url to your service object */}
                {/* <Image source={{uri: item.image_url}} /> */}
                <View className="gap-2">
                  <Text className="font-bold">{item.name}</Text>
                  <Text className="">Crew Available: {item.slots_available}</Text>
                </View>
              </TouchableOpacity>
              <View className="items-end gap-2">
                <Container />
                <Text className="font-bold">{getPriceDisplay(item)}/ Month</Text>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View className="w-5/6 ml-auto bg-gray-300 mt-3 mb-10 h-[.1rem]"></View>}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

export default Subscription;
