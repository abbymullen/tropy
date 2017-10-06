'use strict'

const React = require('react')
const { Iterator } = require('../iterator')
const { FormattedMessage } = require('react-intl')
const { match } = require('../../keymap')
const cx = require('classnames')

const {
  arrayOf, oneOf, shape, bool, func, number, object, string
} = require('prop-types')


class ItemIterator extends Iterator {
  get tabIndex() {
    return this.props.isActive ? super.tabIndex : null
  }

  getIterables(props = this.props) {
    return props.items || super.getIterables()
  }

  indexOf(id) {
    return this.props.index[id]
  }

  head() {
    const { selection } = this.props
    return selection.length > 0 ? selection[selection.length - 1] : null
  }

  getSelection = () => this.props.selection

  isSelected({ id }) {
    return this.props.selection.includes(id)
  }

  clearSelection() {
    this.props.onSelect({ items: [] })
  }

  handleContextMenu = (event, item) => {
    const { list, isDisabled, selection, onContextMenu } = this.props

    const context = ['item']
    const target = {
      id: item.id, photos: item.photos, tags: item.tags, list
    }

    if (selection.length > 1) {
      context.push('bulk')
      target.id = [...selection]

      if (!this.isSelected(item)) {
        target.id.push(item.id)
      }
    }

    if (list) context.push('list')
    if (isDisabled) context.push('deleted')

    onContextMenu(event, context.join('-'), target)
  }

  handleItemDelete(items) {
    if (!this.props.isDisabled && items != null && items.length > 0) {
      this.props.onItemDelete(items)
    }
  }

  // eslint-disable-next-line complexity
  handleKeyDown = (event) => {
    switch (match(this.props.keymap, event)) {
      case (this.isVertical ? 'up' : 'left'):
        this.select(this.prev(), event.shiftKey, true)
        break
      case (this.isVertical ? 'down' : 'right'):
        this.select(this.next(), event.shiftKey, true)
        break
      case 'open':
        this.props.onItemOpen(this.current())
        break
      case 'preview':
        this.props.onItemPreview(this.current())
        break
      case 'clear':
        this.clearSelection()
        break
      case 'delete':
        this.handleItemDelete(this.props.selection)
        this.select(this.next() || this.prev())
        break
      case 'all':
        this.props.onSelect({}, 'all')
        break
      default:
        return
    }

    event.preventDefault()
    event.stopPropagation()
  }

  select(item, isRange = false, throttle = false) {
    if (item == null) return

    const mod = isRange ? 'merge' : 'replace'
    this.props.onSelect({ items: [item.id] }, mod, { throttle })
  }

  connect(element) {
    return (this.isDisabled) ? element : this.props.dt(element)
  }

  getIterableProps(item, index) {
    return {
      item,
      cache: this.props.cache,
      photos: this.props.photos,
      tags: this.props.tags,
      isLast: this.isLast(index),
      isSelected: this.isSelected(item),
      isDisabled: this.isDisabled,
      isVertical: this.isVertical,
      getSelection: this.getSelection,
      onContextMenu: this.handleContextMenu,
      onDropItems: this.props.onItemMerge,
      onDropPhotos: this.props.onPhotoMove,
      onItemOpen: this.props.onItemOpen,
      onSelect: this.props.onSelect
    }
  }

  renderNoItems() {
    return this.connect(
      <div
        ref={this.setContainer}
        className={cx('no-items', 'drop-target', { over: this.props.isOver })
      }>
        <figure className="no-items-illustration"/>
        <h1><FormattedMessage id="project.empty"/></h1>
      </div>
    )
  }

  static propTypes = {
    index: object.isRequired,
    items: arrayOf(shape({
      id: number.isRequired
    })).isRequired,

    sort: shape({
      asc: bool,
      column: string.isRequired,
      type: oneOf(['property']).isRequired
    }).isRequired,

    isActive: bool,
    isOver: bool,
    isDisabled: bool,

    cache: string.isRequired,
    selection: arrayOf(number).isRequired,
    keymap: object.isRequired,
    list: number,
    size: number.isRequired,
    photos: object.isRequired,
    tags: object.isRequired,

    dt: func.isRequired,
    onContextMenu: func.isRequired,
    onItemDelete: func.isRequired,
    onItemMerge: func.isRequired,
    onItemOpen: func.isRequired,
    onItemPreview: func.isRequired,
    onPhotoMove: func.isRequired,
    onSelect: func.isRequired,
    onSort: func.isRequired
  }
}


module.exports = {
  ItemIterator
}
