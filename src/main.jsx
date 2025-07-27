import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'bulma/css/bulma.min.css';

const rootElement = document.getElementById('root');
rootElement.classList.add('container');
rootElement.classList.add('is-widescreen')
rootElement.classList.add('has-text-centered')
const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);