import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  LayoutChangeEvent,
  GestureResponderEvent,
} from 'react-native';
import {
  HOLD_COLORS,
  V_GRADES,
  type Hold,
  type HoldType,
  type HoldSize,
} from '@climbset/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { nanoid } from 'nanoid/non-secure';
import { useRoutesStore } from '../../lib/stores/routes-store';

const HOLD_TYPES: HoldType[] = ['start', 'hand', 'foot', 'finish'];
const HOLD_SIZE_PX: Record<HoldSize, number> = { small: 16, medium: 24, large: 36 };
const HOLD_BORDER: Record<HoldSize, number> = { small: 2, medium: 3, large: 4 };

export default function EditorScreen() {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [selectedType, setSelectedType] = useState<HoldType>('hand');
  const [selectedSize, setSelectedSize] = useState<HoldSize>('medium');
  const [showSequence, setShowSequence] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeGrade, setRouteGrade] = useState('');
  const [undoStack, setUndoStack] = useState<Hold[][]>([]);

  const canvasLayout = useRef({ width: 0, height: 0 });

  const handleCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    canvasLayout.current = { width, height };
  }, []);

  const handleCanvasPress = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      const { width, height } = canvasLayout.current;
      if (width === 0 || height === 0) return;

      const x = (locationX / width) * 100;
      const y = (locationY / height) * 100;

      const newHold: Hold = {
        id: `h-${Date.now()}`,
        x,
        y,
        type: selectedType,
        color: HOLD_COLORS[selectedType],
        sequence: showSequence ? holds.length + 1 : null,
        size: selectedSize,
      };

      setUndoStack((prev) => [...prev, holds]);
      setHolds((prev) => [...prev, newHold]);
    },
    [selectedType, selectedSize, showSequence, holds]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setHolds(prev);
  }, [undoStack]);

  const removeHold = useCallback((holdId: string) => {
    setHolds((prev) => {
      setUndoStack((s) => [...s, prev]);
      return prev.filter((h) => h.id !== holdId);
    });
  }, []);

  const clearHolds = () => {
    if (holds.length === 0) return;
    Alert.alert('Clear All', 'Remove all holds?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setUndoStack((s) => [...s, holds]);
          setHolds([]);
        },
      },
    ]);
  };

  const addRoute = useRoutesStore((s) => s.addRoute);

  const handleSave = async () => {
    const route = {
      id: nanoid(),
      user_id: 'local-user',
      user_name: 'You',
      wall_id: 'default-wall',
      name: routeName.trim(),
      grade_v: routeGrade || undefined,
      holds,
      is_public: true,
      view_count: 0,
      share_token: nanoid(10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      like_count: 0,
    };

    await addRoute(route as any);
    Alert.alert('Saved!', `"${routeName}" saved with ${holds.length} holds.`);
    setSaveModalVisible(false);
    setRouteName('');
    setRouteGrade('');
    setHolds([]);
    setUndoStack([]);
  };

  const holdCounts = holds.reduce(
    (acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1917' }} edges={['top']}>
      {/* Header — frosted glass */}
      <BlurView intensity={40} tint="systemChromeMaterialDark" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: undoStack.length > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
              alignItems: 'center', justifyContent: 'center',
            }}
            onPress={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Text style={{ color: undoStack.length > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)', fontSize: 18 }}>
              ↩
            </Text>
          </Pressable>

          {holds.length > 0 && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' }}>
                {holds.length} {holds.length === 1 ? 'hold' : 'holds'}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={{
            paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14,
            backgroundColor: holds.length > 0 ? '#8b6f47' : 'rgba(255,255,255,0.08)',
            shadowColor: holds.length > 0 ? '#8b6f47' : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
          onPress={() => holds.length > 0 && setSaveModalVisible(true)}
          disabled={holds.length === 0}
        >
          <Text style={{ fontWeight: '600', color: holds.length > 0 ? '#fffbf7' : 'rgba(255,255,255,0.3)' }}>
            Save
          </Text>
        </Pressable>
      </BlurView>

      {/* Canvas */}
      <View
        style={{
          flex: 1, marginHorizontal: 12, marginBottom: 8, borderRadius: 16,
          overflow: 'hidden', backgroundColor: '#232017',
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        }}
        onLayout={handleCanvasLayout}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleCanvasPress}
      >
        {/* Placeholder */}
        {holds.length === 0 && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 28 }}>👆</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '500' }}>Tap to place holds</Text>
            <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, marginTop: 4 }}>Long-press a hold to remove it</Text>
          </View>
        )}

        {/* Hold count overlay */}
        {holds.length > 0 && (
          <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6, zIndex: 10 }}>
            {Object.entries(holdCounts).map(([type, count]) => (
              <View
                key={type}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}
              >
                <View style={{ backgroundColor: HOLD_COLORS[type as HoldType], width: 8, height: 8, borderRadius: 4 }} />
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '500' }}>
                  {count} {type}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Rendered holds */}
        {holds.map((hold) => {
          const size = HOLD_SIZE_PX[hold.size];
          const bw = HOLD_BORDER[hold.size];
          return (
            <Pressable
              key={hold.id}
              onLongPress={() => removeHold(hold.id)}
              delayLongPress={400}
              style={{
                position: 'absolute',
                left: `${hold.x}%`,
                top: `${hold.y}%`,
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: bw,
                borderColor: hold.color,
                backgroundColor: hold.color + '33',
                transform: [{ translateX: -size / 2 }, { translateY: -size / 2 }],
                alignItems: 'center',
                justifyContent: 'center',
                // Glow effect
                shadowColor: hold.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
              }}
            >
              {showSequence && hold.sequence != null && (
                <Text style={{ color: '#fff', fontSize: size * 0.35, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                  {hold.sequence}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Bottom Controls — frosted glass */}
      <BlurView intensity={40} tint="systemChromeMaterialDark" style={{ paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
        {/* Hold Type Pills */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, marginTop: 8 }}>
          {HOLD_TYPES.map((type) => {
            const isSelected = selectedType === type;
            const color = HOLD_COLORS[type];
            return (
              <Pressable
                key={type}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: isSelected ? color + '15' : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: isSelected ? color + '40' : 'transparent',
                }}
                onPress={() => setSelectedType(type)}
              >
                <View style={{ backgroundColor: color, width: 10, height: 10, borderRadius: 5 }} />
                <Text style={{ fontSize: 12, fontWeight: '500', textTransform: 'capitalize', color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Size + Actions Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Size selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {(['small', 'medium', 'large'] as HoldSize[]).map((size) => {
              const isSelected = selectedSize === size;
              const dotSize = size === 'small' ? 8 : size === 'medium' ? 14 : 20;
              const bw = HOLD_BORDER[size];
              return (
                <Pressable
                  key={size}
                  style={{
                    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                  }}
                  onPress={() => setSelectedSize(size)}
                >
                  <View
                    style={{
                      width: dotSize, height: dotSize, borderRadius: dotSize / 2,
                      borderWidth: bw, borderColor: HOLD_COLORS[selectedType],
                      backgroundColor: isSelected ? HOLD_COLORS[selectedType] + '33' : 'transparent',
                    }}
                  />
                </Pressable>
              );
            })}
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginLeft: 4, textTransform: 'capitalize' }}>{selectedSize}</Text>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable
              style={{
                width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: showSequence ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              }}
              onPress={() => setShowSequence((v) => !v)}
            >
              <Text style={{ fontWeight: '700', color: showSequence ? '#fff' : 'rgba(255,255,255,0.4)' }}>#</Text>
            </Pressable>
            <Pressable
              style={{
                width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
              onPress={clearHolds}
              disabled={holds.length === 0}
            >
              <Text style={{ color: holds.length > 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)' }}>🗑</Text>
            </Pressable>
          </View>
        </View>
      </BlurView>

      {/* Save Modal */}
      <Modal
        visible={saveModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              <Pressable onPress={() => setSaveModalVisible(false)}>
                <Text className="text-muted-foreground text-base">Cancel</Text>
              </Pressable>
              <Text className="text-base font-semibold text-foreground">Save Route</Text>
              <Pressable onPress={handleSave} disabled={!routeName.trim()}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: routeName.trim() ? '#8b6f47' : '#e6ddd0' }}>
                  Save
                </Text>
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }}>
              {/* Route Name */}
              <Text className="text-sm font-medium text-foreground mb-1.5">Route Name</Text>
              <TextInput
                style={{
                  backgroundColor: '#ede5d8', borderRadius: 12, paddingHorizontal: 16,
                  paddingVertical: 12, fontSize: 16, color: '#3d2817', marginBottom: 20,
                }}
                placeholder="e.g., Crimpy Corner"
                placeholderTextColor="#8b7668"
                value={routeName}
                onChangeText={setRouteName}
                autoFocus
              />

              {/* Grade */}
              <Text className="text-sm font-medium text-foreground mb-1">Grade (Your Suggestion)</Text>
              <Text style={{ fontSize: 12, color: '#8b7668', marginBottom: 8 }}>
                This is your suggested grade as the setter
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                      backgroundColor: !routeGrade ? '#3d2817' : '#ede5d8',
                    }}
                    onPress={() => setRouteGrade('')}
                  >
                    <Text style={{ fontSize: 14, color: !routeGrade ? '#fffbf7' : '#8b7668', fontWeight: !routeGrade ? '500' : '400' }}>
                      Ungraded
                    </Text>
                  </Pressable>
                  {V_GRADES.map((g) => (
                    <Pressable
                      key={g}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                        backgroundColor: routeGrade === g ? '#3d2817' : '#ede5d8',
                      }}
                      onPress={() => setRouteGrade(g)}
                    >
                      <Text style={{ fontSize: 14, color: routeGrade === g ? '#fffbf7' : '#8b7668', fontWeight: routeGrade === g ? '500' : '400' }}>
                        {g}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Hold Summary */}
              <View style={{ backgroundColor: '#fffbf7', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e6ddd0' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#3d2817', marginBottom: 12 }}>
                  Hold Summary — {holds.length} total
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                  {HOLD_TYPES.map((type) => {
                    const count = holds.filter((h) => h.type === type).length;
                    return (
                      <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ backgroundColor: HOLD_COLORS[type], width: 14, height: 14, borderRadius: 7 }} />
                        <Text style={{ fontSize: 14, color: '#8b7668' }}>
                          <Text style={{ fontWeight: '600' }}>{count}</Text> {type}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
