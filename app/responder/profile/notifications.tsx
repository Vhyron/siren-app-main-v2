import { View, Text, Pressable, FlatList, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { ScaledSheet } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import NotificationCard from "@/components/NotificationCard";
import { get, ref } from "firebase/database";
import { db } from "@/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNotificationClick = async (notif) => {
    try {
      // Handle differently based on notification type
      if (notif.type === "Emergency Report") {
        // Navigate to emergency report details
        router.push({
          pathname: "/app/reports/details",
          params: { reportId: notif.reportId },
        });
      } else {
        // Handle message notifications
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
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const currentUserId = await AsyncStorage.getItem("userId");
        if (!currentUserId) {
          console.error("User ID not found in AsyncStorage");
          return;
        }

        // Fetch message notifications
        const messageNotifRef = ref(
          db,
          `notifications/messages/${currentUserId}`
        );
        const messageSnapshot = await get(messageNotifRef);

        // Fetch emergency report notifications
        const reportsRef = ref(db, "notifications/reports");
        const reportsSnapshot = await get(reportsRef);

        let allNotifications = [];

        // Process message notifications
        if (messageSnapshot.exists()) {
          const messageData = messageSnapshot.val();
          const messageNotifications = Object.entries(messageData).map(
            ([id, notif]) => ({
              id,
              type: "Message",
              ...notif,
            })
          );
          allNotifications = [...allNotifications, ...messageNotifications];
        }

        // Process emergency reports
        if (reportsSnapshot.exists()) {
          const reportsData = reportsSnapshot.val();
          // Flatten the nested structure of reports
          const reportNotifications = Object.values(reportsData).flatMap(
            (userReports) =>
              Object.entries(userReports).map(([id, report]) => ({
                id,
                type: "Emergency Report",
                ...report,
              }))
          );
          allNotifications = [...allNotifications, ...reportNotifications];
        }

        // Sort notifications by creation time
        allNotifications.sort((a, b) => b.createdAt - a.createdAt);

        setNotifications(allNotifications);

        // Count unread notifications
        const unread = allNotifications.filter((notif) => !notif.read).length;
        setUnreadCount(unread);
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
            <Text style={styles.notifColor}>
              You have {" + "}{unreadCount} unread notifications today.
            </Text>
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
              image={
                notif.type === "Emergency Report"
                  ? require("@/assets/images/profile.png")
                  : require("@/assets/images/profile.png")
              }
              name={notif.name || "Unknown User"}
              desc={notif.message}
              time={formatNotificationTime(notif.createdAt)}
              read={notif.read}
              isEmergency={notif.type === "Emergency Report"}
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
