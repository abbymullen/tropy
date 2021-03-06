'use strict'

const { save } = require('./value')
const { keys } = Object
const { get, list, quote } = require('../common/util')


const metadata = {
  async load(db, ids) {
    const data = {}

    await db.each(`
      SELECT id, property, text, datatype AS type
        FROM subjects
          JOIN metadata USING (id)
          JOIN metadata_values USING (value_id)${
        (ids != null) ? ` WHERE id IN (${list(ids)}) ` : ''
      } ORDER BY id, metadata.created ASC`,
      ({ id, property, type, text }) => {
        if (id in data) data[id][property] = { type, text }
        else data[id] = { id, [property]: { type, text } }
      }
    )

    return data
  },

  async update(db, { ids, data, timestamp }, replace = false) {
    const idList = list(ids)

    await db.run(`
      DELETE FROM metadata WHERE id IN (${idList})${
        replace ? '' : ` AND property IN (${list(keys(data), quote)})`
      }`)

    for (let prop in data) {
      if (get(data, [prop, 'text']) == null) continue

      const value = await save(db, data[prop])

      await db.run(`
        INSERT INTO metadata (id, property, value_id, language)
          VALUES ${ids.map(id =>
            `(${[id, quote(prop), value, 'NULL'].join(',')})`).join(', ')}`)
    }

    if (timestamp != null) {
      await db.run(`
        UPDATE subjects
          SET modified = datetime(?)
          WHERE id IN (${idList})`,
        new Date(timestamp).toISOString())
    }
  },

  async replace(db, data) {
    return metadata.update(db, data, true)
  },

  async copy(db, { source, target }) {
    return db.run(`
      INSERT INTO metadata (id, property, value_id, language)
        SELECT ${Number(target)} AS id, property, value_id, language
          FROM metadata
          WHERE id = ?`, source)
  }
}

module.exports = metadata
