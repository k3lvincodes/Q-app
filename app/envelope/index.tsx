import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, Platform, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

// Heart positions for the pattern
const hearts = [
    { size: 90, left: -20, top: 50, rotate: -15, color: '#D90429' },
    { size: 60, left: 80, top: 120, rotate: 30, color: '#EF476F' },
    { size: 45, left: 200, top: 80, rotate: -10, color: '#FF6B8A' },
    { size: 70, left: 280, top: 180, rotate: 20, color: '#D90429' },
    { size: 55, left: 40, top: 280, rotate: -25, color: '#FF6B8A' },
    { size: 80, left: 150, top: 320, rotate: 15, color: '#EF476F' },
    { size: 50, left: 300, top: 350, rotate: -5, color: '#D90429' },
    { size: 65, left: -10, top: 450, rotate: 25, color: '#EF476F' },
    { size: 75, left: 120, top: 500, rotate: -20, color: '#D90429' },
    { size: 40, left: 250, top: 480, rotate: 10, color: '#FF6B8A' },
    { size: 85, left: 320, top: 550, rotate: -30, color: '#EF476F' },
    { size: 55, left: 50, top: 620, rotate: 5, color: '#D90429' },
    { size: 70, left: 180, top: 680, rotate: -15, color: '#FF6B8A' },
    { size: 60, left: 300, top: 720, rotate: 20, color: '#EF476F' },
];

export default function EnvelopeLanding() {
    const introTranslateY = useSharedValue(0);
    const contentOpacity = useSharedValue(0);
    const floatY = useSharedValue(0);
    const pulse = useSharedValue(1);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        // Floating animation
        floatY.value = withRepeat(
            withSequence(
                withTiming(-15, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
                withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );

        // Pulse animation for center heart
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.quad) }),
                withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );

        // Transition to main content
        const timeout = setTimeout(() => {
            introTranslateY.value = withTiming(-height, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            contentOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
        }, 2500);

        return () => clearTimeout(timeout);
    }, []);

    const introStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: introTranslateY.value }],
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        flex: 1,
    }));

    const floatStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: floatY.value }],
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    return (
        <View className="flex-1 bg-black">
            {/* Intro Overlay */}
            <Animated.View style={introStyle}>
                <View className="flex-1 items-center justify-center overflow-hidden">
                    {/* Full-screen Heart Pattern Background */}
                    <Animated.Image
                        entering={FadeInDown.duration(1000).springify()}
                        source={require('../../assets/images/envelope-intro.png')}
                        className="absolute w-full h-full"
                        resizeMode={Platform.OS === 'web' ? 'contain' : 'cover'}
                        style={pulseStyle}
                    />

                    <View className="absolute inset-0 bg-black/20" />

                    {/* Central Logo/Text */}
                    <Animated.View entering={FadeInDown.delay(500).duration(1000).springify()} className="items-center">
                        <Animated.View style={pulseStyle} className="w-24 h-24 bg-white rounded-full items-center justify-center shadow-lg shadow-red-500/30 mb-4">
                            <Ionicons name="heart" size={50} color="#D90429" />
                        </Animated.View>
                        <Text className="text-white text-3xl font-bold font-segoe tracking-widest shadow-lg">Q Envelope</Text>
                        <Text className="text-white/70 text-sm font-segoe mt-2 tracking-widest">OPENING WITH LOVE</Text>
                    </Animated.View>
                </View>
            </Animated.View>

            {/* Main Landing Content */}
            <Animated.View style={contentStyle} className="flex-1 bg-white">
                {/* Top Image Background (492px) */}
                <View style={{ height: 492 }} className="absolute top-0 left-0 right-0 overflow-hidden rounded-b-[40px]">
                    <Animated.Image
                        source={require('../../assets/images/valentine-bg.png')}
                        className="w-full h-full"
                        resizeMode={Platform.OS === 'web' ? 'contain' : 'cover'}
                    />
                    <View className="absolute inset-0 bg-black/30" />
                </View>

                {/* Content Overlay */}
                <View
                    style={{ paddingTop: insets.top + 5, paddingBottom: insets.bottom + 40 }}
                    className="flex-1 w-full justify-between items-center px-6"
                >
                    {/* Header Icons */}
                    <View className="w-full flex-row justify-between items-center">
                        <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full justify-center items-center border border-white/30">
                            <Ionicons name="menu-outline" size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full justify-center items-center border border-white/30">
                            <Ionicons name="notifications-outline" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Main Text & Button - Positioned from safe area */}
                    <View className="w-full items-center flex-1" style={{ paddingHorizontal: 24, marginTop: 50 }}>
                        {/* Headline - 102.32px from safe area (adjusted for header height), 27.87px Salsa Regular */}
                        <Animated.Text
                            entering={FadeInDown.delay(200).duration(1000)}
                            style={{
                                marginTop: 40,
                                fontSize: 27.87,
                                fontFamily: 'Salsa-Regular',
                                lineHeight: 36,
                                textShadowColor: 'rgba(0, 0, 0, 0.5)',
                                textShadowOffset: { width: 0, height: 2 },
                                textShadowRadius: 4,
                            }}
                            className="text-white font-salsa text-center"
                        >
                            Send your special someone something this Valentine.
                        </Animated.Text>

                        {/* Supporting text - 13px Gilroy Regular */}
                        <Animated.Text
                            entering={FadeInDown.delay(400).duration(1000)}
                            style={{
                                marginTop: 24,
                                fontSize: 13,
                                fontFamily: 'Gilroy-Regular',
                            }}
                            className="text-white/90 text-center font-gilroy px-6"
                        >
                            A digital envelope that opens with intention. You set it up, Q delivers it.
                        </Animated.Text>

                        {/* Button - 154x40px, 15px text */}
                        <Animated.View
                            entering={FadeInDown.delay(600).duration(1000)}
                            style={{ marginTop: 30 }}
                        >
                            <TouchableOpacity
                                onPress={() => router.push('/envelope/step1')}
                                style={{ width: 154, height: 40 }}
                                className="bg-[#D90429] rounded-xl shadow-xl shadow-red-900/40 items-center justify-center"
                            >
                                <Text style={{ fontSize: 15 }} className="text-white font-bold font-segoe">Create Q envelope</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Footer - In the white section */}
                    <View className="w-full items-center pt-10">
                        <Text className="text-gray-400 text-xs font-segoe">Made with care by Q · Share smarter. Spend less.</Text>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}
