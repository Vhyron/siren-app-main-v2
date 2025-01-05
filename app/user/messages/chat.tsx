import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/firebaseConfig";
import {
  set,
  ref,
  get,
  onChildAdded,
  push,
  query,
  orderByChild,
  onValue,
  remove,
  equalTo,
} from "firebase/database";
import MCI from "react-native-vector-icons/MaterialCommunityIcons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MessageHeader from "@/components/MessageHeader";
import Container from "@/components/Container";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Audio } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";

interface Receiver {
  username: string;
  email: string;
}

interface Message {
  id: string;
  senderId: string;
  message: string;
  createdAt: number;
}

const MessagingItem = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { roomId } = useLocalSearchParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [receiver, setReceiver] = useState<Receiver | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const user = getAuth().currentUser;

  useEffect(() => {
    // Scroll to the end when messages are updated
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    async function getUserId() {
      const userId = await AsyncStorage.getItem("userId");
      setCurrentUserId(userId || "");
    }
    getUserId();

    const roomRef = ref(db, `rooms/${roomId}`);
    const roomQuery = query(roomRef, orderByChild("createdAt"));

    // Fetch receiver details and messages from Firebase
    async function fetchReceiverAndMessages() {
      const roomSnapshot = await get(roomRef);
      if (roomSnapshot.exists()) {
        const roomData = roomSnapshot.val();
        const receiverId =
          roomData.user1 === currentUserId ? roomData.user2 : roomData.user1;
        const receiverRef = ref(db, `users/${receiverId}`);
        const receiverSnapshot = await get(receiverRef);
        if (receiverSnapshot.exists()) {
          setReceiver(receiverSnapshot.val());
        }
      }
    }

    // Fetch messages from Firebase
    async function fetchMessages() {
      onValue(roomQuery, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const messagesArray = Object.entries(data.messages || {}).map(
            ([key, msg]: any) => ({
              id: key,
              ...msg,
            })
          );
          setMessages(messagesArray);
        } else {
          setMessages([]);
        }
      });
    }

    fetchReceiverAndMessages();
    fetchMessages();
  }, [roomId, currentUserId]);

  const createNotification = async (receiverId: string, message: string) => {
    try {
      const userRef = ref(db, `users/${currentUserId}`);
      const userSnapshot = await get(userRef);

      if (!userSnapshot.exists()) {
        console.error("User data not found");
        return;
      }

      const userData = userSnapshot.val();
      const senderName = userData.firstname + " " + userData.lastname;

      const notificationsRef = ref(db, `notifications/messages/${receiverId}`);
      const newNotification = {
        createdAt: Date.now(),
        message: `New message: ${message.substring(0, 50)}${
          message.length > 50 ? "..." : ""
        }`,
        receiverId: receiverId,
        roomId: roomId,
        senderId: currentUserId,
        name: senderName, // Store the sender's name
        read: false,
      };

      // Push the notification to Firebase
      await push(notificationsRef, newNotification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  const createMessage = async () => {
    if (message.trim()) {
      try {
        // Get room data to identify the receiver
        const roomRef = ref(db, `rooms/${roomId}`);
        const roomSnapshot = await get(roomRef);

        if (!roomSnapshot.exists()) {
          Alert.alert("Error", "Room not found");
          return;
        }

        const roomData = roomSnapshot.val();
        const receiverId =
          roomData.user1 === currentUserId ? roomData.user2 : roomData.user1;

        // Create the message
        const messagesRef = ref(db, `rooms/${roomId}/messages`);
        await push(messagesRef, {
          senderId: currentUserId,
          message,
          createdAt: Date.now(),
        });

        // Create notification for the receiver
        await createNotification(receiverId, message);

        // Clear the input after sending
        setMessage("");
      } catch (error) {
        Alert.alert("Error sending message:", error.message);
      }
    }
  };

  
  const handleStartCall = useCallback(async () => {
    if (!receiver) {
      Alert.alert("Error", "Receiver information not available");
      return;
    }

    try {
      await startAudioCall(receiver);
    } catch (error) {
      console.error("Call initiation error:", error);
      Alert.alert("Call Error", "Unable to start the call. Please try again.");
    }
  }, [receiver]);

  const startAudioCall = async (receiver: Receiver) => {
    try {
      // First, retrieve the user2 ID from the room
      const roomRef = ref(db, `rooms/${roomId}`);
      const roomSnapshot = await get(roomRef);

      if (!roomSnapshot.exists()) {
        Alert.alert("Error", "Room not found");
        return;
      }

      const roomData = roomSnapshot.val();
      const receiverId =
        roomData.user1 === currentUserId ? roomData.user2 : roomData.user1;

      const callRef = ref(db, `calls/${roomId}`);

      // Create call record
      await set(callRef, {
        status: "initiated",
        caller: {
          id: currentUserId,
          name: user?.displayName || "Unknown Caller",
        },
        receiver: {
          id: receiverId,
          name: receiver.username || "Unknown Receiver",
        },
        timestamp: new Date().toISOString(),
        notify: true,
      });

      router.push({
        pathname: "/user/call/Caller",
        params: {
          roomId,
          currentUserId,
          receiverId,
          receiverName: receiver.username,
        },
      });
    } catch (error) {
      console.error("Error starting audio call:", error);
      Alert.alert("Call Error", "Unable to start the call. Please try again.");
    }
  };
  return (
    <Container bg="#F0F1F2">
      <MessageHeader
        username={receiver?.username || "Loading..."}
        email={receiver?.email || "Loading..."}
      />
      <View style={styles.container}>
        <GestureHandlerRootView style={styles.messagesContent}>
          <FlatList
            data={messages}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View
                style={
                  item.senderId === currentUserId
                    ? styles.userMessage
                    : styles.replyMessage
                }
              >
                {item.senderId !== currentUserId && (
                  <Image
                    source={require("@/assets/images/woman.png")}
                    style={{ resizeMode: "stretch", width: 40, height: 40 }}
                  />
                )}
                <View
                  style={
                    item.senderId === currentUserId
                      ? styles.userMessageBox
                      : styles.replyBox
                  }
                >
                  <Text style={styles.replyText}>{item.message}</Text>
                  <Text style={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
          />
        </GestureHandlerRootView>

        <View style={styles.chatButtons}>
          <View style={styles.actions}>
            <Pressable onPress={handleStartCall}>
              <Ionicons name="call-outline" size={30} color="#b6b6b7" />
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={"#F0F1F2"}
            onChangeText={setMessage}
            value={message}
          />
          <Pressable>
            <MCI name="image-outline" size={30} color={"#b6b6b7"} />
          </Pressable>
          <TouchableOpacity onPress={createMessage} style={styles.sendButton}>
            <MCI name="send" size={30} color={"#b6b6b7"} />
          </TouchableOpacity>
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "90%",
    marginHorizontal: "auto",
    paddingVertical: 10,
    gap: 10,
    overflow: "scroll",
  },
  messagesContent: {
    flex: 1,
    justifyContent: "flex-end",
  },
  chatButtons: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 10,
  },
  actions: {
    flexDirection: "row",
  },
  input: {
    color: "#000",
    flex: 1,
  },
  replyMessage: {
    flexDirection: "row",
    gap: 20,
    marginVertical: 10,
  },
  replyBox: {
    flex: 1,
    padding: 15,
    backgroundColor: "#AFE8F3",
    borderRadius: 15,
  },
  replyText: {
    fontSize: 15,
  },
  userMessage: {
    maxWidth: "80%",
    alignSelf: "flex-end",
    marginVertical: 10,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#08B6D9",
  },
  userMessageBox: {
    maxWidth: "80%",
    padding: 15,
    backgroundColor: "#08B6D9",
    borderRadius: 15,
  },
  sendButton: {
    width: 40,
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  timestamp: {
    fontSize: 12,
    color: "#777",
    textAlign: "right",
    marginTop: 5,
  },
});

export default MessagingItem;
