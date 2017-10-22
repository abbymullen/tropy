'use strict'

require('./common/promisify')

const { basename, extname } = require('path')
const { createReadStream, statAsync: stat } = require('fs')
const { createHash } = require('crypto')
const { exif } = require('./exif')
const { nativeImage } = require('electron')
const { assign } = Object
const { warn, debug } = require('./common/log')


class Image {
  static read(path) {
    return (new Image(path)).read()
  }

  static async check({ path, created, checksum }, { force } = {}) {
    const status = {}

    try {
      const { mtime } = await stat(path)
      status.hasChanged = (mtime > created)

      if (force || created == null || status.hasChanged) {
        status.image = await Image.read(path)
        status.hasChanged = (status.image.checksum !== checksum)
      }
    } catch (error) {
      debug(`image check failed for ${path}: ${error.message}`, { error })
      status.hasChanged = true
      status.error = error
    }

    return status
  }

  constructor(path) {
    this.path = path
  }

  get ext() {
    return extname(this.path)
  }

  get filename() {
    return basename(this.path)
  }

  get title() {
    return basename(this.path, this.ext)
  }

  get checksum() {
    if (this.__digest == null) this.__digest = this.digest()
    return this.__digest
  }

  get orientation() {
    return this.exif.Orientation || 1
  }

  get date() {
    try {
      // temporarily return as string until we add value types
      return (this.exif.DateTimeOriginal || this.file.ctime).toISOString()

    } catch (error) {
      warn(`failed to convert image date: ${error.message}`)
      debug(error.stack)

      return new Date().toISOString()
    }
  }

  digest(encoding = 'hex') {
    return this.hash && this.hash.digest(encoding)
  }

  read() {
    return new Promise((resolve, reject) => {

      this.hash = createHash('md5')
      this.mimetype = null

      const chunks = []

      createReadStream(this.path)
        .on('error', reject)

        .on('data', chunk => {
          this.hash.update(chunk)
          chunks.push(chunk)

          if (chunks.length === 1) {
            this.mimetype = magic(chunk)
          }
        })

        .on('end', () => {
          if (!this.mimetype) {
            return reject(new Error('unsupported image'))
          }

          const buffer = Buffer.concat(chunks)

          Promise
            .all([exif(buffer), NI(buffer), stat(this.path)])

            .then(([data, original, file]) =>
              assign(this, original.getSize(), { exif: data, original, file }))

            .then(resolve, reject)

        })
    })
  }

  async resize(...args) {
    return resize(this.original || await NI(this.path), ...args)
  }
}

function resize(image, size) {
  let current = image.getSize()
  let delta = current.width - current.height
  let target = delta > 0 ? 'height' : 'width'

  if (size >= current[target]) size = current[target]

  image = image.resize({ [target]: size, quality: 'best' })

  current = image.getSize()
  delta = current.width - current.height

  if (delta === 0) return image

  let position = { x: 0, y: 0, width: size, height: size }
  position[delta > 0 ? 'x' : 'y'] = ~~Math.abs(delta / 2)

  image = image.crop(position)

  return image
}

function isValidImage(file) {
  return file.type === 'image/jpeg'
}


function NI(src) {
  return new Promise((resolve) => {
    resolve(typeof src === 'string' ?
      nativeImage.createFromPath(src) :
      nativeImage.createFromBuffer(src))
  })
}

function magic(b) {
  if (!b || !b.length) return

  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) {
    return 'image/jpeg'
  }
}

module.exports = {
  Image,
  resize,
  isValidImage,
}
