import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { theme } from '../../theme';

export function EarningsScreen() {
  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await api.get('/riders/wallet')).data.data,
  });
  const { data: txns } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => (await api.get('/riders/wallet/transactions')).data.data,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={styles.title}>Wallet</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceValue}>GHS {Number(wallet?.availableBalance ?? 0).toFixed(2)}</Text>
        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.subLabel}>Pending</Text>
            <Text style={styles.subValue}>GHS {Number(wallet?.pendingBalance ?? 0).toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.subLabel}>Total earned</Text>
            <Text style={styles.subValue}>GHS {Number(wallet?.totalEarned ?? 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {(txns ?? []).map((t: any) => (
        <View key={t.id} style={styles.txnRow}>
          <View>
            <Text style={styles.txnReason}>{t.reason.replace(/_/g, ' ')}</Text>
            <Text style={styles.txnDate}>{new Date(t.createdAt).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.txnAmount, { color: t.type === 'CREDIT' ? theme.colors.teal : theme.colors.rose }]}>
            {t.type === 'CREDIT' ? '+' : '−'}GHS {Number(t.amount).toFixed(2)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  title: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginBottom: 24 },
  balanceCard: { backgroundColor: theme.colors.flame, borderRadius: 18, padding: 24, marginBottom: 28 },
  balanceLabel: { fontSize: 13, color: 'rgba(11,14,20,0.7)' },
  balanceValue: { fontSize: 36, fontWeight: '800', color: theme.colors.bg, marginTop: 6 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  subLabel: { fontSize: 11, color: 'rgba(11,14,20,0.6)' },
  subValue: { fontSize: 15, fontWeight: '700', color: theme.colors.bg, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  txnReason: { fontSize: 14, color: theme.colors.text, textTransform: 'capitalize' },
  txnDate: { fontSize: 12, color: theme.colors.textDim, marginTop: 3 },
  txnAmount: { fontSize: 15, fontWeight: '700' },
});
