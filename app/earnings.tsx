import { router } from "expo-router";
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../assets/svg/arrow.svg";
import Convert from "../assets/svg/convert.svg";
import { supabase } from "../utils/supabase";

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
}

const Earnings = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase.from('transactions').select('*');
        if (error) throw error;
        setTransactions(data as any);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const totalEarnings = transactions.reduce((acc, tx) => acc + (tx.type === 'credit' ? tx.amount : 0), 0);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
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

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-row items-center gap-5 px-5 mt-[0px]">
        <TouchableOpacity onPress={() => router.back()}>
          <Arrow />
        </TouchableOpacity>
        <Text className="text-bg text-xl ">Earnings</Text>
      </View>
      <View className="px-5 pt-10">
        <View className="bg-bg rounded-lg px-5 py-5">
          <View className=" flex-row  justify-between items-center">
            <Text className="text-white">Current Month Earnings</Text>
            <View className="flex-row bg-black/10 rounded-full items-center p-3 gap-3">
              <Convert />
              <Text className="text-white">Convert</Text>
            </View>
          </View>
          <Text className="text-white">
            ₦ <Text className="text-5xl font-bold">{totalEarnings.toFixed(2)}</Text>{" "}
          </Text>
          <Text className="bg-black/10 rounded-full w-[9.1rem] px-5  mt-5 py-3 text-white">Loop Count: {transactions.length}</Text>
        </View>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View className="flex-row justify-between items-center mt-5">
              <Text>{item.description}</Text>
              <Text className={item.type === 'credit' ? 'text-green-500' : 'text-red-500'}>
                {item.type === 'credit' ? '+' : '-'} ₦{item.amount}
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

export default Earnings;
