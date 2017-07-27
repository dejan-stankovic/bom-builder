import './App.css'
import 'semantic-ui-css/semantic.css'

const React       = require('react')
const semantic    = require('semantic-ui-react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const superagent  = require('superagent')
const oneClickBom = require('1-click-bom')

const {mainReducer, initialState, actions} = require('./state')

const Bom = React.createClass({
  store: redux.createStore(mainReducer, initialState),
  getInitialState() {
    return this.store.getState().toJS()
  },
  render() {
    return (
      <semantic.Table className='Bom' celled unstackable={true}>
        <Header lines={this.state.lines} />
        <Body lines={this.state.lines} />
      </semantic.Table>
    )
  },
  componentDidMount() {
    superagent.get('1-click-BOM.tsv').then(r => {
      this.store.dispatch(actions.setFromTsv(r.text))
    })
    this.store.subscribe(() => {
      const state = this.store.getState().toJS()
      this.setState(state)
    })
  },
})

function Header({lines}) {
  const maxMpns = oneClickBom.lineData.maxMpns(lines)
  return (
    <semantic.Table.Header>
      <semantic.Table.HeaderCell>
        References
      </semantic.Table.HeaderCell>
      <semantic.Table.HeaderCell>
        Qty
      </semantic.Table.HeaderCell>
      {(() => {
        const cells = []
        for (let i = 0; i < maxMpns; ++i) {
          cells.push(
            <semantic.Table.HeaderCell key={`Manufacturer${i}`}>
              Manufacturer
            </semantic.Table.HeaderCell>
          )
          cells.push(
            <semantic.Table.HeaderCell key={`MPN${i}`}>
              MPN
            </semantic.Table.HeaderCell>
          )
        }
        return cells
      })()}
      {oneClickBom.lineData.retailer_list.map(retailer => {
        return (
          <semantic.Table.HeaderCell key={retailer}>
            {retailer}
          </semantic.Table.HeaderCell>
        )
      })}
    </semantic.Table.Header>
  )
}

function Body({lines}) {
  const maxMpns = oneClickBom.lineData.maxMpns(lines)

  return (
    <semantic.TableBody>
      {lines.map(line => Row({line, maxMpns}))}
    </semantic.TableBody>
  )
}

function Row({line, maxMpns}) {
  return (
    <semantic.Table.Row key={line.id}>
      <semantic.Table.Cell className={`marked ${markerColor(line.reference)}`}>
        {line.reference}
      </semantic.Table.Cell>
      <semantic.Table.Cell>
        {line.quantity}
      </semantic.Table.Cell>
      {(() => {
        const ps = line.partNumbers.map(mpn => {
          return [
            <semantic.Table.Cell key={`${line.id}-${mpn.manufacturer}`}>
              {mpn.manufacturer}
            </semantic.Table.Cell>
           ,
            <semantic.Table.Cell key={`${line.id}-${mpn.part}`}>
              {mpn.part}
            </semantic.Table.Cell>
          ]
        })
        while (ps.length < maxMpns) {
          ps.push([<semantic.Table.Cell />, <semantic.Table.Cell />])
        }
        return ps
      })()}
      {oneClickBom.lineData.retailer_list.map(name => {
        return (
          <semantic.Table.Cell key={`${line.id}-${name}`}>
            {line.retailers[name]}
          </semantic.Table.Cell>
        )
      })}
    </semantic.Table.Row>
  )
}

function markerColor(ref) {
  if (/^C\d/.test(ref)) {
    return 'orange'
  }
  if (/^R\d/.test(ref)) {
    return 'lightblue'
  }
  if (/^IC\d/.test(ref) || /^U\d/.test(ref)) {
    return 'blue'
  }
  if (/^L\d/.test(ref)) {
    return 'black'
  }
  if (/^D\d/.test(ref)) {
    return 'green'
  }
  if (/^LED\d/.test(ref)) {
    return 'yellow'
  }
  return 'purple'
}



export default Bom
