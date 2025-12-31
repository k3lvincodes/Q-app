import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Arrow from "../../../assets/svg/arrow.svg";
import { supabase } from '../../../utils/supabase';

interface Message {
    id: number | string;
    message: string;
    sender_id: string;
    created_at: string;
}

interface TicketDetails {
    id: string;
    ticket_id: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
    created_at: string;
    email?: string;
    profiles?: { id: string; full_name: string; email: string };
}

const TicketDetail = () => {
    const { id } = useLocalSearchParams();
    const [ticket, setTicket] = useState<TicketDetails | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const [adminId, setAdminId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setAdminId(user?.id || null);

            if (!user) return;

            // Fetch Ticket Info with User Profile
            const { data: ticketData, error: ticketError } = await supabase
                .from('support_tickets')
                .select('*, profiles:user_id(id, full_name, email)')
                .eq('id', id)
                .single();

            if (ticketError) throw ticketError;
            setTicket(ticketData);

            // Fetch Messages
            const { data: msgsData, error: msgsError } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', id)
                .order('created_at', { ascending: true });

            if (msgsError) throw msgsError;
            setMessages(msgsData || []);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();

            const subscription = supabase
                .channel('public:support_messages_admin')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${id}` },
                    (payload) => {
                        setMessages((prev) => [...prev, payload.new as Message]);
                    })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }, [id])
    );

    const sendMessage = async () => {
        if (!newMessage.trim() || !adminId) return;

        setSending(true);
        try {
            // 1. Insert Reply
            const { error } = await supabase
                .from('support_messages')
                .insert({
                    ticket_id: id,
                    sender_id: adminId,
                    message: newMessage.trim(),
                });

            if (error) throw error;
            setNewMessage('');

            // 2. Auto-Update Status if Open -> In Progress
            if (ticket?.status === 'Open') {
                await updateStatus('In Progress');
            }

        } catch (err) {
            console.error(err);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            setTicket(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-red-100 text-red-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Resolved': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const insets = useSafeAreaInsets();

    if (loading) {
        return (
            <View className="flex-1 bg-[#F6F4F1] justify-center items-center">
                <ActivityIndicator size="large" color="#EF5323" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={{ flex: 1, backgroundColor: '#F6F4F1' }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <View style={{ flex: 1 }}>
                {/* Header */}
                <View
                    style={{ paddingTop: insets.top }}
                    className="px-5 pb-2 border-b border-gray-200 bg-[#F6F4F1]"
                >
                    <View className="flex-row items-center gap-5 mb-2">
                        <TouchableOpacity onPress={() => router.back()}>
                            <Arrow />
                        </TouchableOpacity>
                        <View className="flex-1">
                            <Text className="text-xl font-bold" numberOfLines={1}>Ticket Details</Text>
                        </View>
                    </View>

                    <View className="bg-white p-3 rounded-xl border border-gray-200">
                        <Text className="text-lg font-bold mb-1">{ticket?.subject}</Text>
                        <Text className="text-xs text-gray-500 mb-2">User: {ticket?.profiles?.full_name || 'Unknown'} ({ticket?.profiles?.email || ticket?.email})</Text>

                        <View className="flex-row items-center justify-between">
                            <View className={`px-3 py-1 rounded-full ${getStatusColor(ticket?.status || 'Open').split(' ')[0]}`}>
                                <Text className={`text-xs font-bold ${getStatusColor(ticket?.status || 'Open').split(' ')[1]}`}>{ticket?.status}</Text>
                            </View>

                            <View className="flex-row gap-2">
                                {['Open', 'In Progress', 'Resolved'].map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        onPress={() => updateStatus(s)}
                                        className={`px-2 py-1 rounded border ${ticket?.status === s ? 'bg-gray-800 border-gray-800' : 'bg-white border-gray-300'}`}
                                    >
                                        <Text className={`text-[10px] ${ticket?.status === s ? 'text-white' : 'text-gray-600'}`}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={[{ id: 'initial', message: ticket?.message, sender_id: ticket?.profiles?.id || 'user', created_at: ticket?.created_at } as Message, ...messages]}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    contentContainerStyle={{ padding: 20, gap: 10 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    renderItem={({ item }) => {
                        const isAdmin = item.sender_id === adminId;
                        return (
                            <View className={`max-w-[80%] p-3 rounded-2xl ${isAdmin ? 'bg-[#EF5323] self-end rounded-tr-none' : 'bg-white self-start rounded-tl-none border border-gray-200'}`}>
                                <Text className={`${isAdmin ? 'text-white' : 'text-black'} text-base font-segoe`}>{item.message}</Text>
                                <Text className={`text-[10px] mt-1 ${isAdmin ? 'text-white/70' : 'text-gray-400'}`}>
                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        );
                    }}
                />

                <View className="p-4 bg-white border-t border-gray-200 flex-row items-center gap-2" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
                    <TextInput
                        className="flex-1 bg-gray-100 rounded-full px-4 py-3 font-segoe"
                        placeholder="Reply as Admin..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <TouchableOpacity
                        onPress={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className={`p-3 rounded-full ${!newMessage.trim() ? 'bg-gray-300' : 'bg-[#EF5323]'}`}
                    >
                        {sending ? <ActivityIndicator size="small" color="white" /> : <Feather name="send" size={20} color="white" />}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

export default TicketDetail;
