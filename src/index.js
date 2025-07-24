// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import './index.css';
// import App from './App';
// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import { PostHogProvider } from 'posthog-js/react'

// const options = {
//   api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
//   defaults: '2025-05-24',
// }

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
//       <App />
//     </PostHogProvider>
//   </StrictMode>,
// );  

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />); 