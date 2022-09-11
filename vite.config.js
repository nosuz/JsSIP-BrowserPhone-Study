import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import viteCompression from 'vite-plugin-compression';
import purgecss from '@fullhuman/postcss-purgecss'


import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // console.log(command, mode)
  if (mode === "production") {
    return {
      plugins: [svelte(), viteCompression()],
      base: './',
      css: {
        postcss: {
          plugins: [
                purgecss({
                  content: ['dist/*.html', 'dist/assets/*.js'],
                  css: ['dist/assets/*.css'],
                  safelist: [/filepond-*/],
                })
          ]
        }
      }
    };
  } else {
    return {
      plugins: [svelte()],
      server: {
        https: {
          key: fs.readFileSync('./cert/server.key'),
          cert: fs.readFileSync('./cert/server.crt'),
        },
        // proxy: {
        //   '/ws':{
        //     target: 'wss://test.mosquitto.org:8081/',
        //     secure: false,
        //     ws: true,
        //     rewrite: (path) => path.replace(/^\/ws/, '')
        //   },
        // },
        }
    }
  }
});
