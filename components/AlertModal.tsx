import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AlertModalProps {
    visible: boolean;
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
    type?: 'success' | 'error' | 'info';
}

const AlertModal = ({ visible, title, message, buttonText = "OK", onClose, type = 'info' }: AlertModalProps) => {

    const getIcon = () => {
        switch (type) {
            case 'success': return <Feather name="check-circle" size={50} color="#22C55E" />;
            case 'error': return <Feather name="alert-circle" size={50} color="#EF4444" />;
            default: return <Feather name="info" size={50} color="#EB4219" />;
        }
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View className="bg-white rounded-3xl p-6 w-[85%] items-center shadow-lg">
                    <View className="mb-4">
                        {getIcon()}
                    </View>
                    <Text className="text-xl font-bold text-black mb-2 text-center">
                        {title}
                    </Text>
                    <Text className="text-base text-gray-600 mb-6 text-center leading-5 px-2">
                        {message}
                    </Text>

                    <TouchableOpacity
                        onPress={onClose}
                        className={`py-3 px-8 rounded-full w-full ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-[#EB4219]'}`}
                    >
                        <Text className="text-white font-bold text-center text-lg">{buttonText}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
});

export default AlertModal;
