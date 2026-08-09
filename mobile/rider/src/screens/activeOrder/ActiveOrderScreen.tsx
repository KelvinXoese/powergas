import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, updateOrderStatus, OrderStatus, RiderOrder } from '../../services/api';
import { useRiderStore } from '../../store/rider';
import { theme } from '../../theme';

// Each step: the status the order is CURRENTLY in, the action button shown,
// and the status tapping that button moves it to. Matches the backend's
// transition map in orders.service.ts exactly.
const STEPS: Record<string, { label: string; buttonText: string; next: OrderStatus; gated: boolean }> = {
  RIDER_ASSIGNED: { label: 'Heading to pick up the cylinder', buttonText: "I'm on my way", next: 'RIDER_EN_ROUTE_PICKUP', gated: false },
  RIDER_EN_ROUTE_PICKUP: { label: 'On the way to customer', buttonText: "I've arrived", next: 'RIDER_ARRIVED_PICKUP', gated: true },
  RIDER_ARRIVED_PICKUP: { label: 'Arrived — collect the cylinder', buttonText: 'Cylinder picked up', next: 'CYLINDER_PICKED_UP', gated: false },
  CYLINDER_PICKED_UP: { label: 'Got it — head to the station', buttonText: 'Heading to station', next: 'RIDER_EN_ROUTE_STATION', gated: false },
  RIDER_EN_ROUTE_STATION: { label: 'On the way to the station', buttonText: "I've arrived at the station", next: 'AT_STATION', gated: true },
  AT_STATION: { label: 'At the station — refill in progress', buttonText: 'Refill done, heading to customer', next: 'RIDER_EN_ROUTE_DELIVERY', gated: false },
  RIDER_EN_ROUTE_DELIVERY: { label: 'Delivering the full cylinder', buttonText: "I've arrived", next: 'RIDER_ARRIVED_DELIVERY', gated: true },
  RIDER_ARRIVED_DELIVERY: { label: 'Arrived — hand over the cylinder', buttonText: 'Mark delivered', next: 'DELIVERED', gated: true },
};

export function ActiveOrderScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const orderId: string = route.params.orderId;
  const setActiveOrderId = useRiderStore((s) => s.setActiveOrderId);

  const [order, setOrder] = useState<RiderOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const loadOrder = useCallback(async () => {
    const { data } = await api.get(`/orders/${orderId}`);
    setOrder(data.data ?? data);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    setActiveOrderId(orderId); // starts location sharing app-wide, see useLocationSharing
    loadOrder();
    return () => {
      // Only clear if this order actually finished — don't kill sharing
      // just because the rider navigated away mid-delivery.
    };
  }, [orderId, loadOrder, setActiveOrderId]);

  const step = order ? STEPS[order.status] : null;

  const handleAdvance = async () => {
    if (!step || !order) return;
    setAdvancing(true);
    try {
      const updated = await updateOrderStatus(order.id, step.next);
      setOrder(updated);

      if (step.next === 'DELIVERED') {
        setActiveOrderId(null); // job's done — free up location sharing and the "busy" state
        Alert.alert('Delivered', 'Waiting for the customer to confirm on their end.', [
          { text: 'Back to jobs', onPress: () => nav.replace('Dashboard') },
        ]);
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        // Proximity gate rejected it — this is expected behavior, not a bug.
        const message = err?.response?.data?.message ?? "You're not close enough yet.";
        Alert.alert('Not close enough', message);
      } else {
        Alert.alert('Could not update', 'Something went wrong — try again.');
      }
    } finally {
      setAdvancing(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.teal} />
      </View>
    );
  }

  if (!step) {
    // Status isn't one we render a button for (e.g. DELIVERED already, or a
    // terminal state) — just show where things stand.
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.doneText}>Order status: {order.status}</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => nav.replace('Dashboard')}>
          <Text style={styles.secondaryBtnText}>Back to jobs</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.orderNum}>{order.orderNumber}</Text>
      <View style={[styles.tierBadge, order.deliveryTier === 'EXPRESS' && styles.tierBadgeExpress]}>
        <Text style={styles.tierText}>{order.deliveryTier}</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>{step.label}</Text>
        {step.gated && <Text style={styles.gatedHint}>You must be at the location to continue</Text>}
      </View>

      <Text style={styles.address}>{order.deliveryAddress}</Text>

      <TouchableOpacity
        style={[styles.actionBtn, advancing && styles.actionBtnDisabled]}
        onPress={handleAdvance}
        disabled={advancing}
      >
        <Text style={styles.actionText}>{advancing ? 'Updating…' : step.buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 20, paddingTop: 60 },
  center: { justifyContent: 'center', alignItems: 'center' },
  orderNum: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  tierBadge: { alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  tierBadgeExpress: { backgroundColor: theme.colors.flame },
  tierText: { fontSize: 10, fontWeight: '700', color: theme.colors.text },
  statusCard: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: theme.colors.border, marginTop: 24 },
  statusLabel: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  gatedHint: { fontSize: 12, color: theme.colors.amber, marginTop: 8 },
  address: { fontSize: 14, color: theme.colors.textDim, marginTop: 16, lineHeight: 20 },
  actionBtn: { backgroundColor: theme.colors.teal, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 32 },
  actionBtnDisabled: { opacity: 0.6 },
  actionText: { color: theme.colors.bg, fontWeight: '700', fontSize: 15 },
  doneText: { color: theme.colors.text, fontSize: 16, marginBottom: 20 },
  secondaryBtn: { backgroundColor: theme.colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  secondaryBtnText: { color: theme.colors.text, fontWeight: '600' },
});
