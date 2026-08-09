import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { theme } from '../../theme';

// Matches the same "active" definition used server-side (see
// OrdersService.releaseRiderIfFree) and on the rider app's DashboardScreen.
const ACTIVE_STATUSES = [
  'PENDING', 'ACCEPTED', 'INVENTORY_RESERVED', 'PREPARING', 'RIDER_ASSIGNED',
  'RIDER_EN_ROUTE_PICKUP', 'RIDER_ARRIVED_PICKUP', 'CYLINDER_PICKED_UP',
  'RIDER_EN_ROUTE_STATION', 'AT_STATION', 'RIDER_EN_ROUTE_DELIVERY',
  'RIDER_ARRIVED_DELIVERY', 'DELIVERED',
];

// Delivery urgency (STANDARD/EXPRESS) is now an independent choice made in
// OrderScreen, not a 4th order type here — EMERGENCY was removed from the
// backend's OrderType entirely and replaced by DeliveryTier, which applies
// to any of these three, not a separate category of its own.
const ORDER_TYPES = [
  { type: 'CYLINDER_EXCHANGE', label: 'Cylinder Exchange', desc: 'Swap empty for filled', icon: '🔄' },
  { type: 'NEW_CYLINDER_PURCHASE', label: 'New Cylinder', desc: 'Buy cylinder + gas', icon: '🛒' },
  { type: 'REFILL_SERVICE', label: 'Refill', desc: 'Refill your cylinder', icon: '⛽' },
];

export function HomeScreen() {
  const nav = useNavigation<any>();

  const trackActive = async () => {
    try {
      // Previously navigated to Tracking with no orderId at all — the
      // screen had no way to know which order to subscribe to.
      const { data } = await api.get('/orders');
      const active = data.data?.items?.find((o: any) => ACTIVE_STATUSES.includes(o.status));
      if (!active) {
        Alert.alert('No active delivery', "You don't have an order in progress right now.");
        return;
      }
      nav.navigate('Tracking', { orderId: active.id });
    } catch {
      Alert.alert('Could not check', 'Try again in a moment.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={styles.greeting}>Good day 👋</Text>
      <Text style={styles.title}>What do you need?</Text>

      <View style={styles.grid}>
        {ORDER_TYPES.map((o) => (
          <TouchableOpacity key={o.type} style={styles.card} onPress={() => nav.navigate('Order', { type: o.type })}>
            <Text style={styles.cardIcon}>{o.icon}</Text>
            <Text style={styles.cardLabel}>{o.label}</Text>
            <Text style={styles.cardDesc}>{o.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.trackBtn} onPress={trackActive}>
        <Text style={styles.trackText}>Track active delivery →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  greeting: { fontSize: 14, color: theme.colors.textDim },
  title: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginTop: 4, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 18, marginBottom: 14 },
  cardIcon: { fontSize: 28, marginBottom: 12 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  cardDesc: { fontSize: 12, color: theme.colors.textDim, marginTop: 4 },
  trackBtn: { backgroundColor: theme.colors.surfaceAlt, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  trackText: { color: theme.colors.flame, fontWeight: '600', fontSize: 15 },
});
