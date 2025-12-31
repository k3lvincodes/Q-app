import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
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
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { initiateDeposit, verifyDeposit } from "../../utils/paymentApi";
import { supabase } from "../../utils/supabase";

type ModalType = {
  modalVisible: any;
  setModalVisible: any;
};

const DepositModal = ({ modalVisible, setModalVisible }: ModalType) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'verifying' | 'success' | 'failed'>('idle');
  const [verificationMessage, setVerificationMessage] = useState("");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  // Clean up timer on unmount or close
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const startPolling = (reference: string) => {
    setPaymentStatus('verifying');
    setVerificationMessage("Checking transaction status...");
    pollCountRef.current = 0;

    const poll = async () => {
      try {
        console.log(`Polling verification for ${reference}, attempt ${pollCountRef.current + 1}`);
        const result = await verifyDeposit(reference);

        if (result.status === 'success') {
          setPaymentStatus('success');
          setAmount(prev => ""); // Clear amount on success
          return;
        } else if (result.status === 'failed' || result.status === 'abandoned') {
          setPaymentStatus('failed');
          setVerificationMessage(result.message || "Transaction failed or was abandoned.");
          return;
        }

        // If pending, continue polling
        pollCountRef.current += 1;
        if (pollCountRef.current < 20) { // Poll for ~60 seconds (20 * 3s)
          pollTimerRef.current = setTimeout(poll, 3000);
        } else {
          setPaymentStatus('failed'); // Or 'timeout'
          setVerificationMessage("Verification timed out. Please check your transaction history shortly.");
        }
      } catch (err) {
        console.error("Polling error:", err);
        // Continue polling on error (network blip etc) unless max retries
        pollCountRef.current += 1;
        if (pollCountRef.current < 20) {
          pollTimerRef.current = setTimeout(poll, 3000);
        } else {
          setPaymentStatus('failed'); // Timeout style failure
          setVerificationMessage("Could not verify status. Please check your transaction list.");
        }
      }
    };

    poll();
  };

  const handleDeposit = async () => {
    console.log("Deposit button pressed, Amount:", amount);

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Alert.alert("Error", "User email not found. Please log in again.");
        return;
      }

      const response = await initiateDeposit(user.email, amount, user.id);

      if (response && response.authorization_url) {
        setPaymentReference(response.reference);
        setPaymentStatus('processing');

        await WebBrowser.openBrowserAsync(response.authorization_url);

        // Start polling after browser closes
        startPolling(response.reference);
      } else {
        Alert.alert("Error", "Failed to get authorization URL.");
        setPaymentStatus('idle');
      }
    } catch (error: any) {
      console.log("Error during deposit:", error);
      Alert.alert("Error", error.message || "An error occurred during deposit.");
      setPaymentStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setModalVisible(false);
    if (paymentStatus === 'success') setAmount("");
    setPaymentReference(null);
    setPaymentStatus('idle');
  };

  const renderContent = () => {
    if (paymentStatus === 'success') {
      return (
        <Pressable className="bg-white rounded-xl px-5 w-full mx-5 py-10" onPress={() => { }}>
          <View className="items-center">
            <Text className="text-green-500 text-5xl mb-4">✓</Text>
            <Text className="font-bold text-2xl text-center">Deposit Successful!</Text>
            <Text className="text-gray-500 pt-2 text-center">
              Your deposit has been confirmed and added to your balance.
            </Text>
            <Pressable className="bg-bg mt-8 rounded-full py-5 px-10" onPress={handleClose}>
              <Text className="text-white font-bold">Done</Text>
            </Pressable>
          </View>
        </Pressable>
      );
    }

    if (paymentStatus === 'failed') {
      return (
        <Pressable className="bg-white rounded-xl px-5 w-full mx-5 py-10" onPress={() => { }}>
          <View className="items-center">
            <Text className="text-red-500 text-5xl mb-4">✕</Text>
            <Text className="font-bold text-2xl text-center">Verification Failed</Text>
            <Text className="text-gray-500 pt-2 text-center px-2">
              {verificationMessage}
            </Text>
            <View className="flex-row gap-4 mt-8">
              <Pressable className="bg-gray-200 rounded-full py-4 px-8" onPress={handleClose}>
                <Text className="text-gray-700 font-bold">Close</Text>
              </Pressable>
              <Pressable
                className="bg-bg rounded-full py-4 px-8"
                onPress={() => paymentReference && startPolling(paymentReference)}
              >
                <Text className="text-white font-bold">Retry Check</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      );
    }

    if (paymentStatus === 'processing' || paymentStatus === 'verifying') {
      const isVerifying = paymentStatus === 'verifying';
      return (
        <Pressable className="bg-white rounded-xl px-5 w-full mx-5 py-10" onPress={() => { }}>
          <View className="items-center">
            <ActivityIndicator size="large" color="#EF5323" />
            <Text className="font-bold text-xl mt-4">
              {isVerifying ? "Verifying Transaction..." : "Processing Payment..."}
            </Text>
            <Text className="text-gray-500 pt-2 text-center">
              {isVerifying
                ? "Please wait while we confirm your deposit status."
                : "Please complete your payment in the browser."}
            </Text>
          </View>
        </Pressable>
      );
    }

    return (
      <Pressable className="bg-white rounded-xl px-5 w-full mx-5 py-10" onPress={() => { }}>
        <Text className="font-bold text-3xl">Deposit</Text>
        <Text className="text-gray-500 pt-2">
          Withdrawals are not supported only deposit the money you need for a subscription.
        </Text>
        <TextInput
          className="border h-[3.5rem] pl-3 border-gray-300 rounded mt-10"
          placeholder="Enter amount"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <Pressable
          className="bg-bg mt-5 self-start rounded-full py-5 px-10 flex-row justify-center items-center"
          onPress={handleDeposit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold">Deposit</Text>
          )}
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.centeredView} className="bg-black/0.5">
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={handleClose}
        >
          <Pressable
            style={styles.backdrop}
            onPress={paymentStatus === 'idle' ? handleClose : undefined}
          >
            {renderContent()}
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
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black
    justifyContent: "center",
    paddingHorizontal: 20,
    alignItems: "center",
  },
});

export default DepositModal;
