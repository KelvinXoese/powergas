import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { DashboardScreen } from './src/screens/dashboard/DashboardScreen';
import { JobsScreen } from './src/screens/jobs/JobsScreen';
import { ActiveOrderScreen } from './src/screens/activeOrder/ActiveOrderScreen';
import { EarningsScreen } from './src/screens/earnings/EarningsScreen';
import { useAuthStore } from './src/store/auth';
import { useLocationSharing } from './src/hooks/useLocationSharing';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  const token = useAuthStore((s) => s.accessToken);

  // Mounted once at the root — keeps streaming location for as long as
  // there's an active order, independent of which screen is on screen.
  // See hooks/useLocationSharing.ts for why this can't live inside
  // DashboardScreen (it used to, and stopped working the moment the rider
  // navigated to a different screen mid-delivery).
  useLocationSharing();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!token ? (
              <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
              <>
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="Jobs" component={JobsScreen} />
                <Stack.Screen name="ActiveOrder" component={ActiveOrderScreen} />
                <Stack.Screen name="Earnings" component={EarningsScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
