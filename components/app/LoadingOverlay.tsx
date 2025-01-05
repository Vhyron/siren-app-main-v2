import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Alert,
  Button,
} from "react-native";
import { db, storage } from "@/firebaseConfig";
import { ref, remove } from "firebase/database";
interface Props {
  visible: boolean;
  message?: string;
  backButtonVisible?: boolean;
}

const LoadingOverlay = ({
  visible,
  message = "Loading...",
  backButtonVisible = false,
}: Props) => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { roomId, currentUserId, callerId, callerName, isResponder } = params;

  const endCall = async () => {
    console.log("Ending call...");
    try {
      const callRef = ref(db, `calls/${roomId}`);
      await remove(callRef);

      callerDataSend();
    } catch (error) {
      console.error("Failed to end the call:", error);
      Alert.alert("Error", "Could not end the call. Please try again.");
    }
  };

  // redirect responder ONLY!
  const callerDataSend = async () => {
    if (isResponder === "true") {
      router.push({
        pathname: "/responder/validation",
        params: {
          callerId: callerId,
          name: callerName || "Unknown",
        },
      });
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      hardwareAccelerated={true}
    >
      <View style={styles.overlay}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.message}>{message}</Text>
        </View>
        {backButtonVisible && (
          <Button
            title="Cancel"
            onPress={async () => {
              // Execute the endCall function when "Cancel" is clicked
              await endCall();
              router.back(); // Navigate back after ending the call
            }}
            color={"#ff0033"}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    gap: 20,
  },
  loaderContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#333",
    padding: 20,
    borderRadius: 10,
    width: 200,
    height: 100,
  },
  message: {
    marginTop: 10,
    color: "#fff",
    fontSize: 14,
    fontFamily: "BeVietnamProMedium",
  },
});

export default LoadingOverlay;
