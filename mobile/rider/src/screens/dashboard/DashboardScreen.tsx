import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, getMyOrders } from '../../services/api';
import { useRiderStore } from '../../store/rider';
import { theme } from '../../theme';

// Any status in this list means the rider still has unfinished work on that
// order — matches the "active" list OrdersService.releaseRiderIfFree uses
// on the backend, so the app and the backend agree on what "busy" means.
const ACTIVE_STATUSES = [
  'RIDER_ASSIGNED', 'RIDER_EN_ROUTE_PICKUP', 'RIDER_ARRIVED_PICKUP',
  'CYLINDER_PICKED_UP', 'RIDER_EN_ROUTE_STATION', 'AT_STATION',
  'RIDER_EN_ROUTE_DELIVERY', 'RIDER_ARRIVED_DELIVERY',
];

export function DashboardScreen() {
  const nav = useNavigation<any>();
  const available = useRiderStore((s) => s.available);
  const setAvailable = useRiderStore((s) => s.setAvailable);
  const activeOrderId = useRiderStore((s) => s.activeOrderId);
  const setActiveOrderId = useRiderStore((s) => s.setActiveOrderId);
  const [checkingForActiveOrder, setCheckingForActiveOrder] = useState(true);

  // On load: if the rider already has an order mid-delivery (app was
  // killed and reopened, etc.), restore it instead of showing "no active
  // delivery" and letting them accidentally start a second job.
  useEffect(() => {
    (async () => {
      try {
        const { items } = await getMyOrders();
        const inProgress = items.find((o) => ACTIVE_STATUSES.includes(o.status as string));
        if (inProgress) {
          setActiveOrderId(inProgress.id);
          nav.replace('ActiveOrder', { orderId: inProgress.id });
          return;
        }
      } catch {
        // Non-fatal — just means we can't confirm, rider can still work manually.
      }
      setCheckingForActiveOrder(false);
    })();
  }, [nav, setActiveOrderId]);

  const toggleAvailability = async (value: boolean) => {
    setAvailable(value);
    try {
      await api.patch('/riders/availability', { status: value ? 'AVAILABLE' : 'OFFLINE' });
    } catch {
      setAvailable(!value); // roll back on failure so the UI doesn't lie about real status
    }
  };

  if (checkingForActiveOrder) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.teal} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusLabel}>You are</Text>
          <Text style={[styles.statusValue, { color: available ? theme.colors.teal : theme.colors.textDim }]}>
            {available ? 'AVAILABLE' : 'OFFLINE'}
          </Text>
        </View>
        <Switch
          value={available}
          onValueChange={toggleAvailability}
          trackColor={{ false: theme.colors.border, true: theme.colors.teal }}
          thumbColor={theme.colors.text}
        />
      </View>

      <Text style={styles.sectionTitle}>Active Delivery</Text>
      {activeOrderId ? (
        <TouchableOpacity style={styles.orderCard} onPress={() => nav.navigate('ActiveOrder', { orderId: activeOrderId })}>
          <Text style={styles.orderNum}>Order in progress</Text>
          <Text style={styles.orderHint}>Tap to continue →</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.emptyCard, !available && styles.emptyCardDisabled]}
          onPress={() => available && nav.navigate('Jobs')}
          disabled={!available}
        >
          <Text style={styles.emptyText}>
            {available ? 'No active delivery. Tap to browse nearby jobs.' : 'Go available to start seeing nearby jobs.'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.earningsBtn} onPress={() => nav.navigate('Earnings')}>
        <Text style={styles.earningsText}>View earnings & wallet →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 28 },
  statusLabel: { fontSize: 13, color: theme.colors.textDim },
  statusValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  orderCard: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: theme.colors.flame },
  orderNum: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  orderHint: { fontSize: 13, color: theme.colors.teal, marginTop: 6 },
  emptyCard: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: theme.colors.border },
  emptyCardDisabled: { opacity: 0.6 },
  emptyText: { fontSize: 14, color: theme.colors.textDim, lineHeight: 20 },
  earningsBtn: { backgroundColor: theme.colors.surfaceAlt, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 28 },
  earningsText: { color: theme.colors.flame, fontWeight: '600', fontSize: 15 },
});
