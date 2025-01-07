import { auth, db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import { onChildAdded, onValue, ref, remove, update } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Modal, StyleSheet, Pressable, TouchableOpacity, Vibration } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import LoadingOverlay from './app/LoadingOverlay';
import { getAuth } from 'firebase/auth';

interface Props {
  currentUserId: string;
}

interface CallType {
  caller: {
    id: string;
    name: string;
  };
  receiver: {
    id: string;
    name: string;
  };
  toResponder?: boolean;
  notify: boolean;
  status: string;
  timestamp: string;
}

const CallNotification = () => {
  const router = useRouter();
  const currentUserId = getAuth().currentUser?.uid;
  
  // Add loading states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [callData, setCallData] = useState<({ roomId: string } & CallType) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Early return if no currentUserId
    if (!currentUserId) {
      console.warn('No user ID found');
      return;
    }

    const callsRef = ref(db, 'calls');

    const unsubscribe = onValue(callsRef, (snapshot) => {
      const calls = snapshot.val();
      if (!calls) {
        setIsModalVisible(false);
        return;
      }

      Object.entries(calls).forEach(([roomId, call]) => {
        const typedCall = call as CallType;
        
        if (
          typedCall.receiver?.id === currentUserId && 
          typedCall.notify && 
          typedCall.status !== 'ongoing'
        ) {
          setCallData({ ...typedCall, roomId });
          setIsModalVisible(true);
          Vibration.vibrate(3000, true);
        }
      });
    });

    return () => {
      unsubscribe();
      Vibration.cancel();
    };
  }, [currentUserId]);

  const handleAccept = async () => {
    if (!callData?.roomId || !currentUserId) return;
    
    setLoading(true);
    Vibration.cancel();

    try {
      await update(ref(db), {
        [`calls/${callData.roomId}/status`]: 'ongoing',
        [`calls/${callData.roomId}/notify`]: false
      });

      router.replace({
        pathname: '/user/call/Receiver',
        params: {
          roomId: callData.roomId,
          currentUserId,
          callerId: callData.caller.id,
          callerName: callData.caller.name,
          isResponder: callData.toResponder ? 'true' : 'false'
        }
      });
    } catch (error) {
      console.error('Error accepting call:', error);
    } finally {
      setIsModalVisible(false);
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!callData?.roomId) return;

    setIsModalVisible(false);
    setCallData(null);
    Vibration.cancel();

    try {
      await remove(ref(db, `calls/${callData.roomId}`));
    } catch (error) {
      console.error('Handle Decline Error:', error);
    }
  };

  return (
    <Modal visible={isModalVisible} transparent>
      <LoadingOverlay visible={loading} message="Redirecting..." />
      <View style={styles.container}>
        <View style={styles.callForm}>
          <View style={styles.upperForm}>
            <Text style={styles.textCaller}>{callData?.caller?.name || 'Unknown'}</Text>
            <Text style={styles.textInfo}>Incoming Call</Text>
          </View>
          <View style={styles.lowerForm}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleAccept}
                style={styles.acceptButton}
                activeOpacity={0.8}
                disabled={loading}
              >
                <MaterialIcons name="call" size={70} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDecline}
                style={styles.declineButton}
                activeOpacity={0.8}
                disabled={loading}
              >
                <MaterialIcons name="call-end" size={70} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CallNotification;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  callForm: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    height: hp(100),
    width: wp(100),
  },
  upperForm: {
    height: hp(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInfo: {
    fontSize: 24,
    marginBottom: 20,
  },
  textCaller: {
    fontWeight: 'bold',
    fontSize: 44,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  lowerForm: {
    height: hp(50),
    justifyContent: 'center',
    alignContent: 'center',
  },
  buttonContainer: {
    justifyContent: 'space-evenly',
    flexDirection: 'row',
  },
  button: {},
  acceptButton: {
    backgroundColor: '#007C01',
    padding: 20,
    borderRadius: 50,
  },
  declineButton: {
    backgroundColor: '#E80001',
    padding: 20,
    borderRadius: 50,
  },
});
