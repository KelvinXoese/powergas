import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { theme } from '../../theme';

export function LoginScreen() {
  const { setAccessToken, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAccessToken(data.data.accessToken);
      const me = await api.get('/auth/me');
      setUser(me.data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Sign in failed');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mark}><Text style={styles.markText}>🛵</Text></View>
      <Text style={styles.title}>Powergas Rider</Text>
      <Text style={styles.subtitle}>Deliver. Earn. Repeat.</Text>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.colors.textDim} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.colors.textDim} value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleLogin}><Text style={styles.buttonText}>Sign in</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 28, justifyContent: 'center' },
  mark: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.colors.flame, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  markText: { fontSize: 26 },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textDim, marginTop: 6, marginBottom: 32 },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 14, color: theme.colors.text, marginBottom: 14, fontSize: 15 },
  error: { color: theme.colors.rose, marginBottom: 12 },
  button: { backgroundColor: theme.colors.flame, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: theme.colors.bg, fontWeight: '700', fontSize: 16 },
});
