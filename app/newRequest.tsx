import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";
import Arrow from "../assets/svg/arrow.svg";
import Request from "../assets/svg/request.svg";
import { supabase } from "../utils/supabase";

const NewRequest = () => {
  const data = [
    { label: "One month ", value: "1" },
    { label: "Three month", value: "2" },
    { label: "One year", value: "3" },
  ];
  const [serviceName, setServiceName] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [isFocus, setIsFocus] = useState(false);

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase.from('requests').insert({
        user_id: user.id,
        request_type: serviceName,
        details: { duration, notes }
      });

      if (error) throw error;
      Alert.alert('Request received', 'Your subscription request has been submitted. The Q team will reach out to you shortly');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    }
  };

  return (
    <SafeAreaView className="px-5 bg-[#F6F4F1] h-full">
      <View className="flex-row items-center gap-5 mt-[0px]">
        <TouchableOpacity onPress={() => router.back()}>
          <Arrow />
        </TouchableOpacity>
        <Text className="text-bg text-xl ">New request</Text>
      </View>
      <View className="gap-5 pt-10">
        <View className="gap-3">
          <Text className="font-semibold text-gray-600">
            Subscription Service
          </Text>
          <TextInput
            placeholder="Subscription Service"
            placeholderTextColor={"#4b5563"}
            className="border border-bg/20 pl-5 h-[3.5rem] rounded-xl "
            value={serviceName}
            onChangeText={setServiceName}
          />
        </View>
        <View className="gap-3">
          <Text className="font-semibold text-gray-600">Duration</Text>
          <Dropdown
            style={[styles.dropdown, isFocus && { borderColor: "blue" }]}
            placeholderStyle={{ fontSize: 14, color: "#4b5563" }}
            selectedTextStyle={{ fontSize: 14, color: "#4b5563" }}
            iconStyle={{ height: 20, width: 20 }}
            data={data}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder={!isFocus ? "Select Duration" : "..."}
            value={duration}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={(item) => {
              setDuration(item.value);
              setIsFocus(false);
            }}
          />
        </View>
        <View className="gap-3">
          <Text className="font-semibold text-gray-600">Request Notes</Text>
          <TextInput
            placeholder="Subscription Service"
            textAlignVertical="top"
            multiline={true}
            placeholderTextColor={"#4b5563"}
            className="border border-bg/20 pt-5 pl-5 h-[12rem] rounded-xl mb-auto"
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </View>
      <Pressable
        onPress={handleSubmit}
        className="flex-row items-center px-10 mt-10 py-5 justify-center gap-3 bg-bg rounded-full"
      >
        <Text className="text-white">Send request</Text>
        <Request />
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  dropdown: {
    height: 50,
    borderColor: "rgb(235 66 25 / 0.2)",
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 15,
  },
});

export default NewRequest;
