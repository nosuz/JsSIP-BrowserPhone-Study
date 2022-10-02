import { writable } from 'svelte/store';

export const phoneAgent = writable(null);

export const sipStore = writable(null);

export const authToken = writable({
    username: '',
    password: '',
});
