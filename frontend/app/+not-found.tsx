import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
      <Text className="text-2xl font-bold text-gray-800 text-center">
        Oops! Pantalla no encontrada
      </Text>
      <Text className="text-base text-gray-500 text-center mt-2 mb-6">
        La sección a la que intentás ingresar no está disponible.
      </Text>
      
      <Link href="/" asChild>
        <TouchableOpacity className="bg-blue-600 px-6 py-3 rounded-full shadow-md">
          <Text className="text-white font-semibold text-base">Volver al Inicio</Text>
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  );
}