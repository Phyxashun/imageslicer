import React, { useState } from "react";
import { ThemeProvider, useTheme, useThemeUpdate } from './components/ThemeContext.jsx';
import ControlsPanel from './components/ControlsPanel';
import SpriteCanvas from './components/SpriteCanvas';
import full_logo from '/full_logo.png';

const AppContent = () => {
    const [image, setImage] = useState(null);
    const [spriteGrid, setSpriteGrid] = useState({ rows: 4, cols: 4 }); // default
    const [dividers, setDividers] = useState({ vertical: [], horizontal: [] });
    const theme = useTheme();
    const toggleTheme = useThemeUpdate();

    let appClass = 'app container is-widescreen';
    appClass += (theme === 'dark') ? 'theme-dark' : 'theme-light';
    console.log('APP CLASS:', appClass);

    return (
        <div className={appClass}>
            <div className="buttons is-right">
                <button className="button is-small is-dark" onClick={toggleTheme}>
                    Toggle Theme
                </button>
            </div>
            <section className='hero'>
                <div className='hero-body'>
                    <div className='title'>
                        <figure className='image is-128x128 is-centered'>
                            <img src={full_logo} alt='logo'/>
                        </figure>
                    </div>
                    <div className='subtitle'>Image Slicer and Dicer v1.0</div>
                </div>
            </section>
            <div className="columns">
                <div className="column is-one-third">
                    <ControlsPanel
                        onImageLoad={setImage}
                        spriteGrid={spriteGrid}
                        setSpriteGrid={setSpriteGrid}
                        dividers={dividers}
                        setDividers={setDividers}
                    />
                </div>
                <div className="column">
                    <SpriteCanvas
                        image={image}
                        spriteGrid={spriteGrid}
                        dividers={dividers}
                        setDividers={setDividers}
                    />
                </div>
            </div>
        </div>
    );
};

const App = () => (
    <ThemeProvider>
        <AppContent />
    </ThemeProvider>
);

export default App;