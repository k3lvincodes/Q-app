import { Feather } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerIcon from '../../../assets/svg/hamburger.svg';
import Logo from '../../../assets/svg/logo.svg';
import AdminMenu from '../../../components/Admin/AdminMenu';
import { supabase } from '../../../utils/supabase';

interface SupportTicket {
    id: string;
    ticketId: string;
    status: 'Open' | 'In Progress' | 'Resolved';
    priority: 'High' | 'Medium' | 'Low';
    subject: string;
    message: string;
    user: string;
    email: string;
    account: string;
    category: string;
    lastUpdate: string;
    created: string;
}

const Support = () => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            console.log('Admin Fetch Error:', error);
            console.log('Admin Fetch Data:', data);

            if (error) throw error;

            if (data) {
                console.log('Mapping tickets...');
                const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : 'Open';
                const formattedTickets: SupportTicket[] = data.map((item: any) => ({
                    id: item.id,
                    ticketId: item.ticket_id || `SUP-${item.id?.substring(0, 4).toUpperCase()}`,
                    status: capitalize(item.status),
                    priority: 'Medium', // Default since column removed
                    subject: item.subject,
                    message: item.message,
                    user: 'User ' + (item.user_id ? item.user_id.substring(0, 4) : 'Unknown'),
                    email: item.email || 'No Email',
                    account: 'General', // Default
                    category: 'General', // Default
                    lastUpdate: item.updated_at || item.created_at, // Keep raw ISO string for calc
                    created: item.created_at // Keep raw ISO string for calc
                }));
                setTickets(formattedTickets);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTickets();

        const subscription = supabase
            .channel('public:admin_support_tickets')
            .on('postgres_changes', {
                event: '*', // Listen for inserts and updates
                schema: 'public',
                table: 'support_tickets'
            }, () => {
                // Simply refetch for now to handle all related data (profiles etc)
                // Optimizing to manual update is possible but refetch ensures data integrity
                fetchTickets();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTickets();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-red-100 text-red-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Resolved': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            case 'Low': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // --- Stats Calculations ---
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // Helpers
    const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();

    // 1. Open Tickets (Count & Trend of NEW tickets today vs yesterday)
    const openCount = tickets.filter(t => t.status === 'Open').length;
    const newOpenToday = tickets.filter(t => t.status === 'Open' && isSameDay(new Date(t.created), now)).length;
    const newOpenYesterday = tickets.filter(t => t.status === 'Open' && isSameDay(new Date(t.created), yesterday)).length;
    const openTrendVal = newOpenYesterday === 0 ? newOpenToday * 100 : ((newOpenToday - newOpenYesterday) / newOpenYesterday) * 100;
    const openTrend = `${openTrendVal >= 0 ? '+' : ''}${openTrendVal.toFixed(0)}%`;

    // 2. In Progress (Count & Trend of active today vs yesterday - approximated by update time)
    const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;
    const activeToday = tickets.filter(t => t.status === 'In Progress' && isSameDay(new Date(t.lastUpdate), now)).length;
    const activeYesterday = tickets.filter(t => t.status === 'In Progress' && isSameDay(new Date(t.lastUpdate), yesterday)).length;
    const progressTrendVal = activeYesterday === 0 ? activeToday * 100 : ((activeToday - activeYesterday) / activeYesterday) * 100;
    const progressTrend = `${progressTrendVal >= 0 ? '+' : ''}${progressTrendVal.toFixed(0)}%`;

    // 3. Resolved Today (Count & Trend vs Yesterday)
    const resolvedTodayCount = tickets.filter(t => t.status === 'Resolved' && isSameDay(new Date(t.lastUpdate), now)).length;
    const resolvedYesterdayCount = tickets.filter(t => t.status === 'Resolved' && isSameDay(new Date(t.lastUpdate), yesterday)).length;
    const resolvedTrendVal = resolvedYesterdayCount === 0 ? resolvedTodayCount * 100 : ((resolvedTodayCount - resolvedYesterdayCount) / resolvedYesterdayCount) * 100;
    const resolvedTrend = `${resolvedTrendVal >= 0 ? '+' : ''}${resolvedTrendVal.toFixed(0)}%`;

    // 4. Avg Response Time (For Resolved Today vs Yesterday)
    const calcAvgTime = (ticketList: SupportTicket[]) => {
        if (ticketList.length === 0) return 0;
        const totalMs = ticketList.reduce((acc, t) => acc + (new Date(t.lastUpdate).getTime() - new Date(t.created).getTime()), 0);
        return totalMs / ticketList.length;
    };

    const resolvedTodayList = tickets.filter(t => t.status === 'Resolved' && isSameDay(new Date(t.lastUpdate), now));
    const resolvedYesterdayList = tickets.filter(t => t.status === 'Resolved' && isSameDay(new Date(t.lastUpdate), yesterday));

    const avgMsToday = calcAvgTime(resolvedTodayList);
    const avgMsYesterday = calcAvgTime(resolvedYesterdayList);

    // Format Display
    const avgHours = avgMsToday / (1000 * 60 * 60);
    const avgResponseTime = avgHours < 1 ? `${Math.round(avgMsToday / (1000 * 60))}m` : `${avgHours.toFixed(1)}h`;

    // Trend (Difference in minutes)
    const diffMins = Math.round((avgMsToday - avgMsYesterday) / (1000 * 60));
    const responseTrend = `${diffMins > 0 ? '+' : ''}${diffMins} min`;

    // Helper for Trend Icon
    const getTrendIcon = (percentage: string) => {
        return percentage.includes('-') ? 'trending-down' : 'trending-up';
    };

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

            <ScrollView
                className="flex-1 px-6"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Search Bar & Filter */}
                <View className="flex-row items-center justify-between mb-8 mt-2">
                    <View className="flex-row items-center bg-[#FFF5EE] rounded-[9px] px-2 h-[30px] w-[162px] mr-4 border border-[#FFE4C4]">
                        <Feather name="search" size={16} color="#E9967A" />
                        <TextInput
                            placeholder="Search ..."
                            placeholderTextColor="#E9967A"
                            className="flex-1 ml-2 text-black text-xs h-full py-0"
                        />
                    </View>
                    <TouchableOpacity className="flex-row items-center bg-[#FFE4D6] px-4 py-3 rounded-xl">
                        <Feather name="filter" size={20} color="#E85D36" />
                        <Text className="text-[#E85D36] font-segoe ml-2 font-bold">Filter</Text>
                    </TouchableOpacity>
                </View>

                {/* Header Titles */}
                <Text className="text-[#E85D36] font-bold text-[20px] mb-1">Support Center</Text>
                <Text className="text-[#E85D36] text-[20px] mb-6">Manage customer support tickets and inquiries</Text>

                {/* Stats Cards */}
                <View className="bg-[#FFF8F0] rounded-3xl p-6 mb-4">
                    <View className="flex-row justify-between items-start mb-4">
                        <Text className="text-xl text-black">Open Tickets</Text>
                        <Feather name="message-square" size={24} color="#E85D36" />
                    </View>
                    <View className="flex-row justify-between items-end">
                        <Text className="text-4xl font-bold">{openCount}</Text>
                        <View className="flex-row items-center">
                            <Text className="text-black text-base font-medium mr-1">{openTrend}</Text>
                            <Feather name={getTrendIcon(openTrend)} size={16} color="black" />
                        </View>
                    </View>
                </View>

                <View className="bg-[#FFF8F0] rounded-3xl p-6 mb-4">
                    <View className="flex-row justify-between items-start mb-4">
                        <Text className="text-xl text-black">In Progress</Text>
                        <Feather name="clock" size={24} color="#E85D36" />
                    </View>
                    <View className="flex-row justify-between items-end">
                        <Text className="text-4xl font-bold">{inProgressCount}</Text>
                        <View className="flex-row items-center">
                            <Text className="text-black text-base font-medium mr-1">{progressTrend}</Text>
                            <Feather name={getTrendIcon(progressTrend)} size={16} color="black" />
                        </View>
                    </View>
                </View>

                <View className="bg-[#FFF8F0] rounded-3xl p-6 mb-4">
                    <View className="flex-row justify-between items-start mb-4">
                        <Text className="text-xl text-black">Resolved Today</Text>
                        <Feather name="check-circle" size={24} color="green" />
                    </View>
                    <View className="flex-row justify-between items-end">
                        <Text className="text-4xl font-bold">{resolvedTodayCount}</Text>
                        <View className="flex-row items-center">
                            <Text className="text-black text-base font-medium mr-1">{resolvedTrend}</Text>
                            <Feather name={getTrendIcon(resolvedTrend)} size={16} color="black" />
                        </View>
                    </View>
                </View>

                <View className="bg-[#FFF8F0] rounded-3xl p-6 mb-8">
                    <View className="flex-row justify-between items-start mb-4">
                        <Text className="text-xl text-black">Avg Response Time</Text>
                        <Feather name="alert-circle" size={24} color="#4A90E2" />
                    </View>
                    <View className="flex-row justify-between items-end">
                        <Text className="text-4xl font-bold">{avgResponseTime}</Text>
                        <View className="flex-row items-center">
                            <Text className="text-black text-base font-medium mr-1">{responseTrend}</Text>
                            <Feather name={getTrendIcon(responseTrend)} size={16} color="black" />
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <View className="flex-row bg-[#FFF8F0] p-1 rounded-xl mb-6">
                    <TouchableOpacity className="flex-1 bg-white py-2 rounded-lg shadow-sm">
                        <Text className="text-center font-bold text-black text-xs">Support Tickets</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 py-2">
                        <Text className="text-center text-gray-500 text-xs">Knowledge Base</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 py-2">
                        <Text className="text-center text-gray-500 text-xs">Settings</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Tickets List */}
                <Text className="text-[#E85D36] font-bold text-[20px] mb-1">Recent Support Tickets</Text>
                <Text className="text-[#E85D36] text-[20px] mb-4">Manage and respond to customer inquiries</Text>

                {
                    tickets.length === 0 && !loading ? (
                        <Text className="text-gray-500 text-center my-4">No support tickets found.</Text>
                    ) : (
                        tickets.map((ticket) => (
                            <TouchableOpacity
                                key={ticket.id}
                                className="bg-white border border-[#E0E0E0] rounded-2xl p-4 mb-3 shadow-sm"
                                onPress={() => router.push(`/(admin)/support/${ticket.id}`)}
                            >
                                <View className="flex-row justify-between items-start mb-3">
                                    <View className="flex-row gap-2 flex-1">
                                        <Text className="font-bold text-xs text-black">{ticket.ticketId}</Text>
                                        <View className={`px-2 py-0.5 rounded ${getStatusColor(ticket.status).split(' ')[0]}`}>
                                            <Text className={`text-[10px] font-medium ${getStatusColor(ticket.status).split(' ')[1]}`}>{ticket.status}</Text>
                                        </View>
                                        <View className={`px-2 py-0.5 rounded ${getPriorityColor(ticket.priority).split(' ')[0]}`}>
                                            <Text className={`text-[10px] font-medium ${getPriorityColor(ticket.priority).split(' ')[1]}`}>{ticket.priority}</Text>
                                        </View>
                                    </View>
                                </View>

                                <Text className="font-bold text-sm text-black mb-2">{ticket.subject}</Text>
                                <Text className="text-xs text-gray-600 mb-0.5" numberOfLines={2}>{ticket.message}</Text>
                                <Text className="text-xs text-gray-600 mb-0.5">by {ticket.user} ({ticket.email})</Text>
                                <Text className="text-xs text-gray-600 mb-3">{ticket.account}</Text>

                                <View className="flex-row justify-between items-center">
                                    <View>
                                        <Text className="text-[10px] text-gray-400">Last update: {new Date(ticket.lastUpdate).toLocaleDateString()}</Text>
                                        <Text className="text-[10px] text-gray-400">Created {new Date(ticket.created).toLocaleDateString()}</Text>
                                    </View>
                                    <View className="flex-row gap-3">
                                        <View className="w-8 h-8 rounded-full bg-[#FFF8F0] items-center justify-center">
                                            <Feather name="eye" size={14} color="#E85D36" />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )
                }

                <View className="h-10" />

            </ScrollView >

            <AdminMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                navigation={router}
            />
        </SafeAreaView >
    );
};

export default Support;
