// lib/authSocial.ts
import * as Apple from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

// Close the browser tab on return
WebBrowser.maybeCompleteAuthSession();

/**
 * 1) Put these IDs from Google Cloud Console (same project as Firebase).
 *    - You can start with JUST the Web client for web builds.
 *    - For iOS/Android dev/prod builds, create platform clients that match your bundle/package.
 */
const GOOGLE_IDS = {
  web: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  ios: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
  android: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
};

/**
 * 2) This must match the `expo.scheme` in app.json/app.config.ts
 *    Example config:
 *    {
 *      "expo": {
 *        "scheme": "fitnessmobile",
 *        "ios": { "bundleIdentifier": "com.yourcompany.fitnessmobile" },
 *        "android": { "package": "com.yourcompany.fitnessmobile" }
 *      }
 *    }
 */
const APP_SCHEME = "fitnessmobile";

/**
 * Google Sign-in
 * Newer expo-auth-session types don’t accept `useProxy` or `expoClientId`.
 * We provide a single `clientId` selected per platform,
 * and a redirectUri built from our app scheme.
 */
export function useGoogleLogin() {
  // Pick the right clientId for this platform (fallback to web if needed)
  const clientId =
    Platform.OS === "ios"
      ? GOOGLE_IDS.ios || GOOGLE_IDS.web
      : Platform.OS === "android"
      ? GOOGLE_IDS.android || GOOGLE_IDS.web
      : GOOGLE_IDS.web;

  const redirectUri = makeRedirectUri({
    // In current Expo, you should NOT use `useProxy`.
    // For native builds, this becomes: fitnessmobile://redirect
    scheme: APP_SCHEME,
    // Optionally customize the path:
    // path: "redirect",
  });

  // NOTE: newer types use just `clientId`; older SDKs also accept platform keys.
  // If your installed version still expects iosClientId/androidClientId, you can add those too.
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId,
    // OPTIONAL: if your installed version is older and supports these, add them:
    iosClientId: GOOGLE_IDS.ios,
    androidClientId: GOOGLE_IDS.android,
    webClientId: GOOGLE_IDS.web,

    // We want an ID token for Firebase:
    responseType: "id_token",
    scopes: ["profile", "email"],
    redirectUri,
  });

  async function signInWithGoogle() {
    // No `useProxy` here on modern SDKs
    const res = await promptAsync();
    if (res.type !== "success" || !res.params?.id_token) {
      const msg =
        res.type === "error"
          ? (res as any)?.error?.message || "Google sign-in failed"
          : "Google sign-in cancelled";
      throw new Error(msg);
    }
    const cred = GoogleAuthProvider.credential(res.params.id_token);
    return await signInWithCredential(auth, cred);
  }

  return { request, response, signInWithGoogle };
}

/** Apple Sign-in (iOS devices) */
export async function signInWithApple() {
  const appleCred = await Apple.signInAsync({
    requestedScopes: [
      Apple.AppleAuthenticationScope.FULL_NAME,
      Apple.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!appleCred.identityToken) {
    throw new Error("No identity token from Apple");
  }

  const provider = new OAuthProvider("apple.com");
  const firebaseCred = provider.credential({
    idToken: appleCred.identityToken,
  });

  const userCred = await signInWithCredential(auth, firebaseCred);

  // Optional: set displayName the first time
  try {
    const given = appleCred.fullName?.givenName;
    const family = appleCred.fullName?.familyName;
    if (userCred.user && (given || family)) {
      await updateProfile(userCred.user, {
        displayName: `${given ?? ""} ${family ?? ""}`.trim(),
      });
    }
  } catch {}

  return userCred;
}
