import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { HomeScreen } from './src/screens/home/HomeScreen';
import { OrderScreen } from './src/screens/orders/OrderScreen';
import { TrackingScreen } from './src/screens/tracking/TrackingScreen';
import { useAuthStore } from './src/store/auth';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  const token = useAuthStore((s) => s.accessToken);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!token ? (
              <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Order" component={OrderScreen} />
                <Stack.Screen name="Tracking" component={TrackingScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
