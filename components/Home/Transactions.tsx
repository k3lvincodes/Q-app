import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

interface Transaction {
  id: number;
  user_id: string;
  amount: number;
  type: string;
  description?: string;
  related_request_id?: number;
  created_at: string;
}

interface TransactionsProps {
  transactions: Transaction[];
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const Transactions = ({ transactions }: TransactionsProps) => {
  return (
    <View className='pt-4 pb-20'>
      <View className='flex-row justify-between items-center mb-4 px-1'>
        <Text className='font-bold text-[14px] text-[#1E293B] dark:text-gray-200'>Recent Transactions</Text>
        <Link href={'/transactions'} className='text-[#EF5323] font-medium text-[14px]'>View all</Link>
      </View>

      {transactions && transactions.length > 0 ? (
        transactions.slice(0, 3).map((tx) => (
          <View
            key={tx.id}
            className='flex-row items-center bg-white dark:bg-gray-900 p-3 rounded-2xl mb-3 shadow-sm shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-gray-800'
          >
            {/* Icon Circle */}
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${tx.type === 'credit' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
              }`}>
              <Ionicons
                name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                size={16}
                color={tx.type === 'credit' ? '#16A34A' : '#EF4444'}
              />
            </View>

            {/* Content */}
            <View className='flex-1 pr-4'>
              <Text
                className='font-semibold text-[#1E293B] dark:text-gray-200 text-[12px] mb-0.5'
                numberOfLines={1}
              >
                {tx.description || (tx.type === 'credit' ? 'Deposit' : 'Transfer')}
              </Text>
              <Text className='text-gray-400 text-[10px]'>
                {formatDate(tx.created_at)}
              </Text>
            </View>

            {/* Amount */}
            <Text className={`font-bold text-[12px] ${tx.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-[#1E293B] dark:text-white'
              }`}>
              {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
            </Text>
          </View>
        ))
      ) : (
        <View className="items-center py-6 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <Text className="text-center text-[#94A3B8] dark:text-gray-500 text-[12px]">No recent transactions found.</Text>
        </View>
      )}
    </View>
  )
}

export default Transactions