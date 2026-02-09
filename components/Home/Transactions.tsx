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

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const Transactions = ({ transactions }: TransactionsProps) => {
  return (
    <View className='pt-8'>
      <View className='flex-row justify-between items-center mb-4'>
        <Text className='font-bold text-[14px] text-[#1E293B] dark:text-white'>Recent Transactions</Text>
        <Link href={'/transactions'} className='text-[#EF5323] font-medium text-[14px]'>View all</Link>
      </View>
      {transactions && transactions.length > 0 ? (
        transactions.slice(0, 3).map((tx) => (
          <View key={tx.id} className='flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800'>
            <View className='flex-1'>
              <Text className={`font-semibold text-[12px] ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                {tx.type === 'credit' ? '+ ' : '- '}₦{tx.amount.toLocaleString()}
              </Text>
              {tx.description && (
                <Text className='text-gray-500 dark:text-gray-400 text-sm mt-0.5' numberOfLines={1}>{tx.description}</Text>
              )}
              <Text className='text-gray-400 dark:text-gray-500 text-xs mt-1'>{formatDate(tx.created_at)}</Text>
            </View>
            <Text className='text-gray-500 dark:text-gray-400 capitalize'>{tx.type}</Text>
          </View>
        ))
      ) : (
        <Text className='pt-2 text-[#64748B] text-[12px]'>No Recent Transactions</Text>
      )}
    </View>
  )
}

export default Transactions