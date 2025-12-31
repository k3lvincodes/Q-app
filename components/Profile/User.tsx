import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import EditUser from "../../assets/svg/edituser.svg";
import Users from "../../assets/svg/user.svg";

interface UserProps {
  user: {
    full_name: string;
    email: string;
  } | null;
  onUpdate: (data: { full_name: string; email: string }) => void;
}

const User = ({ user, onUpdate }: UserProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdate = () => {
    onUpdate({ full_name: name, email });
    setIsEditing(false);
  };

  return (
    <View className="flex-row justify-between items-center">
      <View className="flex-row gap-5 items-center">
        <View className="flex-row">
          <Users />
        </View>
        <View>
          {isEditing ? (
            <>
              <TextInput value={name} onChangeText={setName} className="text-2xl font-semibold" />
              <TextInput value={email} onChangeText={setEmail} className="text-gray-500" />
            </>
          ) : (
            <>
              <Text className="text-2xl font-semibold">{name}</Text>
              <Text className="text-gray-500">{email}</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={() => isEditing ? handleUpdate() : setIsEditing(true)}>
        <EditUser width={40} height={40} />
      </TouchableOpacity>
    </View>
  );
};

export default User;
