import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type ModalType = {
  modalVisible: any;
  setModalVisible: any;
  setLoading: any;
  service: any;
  balance: number;
};

const ServiceModal = ({ modalVisible, setModalVisible, setLoading, service, balance }: ModalType) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);

  const plans = service?.subscription_plans || [];
  const selectedPlan = plans[selectedPlanIndex];

  // Reset form when modal opens
  useEffect(() => {
    if (modalVisible) {
      setUsername('');
      setEmail('');
      setSelectedPlanIndex(0);
    }
  }, [modalVisible]);

  const handleProceed = async () => {
    if (!username || !email) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!selectedPlan) {
      Alert.alert('Error', 'No plan available for this services.');
      return;
    }

    const price = selectedPlan.price_per_member;

    if (balance < price) {
      Alert.alert('Insufficient Balance', `You need ₦${price.toLocaleString()} but have ₦${balance.toLocaleString()}. Please deposit funds.`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // 1. Deduct Balance (Optimistic / Sequential)
      // Ideally this should be an RPC, but doing sequential for MVP.
      // We use 'increment_balance' RPC with negative amount if available, or direct update.
      // Based on previous work, 'increment_balance' exists.

      const { error: balanceError } = await supabase.rpc('increment_balance', {
        user_id: user.id,
        amount: -price
      });

      if (balanceError) {
        // If RPC fails (e.g. function not found), fallback to simple update
        // But strict concurrency safety needs RPC. Assuming RPC works from previous setup.
        console.error("Balance deduction failed:", balanceError);
        throw new Error("Failed to process payment. Please try again.");
      }

      // 2. Insert Subscription
      const { error: subError } = await supabase.from('user_subscriptions').insert({
        user_id: user.id,
        service_id: service.id,
        plan_id: selectedPlan.id,
        status: 'active', // Active immediately as per flow implies ownership, verify logic later
        created_at: new Date().toISOString()
      });

      if (subError) {
        // Critical: Balance deducted but sub failed.
        // Refund!
        await supabase.rpc('increment_balance', { user_id: user.id, amount: price });
        throw subError;
      }

      // 3. Insert Transaction (Debit)
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        amount: price,
        type: 'debit',
        description: `Subscription: ${service.name} (${selectedPlan.plan_type})`,
        created_at: new Date().toISOString()
      });

      if (txError) {
        console.warn("Transaction log failed but sub successful:", txError);
        // Non-critical (?) but bad for history.
      }

      Alert.alert('Success', 'Subscription purchased successfully!', [{
        text: 'OK',
        onPress: () => setModalVisible(false)
      }]);

    } catch (error: any) {
      console.error('Subscription error:', error);
      Alert.alert('Error', error.message || 'Failed to request subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.centeredView} className="bg-black/0.5">
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setModalVisible(false)}
          >
            <Pressable className="bg-white rounded-3xl px-10 w-full mx-5 py-10" onPress={(e) => e.stopPropagation()}>
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

                <Text className="text-gray-700 font-semibold pt-5">Enter your {service?.name || 'Service'} username</Text>
                <TextInput
                  className="border h-[3.5rem] border-gray-300  rounded mt-2 px-3"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                />
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
                disabled={!selectedPlan}
              >
                <Text className="text-white font-bold">
                  {selectedPlan ? `Pay ₦${selectedPlan.price_per_member.toLocaleString()}` : 'Unavailable'}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
});

export default ServiceModal;
