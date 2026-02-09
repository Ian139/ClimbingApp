import { View, Text, StyleSheet } from 'react-native';
import { HOLD_COLORS } from '@climbset/shared';

export default function EditorScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Editor</Text>
      <Text style={styles.subtitle}>Place holds on your wall</Text>
      <View style={styles.holdRow}>
        {Object.entries(HOLD_COLORS).map(([type, color]) => (
          <View
            key={type}
            style={[styles.holdDot, { backgroundColor: color }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#888', marginTop: 8 },
  holdRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  holdDot: { width: 32, height: 32, borderRadius: 16 },
});
