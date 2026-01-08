import ServiceModal from "@/components/Services/ServiceModal";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../utils/supabase";

interface Plan {
  id: string;
  plan_type: string;
  price_per_member: number;
  members_limit: number;
}

interface Subscription {
  id: number;
  name: string;
  price?: number;
  image_url?: string;
  subscription_plans: Plan[];
}

interface Transaction {
  id: number;
  amount: number;
  type: string;
}

const SubDetail = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { id } = useLocalSearchParams();

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [subResponse, transResponse, profileResponse] = await Promise.all([
          supabase
            .from('subscription_services')
            .select('*, subscription_plans(*)')
            .eq('id', id)
            .single(),
          supabase.from('transactions').select('*').eq('user_id', user.id),
          supabase.from('profiles').select('balance').eq('id', user.id).single()
        ]);

        if (subResponse.error) throw subResponse.error;
        if (transResponse.error) throw transResponse.error;
        if (profileResponse.error) throw profileResponse.error;

        setSubscription(subResponse.data as any);
        setTransactions(transResponse.data as any || []);

        // Calculate balance dynamically from transactions to match Dashboard
        const calculatedBalance = (transResponse.data as any || []).reduce((acc: number, tx: any) => {
          return tx.type === 'credit' ? acc + tx.amount : acc - tx.amount;
        }, 0);

        setBalance(calculatedBalance);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const list = [
    {
      id: 1,
      Text: "An invitation email would be sent to the email you provide.",
    },
    {
      id: 2,
      Text: "You would be refunded in 24hours if not added or if password is incorrect.",
    },
    {
      id: 3,
      Text: "You would be refunded if you leave family 2 hours after joining.",
    },
  ];

  const getMinPrice = () => {
    if (!subscription) return 0;
    if (subscription.subscription_plans && subscription.subscription_plans.length > 0) {
      const prices = subscription.subscription_plans.map(p => p.price_per_member);
      return Math.min(...prices);
    }
    return subscription.price || 0;
  };

  const minPrice = getMinPrice();
  const hasEnoughBalance = balance >= minPrice;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center dark:bg-black">
        <ActivityIndicator size='large' />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <Text>Error: {error.message}</Text>
      </SafeAreaView>
    );
  }

  if (!subscription) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center dark:bg-black">
        <Text className="dark:text-white">Subscription not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="px-5 flex-1 dark:bg-black">
      {subscription.image_url && (
        <Image
          className="w-[8rem] mb-10 mx-auto h-[8rem] rounded-full"
          source={{ uri: subscription.image_url }}
          resizeMode="cover"
        />
      )}
      <Text className="text-center pb-10 font-semibold mt-[0px] text-xl dark:text-white">
        {subscription.name} by JointheQ
      </Text>
      <FlatList
        className="bg-white dark:bg-[#1E1E1E] rounded-xl py-5"
        data={list}
        renderItem={({ item }) => (
          <View className="flex-row rounded-xl gap-2 p-5">
            <Text className="bg-gray-100 text-gray-400 rounded-full px-4 py-2">
              {item.id}
            </Text>
            <Text className="text-gray-400 flex-1">{item.Text}</Text>
          </View>
        )}
      />
      <TouchableOpacity
        onPress={() => hasEnoughBalance && setModalVisible(true)}
        disabled={!hasEnoughBalance}
      >
        <Text
          className={`rounded-full py-5 mx-auto mt-20 px-10 text-white font-bold text-center w-full ${hasEnoughBalance ? "bg-bg" : "bg-bg/50"}`}
        >
          {hasEnoughBalance ? "Agree and continue" : `Insufficient Balance (Min: ₦${minPrice.toLocaleString()})`}
        </Text>
      </TouchableOpacity>

      <ServiceModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        service={subscription}
        balance={balance}
      />
    </SafeAreaView>
  );
};

export default SubDetail;
