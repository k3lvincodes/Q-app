import { View, Text, TouchableOpacity } from "react-native";
import Ok from "../../assets/svg/ok.svg";

const Success = () => {
  return (
    <View>
      <View>
        <Ok />
        <Text className="text-xl font-bold text-center">Puchase successful</Text>
        <Text className="text-center">Your subscription has been secured</Text>
      </View>
      <TouchableOpacity className="bg-bg rounded-full w-full py-5">
        <Text className="text-white">View Crew</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Success;
