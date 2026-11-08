"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { get, onValue, ref, set } from "firebase/database";
import { auth, db, firebaseConfig } from "./firebase";
import { stationEmail, teamEmail } from "./defaults";
import type { Profile, Role } from "./types";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createAccount: (a: { email: string; password: string; role: Role; name?: string; stationId?: string }) => Promise<string>;
  /** Creeaza doar utilizatorul de autentificare (fara sa deconecteze staff-ul) si intoarce UID-ul. */
  makeAuthUser: (email: string, password: string) => Promise<string>;
  loginTeam: (teamName: string, password: string) => Promise<void>;
  /** Autentificare la o statie doar cu codul de acces (nu poate intra ca jucator sau ca alta statie). */
  loginStation: (code: string) => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, (u) => {
      off?.();
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      off = onValue(
        ref(db, `users/${u.uid}`),
        (snap) => {
          setProfile(snap.exists() ? (snap.val() as Profile) : null);
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        }
      );
    });
    return () => {
      off?.();
      unsub();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const makeAuthUser = useCallback(async (email: string, password: string) => {
    const second = getApps().find((a) => a.name === "secondary") || initializeApp(firebaseConfig, "secondary");
    const sAuth = getAuth(second);
    try {
      const cred = await createUserWithEmailAndPassword(sAuth, email.trim(), password);
      await signOut(sAuth);
      return cred.user.uid;
    } finally {
      await deleteApp(second).catch(() => {});
    }
  }, []);

  /** Developerul creeaza conturi fara sa fie deconectat (foloseste o a doua instanta Firebase). */
  const createAccount: AuthState["createAccount"] = useCallback(
    async ({ email, password, role, name, stationId }) => {
      const uid = await makeAuthUser(email, password);
      const profile: Profile = { role, email: email.trim() };
      if (name) profile.name = name;
      if (role === "station" && stationId) profile.stationId = stationId;
      await set(ref(db, `users/${uid}`), profile);
      return uid;
    },
    [makeAuthUser]
  );

  const loginTeam = useCallback(async (teamName: string, password: string) => {
    await signInWithEmailAndPassword(auth, teamEmail(teamName), password);
  }, []);

  const loginStation = useCallback(async (code: string) => {
    const c = code.trim().toUpperCase();
    const snap = await get(ref(db, `stationCodes/${c}`));
    if (!snap.exists()) throw new Error("bad-code");
    await signInWithEmailAndPassword(auth, stationEmail(String(snap.val())), c);
  }, []);

  return <Ctx.Provider value={{ user, profile, loading, login, logout, createAccount, makeAuthUser, loginTeam, loginStation }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth in afara AuthProvider");
  return c;
}
