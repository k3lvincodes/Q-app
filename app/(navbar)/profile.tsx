import Account from '@/components/Profile/Account';
import Others from '@/components/Profile/Others';
import User from '@/components/Profile/User';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from '../../assets/svg/arrow.svg';
import { supabase } from '../../utils/supabase';

interface User {
  full_name: string;
  email: string;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user logged in");

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUser(data as any);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleUpdateProfile = async (updatedUser: Partial<User>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { data, error } = await supabase
        .from('profiles')
        .update(updatedUser)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setUser(data as any);
    } catch (err) {
      setError(err as Error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="h-full justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="h-full justify-center items-center">
        <Text>Error: {error.message}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className='flex-1'>
      <View className="flex-row items-center gap-5 px-5 mt-[0px]">
        <TouchableOpacity onPress={() => router.back()}>
          <Arrow />
        </TouchableOpacity>
        <Text className="text-bg text-xl ">Profile</Text>
      </View>
      <ScrollView className='px-5 pt-5 pb-400 h-full '>
        <User user={user} onUpdate={handleUpdateProfile} />
        <Account />
        <Others />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;