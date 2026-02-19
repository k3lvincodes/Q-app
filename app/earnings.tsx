import { router, useFocusEffect } from "expo-router";
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../assets/svg/arrow.svg";
import Deposit from "../assets/svg/deposit.svg";
import WithdrawModal from "../components/WithdrawModal";
import { initiateWithdraw } from "../utils/paymentApi";
import { supabase } from "../utils/supabase";

const Earnings = () => {
  const [earnings, setEarnings] = useState<number>(0);
  const [bootsCount, setBootsCount] = useState<number>(0);

  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchEarnings();
    }, [])
  );

  const fetchEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Profile for Boots Count AND Earnings Balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('boots_count, earnings_balance')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profile) {
        setBootsCount(profile.boots_count || 0);
        setEarnings(profile.earnings_balance || 0);
      }

    } catch (error) {
      console.error('Error fetching earnings data:', error);
    }
  };

  const handleConvert = () => {
    setWithdrawModalVisible(true);
  };

  const handleWithdrawSubmit = async (amount: string, accountNumber: string, bankCode: string, bankName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found. Please log in again.');

    await initiateWithdraw(user.id, parseFloat(amount), accountNumber, bankCode, '', bankName);

    // Refresh earnings after successful withdrawal
    await fetchEarnings();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F6F4F1] dark:bg-black overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center gap-5 px-5 mt-[5px]">
        <TouchableOpacity onPress={() => router.back()}>
          <Arrow />
        </TouchableOpacity>
        <Text className="text-[#EF5323] text-[14px] font-medium">Earnings</Text>
      </View>

      {/* Earnings Card */}
      <View className="px-5 mt-8">
        <View className="bg-[#EF5323] rounded-[20px] p-6 h-[202px]">
          {/* Top Row: Label + Convert Button */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white/80 text-[12px]">Current Month Earnings</Text>
            <TouchableOpacity
              onPress={handleConvert}
              className="flex-row items-center bg-white/20 px-4 py-2 rounded-full gap-2"
            >
              <Deposit width={18} height={18} color="white" />
              <Text className="text-white text-[14px] font-medium">Withdraw</Text>
            </TouchableOpacity>
          </View>

          {/* Amount Display */}
          <View className="flex-row items-start mb-6">
            <Text className="text-white text-[24px] font-bold mt-1">₦</Text>
            <Text className="text-white text-[34px] font-bold leading-[40px]">
              {earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Boots Count */}
          <View className="self-start bg-white/20 px-4 py-2 rounded-full">
            <Text className="text-white text-[14px]">Boots Count: {bootsCount}</Text>
          </View>
        </View>
      </View>

      <WithdrawModal
        visible={withdrawModalVisible}
        onClose={() => setWithdrawModalVisible(false)}
        onSubmit={handleWithdrawSubmit}
        earningsBalance={earnings}
      />
    </SafeAreaView>
  );
};

export default Earnings;
