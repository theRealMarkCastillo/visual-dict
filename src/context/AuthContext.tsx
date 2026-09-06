import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  loading: boolean;
  signingIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Synchronize Firestore user document upon sign in
  const syncUserProfile = async (firebaseUser: User) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const path = `users/${firebaseUser.uid}`;

    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const newProfile: Record<string, any> = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Google Account User',
          photoURL: firebaseUser.photoURL || '',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
      } else {
        const updateData: Record<string, any> = {
          lastLoginAt: serverTimestamp(),
        };
        if (firebaseUser.displayName) {
          updateData.displayName = firebaseUser.displayName;
        }
        if (firebaseUser.photoURL) {
          updateData.photoURL = firebaseUser.photoURL;
        }
        await updateDoc(userRef, updateData);
      }
    } catch (err: unknown) {
      console.error('Failed to sync user document:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, path);
      } catch {
        // Logged formatted error
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to user document in real-time
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const path = `users/${user.uid}`;
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfileData);
        }
      },
      (error) => {
        console.error('Error fetching user profile snapshot:', error);
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch {
          // Handled
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  const signInWithGoogle = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserProfile(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        // User voluntarily dismissed popup
        setAuthError('Sign-in cancelled. You can try again whenever you are ready.');
      } else if (err.code === 'auth/network-request-failed') {
        setAuthError('Network error. Please check your connection and try again.');
      } else {
        setAuthError(err.message || 'Unable to sign in with Google.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err: any) {
      console.error('Sign Out Error:', err);
      setAuthError(err.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signingIn,
        authError,
        signInWithGoogle,
        signOutUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
