import Crew from "@/components/Home/Crew";
import DepositModal from "@/components/Home/DepositModal";
import Transactions from "@/components/Home/Transactions";
import UserMenu from "@/components/User/UserMenu";
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, RefreshControl, ScrollView, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
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
  image_url?: string;
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [backPressedOnce, setBackPressedOnce] = useState(false);
  const [showMoveToQ, setShowMoveToQ] = useState(false); // Default false until we check database

  const refreshData = useCallback(async () => {
    try {
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
          .select('balance, onboarding_completed')
          .eq('id', user.id)
          .single()
      ]);

      if (subsResponse.error) throw subsResponse.error;
      if (transResponse.error) throw transResponse.error;
      if (profileResponse.error) throw profileResponse.error;

      // Check onboarding status from profile data
      const hasCompletedOnboarding = profileResponse.data?.onboarding_completed || false;
      setShowMoveToQ(!hasCompletedOnboarding);

      const formattedSubs = subsResponse.data.map((sub: any) => ({
        id: sub.id,
        name: sub.subscription_services?.name || 'Unknown Service',
        image_url: sub.subscription_services?.image_url,
        slots_available: 0,
        price: 0
      }));

      setSubscriptions(formattedSubs);
      setTransactions(transResponse.data as any || []);

      // Calculate balance dynamically from transactions
      const calculatedBalance = (transResponse.data as any || []).reduce((acc: number, tx: any) => {
        return tx.type === 'credit' ? acc + tx.amount : acc - tx.amount;
      }, 0);

      setBalance(calculatedBalance);

    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
  }, [refreshData]);

  useFocusEffect(
    React.useCallback(() => {
      refreshData();

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
    }, [backPressedOnce, menuVisible, refreshData])
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

            // Update balance locally based on the new transaction
            setBalance((prev) => {
              const amount = payload.new.amount || 0;
              return payload.new.type === 'credit' ? prev + amount : prev - amount;
            });
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
      <SafeAreaView className="h-full bg-[#F6F4F1] dark:bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#EF5323" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="h-full bg-[#F6F4F1] dark:bg-black justify-center items-center">
        <Text className="dark:text-white">Error: {error.message}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="h-full bg-[#F6F4F1] dark:bg-black overflow-hidden">
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

      {/* Main Content with RefreshControl */}
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EF5323"]} />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8 mt-[5px]">
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            className="p-3 rounded-full bg-white dark:bg-gray-900 shadow-sm shadow-gray-200 border border-gray-100 dark:border-gray-800"
          >
            <HamburgerIcon width={24} height={24} color="#EF5323" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/notification')}
            className="p-3 rounded-full bg-white dark:bg-gray-900 shadow-sm shadow-gray-200 border border-gray-100 dark:border-gray-800"
          >
            <NotificationIcon width={24} height={24} />
          </TouchableOpacity>
        </View>

        <Text className="text-[#1E1E1E] dark:text-gray-400 opacity-80 text-[14px] mb-4 font-segoe">My Balance</Text>
        <View className="flex-row justify-center items-start mb-8">
          <Text className="text-2xl font-bold text-[#1E1E1E] dark:text-white mt-1">₦</Text>
          <Text className="text-[34px] font-bold font-segoe text-[#1E1E1E] dark:text-white leading-[40px] ml-1">
            {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View className="flex-row gap-5 mb-8 justify-between">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="flex-1 flex-row items-center px-6 h-[64px] justify-between bg-white dark:bg-gray-900 rounded-[30px] border border-gray-100 dark:border-gray-800"
          >
            <Text className="text-[#EF5323] text-[14px] font-medium">Deposit</Text>
            <View className="bg-transparent rounded-full p-1 border border-[#EF5323] rounded-full">
              <Deposit width={20} height={20} color="#EF5323" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/earnings")}
            className="flex-1 flex-row items-center px-6 h-[64px] justify-between bg-white dark:bg-gray-900 rounded-[30px] border border-gray-100 dark:border-gray-800"
          >
            <Text className="text-[#EF5323] text-[14px] font-medium">Earnings</Text>
            <View className="bg-transparent rounded-full p-1">
              <Earnings width={24} height={24} color="#EF5323" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/newRequest')}
          className="flex-row items-center px-6 h-[64px] justify-center gap-3 bg-[#EF5323] rounded-full mb-8 shadow-lg shadow-[#EF5323]/30"
        >
          <Text className="text-white text-[14px] font-segoe font-medium">New request</Text>
          <View className="bg-white/20 rounded-full p-1">
            <Request width={20} height={20} color="white" />
          </View>
        </TouchableOpacity>

        {/* Complete Your Move to Q Banner */}
        {showMoveToQ && (
          <TouchableOpacity
            onPress={() => router.push('/onboard')}
            className="bg-white rounded-[20px] mb-8 relative shadow-sm shadow-gray-100 h-[83px] justify-center px-5"
          >
            <TouchableOpacity
              onPress={() => setShowMoveToQ(false)}
              className="absolute top-3 right-4 z-10"
            >
              <Ionicons name="close-circle-outline" size={20} color="black" />
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-[16px] font-poppins font-bold text-center text-[#1E1E1E] mb-1">Complete Your Move to Q</Text>
              <Text className="text-gray-400 text-center text-[10px]">
                Just a few steps left to bring your account into the Q app
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Q Envelope Banner */}
        <TouchableOpacity
          onPress={() => router.push('/envelope' as any)}
          className="bg-[#991B1B] rounded-[30px] h-[83px] mb-8 relative overflow-hidden justify-center items-center"
        >
          {/* Background Hearts Pattern */}
          <View className="absolute -left-4 -top-8 opacity-40 transform -rotate-12">
            <Ionicons name="heart-outline" size={90} color="white" />
          </View>
          <View className="absolute left-24 -top-8 opacity-30 transform rotate-45">
            <Ionicons name="heart-outline" size={50} color="white" />
          </View>
          <View className="absolute right-16 top-4 opacity-50 transform -rotate-12">
            <Ionicons name="heart-outline" size={30} color="white" />
          </View>
          <View className="absolute -right-10 -top-4 opacity-40 transform rotate-12">
            <Ionicons name="heart-outline" size={100} color="white" />
          </View>
          <View className="absolute left-10 -bottom-8 opacity-40 transform -rotate-12">
            <Ionicons name="heart-outline" size={70} color="white" />
          </View>
          <View className="absolute right-32 -bottom-6 opacity-30 transform rotate-12">
            <Ionicons name="heart-outline" size={60} color="white" />
          </View>
          <View className="absolute right-4 -bottom-8 opacity-40 transform -rotate-45">
            <Ionicons name="heart-outline" size={70} color="white" />
          </View>


          <View className="bg-white/20 w-[116px] h-[26px] rounded-full backdrop-blur-md justify-center items-center">
            <Text className="text-white text-[17.9px] font-segoe pb-[2px]">Q envelope</Text>
          </View>
        </TouchableOpacity>

        <View className="mb-2">
          <Crew subscriptions={subscriptions} />
        </View>

        <Transactions transactions={transactions.slice(0, 3)} />

        <DepositModal
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Dashboard;
