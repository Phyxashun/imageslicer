import React, { createContext, useEffect, useState, useContext } from "react";

const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);

const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState("dark");

    useEffect(() => {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
    }, []);

    useEffect(() => {
        document.documentElement.className = theme === "dark" ? "has-background-dark has-text-light" : "";
    }, [theme]);

    const toggleTheme = () => {
        setTheme(t => (t === "dark" ? "light" : "dark"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export { ThemeProvider,  useTheme };