import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Screen (Placeholder)</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6fafd' },
  text: { fontSize: 22, color: '#2a4365' },
}); 