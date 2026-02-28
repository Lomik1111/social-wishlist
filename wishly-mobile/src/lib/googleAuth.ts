import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import { useEffect, useState, useCallback } from 'react';

// Вписываем ключи жестко в код для надежности
const WEB_CLIENT_ID = '704627914628-e7c6k80mitr04nkjg10gj1tu5duhpi67.apps.googleusercontent.com';
const IOS_CLIENT_ID = '704627914628-9m6no8ns1b3if4c86qr9nqod5mi1uroq.apps.googleusercontent.com';

// Configure Google Signin
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  iosClientId: IOS_CLIENT_ID,
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
            console.error('Google Signin Error', error);
        }
      } else {
        console.error('An error that is not a GoogleSignin error occurred', error);
      }
    }
  }, [onSuccess]);

  return { promptAsync, isReady };
}
