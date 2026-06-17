"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Lang } from "@/types";
import type { Dict } from "./dictionary";
import { ar } from "./ar";
import { en } from "./en";

interface LangCtx {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({
  children,
  initial = "ar",
}: {
  children: React.ReactNode;
  initial?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initial);

  // Adopt any persisted choice after mount (the anti-flash script already set
  // the <html> attributes; this syncs React state to match).
  useEffect(() => {
    const saved = (localStorage.getItem("fl-lang") as Lang) || initial;
    setLangState(saved);
  }, [initial]);

  const apply = useCallback((l: Lang) => {
    const e = document.documentElement;
    e.setAttribute("data-lang", l);
    e.setAttribute("lang", l);
    e.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
    localStorage.setItem("fl-lang", l);
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      apply(l);
    },
    [apply],
  );

  const toggle = useCallback(
    () => setLang(lang === "ar" ? "en" : "ar"),
    [lang, setLang],
  );

  const t = lang === "ar" ? ar : en;
  return (
    <Ctx.Provider value={{ lang, t, setLang, toggle }}>{children}</Ctx.Provider>
  );
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used within LangProvider");
  return c;
}
