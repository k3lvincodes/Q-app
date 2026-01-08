import React, { useState } from "react";
import { Text, View } from "react-native";
import Drop from "../../assets/svg/drop.svg";

const Faqs = () => {
  const [isOpen, setIsOpen] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setIsOpen((prev) => (prev === index ? null : index));
  };
  const faq = [
    {
      id: 1,
      title: "What is Q",
      text: "Q lets you legally share and split the cost of premium subscriptions like Netflix, Spotify, Canva, and more with verified users. We handle the group setup, payments, and renewals — you just enjoy.",
    },
    {
      id: 2,
      title: "How to Deposit",
      text: "",
    },
    {
      id: 3,
      title: "What happens when my deposit fails?",
      text: "",
    },
    {
      id: 4,
      title: "How do i share or earn?",
      text: "",
    },
    {
      id: 5,
      title: "How do i join a Crew?",
      text: "",
    },
    {
      id: 6,
      title: "What happens when I don't get added to the Crew?",
      text: "",
    },
    {
      id: 7,
      title: "Can I leave a Crew?",
      text: "",
    },
  ];
  return (
    <View className="bg-white dark:bg-[#1E1E1E] mx-5 p-5 mb-10 rounded-xl mt-10">
      <Text className="text-center text-2xl font-semibold dark:text-white">FAQ</Text>
      <View className="border border-gray-300 dark:border-gray-700 mt-5 rounded-xl py-5">
        {faq.map((item, index) => (
          <React.Fragment key={item.id}>
            <View>
              <View className="flex-row px-5 justify-between">
                <Text className="w-4/5 dark:text-white">{item.title}</Text>
                <Drop onPress={() => toggleAccordion(index)} />
              </View>
              <Text className={isOpen === index ? "flex px-5 pt-5 dark:text-gray-300" : "hidden"}>
                {item.text}
              </Text>
            </View>
            {index < faq.length - 1 && (
              <View className="w-full h-[.1rem] my-5 bg-gray-300 dark:bg-gray-700"></View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

export default Faqs;
