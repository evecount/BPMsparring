'use client';

import { useState, useEffect } from 'react';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * React hook to subscribe to Firebase user authentication state.
 *
 * @param {Auth} auth - The Firebase Auth instance.
 * @returns {UserHookResult} Object with user, isUserLoading, and userError.
 */
export function useUser(auth: Auth): UserHookResult {
  const [userState, setUserState] = useState<UserHookResult>({
    user: null,
    isUserLoading: true, // Initially loading until the first auth state is determined
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserState({
        user: null,
        isUserLoading: false,
        userError: new Error("Firebase Auth instance not provided."),
      });
      return;
    }

    // Reset state on auth instance change, and set loading
    setUserState({ user: null, isUserLoading: true, userError: null });

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        // Auth state resolved
        setUserState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        // Auth listener encountered an error
        console.error("useUser hook: onAuthStateChanged error:", error);
        setUserState({ user: null, isUserLoading: false, userError: error });
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]); // Effect depends on the Auth instance

  return userState;
}
