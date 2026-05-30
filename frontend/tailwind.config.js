/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html','./src/**/*.{ts,tsx}'], theme: { extend: { fontFamily: { sans: ['Inter','ui-sans-serif','system-ui'] }, colors: { brand: { 50:'#eff6ff',500:'#2563eb',600:'#1d4ed8',900:'#172554' }, agent:'#f97316', admin:'#dc2626' } } }, plugins: [] };
