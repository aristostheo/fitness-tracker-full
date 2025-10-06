// context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Ctx = { user: User | null; initializing: boolean };
const AuthContext = createContext<Ctx>({ user: null, initializing: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const firedRef = useRef(false);

  useEffect(() => {
    // Safety: never hang on a blank screen
    const safety = setTimeout(() => {
      if (!firedRef.current) {
        console.warn("[auth] safety timeout — unblocking UI");
        setInitializing(false);
      }
    }, 2000);

    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        firedRef.current = true;
        setUser(u);
        setInitializing(false);
        console.log("[auth] user:", u?.uid ?? null);
      },
      (err) => {
        console.warn("[auth] listener error:", err);
        firedRef.current = true;
        setInitializing(false);
      }
    );

    return () => {
      clearTimeout(safety);
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
