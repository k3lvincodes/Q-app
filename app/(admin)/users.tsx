import { Feather } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerIcon from '../../assets/svg/hamburger.svg';
import Logo from '../../assets/svg/logo.svg';
import AdminMenu from '../../components/Admin/AdminMenu';
import { supabase } from '../../utils/supabase';

interface User {
    id: string;
    email: string;
    status: 'active' | 'pending' | 'flagged' | 'banned';
    avatar?: any;
    name?: string;
    reports?: number;
    phone?: string;
    verifiedOn?: string;
}

const Users = () => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedUsers: User[] = data.map((profile: any) => ({
                    id: profile.id,
                    email: profile.email || 'No Email',
                    status: 'active', // Defaulting to active as we don't have a status column yet
                    avatar: profile.avatar_url ? { uri: profile.avatar_url } : require('../../assets/images/icon.png'),
                    name: profile.full_name || 'No Name',
                    reports: 0, // Placeholder
                    phone: profile.phone_number || 'N/A',
                    verifiedOn: new Date(profile.created_at).toLocaleDateString()
                }));
                setUsers(formattedUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const toggleExpand = (id: string) => {
        setExpandedUserId(expandedUserId === id ? null : id);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-200 text-green-800';
            case 'pending': return 'bg-orange-500 text-white';
            case 'flagged': return 'bg-red-200 text-red-800';
            case 'banned': return 'bg-red-200 text-red-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
                        <Text className="text-[#E85D36] font-segoe mr-1">All User</Text>
                        <Feather name="chevron-down" size={20} color="#E85D36" />
                    </TouchableOpacity>
                </View>

                {/* User List */}
                {filteredUsers.length === 0 && !loading ? (
                    <Text className="text-gray-500 text-center">No users found.</Text>
                ) : (
                    filteredUsers.map((user) => (
                        <View key={user.id} className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm">
                            <TouchableOpacity
                                onPress={() => toggleExpand(user.id)}
                                className="flex-row items-center p-4 bg-white"
                            >
                                <Image
                                    source={user.avatar}
                                    className="w-10 h-10 rounded-full mr-3"
                                    resizeMode="cover"
                                />
                                <Text className="flex-1 font-segoe text-base text-black" numberOfLines={1}>
                                    {user.email}
                                </Text>

                                <View className={`px-3 py-1 rounded-lg mr-2 ${getStatusColor(user.status).split(' ')[0]}`}>
                                    <Text className={`font-segoe ${getStatusColor(user.status).split(' ')[1]}`}>
                                        {user.status}
                                    </Text>
                                </View>

                                <Feather name="chevron-down" size={20} color="black" />
                            </TouchableOpacity>

                            {/* Expanded Details */}
                            {expandedUserId === user.id && (
                                <View className="p-6 bg-[#FAFAFA]">
                                    <View className="flex-row justify-between">
                                        <View>
                                            <Text className="text-xs font-bold text-gray-500 mb-2 uppercase">Basic Info</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">Name: {user.name}</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">Email: {user.email}</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">Phone: {user.phone}</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">
                                                Status: <Feather name="check-square" size={12} color="green" /> Verified (Since: {user.verifiedOn})
                                            </Text>
                                        </View>
                                        <View>
                                            <Text className="text-xs font-bold text-gray-500 mb-2 uppercase">Moderation</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">Reports: {user.reports} (Resolved)</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">Strikes: 0</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">Last Login: Unknown</Text>
                                        </View>
                                    </View>

                                    <View className="flex-row justify-between mt-6">
                                        <View className="flex-1 mr-4">
                                            <Text className="text-xs font-bold text-gray-500 mb-2 uppercase">Activity</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">Active Groups: -</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">Payment Success: -</Text>
                                            <Text className="text-[7px] mb-1 text-gray-800">Total Spend: -</Text>
                                        </View>
                                        <View>
                                            <Text className="text-xs font-bold text-gray-500 mb-2 uppercase">Verification</Text>
                                            <Text className="text-[7px] italic text-gray-500">Coming Soon</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    ))
                )}

                {/* Pagination/Entries */}
                <View className="flex-row justify-between items-center mt-4 pb-10">
                    <Text className="text-xs italic text-gray-500">Showing {filteredUsers.length} Entries</Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity className="bg-[#E85D36] px-3 py-1 rounded-full">
                            <Text className="text-white text-xs font-bold">Previous</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="bg-[#E85D36] px-3 py-1 rounded-full">
                            <Text className="text-white text-xs font-bold">Next</Text>
                        </TouchableOpacity>
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

export default Users;
