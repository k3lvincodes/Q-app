import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from "../../../assets/svg/arrow.svg";
import AlertModal from '../../../components/AlertModal';
import { supabase } from '../../../utils/supabase';

interface SupportTicket {
    id: string;
    ticket_id: string;
    subject: string;
    status: string;
    created_at: string;
}

const Support = () => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Tickets List State
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [fetchingTickets, setFetchingTickets] = useState(true);

    // Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    const showAlert = (title: string, msg: string) => {
        setAlertTitle(title);
        setAlertMessage(msg);
        setAlertVisible(true);
    };

    const fetchTickets = async () => {
        setFetchingTickets(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedTickets: SupportTicket[] = data.map((item: any) => ({
                    id: item.id,
                    ticket_id: item.ticket_id || item.id,
                    subject: item.subject,
                    status: item.status,
                    created_at: item.created_at
                }));
                setTickets(formattedTickets);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFetchingTickets(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTickets();
        }, [])
    );

    useEffect(() => {
        let subscription: any;

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            subscription = supabase
                .channel('public:support_tickets_my_list')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_tickets',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    const newTicket = payload.new as any; // Using any to bypass potential type mismatches temporarily, or cast to SupportTicket
                    setTickets(prev => [{
                        id: newTicket.id,
                        ticket_id: newTicket.ticket_id || newTicket.id, // Fallback if ticket_id is missing
                        subject: newTicket.subject,
                        status: newTicket.status,
                        created_at: newTicket.created_at
                    }, ...prev]);
                })
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, []);

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            showAlert('Error', 'Please fill in both subject and message fields.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                showAlert('Error', 'You must be logged in to submit a ticket.');
                return;
            }

            // Generate a simple ticket ID if the database doesn't auto-generate it (format: SUP-XXXX)
            // Using a timestamp component to ensure some uniqueness on client-side generation for now
            // const generatedTicketId = `SUP-${Date.now().toString().slice(-4)}`;

            const { error: insertError } = await supabase.from('support_tickets').insert({
                subject: subject,
                message: message,
                email: user.email,
                user_id: user.id,
            });

            if (insertError) throw insertError;

            showAlert('Success', 'Your support ticket has been submitted.');
            setSubject('');
            setMessage('');
            // Optional: fetchTickets() is removed or kept depending on if Realtime handles it.
            // Keeping it doesn't hurt, but Realtime should handle it.
            // fetchTickets(); 
        } catch (err: any) {
            console.error('Support ticket submission error:', err);
            showAlert('Error', `Failed to submit ticket: ${err.message || JSON.stringify(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'text-red-500';
            case 'In Progress': return 'text-yellow-600';
            case 'Resolved': return 'text-green-600';
            default: return 'text-gray-500';
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F6F4F1] dark:bg-black">
            <View className="flex-row items-center gap-5 px-5 mt-[5px] mb-5">
                <TouchableOpacity onPress={() => router.back()}>
                    <Arrow />
                </TouchableOpacity>
                <Text className="text-2xl font-bold dark:text-white">Contact Support</Text>
            </View>

            <ScrollView className="flex-1 px-5 dark:bg-black">
                <View>
                    <Text className="font-bold text-lg mb-2 dark:text-white">Create New Ticket</Text>
                    <TextInput
                        placeholder="Subject"
                        placeholderTextColor="#9CA3AF"
                        value={subject}
                        onChangeText={setSubject}
                        className="border border-[#EB421933] dark:border-gray-700 p-3 rounded-lg mb-5 font-segoe bg-[#F6F4F1] dark:bg-[#1E1E1E] dark:text-white"
                    />
                    <TextInput
                        placeholder="Message"
                        placeholderTextColor="#9CA3AF"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={4}
                        className="border border-[#EB421933] dark:border-gray-700 p-3 rounded-lg mb-5 h-[147px] font-segoe bg-[#F6F4F1] dark:bg-[#1E1E1E] dark:text-white"
                        style={{ textAlignVertical: 'top' }}
                    />
                    {loading ? (
                        <ActivityIndicator size="large" color="#EF5323" />
                    ) : (
                        <TouchableOpacity onPress={handleSubmit} className="bg-bg p-4 rounded-lg items-center mb-8">
                            <Text className="text-white font-bold font-segoe">Submit</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View>
                    <Text className="font-bold text-lg mb-4 dark:text-white">My Tickets</Text>
                    {fetchingTickets ? (
                        <ActivityIndicator color="#EF5323" />
                    ) : tickets.length === 0 ? (
                        <Text className="text-gray-500 dark:text-gray-400">No tickets found.</Text>
                    ) : (
                        tickets.map(ticket => (
                            <TouchableOpacity
                                key={ticket.id}
                                className="bg-white dark:bg-[#1E1E1E] p-4 rounded-lg mb-3 shadow-sm border border-gray-200 dark:border-gray-700"
                                onPress={() => router.push(`/support/${ticket.id}`)}
                            >
                                <View className="flex-row justify-between mb-2">
                                    <Text className="font-bold text-base flex-1 dark:text-white" numberOfLines={1}>{ticket.subject}</Text>
                                    <Text className={`font-medium ${getStatusColor(ticket.status)}`}>{ticket.status}</Text>
                                </View>
                                <Text className="text-xs text-gray-400">ID: {ticket.ticket_id || ticket.id}</Text>
                                <Text className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
                <View className="h-10" />
            </ScrollView>

            <AlertModal
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />
        </SafeAreaView>
    );
};

export default Support;
