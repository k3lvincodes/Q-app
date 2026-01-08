import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabase';

interface OtpModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  email: string;
  fullName?: string;
  redirectRoute?: string;
  onVerifySuccess?: (session: any) => Promise<void>;
}

const OtpModal = ({ modalVisible, setModalVisible, email, fullName, redirectRoute, onVerifySuccess }: OtpModalProps) => {
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    let isValid = true;
    setOtpError('');

    if (!otp.trim()) {
      setOtpError('Please enter the OTP.');
      isValid = false;
    }

    if (isValid) {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email',
        });

        if (error) throw error;

        if (data.session) {
          if (Platform.OS !== 'web') {
            await SecureStore.setItemAsync('authToken', data.session.access_token);

            // Set 7-day biometric expiry
            const expiryDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
            await SecureStore.setItemAsync('biometric_expiry', expiryDate.toString());
            await SecureStore.setItemAsync('user_email', email); // Save email for biometric login
          } else {
            localStorage.setItem('authToken', data.session.access_token);
            // Store user email in local storage as well if needed
            localStorage.setItem('user_email', email);
          }

          if (fullName) {
            await supabase.auth.updateUser({
              data: { full_name: fullName }
            });
          }

          if (onVerifySuccess) {
            await onVerifySuccess(data.session);
          } else {
            router.push((redirectRoute || '/(navbar)/dashboard') as any);
          }

          setModalVisible(false);
        }
      } catch (error: any) {
        setOtpError(error.message || 'Invalid OTP. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        setModalVisible(!modalVisible);
      }}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Enter OTP</Text>
          <TextInput
            style={styles.input}
            placeholder="12345678"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={8}
          />
          {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
          <TouchableOpacity
            style={[styles.button, styles.buttonClose]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.textStyle}>Verify OTP</Text>}
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
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    paddingVertical: 60, // Increase height
    minHeight: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonClose: {
    backgroundColor: '#EB4219',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    width: 200,
    textAlign: 'center',
    borderRadius: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
});

export default OtpModal;
