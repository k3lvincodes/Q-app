import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import Successful from "../../assets/svg/successful.svg";

type ModalType = {
  modalVisible: any;
  setModalVisible: any;
  service: any;
  balance: number;
};

const ServiceModal = ({ modalVisible, setModalVisible, service, balance }: ModalType) => {
  const [email, setEmail] = useState('');
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const plans = service?.subscription_plans || [];
  const selectedPlan = plans[selectedPlanIndex];

  // Reset form when modal opens
  useEffect(() => {
    if (modalVisible) {
      const getUserEmail = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        } else {
          setEmail('');
        }
      };

      getUserEmail();
      setSelectedPlanIndex(0);
      setSuccess(false);
    }
  }, [modalVisible]);

  const handleProceed = async () => {
    if (!email) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!selectedPlan) {
      Alert.alert('Error', 'No plan available for this services.');
      return;
    }

    const price = selectedPlan.price_per_member;

    if (balance < price) {
      Alert.alert(
        'Insufficient Balance',
        `This plan costs ₦${price.toLocaleString()} but you only have ₦${balance.toLocaleString()}.\n\nPlease deposit more funds to continue.`
      );
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      // Call backend API to handle subscription join
      // Backend handles: balance check, transaction recording, and subscription creation
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      console.log('Using API URL:', apiUrl);

      const response = await fetch(`${apiUrl}/api/subscriptions/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          service_id: service.id,
          plan_id: selectedPlan.id,
          email: email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join subscription');
      }

      setSuccess(true);

    } catch (error: any) {
      console.error('Subscription error:', error);
      Alert.alert('Error', error.message || 'Failed to join subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.centeredView}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setModalVisible(false)}
        >
          <Pressable className="bg-white rounded-3xl px-10 w-full mx-5 py-10" onPress={(e) => e.stopPropagation()}>
            {success ? (
              <View className="items-center justify-center py-5 gap-5">
                <Successful width={100} height={100} />
                <View className="items-center">
                  <Text className="text-2xl font-bold text-gray-800">Success!</Text>
                  <Text className="text-gray-500 text-center mt-2">
                    You have successfully subscribed to {service?.name}.
                    Check your email for further instructions.
                  </Text>
                </View>
                <Pressable
                  className="bg-bg rounded-full py-4 px-12 mt-5"
                  onPress={() => setModalVisible(false)}
                >
                  <Text className="text-white font-bold text-lg">Continue</Text>
                </Pressable>
              </View>
            ) : (
              // Form Content
              <View>
                <View>
                  <Text className="text-gray-700 font-semibold pt-2">Plan</Text>
                  {/* Simple Plan Selector if multiple */}
                  <View className="flex-row gap-2 flex-wrap mt-2">
                    {plans.map((plan: any, index: number) => (
                      <Pressable
                        key={plan.id}
                        onPress={() => setSelectedPlanIndex(index)}
                        className={`border rounded-lg px-4 py-2 ${selectedPlanIndex === index ? 'bg-bg border-bg' : 'border-gray-300'}`}
                      >
                        <Text className={`${selectedPlanIndex === index ? 'text-white' : 'text-gray-600'}`}>
                          {plan.plan_type} - ₦{plan.price_per_member}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {plans.length === 0 && <Text className="text-red-500 mt-2">No plans available.</Text>}
                </View>
                <View className="pt-5">
                  <Text className="text-gray-700 font-semibold pt-2">Email for subscription</Text>
                  <TextInput
                    className="border h-[3.5rem] border-gray-300  rounded mt-2 px-3"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    keyboardType="email-address"
                  />
                  <Text className="text-gray-500 text-xs mt-1">{`Using wallet balance: ₦${balance.toLocaleString()}`}</Text>
                </View>

                <Pressable
                  className={`mt-10 self-end rounded-full py-5 px-10 ${selectedPlan ? 'bg-bg' : 'bg-gray-400'}`}
                  onPress={handleProceed}
                  disabled={!selectedPlan || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold">
                      {selectedPlan ? `Pay ₦${selectedPlan.price_per_member.toLocaleString()}` : 'Unavailable'}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end", // Pushes content to the bottom
    alignItems: "center", // Centers content horizontally
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Overlay background
  },
  backdrop: {
    flex: 1, // Takes up all available space within centeredView
    width: '100%', // Ensures the pressable covers the full width
    justifyContent: "flex-end", // This will push the inner modal content to the bottom of the backdrop
    alignItems: "center", // This will center the inner modal content horizontally within the backdrop
  },
});

export default ServiceModal;
