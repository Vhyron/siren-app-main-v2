import React from 'react';
import { Platform, StatusBar, StyleSheet } from 'react-native';
import { ThemedView } from '../ThemedView';
import AdminFooter from './AdminFooter';

const AdminStyledContainer = ({ children, bg = '#e6e6e6' }: any) => {
  return (
    <ThemedView style={[styles.container, { backgroundColor: bg }]}>
      {children}
      <AdminFooter />
    </ThemedView>
  );
};

export default AdminStyledContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Platform.OS == 'android' ? StatusBar.currentHeight : 0,
    // marginTop: 0,
    position: 'relative',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
