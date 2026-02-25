import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';
import { useEffect, useState, useCallback } from 'react';

// Configure Google Signin
// Ideally this should be called once, e.g. in App.tsx, but calling it here is also fine as long as we ensure it's configured.
GoogleSignin.configure({
  webClientId: Config.GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

export function useGoogleAuth(onSuccess: (idToken: string) => void) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if Play Services are available
    GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
      .then(() => setIsReady(true))
      .catch((err) => {
        if (__DEV__) console.error('Play services error', err);
        setIsReady(false);
      });
  }, []);

  const promptAsync = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (idToken) {
        onSuccess(idToken);
      } else {
         console.warn('Google Signin: No idToken');
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // user cancelled the login flow
            break;
          case statusCodes.IN_PROGRESS:
            // operation (e.g. sign in) is in progress already
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            // play services not available or outdated
            break;
          default:
            // some other error happened
            if (__DEV__) console.error('Google Signin Error', error);
        }
      } else {
        if (__DEV__) console.error('An error that is not a GoogleSignin error occurred', error);
      }
    }
  }, [onSuccess]);

  return { promptAsync, isReady };
}
