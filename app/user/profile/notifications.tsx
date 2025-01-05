import { View, Text, Pressable, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { ScaledSheet } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import NotificationCard from "@/components/NotificationCard";
import { get, ref, onValue } from "firebase/database";
import { db } from "@/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const setupEmergencyNotifications = (userId) => {
    // Reference to the reports collection
    const reportsRef = ref(db, "reports");

    // Listen for changes in reports
    onValue(reportsRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const reports = snapshot.val();
      Object.entries(reports).forEach(([reportId, report]) => {
        // Check if this report belongs to the current user and has been accepted
        if (report.senderId === userId && report.status === "Accepted") {
          // Create notification for the user
          createEmergencyNotification({
            userId: report.senderId,
            responderId: report.responderId,
            reportId: reportId,
            category: report.category,
            status: report.status,
            timestamp: report.timestamp,
          });
        }
      });
    });
  };

  const handleNotificationClick = async (notif) => {
    try {
      const currentUser = await AsyncStorage.getItem("userId");
      if (!currentUser) {
        console.error("Current user ID not found");
        return;
      }

      const roomRef = ref(db, `rooms/${notif.roomId}`);
      const roomSnapshot = await get(roomRef);

      if (!roomSnapshot.exists()) {
        console.error("Room not found");
        return;
      }

      const roomData = roomSnapshot.val();
      const selectedId =
        roomData.user1 === currentUser ? roomData.user2 : roomData.user1;

      router.push({
        pathname: "/app/user/messages/chat",
        params: { roomId: notif.roomId, selectedId: selectedId },
      });
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Retrieve the current user's ID from AsyncStorage
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) {
          console.error("User ID not found in AsyncStorage");
          return;
        }

        // References for both notification collections
        const messageNotifRef = ref(db, `notifications/messages/${userId}`);
        const reportsNotifRef = ref(db, `notifications/accept/${userId}`);

        // Fetch data for both collections in parallel
        const [messageSnapshot, reportsSnapshot] = await Promise.all([
          get(messageNotifRef),
          get(reportsNotifRef),
        ]);

        let allNotifications = [];

        // Process "messages" notifications
        if (messageSnapshot.exists()) {
          const messageData = messageSnapshot.val();
          const messageNotifications = Object.entries(messageData).map(
            ([id, notif]) => ({
              id,
              type: "Message", // Assign a type to distinguish these notifications
              ...notif,
            })
          );
          allNotifications = [...allNotifications, ...messageNotifications];
        }

        // Process "accept" notifications
        if (reportsSnapshot.exists()) {
          const reportsData = reportsSnapshot.val();
          const reportNotifications = Object.entries(reportsData).map(
            ([id, notif]) => ({
              id,
              type: "Emergency Report", // Assign a type for "accept" notifications
              ...notif,
            })
          );
          allNotifications = [...allNotifications, ...reportNotifications];
        }

        // Sort notifications by their creation time (assuming `createdAt` exists)
        allNotifications.sort((a, b) => b.createdAt - a.createdAt);

        // Update the notifications state
        setNotifications(allNotifications);

        // Calculate and update the unread count
        const unreadCount = allNotifications.filter(
          (notif) => !notif.read
        ).length;
        setUnreadCount(unreadCount);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={30} color="#0c0c63" />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerText}>Notifications</Text>
          <Text style={styles.notifText}>
            You have
            <Text style={styles.notifColor}>{unreadCount} notifications</Text>
            today.
          </Text>
        </View>
      </View>
      <ScrollView
        style={styles.navScrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.notifications}>
          <Text style={styles.timeHeaderText}>Today</Text>
          {notifications.map((notif) => (
            <NotificationCard
              key={notif.id}
              href="#"
              image={require("@/assets/images/profile.png")} // Replace with actual image if available
              name={notif.name} // Replace with sender's name if available
              desc={notif.message}
              time={formatNotificationTime(notif.createdAt)}
              read={notif.read}
              onPress={() => handleNotificationClick(notif)}
            />
          ))}
        </View>
      </ScrollView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = ScaledSheet.create({
  navScrollContainer: {
    flex: 1,
    flexDirection: "column",
    overflow: "scroll",
  },
  container: {
    flex: 1,
    backgroundColor: "#faf9f6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: "25@s",
    backgroundColor: "#e6e6e6",
    gap: "5@s",
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "#dcdcdb",
  },
  headerTextContainer: {
    position: "relative",
    flex: 1,
  },
  headerText: {
    fontSize: "22@s",
    fontFamily: "BeVietnamProBold",
    color: "#0c0c63",
    marginBottom: 4,
  },
  notifText: {
    position: "absolute",
    fontSize: "12@s",
    bottom: "-14@s",
    width: "100%",
    fontFamily: "BeVietnamProRegular",
    color: "#b0adad",
  },
  notifColor: {
    color: "#087bb8",
    fontFamily: "BeVietnamProMedium",
  },
  notifications: {
    paddingHorizontal: "25@s",
    paddingVertical: "10@s",
  },
  timeHeaderText: {
    fontSize: "16@s",
    fontFamily: "BeVietnamProSemiBold",
    marginTop: "20@s",
  },
});
