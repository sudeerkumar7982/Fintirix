const fs = require('fs');

let html = fs.readFileSync('../src/main/resources/static/index.html', 'utf8');

// Extract the body content
const bodyMatch = html.match(/<body>([\s\S]*?)<script/i);
if (!bodyMatch) {
    console.error("Could not find body");
    process.exit(1);
}

let body = bodyMatch[1];

// Convert HTML to JSX
body = body.replace(/class=/g, 'className=');
body = body.replace(/for=/g, 'htmlFor=');

// Self close tags
body = body.replace(/<input([^>]*?[^\/])>/g, '<input$1 />');
body = body.replace(/<img([^>]*?[^\/])>/g, '<img$1 />');
body = body.replace(/<br>/g, '<br />');
body = body.replace(/<hr>/g, '<hr />');

// Remove JS specific comments
body = body.replace(/<!--[\s\S]*?-->/g, '');

// Convert inline styles like style="width:16px;height:16px;" to style={{width: '16px', height: '16px'}}
body = body.replace(/style="([^"]+)"/g, (match, p1) => {
    const styleObj = p1.split(';').filter(s => s.trim()).map(s => {
        const [key, val] = s.split(':');
        if (!key || !val) return '';
        const camelKey = key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        return `${camelKey}: '${val.trim()}'`;
    }).join(', ');
    return `style={{${styleObj}}}`;
});

const jsx = `
import React, { useState, useEffect } from 'react';
import { api } from './api';
import './index.css';

export default function OldInterface() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login or register

  // We will insert the converted HTML here
  return (
    <>
      ${body}
    </>
  );
}
`;

fs.writeFileSync('src/OldInterface.jsx', jsx);
console.log("Conversion complete! Check src/OldInterface.jsx");
