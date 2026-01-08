import { Feather } from '@expo/vector-icons';
import { Stack, router, useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, ScrollView, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerIcon from '../../assets/svg/hamburger.svg';
import Logo from '../../assets/svg/logo.svg';
import AdminMenu from '../../components/Admin/AdminMenu';
import { supabase } from '../../utils/supabase';

const Dashboard = () => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [backPressedOnce, setBackPressedOnce] = useState(false);
    const [stats, setStats] = useState({
        revenue: 0,
        users: 0,
        groups: 0,
        systemLog: 0,
        urgentAlerts: 0,
        warnings: 0
    });
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            const backAction = () => {
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
        }, [backPressedOnce])
    );

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Get current month start and end dates
                const now = new Date();
                const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

                // Fetch all active subscriptions from current month
                const { data: subscriptions, error: subsError } = await supabase
                    .from('user_subscriptions')
                    .select(`
                        *,
                        subscription_plans (price_per_member)
                    `)
                    .in('status', ['active', 'confirmed', 'joined'])
                    .gte('created_at', currentMonthStart.toISOString())
                    .lte('created_at', currentMonthEnd.toISOString());

                if (subsError) throw subsError;

                // Calculate revenue from subscription prices
                const totalRevenue = subscriptions?.reduce((sum, sub) => {
                    const price = sub.subscription_plans?.price_per_member || 0;
                    return sum + price;
                }, 0) || 0;

                // Fetch Users Count
                const { count: usersCount, error: usersError } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                if (usersError) throw usersError;

                // Fetch Groups Count (Subscription Services)
                const { count: groupsCount, error: groupsError } = await supabase
                    .from('subscription_services')
                    .select('*', { count: 'exact', head: true });

                if (groupsError) throw groupsError;

                // Fetch System Log Count (Notifications)
                const { count: logsCount, error: logsError } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true });

                if (logsError) throw logsError;

                // Fetch Urgent Alerts (Open Support Tickets)
                const { count: ticketsCount, error: ticketsError } = await supabase
                    .from('support_tickets')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'Open');

                if (ticketsError) throw ticketsError;


                setStats({
                    revenue: totalRevenue,
                    users: usersCount || 0,
                    groups: groupsCount || 0,
                    systemLog: logsCount || 0,
                    urgentAlerts: ticketsCount || 0,
                    warnings: 0 // Placeholder or another metric
                });

            } catch (error) {
                console.error('Error fetching admin stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Realtime Subscription for Urgent Alerts (Open Tickets)
        const subscription = supabase
            .channel('public:dashboard_stats')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'support_tickets'
            }, () => {
                // Refresh specific stats or all stats
                fetchStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-mainBg justify-center items-center">
                <ActivityIndicator size="large" color="#EF5323" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-mainBg">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-6 py-4 mt-[0px] flex-row justify-between items-center bg-mainBg">
                <View className="flex-row items-center gap-2">
                    <Logo width={35} height={35} />
                    <Text className="text-xl font-bold tracking-tighter">jointheQ</Text>
                </View>
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <HamburgerIcon width={24} height={24} />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6">

                {/* Overview Header */}
                <Text className="text-3xl font-bold font-segoe text-black mb-6 mt-4">Overview</Text>

                {/* Revenue */}
                <View className="bg-[#FFF8F0] rounded-3xl p-6 mb-4">
                    <Text className="text-xl font-segoe text-black mb-4">Revenue</Text>
                    <View className="flex-row items-baseline justify-between">
                        <Text className="text-5xl font-bold font-segoe-bold text-black">
                            ₦{stats.revenue.toLocaleString()}
                        </Text>
                        <View className="flex-row items-center gap-1">
                            <Text className="text-xl text-black">--</Text>
                        </View>
                    </View>
                </View>

                {/* Users */}
                <View className="bg-[#FFF8F0] rounded-3xl p-6 mb-4">
                    <Text className="text-xl font-segoe text-black mb-4">Users</Text>
                    <View className="flex-row items-baseline justify-between">
                        <Text className="text-5xl font-bold font-segoe-bold text-black">
                            {stats.users.toLocaleString()}
                        </Text>
                        <View className="flex-row items-center gap-1">
                            <Text className="text-xl text-black">--</Text>
                        </View>
                    </View>
                </View>

                {/* Groups */}
                <View className="bg-[#FFF8F0] rounded-3xl p-6 mb-4">
                    <Text className="text-xl font-segoe text-black mb-4">Groups</Text>
                    <View className="flex-row items-baseline justify-between">
                        <Text className="text-5xl font-bold font-segoe-bold text-black">
                            {stats.groups.toLocaleString()}
                        </Text>
                        <View className="flex-row items-center gap-1">
                            <Text className="text-xl text-black">--</Text>
                        </View>
                    </View>
                </View>

                {/* System Log */}
                <View className="bg-[#FFF8F0] rounded-3xl p-6 mb-4">
                    <Text className="text-xl font-segoe text-black mb-4">System Log</Text>
                    <View className="flex-row items-baseline justify-between">
                        <Text className="text-5xl font-bold font-segoe-bold text-black">
                            {stats.systemLog.toLocaleString()}
                        </Text>
                        <View className="flex-row items-center gap-1">
                            <Text className="text-xl text-black">--</Text>
                        </View>
                    </View>
                </View>

                {/* Bottom Row */}
                <View className="flex-row gap-4 mb-4">
                    {/* Urgent Alert - Red - Longer */}
                    <View className="flex-[1.6] bg-[#FF0000] rounded-3xl p-5 justify-between h-[114px]">
                        <View className="flex-row items-center gap-2">
                            <Feather name="alert-triangle" size={20} color="black" />
                            <Text className="text-base font-bold text-black">Urgent Alert</Text>
                        </View>
                        <View className="mt-auto flex-row items-baseline gap-2">
                            <Text className="text-4xl font-bold text-black">{stats.urgentAlerts}</Text>
                            <View className="flex-row items-center">
                                <Text className="text-sm text-black">Tickets</Text>
                            </View>
                        </View>
                    </View>

                    {/* Warnings - Yellow - Shorter - Stacked */}
                    <View className="flex-1 bg-[#FFE500] rounded-3xl p-4 justify-between h-[114px] items-center">
                        <View className="flex-row items-center gap-1 mb-2">
                            <Feather name="alert-triangle" size={16} color="black" />
                            <Text className="text-sm font-bold text-black text-center">Warnings</Text>
                        </View>
                        <View className="items-center justify-center flex-1">
                            <Text className="text-2xl font-bold text-black mb-1">{stats.warnings}</Text>
                            <Text className="text-xs text-black">Issues</Text>
                        </View>
                    </View>
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

export default Dashboard;
