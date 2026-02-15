import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

interface Subscription {
    id: number;
    name: string;
    image_url?: string;
}

interface CrewDetailsModalProps {
    modalVisible: boolean;
    setModalVisible: (visible: boolean) => void;
    subscription: Subscription | null;
}

const CrewDetailsModal = ({ modalVisible, setModalVisible, subscription }: CrewDetailsModalProps) => {
    if (!subscription) return null;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View className="flex-1 bg-black/50 justify-center items-center px-5">
                <Pressable className="absolute top-0 bottom-0 left-0 right-0" onPress={() => setModalVisible(false)} />

                <View className="bg-white dark:bg-[#1E1E1E] w-full rounded-[30px] p-6 shadow-xl relative">
                    {/* Close Button */}
                    <TouchableOpacity
                        onPress={() => setModalVisible(false)}
                        className="absolute top-4 right-4 z-10 p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
                    >
                        <Ionicons name="close" size={20} color="#EF5323" />
                    </TouchableOpacity>

                    {/* Icon */}
                    <View className="w-20 h-20 bg-[#FFF5F2] dark:bg-gray-800 rounded-full items-center justify-center self-center mb-4 overflow-hidden">
                        {subscription.image_url ? (
                            <Image source={{ uri: subscription.image_url }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <Text className="text-[#EF5323] font-bold text-4xl">{subscription.name.charAt(0).toUpperCase()}</Text>
                        )}
                    </View>

                    {/* Title */}
                    <Text className="text-center font-bold text-2xl text-[#1E293B] dark:text-white mb-2">
                        {subscription.name}
                    </Text>

                    <Text className="text-center text-gray-500 dark:text-gray-400 mb-8">
                        You are a member of this crew.
                    </Text>

                    {/* Details Row (Mock Data for now as we only have ID and Name) */}
                    <View className="flex-row justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <Text className="text-gray-500 dark:text-gray-400">Status</Text>
                        <Text className="text-green-500 font-bold">Active</Text>
                    </View>

                    <View className="flex-row justify-between mb-8 pb-4">
                        <Text className="text-gray-500 dark:text-gray-400">Plan</Text>
                        <Text className="text-[#1E293B] dark:text-white font-medium">Standard</Text>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        className="w-full bg-[#EF5323] py-4 rounded-full items-center"
                        onPress={() => setModalVisible(false)}
                    >
                        <Text className="text-white font-bold text-lg">Close Details</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default CrewDetailsModal;
