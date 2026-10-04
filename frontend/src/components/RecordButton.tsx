/// <reference types="nativewind" />

import React, { useState } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';

interface RecordButtonProps {
  onRecordComplete: (audioUri: string) => void;
  isLoading?: boolean;
}

export default function RecordButton({ onRecordComplete, isLoading = false }: RecordButtonProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  async function startRecording() {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Necesitamos tu permiso para usar el micrófono');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
    } catch (err) {
      console.error('Error al iniciar la grabación', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      const currentRecording = recording;
      setRecording(null);
      
      await currentRecording.stopAndUnloadAsync();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = currentRecording.getURI();
      if (uri) {
        onRecordComplete(uri);
      }
    } catch (err) {
      console.error('Error al detener la grabación', err);
    }
  }

  const isRecording = recording !== null;

  return (
    <View className="items-center justify-center">
      <TouchableOpacity
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={isLoading}
        activeOpacity={0.7}
        className={`w-32 h-32 rounded-full items-center justify-center shadow-lg transition-all ${
          isRecording ? 'bg-red-500 scale-110' : 'bg-blue-600'
        } ${isLoading ? 'opacity-50' : 'opacity-100'}`}
      >
        <FontAwesome 
          name="microphone" 
          size={50} 
          color="white" 
        />
      </TouchableOpacity>
      
      <Text className="mt-6 text-lg font-medium text-gray-700">
        {isLoading 
          ? 'Procesando gasto...' 
          : isRecording 
            ? 'Te escucho... (soltá para enviar)' 
            : 'Mantené presionado para hablar'}
      </Text>
    </View>
  );
}