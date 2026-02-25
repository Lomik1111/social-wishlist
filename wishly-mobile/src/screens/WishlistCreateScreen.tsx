import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useWishlistStore } from '../../store/wishlistStore';
import { RoundedInput } from '../../components/ui/RoundedInput';
import { PillButton } from '../../components/ui/PillButton';
import { Card } from '../../components/ui/Card';
import {
  colors,
  spacing,
  radius,
  typography,
  wishlistThemes,
} from '../../constants/design';
import { haptic } from '../../lib/haptics';
import { extractDomain } from '../../lib/utils';
import api from '../../lib/api';
import type { AutofillResult } from '../../types';

type Step = 'create' | 'addItem';

const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Публичный', icon: '🌍' },
  { value: 'friends', label: 'Для друзей', icon: '👥' },
  { value: 'private', label: 'Приватный', icon: '🔒' },
] as const;

const THEME_KEYS = Object.keys(wishlistThemes) as (keyof typeof wishlistThemes)[];

export default function CreateWishlistScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};

  const createWishlist = useWishlistStore((s) => s.createWishlist);
  const addItem = useWishlistStore((s) => s.addItem);
  const isLoading = useWishlistStore((s) => s.isLoading);

  // Determine initial step based on params
  const [step, setStep] = useState<Step>(
    params.addToWishlist ? 'addItem' : 'create'
  );

  // ---- Create wishlist state ----
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [occasion, setOccasion] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof wishlistThemes>(
    'deep_amethyst'
  );
  const [privacy, setPrivacy] = useState<string>('friends');
  const [createdWishlistId, setCreatedWishlistId] = useState<string | null>(
    params.addToWishlist ?? null
  );

  // ---- Add item state ----
  const [itemUrl, setItemUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [autofillResult, setAutofillResult] = useState<AutofillResult | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  // ---- Scanning animation ----
  const scanLineY = useSharedValue(0);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const startScanAnimation = useCallback(() => {
    scanLineY.value = 0;
    scanLineY.value = withRepeat(
      withTiming(60, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [scanLineY]);

  const stopScanAnimation = useCallback(() => {
    scanLineY.value = withTiming(0, { duration: 200 });
  }, [scanLineY]);

  // ---- Handlers ----
  const handleCreateWishlist = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Ошибка', 'Введите название вишлиста');
      return;
    }
    if (trimmedTitle.length > 200) {
      Alert.alert('Ошибка', 'Название не может быть длиннее 200 символов');
      return;
    }

    const trimmedDate = eventDate.trim();
    if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      Alert.alert('Ошибка', 'Дата должна быть в формате ГГГГ-ММ-ДД');
      return;
    }
    if (trimmedDate) {
      const parsed = new Date(trimmedDate);
      if (isNaN(parsed.getTime())) {
        Alert.alert('Ошибка', 'Указана некорректная дата');
        return;
      }
    }

    haptic.medium();
    try {
      const wishlist = await createWishlist({
        title: trimmedTitle,
        description: description.trim() || undefined,
        occasion: occasion.trim() || undefined,
        event_date: trimmedDate || undefined,
        theme: selectedTheme,
        privacy,
      });
      setCreatedWishlistId(wishlist.id);
      haptic.success();

      // Ask if they want to add items
      Alert.alert(
        'Вишлист создан!',
        'Хотите добавить желания в список?',
        [
          {
            text: 'Позже',
            style: 'cancel',
            onPress: () => navigation.replace('WishlistDetail', { id: wishlist.id }),
          },
          {
            text: 'Добавить',
            onPress: () => setStep('addItem'),
          },
        ]
      );
    } catch {
      haptic.error();
    }
  }, [title, description, occasion, eventDate, selectedTheme, privacy, createWishlist, navigation]);

  const handleScanUrl = useCallback(async () => {
    const url = itemUrl.trim();
    if (!url) return;

    // Basic URL validation
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = `https://${url}`;
    }

    haptic.light();
    setIsScanning(true);
    setScanSuccess(false);
    startScanAnimation();

    try {
      const { data } = await api.post<AutofillResult>('/items/autofill', {
        url: normalizedUrl,
      });

      if (data.success) {
        setAutofillResult(data);
        setItemName(data.title ?? '');
        setItemDescription(data.description ?? '');
        setItemPrice(data.price?.toString() ?? '');
        setItemImageUrl(data.image_url ?? '');
        setScanSuccess(true);
        haptic.success();
      } else {
        Alert.alert('Не удалось', data.error ?? 'Не удалось распознать товар по ссылке');
        haptic.warning();
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось обработать ссылку. Заполните данные вручную.');
      haptic.error();
    } finally {
      setIsScanning(false);
      stopScanAnimation();
    }
  }, [itemUrl, startScanAnimation, stopScanAnimation]);

  const handleAddItem = useCallback(async () => {
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      Alert.alert('Ошибка', 'Введите название подарка');
      return;
    }
    if (trimmedName.length > 500) {
      Alert.alert('Ошибка', 'Название не может быть длиннее 500 символов');
      return;
    }

    if (itemPrice) {
      const price = parseFloat(itemPrice);
      if (isNaN(price) || price < 0 || price > 999999999) {
        Alert.alert('Ошибка', 'Укажите корректную цену (от 0)');
        return;
      }
    }

    const wishlistId = createdWishlistId;
    if (!wishlistId) {
      Alert.alert('Ошибка', 'Сначала создайте вишлист');
      return;
    }

    setAddingItem(true);
    haptic.medium();

    try {
      const normalizedUrl = itemUrl.trim()
        ? itemUrl.trim().startsWith('http')
          ? itemUrl.trim()
          : `https://${itemUrl.trim()}`
        : undefined;

      await addItem(wishlistId, {
        name: trimmedName,
        description: itemDescription.trim() || undefined,
        url: normalizedUrl,
        image_url: itemImageUrl.trim() || undefined,
        price: itemPrice ? parseFloat(itemPrice) : undefined,
        currency: 'RUB',
        source_domain: normalizedUrl ? (extractDomain(normalizedUrl) ?? undefined) : undefined,
      });

      haptic.success();

      // Reset item fields
      setItemUrl('');
      setItemName('');
      setItemDescription('');
      setItemPrice('');
      setItemImageUrl('');
      setAutofillResult(null);
      setScanSuccess(false);

      Alert.alert('Добавлено!', 'Желание добавлено в список', [
        {
          text: 'Ещё один',
          onPress: () => {},
        },
        {
          text: 'Готово',
          onPress: () => navigation.replace('WishlistDetail', { id: wishlistId }),
        },
      ]);
    } catch {
      haptic.error();
      Alert.alert('Ошибка', 'Не удалось добавить желание');
    } finally {
      setAddingItem(false);
    }
  }, [
    itemName,
    itemDescription,
    itemUrl,
    itemImageUrl,
    itemPrice,
    createdWishlistId,
    addItem,
    navigation,
  ]);

  const handleThemeSelect = useCallback(
    (themeKey: keyof typeof wishlistThemes) => {
      haptic.selection();
      setSelectedTheme(themeKey);
    },
    []
  );

  const handlePrivacySelect = useCallback((value: string) => {
    haptic.selection();
    setPrivacy(value);
  }, []);

  const handleBack = useCallback(() => {
    haptic.light();
    if (step === 'addItem' && !params.addToWishlist) {
      // If we came from create step and there's a created wishlist, go there
      if (createdWishlistId) {
        navigation.replace('WishlistDetail', { id: createdWishlistId });
      } else {
        setStep('create');
      }
    } else {
      navigation.goBack();
    }
  }, [step, params.addToWishlist, createdWishlistId, navigation]);

  // ---- Render Create Wishlist ----
  const renderCreateStep = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.screenTitle}>{'Новый вишлист'}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Form */}
      <View style={styles.form}>
        <RoundedInput
          label="Название"
          placeholder="День рождения, Новый год..."
          value={title}
          onChangeText={setTitle}
          icon="✨"
        />

        <RoundedInput
          label="Описание"
          placeholder="Расскажите о списке..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          icon="📝"
        />

        <RoundedInput
          label="Повод"
          placeholder="День рождения, свадьба..."
          value={occasion}
          onChangeText={setOccasion}
          icon="🎉"
        />

        <RoundedInput
          label="Дата события"
          placeholder="2026-03-15"
          value={eventDate}
          onChangeText={setEventDate}
          icon="📅"
        />

        {/* Theme selector */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>{'Тема оформления'}</Text>
          <View style={styles.themeRow}>
            {THEME_KEYS.map((key) => {
              const theme = wishlistThemes[key];
              const isSelected = selectedTheme === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handleThemeSelect(key)}
                  style={[
                    styles.themeCircleWrapper,
                    isSelected && styles.themeCircleSelected,
                  ]}
                >
                  <LinearGradient
                    colors={theme.gradient as [string, string]}
                    style={styles.themeCircle}
                  >
                    <Text style={styles.themeIcon}>{theme.icon}</Text>
                  </LinearGradient>
                  <Text
                    style={[
                      styles.themeName,
                      isSelected && styles.themeNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {theme.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Privacy selector */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>{'Приватность'}</Text>
          <View style={styles.privacyRow}>
            {PRIVACY_OPTIONS.map((option) => {
              const isSelected = privacy === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handlePrivacySelect(option.value)}
                  style={[
                    styles.privacyOption,
                    isSelected && styles.privacyOptionSelected,
                  ]}
                >
                  <Text style={styles.privacyIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.privacyLabel,
                      isSelected && styles.privacyLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Create button */}
        <View style={styles.buttonContainer}>
          <PillButton
            title="Создать"
            onPress={handleCreateWishlist}
            loading={isLoading}
            disabled={!title.trim()}
          />
        </View>
      </View>
    </ScrollView>
  );

  // ---- Render Add Item ----
  const renderAddItemStep = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.screenTitle}>{'Добавить желание'}</Text>
        <View style={styles.backButton} />
      </View>

      {/* URL autofill section */}
      <Card style={styles.urlCard}>
        <Text style={styles.urlCardTitle}>{'Добавить по ссылке'}</Text>
        <Text style={styles.urlCardSubtitle}>
          {'Вставьте ссылку на товар — мы заполним данные автоматически'}
        </Text>

        <View style={styles.urlInputRow}>
          <View style={styles.urlInputWrapper}>
            <RoundedInput
              placeholder="https://..."
              value={itemUrl}
              onChangeText={setItemUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              icon="🔗"
            />
          </View>
        </View>

        {/* Scan button + indicator */}
        <Pressable
          onPress={handleScanUrl}
          disabled={isScanning || !itemUrl.trim()}
          style={[
            styles.scanButton,
            (!itemUrl.trim() || isScanning) && styles.scanButtonDisabled,
          ]}
        >
          <LinearGradient
            colors={
              scanSuccess
                ? (['#00D68F', '#00B894'] as const)
                : (['#1E1E2E', '#2C2C3E'] as const)
            }
            style={styles.scanButtonGradient}
          >
            {isScanning ? (
              <View style={styles.scanningContainer}>
                <ActivityIndicator color={colors.success} size="small" />
                <Text style={styles.scanningText}>{'Сканируем...'}</Text>
                {/* Scanning animation line */}
                <Animated.View style={[styles.scanLine, scanLineStyle]} />
              </View>
            ) : scanSuccess ? (
              <View style={styles.scanSuccessContainer}>
                <Text style={styles.scanSuccessIcon}>{'✓'}</Text>
                <Text style={styles.scanSuccessText}>{'Распознано!'}</Text>
              </View>
            ) : (
              <Text style={styles.scanButtonText}>{'Распознать товар'}</Text>
            )}
          </LinearGradient>
        </Pressable>
      </Card>

      {/* Autofill result preview */}
      {autofillResult?.image_url && (
        <Card style={styles.previewCard}>
          <Image
            source={{ uri: autofillResult.image_url }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        </Card>
      )}

      {/* Manual / editable fields */}
      <View style={styles.manualSection}>
        <Text style={styles.manualSectionTitle}>
          {autofillResult ? 'Проверьте данные' : 'Или заполните вручную'}
        </Text>

        <RoundedInput
          label="Название"
          placeholder="AirPods Pro, Книга..."
          value={itemName}
          onChangeText={setItemName}
          icon="🎁"
        />

        <RoundedInput
          label="Цена"
          placeholder="5000"
          value={itemPrice}
          onChangeText={setItemPrice}
          keyboardType="numeric"
          icon="💰"
        />

        <RoundedInput
          label="Описание / пожелание"
          placeholder="Цвет, размер, комментарий..."
          value={itemDescription}
          onChangeText={setItemDescription}
          multiline
          numberOfLines={3}
          icon="📝"
        />

        <RoundedInput
          label="Ссылка на изображение"
          placeholder="https://example.com/photo.jpg"
          value={itemImageUrl}
          onChangeText={setItemImageUrl}
          autoCapitalize="none"
          autoCorrect={false}
          icon="🖼️"
        />

        {/* Add to wishlist button */}
        <View style={styles.buttonContainer}>
          <PillButton
            title="Добавить в список"
            onPress={handleAddItem}
            loading={addingItem}
            disabled={!itemName.trim()}
          />
        </View>

        {/* Skip button */}
        {createdWishlistId && (
          <Pressable
            onPress={() => navigation.replace('WishlistDetail', { id: createdWishlistId })}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>{'Пропустить'}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {step === 'create' ? renderCreateStep() : renderAddItemStep()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge * 2,
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  screenTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },

  // ---- Form ----
  form: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing.md,
  },

  // ---- Theme selector ----
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  themeCircleWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCircleSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  themeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  themeIcon: {
    fontSize: 22,
  },
  themeName: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  themeNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // ---- Privacy selector ----
  privacyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  privacyOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  privacyIcon: {
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  privacyLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  privacyLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // ---- Button ----
  buttonContainer: {
    marginTop: spacing.xl,
  },

  // ---- URL Card ----
  urlCard: {
    marginBottom: spacing.xl,
  },
  urlCardTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  urlCardSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  urlInputRow: {
    marginBottom: spacing.sm,
  },
  urlInputWrapper: {
    flex: 1,
  },

  // ---- Scan button ----
  scanButton: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    minHeight: 50,
  },
  scanButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
  },
  scanningText: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },
  scanLine: {
    position: 'absolute',
    left: -20,
    right: -20,
    height: 2,
    backgroundColor: colors.success,
    opacity: 0.6,
  },
  scanSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scanSuccessIcon: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  scanSuccessText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },

  // ---- Preview card ----
  previewCard: {
    marginBottom: spacing.xl,
    padding: 0,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
  },

  // ---- Manual section ----
  manualSection: {
    marginBottom: spacing.huge,
  },
  manualSectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },

  // ---- Skip button ----
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  skipButtonText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});
