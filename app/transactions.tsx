import { router } from "expo-router";
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../assets/svg/arrow.svg";
import { supabase } from "../utils/supabase";

interface Transaction {
    id: number;
    user_id: string;
    amount: number;
    type: string;
    description?: string;
    related_request_id?: number;
    created_at: string;
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const Transactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTransactions(data || []);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();

        // Setup realtime subscription
        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase
                .channel('transactions-all')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'transactions',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        setTransactions((prev) => [payload.new as Transaction, ...prev]);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupRealtime();
    }, []);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-[#F6F4F1]">
                <ActivityIndicator size="large" color="#EF5323" />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-[#F6F4F1]">
                <Text>Error: {error.message}</Text>
            </SafeAreaView>
        );
    }

    const totalBalance = transactions.reduce(
        (acc, tx) => acc + (tx.type === 'credit' ? tx.amount : -tx.amount),
        0
    );

    return (
        <SafeAreaView className="flex-1 bg-[#F6F4F1]">
            {/* Header */}
            <View className="flex-row items-center gap-5 px-5 pb-4 mt-[0px]">
                <TouchableOpacity onPress={() => router.back()}>
                    <Arrow />
                </TouchableOpacity>
                <Text className="text-[#1E293B] text-xl font-bold">All Transactions</Text>
            </View>

            {/* Balance Summary */}
            <View className="mx-5 mb-4 p-4 bg-white rounded-2xl shadow-sm">
                <Text className="text-gray-500 text-sm">Current Balance</Text>
                <Text className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ₦{totalBalance.toLocaleString()}
                </Text>
            </View>

            {/* Transactions List */}
            <View className="flex-1 mx-5 bg-white rounded-2xl shadow-sm">
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={
                        <View className="items-center py-10">
                            <Text className="text-gray-400">No transactions yet</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View className="flex-row justify-between items-start py-4 border-b border-gray-100">
                            <View className="flex-1">
                                <Text className={`font-semibold text-lg ${item.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                                    {item.type === 'credit' ? '+ ' : '- '}₦{item.amount.toLocaleString()}
                                </Text>
                                {item.description && (
                                    <Text className="text-gray-600 mt-1">{item.description}</Text>
                                )}
                                <Text className="text-gray-400 text-xs mt-2">{formatDate(item.created_at)}</Text>
                            </View>
                            <View className={`px-3 py-1 rounded-full ${item.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                                <Text className={`text-xs capitalize font-medium ${item.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                                    {item.type}
                                </Text>
                            </View>
                        </View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
};

export default Transactions;
