import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../assets/svg/arrow.svg";
import Link from "../assets/svg/linkbt.svg";
import Refer from "../assets/svg/refer.svg";
import { supabase } from "../utils/supabase";

const Invite = () => {
  const [user, setUser] = useState<{ full_name: string; id: string } | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInviteData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, id')
          .eq('id', authUser.id)
          .single();

        if (profile) setUser(profile);

        // Attempt to count referrals
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('referred_by', authUser.id);

        if (!error && count !== null) {
          setReferralCount(count);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInviteData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#EF5323" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <View className="px-5">
        <View className="flex-row items-center gap-5 pb-10 mt-[0px]">
          <TouchableOpacity onPress={() => router.back()}>
            <Arrow />
          </TouchableOpacity>
          <Text className="text-bg text-xl">Invite and earn</Text>
        </View>
        <View className="flex-col items-center">
          <Text className="font-bold text-center pb-5 ">
            Refer friends and earn loop coins
          </Text>
          <Refer width={150} height={150} />
          <Text className="border border-dashed border-gray-400 w-full mb-5 text-center py-2 text-gray-700 rounded mt-20">
            {user ? `https://joinq.ng/register?ref=${user.full_name}` : '...'}
          </Text>
          <Link width={40} height={40} />
          <Text className="text-gray-700 pt-10">
            {referralCount === 0 ? "No referrals yet" : `${referralCount} Referral${referralCount > 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Invite;

