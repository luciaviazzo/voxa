import React, { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RecordButton from '@/components/RecordButton';
import { transcribeAudio } from '@/services/transcribeService';

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [disponible, setDisponible] = useState(45000);

  async function handleRecordComplete(audioUri: string) {
    setIsLoading(true);
    setErrorMessage(null);
    setTranscribedText(null);

    try {
      const response = await transcribeAudio(audioUri);
      
      setTranscribedText(response.text);
      console.log('Texto obtenido:', response.text);
      console.log('Datos de la transacción:', response.transaction);

      if (response.transaction && response.transaction.monto > 0) {
        const { monto, tipo } = response.transaction;

        setDisponible((prevSaldo) => {
          if (tipo === 'gasto') {
            return prevSaldo - monto;
          } else if (tipo === 'ingreso') {
            return prevSaldo + monto;
          }
          return prevSaldo;
        });
      }

    } catch (error: any) {
      setErrorMessage(error.message || 'Ocurrió un error al procesar el audio.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 justify-between items-center px-6 py-10">
      
      <View className="items-center mt-4">
        <Text className="text-3xl font-bold text-blue-600">Voxa</Text>
        <Text className="text-base text-gray-500 mt-1">Tus finanzas con la voz</Text>
      </View>

      <View className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 items-center">
        <Text className="text-sm text-gray-400 uppercase tracking-wider">Disponible este mes</Text>
        <Text className="text-4xl font-extrabold text-gray-800 mt-2">${disponible.toLocaleString()}</Text>
        <Text className="text-sm text-green-600 font-medium mt-1">¡Vas muy bien!</Text>
      </View>

      <View className="w-full px-2 min-h-[60px] justify-center items-center">
        {isLoading && <ActivityIndicator size="small" color="#2563eb" />}
        
        {transcribedText && (
          <View className="bg-blue-50 p-3 rounded-xl border border-blue-100 w-full">
            <Text className="text-xs text-blue-500 font-bold">Último audio reconocido:</Text>
            <Text className="text-sm text-blue-900 mt-1">"{transcribedText}"</Text>
          </View>
        )}

        {errorMessage && (
          <View className="bg-red-50 p-3 rounded-xl border border-red-100 w-full">
            <Text className="text-sm text-red-600 text-center">{errorMessage}</Text>
          </View>
        )}
      </View>

      <View className="mb-8">
        <RecordButton 
          onRecordComplete={handleRecordComplete} 
          isLoading={isLoading} 
        />
      </View>

    </SafeAreaView>
  );
}