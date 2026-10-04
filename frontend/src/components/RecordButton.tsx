import React, { useState } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import {
  useAudioRecorder,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import { FontAwesome } from '@expo/vector-icons';

interface RecordButtonProps {
  onRecordComplete: (audioUri: string) => void;
  isLoading?: boolean;
}

export default function RecordButton({ onRecordComplete, isLoading = false }: RecordButtonProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  async function startRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        alert('Necesitamos tu permiso para usar el micrófono');
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error('Error al iniciar la grabación', err);
    }
  }

  async function stopRecording() {
    if (!isRecording) return;

    try {
      setIsRecording(false);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });

      if (recorder.uri) {
        onRecordComplete(recorder.uri);
      }
    } catch (err) {
      console.error('Error al detener la grabación', err);
    }
  }

  return (
    <View className="items-center justify-center">
      <TouchableOpacity
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={isLoading}
        activeOpacity={0.7}
        className={`w-32 h-32 rounded-full items-center justify-center shadow-lg ${
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