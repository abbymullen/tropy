'use strict'

const { BrowserWindow, systemPreferences: pref } = require('electron')
const { join } = require('path')
const { format } = require('url')
const { darwin, EL_CAPITAN } = require('../common/os')
const { channel } = require('../common/release')
const { warn } = require('../common/log')

const ROOT = join(__dirname, '..', '..', 'static')
const ICON = join(__dirname, '..', '..', 'res', 'icons', channel, 'tropy')

const DEFAULTS = {
  show: false,
  frame: true,
  useContentSize: true,
  webPreferences: {
    zoomFactor: global.ARGS.zoom || 1,
    preload: join(__dirname, '..', 'bootstrap.js'),
    experimentalFeatures: true
  }
}

const EVENTS = [
  'focus',
  'blur',
  'maximize',
  'unmaximize',
  'enter-full-screen',
  'leave-full-screen'
]

const AQUA = {
  1: 'blue',
  6: 'graphite'
}

function hasOverlayScrollBars() {
  return darwin &&
    'WhenScrolling' === pref.getUserDefault('AppleShowScrollBars', 'string')
}

module.exports = {

  open(file, data = {}, options = {}) {
    options = { ...DEFAULTS, ...options }

    switch (process.platform) {
      case 'linux':
        options.icon = join(ICON, '512x512.png')
        break

      case 'darwin':
        if (!options.frame && EL_CAPITAN) {
          options.frame = true
          options.titleBarStyle = options.titleBarStyle || 'hidden-inset'
        }

        data.aqua = AQUA[
          pref.getUserDefault('AppleAquaColorVariant', 'integer')
        ]

        break
    }

    data.scrollbars = !hasOverlayScrollBars()

    const win = new BrowserWindow(options)

    win.webContents
      .on('devtools-reload-page', () => {
        win.webContents.send('reload')
      })

      .on('did-finish-load', () => {
        win.webContents.setVisualZoomLevelLimits(1, 1)
      })

      .on('will-navigate', (event, url) => {
        if (url !== win.webContents.getURL()) {
          warn(`win#${win.id} attempted to navigate to ${url}`)
          event.preventDefault()
        }
      })

    for (let event of EVENTS) {
      win.on(event, () => { win.webContents.send('win', event) })
    }

    win.loadURL(format({
      protocol: 'file',
      pathname: join(ROOT, `${file}.html`),
      hash: encodeURIComponent(JSON.stringify(data))
    }))

    return win
  },

  hasOverlayScrollBars
}
