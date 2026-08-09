import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useRoute } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { theme } from '../../theme';

const SOCKET_URL = 'http://10.0.2.2:3000';

const STATUS_LABELS: Record<string, string> = {
  PREPARING: 'Station is preparing your order',
  RIDER_ASSIGNED: 'A rider has been assigned',
  RIDER_EN_ROUTE_PICKUP: 'Rider heading to collect your cylinder',
  RIDER_ARRIVED_PICKUP: 'Rider has arrived to collect your cylinder',
  CYLINDER_PICKED_UP: 'Cylinder collected',
  RIDER_EN_ROUTE_STATION: 'Rider is heading to the station',
  AT_STATION: 'Your cylinder is being refilled',
  RIDER_EN_ROUTE_DELIVERY: 'Rider is bringing your cylinder back',
  RIDER_ARRIVED_DELIVERY: 'Rider has arrived — ask for the code below',
  DELIVERED: 'Marked delivered — confirm below',
};

export function TrackingScreen() {
  const route = useRoute<any>();
  const orderId: string | undefined = route.params?.orderId;
  const token = useAuthStore((s) => s.accessToken);

  const [order, setOrder] = useState<any>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number; eta?: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirming, setConfirming] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    const { data } = await api.get(`/orders/${orderId}`);
    setOrder(data.data);
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Previously this connected to the socket but never actually subscribed
  // to any order — the gateway only broadcasts location_update to clients
  // that have explicitly joined `order:${orderId}` via subscribe_order, so
  // nothing was ever received, no matter how active the delivery was.
  useEffect(() => {
    if (!orderId) return;
    const socket: Socket = io(`${SOCKET_URL}/tracking`, { auth: { token } });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe_order', { orderId });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('location_update', (data: any) => {
      setPosition({ lat: data.latitude, lng: data.longitude, eta: data.etaSeconds });
    });
    socket.on('order_status', () => {
      loadOrder(); // refresh order details whenever status changes
    });

    return () => {
      socket.emit('unsubscribe_order', { orderId });
      socket.disconnect();
    };
  }, [orderId, token, loadOrder]);

  const confirmDelivery = async () => {
    if (!orderId || otp.length < 4) return;
    setConfirming(true);
    try {
      await api.post(`/orders/${orderId}/confirm-delivery`, { otp });
      Alert.alert('Confirmed', 'Thanks — enjoy your gas!');
      loadOrder();
    } catch (e: any) {
      Alert.alert('Wrong code', e.response?.data?.message || 'Check the code and try again.');
    } finally {
      setConfirming(false);
    }
  };

  if (!orderId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.coords}>No order selected to track.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <View style={[styles.dot, { backgroundColor: connected ? theme.colors.teal : theme.colors.rose }]} />
        <Text style={styles.statusText}>{connected ? 'Live tracking active' : 'Connecting…'}</Text>
      </View>

      {order && (
        <Text style={styles.orderStatus}>{STATUS_LABELS[order.status] ?? order.status}</Text>
      )}

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>📍</Text>
        {position ? (
          <>
            <Text style={styles.coords}>{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</Text>
            {position.eta != null && <Text style={styles.eta}>ETA {Math.round(position.eta / 60)} min</Text>}
          </>
        ) : (
          <Text style={styles.coords}>Waiting for rider location…</Text>
        )}
      </View>

      {/* Without this, an order could never actually complete through the
          app — DELIVERED still requires the customer's own OTP confirmation
          to move to CUSTOMER_CONFIRMED, and there was no UI for it anywhere. */}
      {order?.status === 'RIDER_ARRIVED_DELIVERY' || order?.status === 'DELIVERED' ? (
        <View style={styles.otpCard}>
          <Text style={styles.otpLabel}>Enter the code shown in your app to confirm receipt</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="6-digit code"
            placeholderTextColor={theme.colors.textDim}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.confirmBtn} onPress={confirmDelivery} disabled={confirming}>
            <Text style={styles.confirmText}>{confirming ? 'Confirming…' : 'Confirm delivery'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 20, paddingTop: 60 },
  center: { justifyContent: 'center', alignItems: 'center' },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: theme.colors.text, fontSize: 14 },
  orderStatus: { color: theme.colors.flame, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  mapPlaceholder: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  mapIcon: { fontSize: 48, marginBottom: 16 },
  coords: { color: theme.colors.textDim, fontSize: 15, fontFamily: 'monospace' },
  eta: { color: theme.colors.flame, fontSize: 22, fontWeight: '700', marginTop: 12 },
  otpCard: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 18, marginTop: 16, borderWidth: 1, borderColor: theme.colors.flame },
  otpLabel: { color: theme.colors.text, fontSize: 13, marginBottom: 12 },
  otpInput: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 14, color: theme.colors.text, fontSize: 18, letterSpacing: 4, textAlign: 'center', marginBottom: 12 },
  confirmBtn: { backgroundColor: theme.colors.flame, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText: { color: theme.colors.bg, fontWeight: '700', fontSize: 15 },
});
