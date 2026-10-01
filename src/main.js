import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { startSync } from './lib/sync/sync.svelte.js';

startSync();

export default mount(App, { target: document.getElementById('app') });
