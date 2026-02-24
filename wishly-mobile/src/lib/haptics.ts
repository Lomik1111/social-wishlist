import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const haptic = {
  light: () => ReactNativeHapticFeedback.trigger('impactLight', options),
  medium: () => ReactNativeHapticFeedback.trigger('impactMedium', options),
  heavy: () => ReactNativeHapticFeedback.trigger('impactHeavy', options),
  success: () => ReactNativeHapticFeedback.trigger('notificationSuccess', options),
  error: () => ReactNativeHapticFeedback.trigger('notificationError', options),
  warning: () => ReactNativeHapticFeedback.trigger('notificationWarning', options),
  selection: () => ReactNativeHapticFeedback.trigger('selection', options),
};
