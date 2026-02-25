import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useEffect, useState, useCallback } from 'react';

// Configure Google Signin
// Ideally this should be called once, e.g. in App.tsx, but calling it here is also fine as long as we ensure it's configured.
GoogleSignin.configure({
  webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

export function useGoogleAuth(onSuccess: (idToken: string) => void) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if Play Services are available
    GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error('Play services error', err);
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
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        // some other error happened
        console.error('Google Signin Error', error);
      }
    }
  }, [onSuccess]);

  return { promptAsync, isReady };
}
