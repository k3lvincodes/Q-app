import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { performLogoutCleanup } from '../../utils/authCleanup';

interface UserMenuProps {
    visible: boolean;
    onClose: () => void;
    onRefresh?: () => void;
}

const { width } = Dimensions.get('window');

const MENU_ITEMS = [
    { label: 'Dashboard', route: '/(navbar)/dashboard', icon: 'home' },
    { label: 'Discover', route: '/(navbar)/discover', icon: 'globe' },
    { label: 'Jointhequeue', route: '/(navbar)/join', icon: 'users' },
    { label: 'Support', route: '/(navbar)/support', icon: 'help-circle' },
    { label: 'Profile', route: '/(navbar)/profile', icon: 'user' },
];

const UserMenu = ({ visible, onClose, onRefresh }: UserMenuProps) => {
    const translateX = useSharedValue(-256); // Start off-screen (width 240 + left 16)
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (visible) {
            translateX.value = withTiming(0, {
                duration: 300,
                easing: Easing.out(Easing.exp),
            });
        } else {
            translateX.value = withTiming(-256, {
                duration: 300,
                easing: Easing.out(Easing.exp),
            });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    return (
        <Animated.View
            style={[styles.container, animatedStyle, { top: insets.top + 15 }]}
            pointerEvents={visible ? 'auto' : 'none'}
        >
            <View className="flex-1 bg-[#F6F4F1] rounded-[6px] overflow-hidden justify-center">

                {/* Menu Items */}
                <View className="px-4">
                    {MENU_ITEMS.map((item, index) => {
                        // Normalize item route for comparison (remove group)
                        const normalizedRoute = item.route.replace('/(navbar)', '');
                        const isActive = pathname === normalizedRoute || pathname?.startsWith(normalizedRoute + '/');

                        // Determine Color: Active = Q Orange (#EF5323), Inactive = Gray
                        const activeColor = '#EF5323';
                        const inactiveColor = '#666666';

                        return (
                            <TouchableOpacity
                                key={index}
                                className="py-2 px-2 mb-1 flex-row items-center gap-4"
                                onPress={() => {
                                    onClose();
                                    if (isActive) {
                                        onRefresh?.();
                                    } else {
                                        router.push(item.route as any);
                                    }
                                }}
                            >
                                <Feather
                                    name={item.icon as any}
                                    size={20}
                                    color={isActive ? activeColor : inactiveColor}
                                />
                                <Text
                                    className={`text-base font-segoe ${isActive ? 'text-[#EF5323]' : 'text-[#666666]'
                                        }`}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}

                    {/* Logout Button */}
                    <TouchableOpacity
                        className="py-2 px-2 mt-1 flex-row items-center gap-4"
                        onPress={async () => {
                            try {
                                onClose();
                                await performLogoutCleanup();
                                router.replace('/(auth)/login');
                            } catch (error) {
                                console.error("Logout error:", error);
                            }
                        }}
                    >
                        <Feather name="log-out" size={20} color="#EF5323" />
                        <Text className="text-base font-segoe text-[#666666]">Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 16,
        height: 291,
        width: 240,
        backgroundColor: 'transparent', // The internal view handles background and radius
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    }
});

export default UserMenu;
