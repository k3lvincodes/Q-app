import Crew from "@/components/Home/Crew";
import DepositModal from "@/components/Home/DepositModal";
import Transactions from "@/components/Home/Transactions";
import UserMenu from "@/components/User/UserMenu";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Deposit from "../../assets/svg/deposit.svg";
import HamburgerIcon from "../../assets/svg/hamburger.svg";
import NotificationIcon from "../../assets/svg/nortification.svg";
import Request from "../../assets/svg/request.svg";
import Earnings from "../../assets/svg/wallet.svg";
import { supabase } from "../../utils/supabase";

interface Subscription {
  id: number;
  name: string;
  slots_available: number;
  price: number;
}

interface Transaction {
  id: number;
  user_id: string;
  amount: number;
  type: string;
  description?: string;
  related_request_id?: number;
  created_at: string;
}

const Dashboard = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [backPressedOnce, setBackPressedOnce] = useState(false);

  // Animation for Refresh
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const refreshData = useCallback(async () => {
    try {
      // Create a smooth slide down and up animation
      translateY.value = withSequence(
        withTiming(100, { duration: 500 }),
        withTiming(0, { duration: 500 })
      );

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log("No authenticated user found");
        setLoading(false);
        return;
      }

      const [subsResponse, transResponse, profileResponse] = await Promise.all([
        supabase
          .from('user_subscriptions')
          .select('*, subscription_services(*)')
          .eq('user_id', user.id),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single()
      ]);

      if (subsResponse.error) throw subsResponse.error;
      if (transResponse.error) throw transResponse.error;
      if (profileResponse.error) throw profileResponse.error;

      const formattedSubs = subsResponse.data.map((sub: any) => ({
        id: sub.id,
        name: sub.subscription_services?.name || 'Unknown Service',
        slots_available: 0,
        price: 0
      }));

      setSubscriptions(formattedSubs);
      setTransactions(transResponse.data as any || []);
      setBalance(profileResponse.data?.balance || 0);

    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        if (menuVisible) {
          setMenuVisible(false);
          return true;
        }

        if (backPressedOnce) {
          BackHandler.exitApp();
          return true;
        }

        setBackPressedOnce(true);
        if (Platform.OS === 'android') {
          ToastAndroid.show("Press again to exit", ToastAndroid.SHORT);
        }

        setTimeout(() => {
          setBackPressedOnce(false);
        }, 2000);

        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }, [backPressedOnce, menuVisible])
  );

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Supabase Realtime subscription
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('dashboard-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('New transaction received:', payload.new);
            setTransactions((prev) => [payload.new as Transaction, ...prev]);
            // Optionally refresh balance here if we trust the API to update it fast enough
            // or rely on the profile listener below
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            console.log('Profile updated:', payload.new);
            if (payload.new.balance !== undefined) {
              setBalance(payload.new.balance);
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="h-full bg-[#F6F4F1] justify-center items-center">
        <ActivityIndicator size="large" color="#EF5323" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="h-full bg-[#F6F4F1] justify-center items-center">
        <Text>Error: {error.message}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="h-full bg-[#F6F4F1]">
      {/* Dim overlay when menu is open */}
      {menuVisible && (
        <Pressable
          className="absolute top-0 bottom-0 left-0 right-0 bg-black/20 z-10"
          onPress={() => setMenuVisible(false)}
        />
      )}

      <UserMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onRefresh={refreshData}
      />

      {/* Main Content with Animation */}
      <Animated.View className="px-5 pb-20" style={animatedStyle}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8 mt-[0px]">
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            className="p-2 -ml-2 rounded-full bg-[#EF5323]/10 border border-[#EF5323]"
          >
            <HamburgerIcon width={24} height={24} color="#EF5323" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/notification')}
            className="p-2 -mr-2 rounded-full bg-[#EF5323]/10 border border-[#EF5323]"
          >
            <NotificationIcon width={24} height={24} />
          </TouchableOpacity>
        </View>

        <Text className="text-[#1E1E1E] opacity-80 text-lg mb-1 font-segoe-bold">My Balance</Text>
        <View className="flex-row items-baseline mb-8">
          <Text className="text-2xl font-bold text-[#1E1E1E]">₦</Text>
          <Text className="text-[50px] font-bold font-segoe text-[#1E1E1E] leading-[60px] ml-1">
            {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View className="flex-row gap-5 mb-8 justify-between">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="flex-1 flex-row items-center px-6 py-5 justify-between bg-[#F9ECE9] rounded-[30px]"
          >
            <Text className="text-[#EF5323] text-lg font-medium">Deposit</Text>
            <View className="bg-transparent rounded-full p-1 border border-[#EF5323] rounded-full">
              <Deposit width={20} height={20} color="#EF5323" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/earnings")}
            className="flex-1 flex-row items-center px-6 py-5 justify-between bg-[#F9ECE9] rounded-[30px]"
          >
            <Text className="text-[#EF5323] text-lg font-medium">Earnings</Text>
            <View className="bg-transparent rounded-full p-1">
              <Earnings width={24} height={24} color="#EF5323" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/newRequest')}
          className="flex-row items-center px-6 py-5 justify-center gap-3 bg-[#EF5323] rounded-full mb-8 shadow-lg shadow-[#EF5323]/30"
        >
          <Text className="text-white text-xl font-segoe font-medium">New request</Text>
          <View className="bg-white/20 rounded-full p-1">
            <Request width={20} height={20} color="white" />
          </View>
        </TouchableOpacity>

        <View className="mb-2">
          <Crew subscriptions={subscriptions} />
        </View>

        <Transactions transactions={transactions} />

        <DepositModal
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

export default Dashboard;
