import React, { useState } from 'react';
import { View, Text, TextInput, Button, Modal, StyleSheet, Platform } from 'react-native';
import { useConfig } from '@/contexts/ConfigContext';

export function ConfigDialog() {
  const { 
    websiteUrl, 
    setWebsiteUrl, 
    isConfigDialogVisible, 
    hideConfigDialog 
  } = useConfig();
  
  const [tempUrl, setTempUrl] = useState(websiteUrl);

  const handleSave = () => {
    setWebsiteUrl(tempUrl);
    hideConfigDialog();
  };

  const handleCancel = () => {
    setTempUrl(websiteUrl);
    hideConfigDialog();
  };

  return (
    <Modal
      visible={isConfigDialogVisible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.title}>Configuration</Text>
          
          <Text style={styles.label}>Website URL</Text>
          <TextInput
            style={styles.input}
            value={tempUrl}
            onChangeText={setTempUrl}
            placeholder="https://example.com"
          />
          
          <View style={styles.buttonContainer}>
            <Button title="Cancel" onPress={handleCancel} color="#6c757d" />
            <Button title="Save" onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    alignSelf: 'flex-start',
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    height: 40,
    width: '100%',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
});