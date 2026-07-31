"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (next: Theme) => {
      // Prevent staggered component-by-component visual lag during theme switch.
      const root = document.documentElement
      root.classList.add('theme-transitioning')
      // Resolve next theme synchronously and apply class change in one pass
      // BEFORE React re-renders, so the whole page flips in a single frame.
      const resolved =
        next === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : next
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
      localStorage.setItem('theme', next)
      setTheme(next)
      // Force a single reflow then drop the lock on the next frame so
      // subsequent hover/focus transitions feel snappy again.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root.classList.remove('theme-transitioning')
        })
      })
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

/**
 * The theme actually on screen: "system" resolved to light or dark, and kept
 * in sync when the OS preference changes under it.
 *
 * `useTheme().theme` is the user's CHOICE, which is the right thing to store
 * and the wrong thing to render from - a component that switches on it treats
 * "system" as neither light nor dark. Anything that needs to paint differently
 * per theme (rather than just read a token) should use this.
 */
export function useResolvedTheme(): "light" | "dark" {
  const { theme } = useTheme()
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  )

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const sync = () => setSystemDark(mq.matches)
    sync()
    mq.addEventListener?.("change", sync)
    return () => mq.removeEventListener?.("change", sync)
  }, [])

  return theme === "system" ? (systemDark ? "dark" : "light") : theme
}