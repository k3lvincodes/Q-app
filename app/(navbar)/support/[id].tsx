import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from 'react';
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
    created_at: string;
}

const TicketDetail = () => {
    const { id } = useLocalSearchParams();
    const [ticket, setTicket] = useState<TicketDetails | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id || null);

            if (!user) return;

            // Fetch Ticket Info
            const { data: ticketData, error: ticketError } = await supabase
                .from('support_tickets')
                .select('*')
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

    useEffect(() => {
        fetchData();

        // Realtime subscription
        const channel = supabase
            .channel(`support_chat:${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${id}` },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        // Prevent duplicates
                        if (prev.some(msg => msg.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const sendMessage = async () => {
        if (!newMessage.trim() || !userId) return;

        setSending(true);
        try {
            const { error } = await supabase
                .from('support_messages')
                .insert({
                    ticket_id: id,
                    sender_id: userId,
                    message: newMessage.trim(),
                });

            if (error) throw error;
            setNewMessage('');
            // Optimistic update handled by realtime or re-fetch if needed, 
            // but realtime listener above handles it.
        } catch (err) {
            console.error(err);
            alert('Failed to send message');
        } finally {
            setSending(false);
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
                    className="flex-row items-center gap-5 px-5 pb-2 border-b border-gray-200 bg-[#F6F4F1]"
                >
                    <TouchableOpacity onPress={() => router.back()} className="py-2">
                        <Arrow />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-xl font-bold" numberOfLines={1}>{ticket?.subject}</Text>
                        <Text className="text-xs text-gray-400">ID: {ticket?.ticket_id || ticket?.id} • {ticket?.status}</Text>
                    </View>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={[{ id: 'initial', message: ticket?.message, sender_id: userId, created_at: ticket?.created_at } as Message, ...messages]}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 20 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    renderItem={({ item }) => {
                        const isMe = item.sender_id === userId;
                        return (
                            <View className={`max-w-[80%] p-3 rounded-2xl ${isMe ? 'bg-[#EF5323] self-end rounded-tr-none' : 'bg-white self-start rounded-tl-none'}`}>
                                <Text className={`${isMe ? 'text-white' : 'text-black'} text-base font-segoe`}>{item.message}</Text>
                                <Text className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        );
                    }}
                />

                <View className="p-4 bg-white border-t border-gray-200 flex-row items-center gap-2" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
                    <TextInput
                        className="flex-1 bg-gray-100 rounded-full px-4 py-3 font-segoe"
                        placeholder="Type a message..."
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
