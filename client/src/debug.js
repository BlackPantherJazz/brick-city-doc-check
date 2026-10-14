// Add ?debug to the URL (e.g. http://localhost:5173/?debug) to see developer
// notes: mock mode, unverified rules, unverified phone numbers.
export const DEBUG = new URLSearchParams(window.location.search).has('debug');
