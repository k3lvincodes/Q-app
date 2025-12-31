import { Feather } from '@expo/vector-icons';
import { Stack, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerIcon from '../../assets/svg/hamburger.svg';
import Logo from '../../assets/svg/logo.svg';
import AdminMenu from '../../components/Admin/AdminMenu';
import { supabase } from '../../utils/supabase';

interface SubscriptionItem {
    id: string;
    user: string;
    serviceName: string;
    status: string;
    image: string;
    url?: string;
    price: number;
    email: string;
    renewalDate: string;
    membersLimit: number;
    currentMembers: number; // Placeholder
}

const AdminSubscriptions = () => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const [approvalExpanded, setApprovalExpanded] = useState(false);
    const [activeExpanded, setActiveExpanded] = useState(false);

    // Data States
    const [stats, setStats] = useState({
        active: 0,
        pending: 0,
        cancelled: 0,
        revenue: 0
    });
    const [queue, setQueue] = useState<SubscriptionItem[]>([]);
    const [activeSubs, setActiveSubs] = useState<SubscriptionItem[]>([]);

    const fetchData = async () => {
        try {
            // 1. Fetch User Subscriptions with joins
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select(`
                    *,
                    subscription_services (name, image_url),
                    subscription_plans (price_per_member, members_limit),
                    profiles (full_name, email, avatar_url)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                let activeCount = 0;
                let pendingCount = 0;
                let cancelledCount = 0;
                let revenue = 0;
                const newQueue: SubscriptionItem[] = [];
                const newActive: SubscriptionItem[] = [];

                data.forEach((sub: any) => {
                    const status = sub.status || 'pending';
                    const price = sub.subscription_plans?.price_per_member || 0;

                    // Stats
                    if (status === 'active') {
                        activeCount++;
                        revenue += price;
                        newActive.push(formatSubscription(sub));
                    } else if (status === 'pending' || status === 'pending_approval') {
                        pendingCount++;
                        newQueue.push(formatSubscription(sub));
                    } else if (status === 'cancelled') {
                        cancelledCount++;
                    }
                });

                setStats({
                    active: activeCount,
                    pending: pendingCount,
                    cancelled: cancelledCount,
                    revenue: revenue
                });
                setQueue(newQueue);
                setActiveSubs(newActive);
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const formatSubscription = (sub: any): SubscriptionItem => ({
        id: sub.id,
        user: sub.profiles?.full_name || 'Unknown',
        email: sub.profiles?.email || '',
        serviceName: sub.subscription_services?.name || 'Unknown Service',
        status: sub.status,
        image: sub.profiles?.avatar_url || sub.subscription_services?.image_url || 'https://i.pravatar.cc/100', // Fallback
        url: `joinq.com/c/${sub.subscription_services?.name?.toLowerCase().replace(/\s/g, '-') || 'service'}`, // Mock URL generation
        price: sub.subscription_plans?.price_per_member || 0,
        renewalDate: sub.renewal_date ? new Date(sub.renewal_date).toLocaleDateString() : 'N/A',
        membersLimit: sub.subscription_plans?.members_limit || 0,
        currentMembers: 1 // Placeholder hardcoded
    });

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-6 py-4 mt-[0px] flex-row justify-between items-center bg-white">
                <View className="flex-row items-center gap-2">
                    <Logo width={35} height={35} />
                    <Text className="text-xl font-bold tracking-tighter">jointheQ</Text>
                </View>
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <HamburgerIcon width={24} height={24} />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-6"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Search and Add New */}
                <View className="flex-row items-center justify-between mt-4 mb-6">
                    <View className="flex-row items-center bg-[#FFF5EE] rounded-[9px] px-2 h-[30px] w-[162px] mr-4 border border-[#FFE4C4]">
                        <Feather name="search" size={16} color="#E9967A" />
                        <TextInput
                            className="flex-1 ml-2 text-black text-xs h-full py-0"
                            placeholder="Search ..."
                            placeholderTextColor="#E9967A"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        className="flex-row items-center"
                        onPress={() => router.push('/(admin)/add-subscription')}
                    >
                        <Text className="text-[#FF7F50] mr-1 font-medium">Add New</Text>
                        <Feather name="plus-circle" size={18} color="#FF7F50" />
                    </TouchableOpacity>
                </View>

                {/* Stats Cards */}
                <View className="gap-4 mb-8">
                    {/* Total Active Subscriptions */}
                    <View className="bg-[#FFF5EE] p-6 rounded-2xl">
                        <Text className="text-[22px] font-bold text-black mb-2">Total Active Subscriptions</Text>
                        <Text className="text-sm font-bold text-[#333]">{stats.active.toLocaleString()}</Text>
                    </View>

                    {/* Pending Renewals (Placeholder Logic: using Pending Count for now or 0) */}
                    <View className="bg-[#FFF5EE] p-6 rounded-2xl">
                        <Text className="text-[22px] font-bold text-black mb-2">Pending Approvals</Text>
                        <Text className="text-sm font-bold text-[#333]">{stats.pending}</Text>
                    </View>

                    {/* Cancelled Subscriptions */}
                    <View className="bg-[#FFF5EE] p-6 rounded-2xl">
                        <Text className="text-[22px] font-bold text-black mb-1">Cancelled Subscriptions</Text>
                        <Text className="text-sm text-gray-600 mb-2"><Text className="font-bold text-black">{stats.cancelled}</Text> All Time</Text>
                    </View>

                    {/* Monthly Revenue */}
                    <View className="bg-[#FFF5EE] p-6 rounded-2xl">
                        <Text className="text-[22px] font-bold text-black mb-2">Monthly Revenue</Text>
                        <Text className="text-sm font-normal text-[#333]">₦{stats.revenue.toLocaleString()}</Text>
                    </View>

                    {/* Top Shared Services (Static for now) */}
                    <View className="bg-[#FFF5EE] p-6 rounded-2xl">
                        <Text className="text-[22px] font-bold text-black mb-2">Top Shared Services</Text>
                        <Text className="text-sm text-[#333]">Netflix, Spotify, Canva, ChatGPT</Text>
                    </View>
                </View>

                {/* Active Subscription Card (Show first one if exists) */}
                {activeSubs.length > 0 && (
                    <View className="bg-[#F9F9F9] border border-gray-200 rounded-2xl p-4 mb-6">
                        <View className="flex-row justify-between items-start mb-2">
                            <Text className="font-bold text-black">#{activeSubs[0].id.substring(0, 8).toUpperCase()}</Text>
                            <View className="bg-[#A8E6CF] px-3 py-1 rounded-full">
                                <Text className="text-xs text-[#006400] font-bold">Active</Text>
                            </View>
                        </View>
                        <Text className="text-xl font-bold text-black mb-1">{activeSubs[0].serviceName}</Text>
                        <Text className="text-gray-500 text-sm mb-2">
                            by {activeSubs[0].user} ({activeSubs[0].email}) • Account Access
                        </Text>
                        <Text className="text-gray-500 text-sm mb-4">{activeSubs[0].currentMembers} / {activeSubs[0].membersLimit} Members</Text>

                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-400 text-xs">Next Renewal Date: {activeSubs[0].renewalDate}</Text>
                            <TouchableOpacity
                                className="flex-row items-center"
                                onPress={() => setActiveExpanded(!activeExpanded)}
                            >
                                <Text className="text-[#FF7F50] mr-1 font-medium">View</Text>
                                <Feather name={activeExpanded ? "chevron-up" : "chevron-down"} size={16} color="#FF7F50" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Pending Approval Alert */}
                {stats.pending > 0 && (
                    <View className="bg-[#F9F9F9] border border-[#FFD700] rounded-2xl p-4 mb-6">
                        <View className="flex-row justify-between items-start">
                            <View className="flex-1 mr-2">
                                <View className="flex-row items-center mb-1">
                                    <Feather name="alert-triangle" size={16} color="#DAA520" className="mr-2" />
                                    <Text className="font-bold text-black ml-2 flex-1">
                                        You have [{stats.pending}] subscriptions pending approval.
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                className="flex-row items-center self-center"
                                onPress={() => setApprovalExpanded(!approvalExpanded)}
                            >
                                <Text className="text-[#FF7F50] mr-1 font-medium text-xs">Approve</Text>
                                <Feather name={approvalExpanded ? "chevron-up" : "chevron-down"} size={16} color="#FF7F50" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Queue List */}
                <View className="gap-3 mb-10">
                    {queue.length === 0 ? (
                        <Text className="text-gray-500 text-center">No pending requests.</Text>
                    ) : (
                        queue.map((item) => (
                            <View key={item.id} className="bg-[#FFF5EE] rounded-xl p-3 flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <View className="relative">
                                        <Image
                                            source={{ uri: item.image }}
                                            className="w-10 h-10 rounded-full border-2 border-[#8B4513]"
                                        />
                                        <View className="absolute top-0 right-0 bg-blue-500 w-3 h-3 rounded-full border border-white" />
                                    </View>
                                    <Text className="text-[#FF7F50] ml-3 text-xs flex-1" numberOfLines={1}>{item.url}</Text>
                                </View>
                                <Text className="text-[#FF7F50] text-xs ml-2">Pending</Text>
                            </View>
                        ))
                    )}
                </View>

            </ScrollView>

            <AdminMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                navigation={router}
            />
        </SafeAreaView>
    );
};

export default AdminSubscriptions;
