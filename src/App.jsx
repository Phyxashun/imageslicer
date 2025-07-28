/*
import React, { useState, useRef } from 'react';
import ImageDropZone from './components/ImageDropZone';
import SpriteCanvas from './components/SpriteCanvas';
import ControlsPanel from './components/ControlsPanel';
import { autoDetectGrid } from './utils/spriteScanner';
import full_logo from '/full_logo.png';

export default function App() {
    const [image, setimage] = useState(null);
    const [spriteGrid, setSpriteGrid] = useState({ rows: 1, cols: 1 });
    const canvasRef = useRef(null);

    const handleImageLoad = async (bitmap) => {
        setimage(bitmap);
        const auto = await autoDetectGrid(bitmap);
        setSpriteGrid(auto);
    };

    return (
        <div className='app-container'>
            <img className='full-logo' src={full_logo} alt='logo' />
            <ImageDropZone onImageLoad={handleImageLoad} />
            {image && (
                <>
                    <SpriteCanvas
                        ref={canvasRef}
                        image={image}
                        spriteGrid={spriteGrid}
                        setSpriteGrid={setSpriteGrid}
                        showGrid={false}
                        gridColor='lime'
                        maxWidth={image.width}
                        maxHeight={image.height}
                        enablePreview={true}
                        exportFormat='PNG'
                        exportQuality={100}

                    />
                    <ControlsPanel
                        canvasRef={canvasRef}
                        spriteGrid={spriteGrid}
                        setSpriteGrid={setSpriteGrid}
                    />
                </>
            )}
        </div>
    );
}
*/

import React, {useState} from 'react';
import { ThemeProvider, useTheme, useThemeUpdate } from './components/ThemeContext.jsx';
import ControlsPanel from './components/ControlsPanel';
import { saveAllSprites } from './utils/spriteSaver';
import SpriteCanvas from './components/SpriteCanvas';

import full_logo from '/full_logo.png';

const AppContent = () => {
    const [image, setImage] = useState(null);
    const [dividers, setDividers] = useState({ vertical: [], horizontal: [] });
    const theme = useTheme();
    const toggleTheme = useThemeUpdate();

    let appClass = 'app container is-widescreen';
    appClass += (theme === 'dark') ? 'theme-dark' : 'theme-light';
    console.log('APP CLASS:', appClass);

    return (
        <div className={appClass}>
            <div className='buttons is-right'>
                <button className='button is-small is-dark' onClick={toggleTheme}>
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
            <div className='container is-fluid'>
                <div className='container is-fluid'>
                    <ControlsPanel
                        onImageLoad={setImage}
                        dividers={dividers}
                        setDividers={setDividers}
                    />
                </div>
                <div className='container is-fluid'>
                    <SpriteCanvas
                        image={image}
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
        <AppContent/>
    </ThemeProvider>
);

export default App;