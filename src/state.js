const immutable   = require('immutable')
const oneClickBom = require('1-click-bom')
const redux       = require('redux')
const reduxUndo   = require('redux-undo')

function makeId() {
  this.id = this.id || 0
  return this.id++
}

const emptyLine = immutable.Map({
  reference   : '',
  quantity    : '',
  partNumbers : immutable.List(),
  retailers: immutable.Map({
    Digikey : '',
    Mouser  : '',
    RS      : '',
    Farnell : '',
    Newark  : '',
  }),
})

const initialState = {
  data: immutable.fromJS({
    lines: [],
    sortedBy: [null, null],
    editFocus: [null, null],
  }),
  view: immutable.fromJS({
    partNumbersExpanded: false,
    focus: [null, null],
    editable: false,
  }),
}

const linesActions = {
  setField(state, {index, field, value}) {
    if (field[0] === 'quantity' && value < 1) {
      value = 1
    }
    const currentValue = state.getIn(['lines', index].concat(field))
    if (currentValue !== value) {
      state = state.setIn(['lines', index].concat(field),  value)
      return state.set('editFocus', immutable.List.of(index, field))
    }
    return state
  },
  addLine(state, value) {
    const line = immutable.fromJS(value).set('id', makeId())
    const lines = state.get('lines').push(line)
    return state.merge({lines})
  },
  removeField(state, focus) {
    const [index, field] = focus
    return state.setIn(['lines', index].concat(field), '')
  },
  remove(state, focus) {
    const [index, field] = focus
    if (field == null) {
      return this.removeLine(state, index)
    } else {
      return this.removeField(state, focus)
    }
  },
  removeLine(state, index) {
    const lines = state.get('lines').remove(index)
    return state.merge({lines})
  },
  sortBy(state, header) {
    let lines = state.get('lines')
    if (oneClickBom.lineData.retailer_list.includes(header)) {
      lines = lines.sortBy(line => line.get('retailers').get(header).toLowerCase())
    } else if (typeof header === 'object') {
      //header can be an array meaning we want to sort by mpn or manufacturer
      //e.g. ['manufacturer', 0]
      lines = lines.sortBy(line => {
        const field = line.get('partNumbers').get(header[1])
        if (field) {
          return field.get(header[0]).toLowerCase()
        }
        return ''
      })
      header = `${header[0]}${header[1]}`
    } else if (header === 'quantity') {
      lines = lines.sortBy(line => line.get('quantity')).reverse()
    } else {
      lines = lines.sortBy(line => line.get(header).toLowerCase())
    }
    let sortedBy = state.get('sortedBy')
    if (sortedBy.get(0) === header && sortedBy.get(1) === 'forward') {
      lines = lines.reverse()
      sortedBy = [header, 'reverse']
    } else {
      sortedBy = [header, 'forward']
    }
    return state.merge({lines, sortedBy})
  },
  initialize(state, lines) {
    return state.set('lines', immutable.fromJS(lines).map(line => {
      return line.merge({id: makeId()})
    }))
  },
}

const viewActions = {
  setFocus(state, location) {
    return state.set('focus', immutable.fromJS(location))
  },
  setEditable(state, value) {
    return state.set('editable', value)
  },
  togglePartNumbersExpanded(state) {
    return state.update('partNumbersExpanded', expanded => !expanded)
  },
  toggleRetailersExpanded(state) {
    return state.update('retailersExpanded', expanded => !expanded)
  },
  loseFocus(state, focusToLose) {
    return state.update('focus', focus => {
      if (focus.equals(immutable.fromJS(focusToLose))) {
        return immutable.List.of(null, null)
      }
      return focus
    })
  },
}

const rootActions = {
  setFocusBelow(state) {
    const lines = state.data.present.get('lines')
    const view  = state.view.update('focus', focus => {
      if (focus == null) {
        return focus
      }
      const index = focus.get(0)
      const field = focus.get(1)
      if (index == null || field == null) {
        return focus
      }
      if ((index + 1) >= lines.size) {
        return immutable.List.of(null, null)
      }
      return immutable.List.of(index + 1, field)
    })
    return Object.assign({}, {data: state.data, view})
  },
  setFocusNext(state) {
    const lines = state.data.present.get('lines')
    const view  = state.view.update('focus', focus => {
      if (focus == null) {
        return focus
      }
      const index = focus.get(0)
      const field = focus.get(1)
      if (index == null || field == null) {
        return focus
      }
      const fieldName = field.get(0)
      const partNumbersExpanded = state.view.get('partNumbersExpanded')
      if (fieldName === 'retailers') {
        const rs = oneClickBom.lineData.retailer_list
        const i = rs.indexOf(field.get(1))
        if ((i + 1) < rs.length) {
          return immutable.fromJS([index, ['retailers', rs[i + 1]]])
        } else if ((index + 1) < lines.size) {
          return immutable.fromJS([index + 1, ['reference']])
        } else {
          return immutable.List.of(null, null)
        }
      } else {
        return focus.update(1, field => {
          if (fieldName === 'reference') {
            return immutable.List.of('quantity')
          } else if (fieldName === 'quantity') {
            return immutable.List.of('description')
          } else if (fieldName === 'description') {
            if (partNumbersExpanded) {
              return immutable.List.of('partNumbers', 0, 'manufacturer')
            } else {
              return immutable.List.of('partNumbers', 0, 'part')
            }
          } else if (fieldName === 'partNumbers') {
            const next = immutable.List.of('retailers', oneClickBom.lineData.retailer_list[0])
            if (partNumbersExpanded) {
              const i = field.get(1)
              const type = field.get(2)
              if (type === 'manufacturer') {
                return immutable.List.of('partNumbers', i, 'part')
              } else if ((i + 1) < lines.get(0).get('partNumbers').size) {
                return immutable.List.of('partNumbers', i + 1, 'manufacturer')
              } else {
                return next
              }
            } else {
              return next
            }
          }
        })
      }
    })
    return Object.assign({}, state, {view})
  },
  ['@@redux-undo/UNDO'](state) {
    const past = state.data.past
    if (past.length > 0) {
      const newFocus = past[past.length - 1].get('editFocus')
      const view = state.view.set('focus', newFocus)
      return Object.assign({}, state, {view})
    }
    return state
  },
  ['@@redux-undo/REDO'](state) {
    const future = state.data.future
    if (future.length > 0) {
      const newFocus = future[0].get('editFocus')
      const view = state.view.set('focus', newFocus)
      return Object.assign({}, state, {view})
    }
    return state
  },
}

const rootReducer = makeReducer(rootActions, initialState)

const linesReducer = reduxUndo.default(
  makeReducer(linesActions, initialState['data']),
  {
    filter(action, newState, previousState) {
      if (action.type === 'initialize') {
        return false
      }
      return !newState.equals(previousState)
    },
  }
)

const viewReducer = makeReducer(viewActions, initialState['view'])

const combinedReducer = redux.combineReducers({
  data: linesReducer,
  view: viewReducer,
})

function mainReducer(state = initialState, action) {
  const state2 = rootReducer(state, action)
  return combinedReducer(state2, action)
}

function makeReducer(reducers, initialState) {
  return function reducer(state = initialState, action) {
    if (Object.keys(reducers).includes(action.type)) {
      const state2 = reducers[action.type](state, action.value)
      return state2
    }
    return state
  }
}

function makeActions(reducers) {
  const actions = {}
  Object.keys(reducers).forEach(name => {
    actions[name] = function createAction(value) {
      return {type: name, value}
    }
  })
  return actions
}

const actions = Object.assign(
  makeActions(linesActions),
  makeActions(viewActions),
  makeActions(rootActions),
  reduxUndo.ActionCreators
)

module.exports = {initialState, mainReducer, makeReducer, linesActions, emptyLine, actions}
