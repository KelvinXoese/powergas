import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { theme } from '../../theme';

export function OrderScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { type } = route.params || {};
  const [qty, setQty] = useState(1);
  const [deliveryTier, setDeliveryTier] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [submitting, setSubmitting] = useState(false);

  const placeOrder = async () => {
    setSubmitting(true);
    try {
      // In a full build, station + cylinder type + address are selected via pickers
      const idempotencyKey = `${Date.now()}-${Math.random()}`;
      const { data } = await api.post('/orders', {
        type,
        deliveryTier,
        stationId: '00000000-0000-0000-0000-000000000000',
        deliveryAddress: 'Selected delivery address',
        items: [{ cylinderTypeId: '00000000-0000-0000-0000-000000000000', cylinderTypeName: '12.5kg', quantity: qty, unitPrice: 120 }],
        paymentMethod: 'MOBILE_MONEY',
        idempotencyKey,
      });
      Alert.alert('Order placed', 'Your order is being processed.');
      // Previously navigated with no orderId at all — TrackingScreen had no
      // way to know which order to subscribe to.
      nav.navigate('Tracking', { orderId: data.data.id });
    } catch (e: any) {
      Alert.alert('Order failed', e.response?.data?.message || 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type?.replace(/_/g, ' ')}</Text>

      <Text style={styles.sectionLabel}>Delivery speed</Text>
      <View style={styles.tierRow}>
        <TouchableOpacity
          style={[styles.tierBtn, deliveryTier === 'STANDARD' && styles.tierBtnActive]}
          onPress={() => setDeliveryTier('STANDARD')}
        >
          <Text style={[styles.tierLabel, deliveryTier === 'STANDARD' && styles.tierLabelActive]}>Standard</Text>
          <Text style={styles.tierHint}>Cheaper, grouped with nearby orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tierBtn, deliveryTier === 'EXPRESS' && styles.tierBtnActive]}
          onPress={() => setDeliveryTier('EXPRESS')}
        >
          <Text style={[styles.tierLabel, deliveryTier === 'EXPRESS' && styles.tierLabelActive]}>Express</Text>
          <Text style={styles.tierHint}>Dedicated rider, small surcharge</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.qtyRow}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}><Text style={styles.qtyBtnText}>−</Text></TouchableOpacity>
        <Text style={styles.qty}>{qty}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((q) => q + 1)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={placeOrder} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Placing…' : 'Place order'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, paddingTop: 80 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginBottom: 28, textTransform: 'capitalize' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textDim, marginBottom: 10 },
  tierRow: { flexDirection: 'row', gap: 10, marginBottom: 36 },
  tierBtn: { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14 },
  tierBtnActive: { borderColor: theme.colors.flame, backgroundColor: theme.colors.surfaceAlt },
  tierLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  tierLabelActive: { color: theme.colors.flame },
  tierHint: { fontSize: 11, color: theme.colors.textDim, marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 50 },
  qtyBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 26, color: theme.colors.flame },
  qty: { fontSize: 34, fontWeight: '700', color: theme.colors.text, minWidth: 50, textAlign: 'center' },
  button: { backgroundColor: theme.colors.flame, borderRadius: 12, padding: 18, alignItems: 'center' },
  buttonText: { color: theme.colors.bg, fontWeight: '700', fontSize: 16 },
});
