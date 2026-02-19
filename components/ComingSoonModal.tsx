import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface ComingSoonModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

const ComingSoonModal = ({
  visible,
  onClose,
  title = 'Coming Soon',
  message = 'This feature is on the way. Check back soon.',
}: ComingSoonModalProps) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-[380px] rounded-3xl bg-white p-6 shadow-lg">
          <Text className="text-center text-2xl font-bold text-gray-900">{title}</Text>
          <Text className="mt-3 text-center text-gray-600">{message}</Text>
          <TouchableOpacity
            onPress={onClose}
            className="mt-8 rounded-full bg-[#EF5323] py-3"
          >
            <Text className="text-center text-base font-bold text-white">Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ComingSoonModal;
