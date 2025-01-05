import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Pressable,
  ImageSourcePropType,
  DimensionValue,
  Dimensions,
} from 'react-native';
import React from 'react';

import MI from 'react-native-vector-icons/MaterialIcons';
import { scale } from 'react-native-size-matters';

interface Props {
  title: string;
  dateString: string;
  timeAgo: string;
  viewString: string;
  detailsString: string;
  width?: DimensionValue;
}
const screenWidth = Dimensions.get('window').width - scale(40);

const newsAlertCard = ({
  title,
  dateString,
  timeAgo,
  viewString,
  detailsString,
  width = screenWidth,
}: Props) => {
  return (
    <View style={[styles.cardContainer, { width }]}>
      {/* <Pressable style={styles.button}>
        <Text style={styles.seeMore}>View More ➤</Text>
        <View style={styles.accidentViews}>
          <MI name="group" size={20} color={'#0B0C63'} />
          <Text style={styles.viewText}>{viewString}</Text>
        </View>
      </Pressable> */}
      <View style={styles.cardMoreInfo}>
        <Text style={styles.accidentName}>{title}</Text>
        <Text style={styles.accidentDetails}>{detailsString}</Text>
        <Text style={styles.accidentDate}>{dateString}</Text>
        {/* <Text style={styles.accidentDate}>{timeAgo}</Text> */}
      </View>
    </View>
  );
};

export default newsAlertCard;

const styles = StyleSheet.create({
  cardContainer: {
    padding: 20,
    borderRadius: 15,
    margin: 5,
    marginHorizontal: 0,
    backgroundColor: '#acb8c0',
  },
  cardMoreInfo: {
    gap: 5,
    flexWrap: 'wrap',
  },
  accidentName: {
    color: '#000',
    fontSize: 22,
    padding: 5,
    fontWeight: 'bold',
  },
  accidentDetails: {
    padding: 5,
    color: '#000',
    flexWrap: 'wrap',
    width: '90%',
  },
  accidentDate: {
    color: '#0B0C63',
    fontSize: 14,
    padding: 5,
    textAlign: 'right',
    width: '100%',
  },

  buttons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 15,
  },
  button: {
    paddingVertical: 10,
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  accidentViews: {
    flexDirection: 'row',

    justifyContent: 'center',
    alignItems: 'center',
  },
  viewText: {
    fontSize: 20,
    paddingLeft: 5,
    fontWeight: 'semibold',
  },
  seeMore: {
    color: '#000',
    fontSize: 16,
  },
});
