import { router } from "expo-router";
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../assets/svg/arrow.svg";
import Wallet from "../assets/svg/wallet2.svg";
import { supabase } from "../utils/supabase";

interface NotificationItem {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description?: string;
  created_at: string;
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

const Notification = () => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'transactions'>('notifications');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const [notifResponse, transResponse] = await Promise.all([
          supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        if (notifResponse.error) throw notifResponse.error;
        if (transResponse.error) throw transResponse.error;

        setNotifications(notifResponse.data || []);
        setTransactions(transResponse.data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView className="flex-1 bg-[#F6F4F1]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4 mt-[0px]">
        <View className="flex-row items-center gap-5">
          <TouchableOpacity onPress={() => router.back()}>
            <Arrow />
          </TouchableOpacity>
          <Text className="text-[#1E293B] text-xl font-bold">Notifications</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text className="text-[#EF5323] text-sm">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View className="flex-row mx-5 mb-4 bg-white rounded-full p-1">
        <TouchableOpacity
          onPress={() => setActiveTab('notifications')}
          className={`flex-1 py-3 rounded-full ${activeTab === 'notifications' ? 'bg-[#EF5323]' : ''}`}
        >
          <Text className={`text-center font-medium ${activeTab === 'notifications' ? 'text-white' : 'text-gray-500'}`}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('transactions')}
          className={`flex-1 py-3 rounded-full ${activeTab === 'transactions' ? 'bg-[#EF5323]' : ''}`}
        >
          <Text className={`text-center font-medium ${activeTab === 'transactions' ? 'text-white' : 'text-gray-500'}`}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 mx-5 bg-white rounded-2xl shadow-sm">
        {activeTab === 'notifications' ? (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-gray-400">No notifications yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => !item.is_read && handleMarkAsRead(item.id)}
                className={`flex-row items-start py-4 border-b border-gray-100 ${item.is_read ? 'opacity-50' : ''}`}
              >
                <View className="bg-[#EF5323]/10 rounded-full p-2 mr-3">
                  <Wallet width={20} height={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800">{item.message}</Text>
                  <Text className="text-gray-400 text-xs mt-1">{formatTimeAgo(item.created_at)}</Text>
                </View>
                {!item.is_read && (
                  <View className="w-2 h-2 bg-[#EF5323] rounded-full mt-2" />
                )}
              </TouchableOpacity>
            )}
          />
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-gray-400">No transactions yet</Text>
              </View>
            }
            ListFooterComponent={
              transactions.length > 0 ? (
                <TouchableOpacity
                  onPress={() => router.push('/transactions')}
                  className="py-4 items-center"
                >
                  <Text className="text-[#EF5323] font-medium">View all transactions</Text>
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item }) => (
              <View className="flex-row justify-between items-start py-4 border-b border-gray-100">
                <View className="flex-1">
                  <Text className={`font-semibold ${item.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {item.type === 'credit' ? '+ ' : '- '}₦{item.amount.toLocaleString()}
                  </Text>
                  {item.description && (
                    <Text className="text-gray-600 text-sm mt-1">{item.description}</Text>
                  )}
                  <Text className="text-gray-400 text-xs mt-1">{formatTimeAgo(item.created_at)}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${item.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Text className={`text-xs capitalize ${item.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {item.type}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default Notification;

