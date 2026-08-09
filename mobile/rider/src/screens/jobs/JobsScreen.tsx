import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { getAvailableNearby, acceptOrder, AvailableOrder } from '../../services/api';
import { theme } from '../../theme';

export function JobsScreen() {
  const nav = useNavigation<any>();
  const [jobs, setJobs] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const loadJobs = useCallback(() => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await getAvailableNearby(pos.coords.latitude, pos.coords.longitude);
          setJobs(results);
        } catch {
          Alert.alert('Could not load jobs', 'Check your connection and try again.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        Alert.alert('Location needed', 'Turn on location to see nearby jobs.');
      },
      { enableHighAccuracy: true },
    );
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleAccept = async (job: AvailableOrder) => {
    setAccepting(job.id);
    try {
      const order = await acceptOrder(job.id);
      // Won the race — go straight into the active-order flow.
      nav.replace('ActiveOrder', { orderId: order.id });
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.response?.status === 403) {
        // Someone else accepted first — this is a normal outcome, not an error.
        Alert.alert('Too slow!', 'Another rider already claimed this one.');
        loadJobs();
      } else {
        Alert.alert('Could not accept', 'Something went wrong — try again.');
      }
    } finally {
      setAccepting(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby jobs</Text>
      <Text style={styles.subtitle}>First to accept gets it — like Bolt</Text>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadJobs} tintColor={theme.colors.teal} />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No jobs nearby right now. Pull to refresh.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <Text style={styles.jobType}>{item.type.replace(/_/g, ' ')}</Text>
              <View style={[styles.tierBadge, item.delivery_tier === 'EXPRESS' && styles.tierBadgeExpress]}>
                <Text style={styles.tierText}>{item.delivery_tier}</Text>
              </View>
            </View>
            <Text style={styles.jobAddress}>{item.delivery_address}</Text>
            <View style={styles.jobFooter}>
              <Text style={styles.jobDistance}>{item.distance?.toFixed(1)} km away</Text>
              <TouchableOpacity
                style={[styles.acceptBtn, accepting === item.id && styles.acceptBtnDisabled]}
                onPress={() => handleAccept(item)}
                disabled={accepting !== null}
              >
                <Text style={styles.acceptText}>{accepting === item.id ? 'Accepting…' : 'Accept'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textDim, marginTop: 4 },
  emptyText: { color: theme.colors.textDim, textAlign: 'center', marginTop: 60, fontSize: 14 },
  jobCard: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobType: { fontSize: 15, fontWeight: '700', color: theme.colors.text, textTransform: 'capitalize' },
  tierBadge: { backgroundColor: theme.colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tierBadgeExpress: { backgroundColor: theme.colors.flame },
  tierText: { fontSize: 10, fontWeight: '700', color: theme.colors.text },
  jobAddress: { fontSize: 13, color: theme.colors.textDim, marginTop: 6 },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  jobDistance: { fontSize: 13, color: theme.colors.teal, fontWeight: '600' },
  acceptBtn: { backgroundColor: theme.colors.teal, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptText: { color: theme.colors.bg, fontWeight: '700', fontSize: 13 },
});
