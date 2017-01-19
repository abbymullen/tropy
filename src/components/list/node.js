'use strict'

const React = require('react')
const { PropTypes, Component } = React
const { Editable } = require('../editable')
const { IconFolder } = require('../icons')
const { noop } = require('../../common/util')
const cn = require('classnames')


class ListNode extends Component {

  handleChange = (name) => {
    const { list: { id, parent }, onSave } = this.props
    onSave(id ? { id, name } : { parent, name })
  }

  handleClick = () => {
    const { list, isSelected, onEdit, onSelect } = this.props

    if (isSelected) {
      onEdit({ list: { id: list.id } })
    } else {
      onSelect({ list: list.id })
    }
  }

  handleContextMenu = (event) => {
    this.props.onContextMenu(event, 'list', this.props.list.id)
  }

  render() {
    const {
      list, isSelected, isContext, isEditing, onEditCancel
    } = this.props

    return (
      <li
        className={cn({ list: true, active: isSelected, context: isContext })}
        onContextMenu={this.handleContextMenu}
        onClick={this.handleClick}>
        <IconFolder/>
        <div className="title">
          <Editable
            value={list.name}
            isRequired
            isEditing={isEditing}
            onCancel={onEditCancel}
            onChange={this.handleChange}/>
        </div>
      </li>
    )
  }

  static propTypes = {
    list: PropTypes.shape({
      id: PropTypes.number,
      parent: PropTypes.number,
      name: PropTypes.string
    }),

    isContext: PropTypes.bool,
    isSelected: PropTypes.bool,
    isEditing: PropTypes.bool,

    onEdit: PropTypes.func,
    onEditCancel: PropTypes.func,
    onContextMenu: PropTypes.func,
    onSelect: PropTypes.func,
    onSave: PropTypes.func
  }

  static defaultProps = {
    onContextMenu: noop,
    onSelect: noop
  }
}

module.exports = {
  ListNode
}