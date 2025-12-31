import { Feather } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerIcon from '../../assets/svg/hamburger.svg';
import Logo from '../../assets/svg/logo.svg';
import AdminMenu from '../../components/Admin/AdminMenu';
import { supabase } from '../../utils/supabase';

interface Group {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    serviceName: string;
    created: string;
    members: any[];
}

const Groups = () => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchGroups = async () => {
        try {
            // Fetch services and their subscribers
            const { data, error } = await supabase
                .from('subscription_services')
                .select(`
                    *,
                    user_subscriptions (
                        id,
                        status,
                        created_at,
                        profiles (full_name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedGroups: Group[] = data.map((service: any) => ({
                    id: service.id,
                    name: `joinq.com/c/${service.name.toLowerCase().replace(/\s/g, '-')}`, // Mock URL
                    status: 'active', // Default to active if exists
                    serviceName: service.name,
                    created: new Date(service.created_at).toLocaleDateString(),
                    members: service.user_subscriptions || []
                }));
                setGroups(formattedGroups);
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchGroups();
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const filteredGroups = groups.filter(g =>
        g.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity className="flex-row items-center">
                        <Text className="text-[#E85D36] font-segoe mr-1">All</Text>
                        <Feather name="chevron-down" size={20} color="#E85D36" />
                    </TouchableOpacity>
                </View>

                {/* Groups List */}
                {filteredGroups.length === 0 && !loading ? (
                    <Text className="text-gray-500 text-center">No groups found.</Text>
                ) : (
                    filteredGroups.map((sub) => (
                        <View key={sub.id} className="bg-white rounded-2xl mb-4 overflow-hidden">
                            <TouchableOpacity
                                onPress={() => toggleExpand(sub.id)}
                                className="flex-row items-center justify-between p-4 bg-white"
                            >
                                <Text className="flex-1 font-segoe text-base text-black mr-2" numberOfLines={1}>
                                    {sub.name}
                                </Text>

                                <View className={`px-3 py-1 rounded-lg mr-2 ${sub.status === 'active' ? 'bg-green-200' : 'bg-yellow-100'}`}>
                                    <Text className={`font-segoe ${sub.status === 'active' ? 'text-green-800' : 'text-yellow-800'}`}>
                                        {sub.status}
                                    </Text>
                                </View>

                                <Feather name="chevron-down" size={20} color="black" />
                            </TouchableOpacity>

                            {/* Expanded Details */}
                            {expandedId === sub.id && (
                                <View className="p-6 bg-white border-t border-gray-100">
                                    <View className="flex-row justify-between mb-4">
                                        <View className={`px-3 py-1 rounded-lg ${sub.status === 'active' ? 'bg-green-200' : 'bg-[#FFF9C4]'} self-start mb-2`}>
                                            <Text className={`font-segoe ${sub.status === 'active' ? 'text-green-800' : 'text-[#FBC02D] font-bold'}`}>
                                                {sub.status === 'active' ? 'Active' : 'Inactive'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row justify-between">
                                        <View className="flex-1 mr-4">
                                            <Text className="text-[10px] font-bold text-gray-800 mb-2">Core Info</Text>
                                            <Text className="text-[8px] text-gray-600 mb-1">Service: {sub.serviceName}</Text>
                                            <Text className="text-[8px] text-gray-600 mb-1">Created: {sub.created}</Text>
                                            <Text className="text-[8px] text-gray-600 mb-4">Split: -</Text>

                                            <Text className="text-[10px] font-bold text-gray-800 mb-2">Payment History</Text>
                                            <View className="flex-row items-center mb-1">
                                                <Text className="text-[8px] text-gray-600 mr-1">No transaction history</Text>
                                            </View>
                                        </View>

                                        <View className="flex-1">
                                            <Text className="text-[10px] font-bold text-gray-800 mb-2">Member Breakdown</Text>
                                            {sub.members.length === 0 ? (
                                                <Text className="text-[8px] text-gray-500 italic">No members yet</Text>
                                            ) : (
                                                sub.members.map((member: any, index: number) => (
                                                    <View key={member.id || index} className="mb-1 flex-row items-center flex-wrap">
                                                        <Text className="text-[8px] text-gray-600">• {member.profiles?.full_name || 'User'} - </Text>
                                                        {member.status === 'active' ? (
                                                            <>
                                                                <Feather name="check-square" size={8} color="green" />
                                                                <Text className="text-[8px] font-bold text-black ml-1">Active</Text>
                                                            </>
                                                        ) : (
                                                            <Text className="text-[8px] text-yellow-600">{member.status}</Text>
                                                        )}
                                                    </View>
                                                ))
                                            )}
                                        </View>
                                    </View>

                                    {/* Tips Box */}
                                    <View className="bg-[#F5F5F5] p-3 rounded-lg mt-4">
                                        <Text className="text-[8px] font-bold text-center mb-2">Tips</Text>
                                        <View className="mb-2">
                                            <Text className="text-[7px] font-bold mb-1">For Healthy Groups:</Text>
                                            <View className="flex-row gap-1">
                                                <View className="bg-green-500 px-1 rounded"><Text className="text-[7px] text-white">Message All</Text></View>
                                            </View>
                                        </View>
                                        <View>
                                            <Text className="text-[7px] font-bold mb-1">For Issues:</Text>
                                            <View className="flex-row gap-1 flex-wrap">
                                                <View className="bg-green-500 px-1 rounded"><Text className="text-[7px] text-white">Manage</Text></View>
                                            </View>
                                        </View>
                                    </View>

                                </View>
                            )}
                        </View>
                    ))
                )}

                {/* Pagination/Entries */}
                <View className="pt-4 pb-10">
                    <Text className="text-xs italic text-gray-500">Showing {filteredGroups.length} Entries</Text>
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

export default Groups;
