import React, { useState, useContext, useEffect } from 'react';

const ThemeContext = React.createContext(null);
const ThemeUpdateContext = React.createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    return useContext(ThemeContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeUpdate() {
    return useContext(ThemeUpdateContext);
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('theme-dark');

    useEffect(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'theme-dark' : 'theme-light');
    }, [setTheme]);

    useEffect(() => {
        document.documentElement.className = theme === 'theme-dark' ? 'theme-dark' : 'theme-light';
    }, [theme]);

    function toggleTheme() {
        setTheme(t => (t === 'theme-dark' ? 'theme-light' : 'theme-dark'));
    }

    return (
        <ThemeContext.Provider value={{theme, toggleTheme}}>
            <ThemeUpdateContext.Provider value={toggleTheme}>
                {children}
            </ThemeUpdateContext.Provider>
        </ThemeContext.Provider>
    )
}