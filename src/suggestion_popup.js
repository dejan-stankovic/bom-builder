import './suggestion_popup.css'

const React       = require('react')
const semantic    = require('semantic-ui-react')
const immutable   = require('immutable')

class SuggestionPopup extends React.PureComponent {
  constructor(props) {
    super(props)
    const viewing = props.selected < 0 ? 0 : props.selected
    this.state = {
      expanded: false,
      viewing,
      initialViewing: viewing,
    }
    this.toggleExpanded = this.toggleExpanded.bind(this)
    this.incrementViewing = this.incrementViewing.bind(this)
    this.decrementViewing = this.decrementViewing.bind(this)
    this.setViewing = this.setViewing.bind(this)
  }
  componentWillReceiveProps(newProps) {
    if (newProps.selected !== this.props.selected
    && this.state.viewing === this.state.initialViewing) {
      this.setViewing(newProps.selected)
    }
  }
  toggleExpanded() {
    this.setState({expanded: !this.state.expanded})
  }
  incrementViewing() {
    this.setViewing(this.state.viewing + 1)
  }
  decrementViewing() {
    this.setViewing(this.state.viewing - 1)
  }
  setViewing(n) {
    const suggestions = this.props.suggestions
    if (n >= suggestions.size) {
      n = 0
    } else if (n < 0) {
      if (suggestions.size === 0) {
        n = 0
      } else {
        n = suggestions.size - 1
      }
    }
    this.setState({viewing: n})
  }
}

class MpnPopup extends SuggestionPopup {
  constructor(props) {
    super(props)
    this.toggleSelected = this.toggleSelected.bind(this)
  }
  toggleSelected() {
    const {
      selected,
      remove,
      setField,
      suggestions,
      lineId,
      field,
    } = this.props
    if (selected === this.state.viewing) {
      remove(immutable.List.of(lineId, field))
    } else {
      const mpn = suggestions.getIn([this.state.viewing, 'mpn'])
      setField({lineId, field, value: mpn})
    }
  }
  render() {
    const props = this.props
    const suggestions = props.suggestions
    const popupProps = {
        className : 'SuggestionPopup',
        flowing   : true,
        position  : props.position,
        trigger   : props.trigger,
        onOpen    : props.onOpen,
        onClose   : props.onClose,
        open      : props.open,
        offset    : props.offset,
        on        : props.on,
    }
    const suggestion = suggestions.get(this.state.viewing) || immutable.Map()
    const image      = suggestion.get('image') || immutable.Map()
    const mpn        = suggestion.get('mpn') || immutable.Map()
    const part       = mpn.get('part') || ''
    let specs        = suggestion.get('specs') || immutable.List()
    if (! this.state.expanded) {
      specs = specs.slice(0, 4)
    }
    const mpnTitle = (
      <Title
        one={mpn.get('manufacturer')}
        two={part}
        page={`${this.state.viewing + 1}/${suggestions.size}`}
        wandColor={suggestion.get('type') === 'match' ? 'green' : 'grey'}
      />
    )
    const specTable = <SpecTable specs={specs} />
    let expandButton
    if (suggestion.get('specs') && suggestion.get('specs').size > 4) {
      expandButton = (
        <div className='expandButtonContainer'>
          <semantic.Button
            onClick = {this.toggleExpanded}
            size    = 'tiny'
            basic   = {true}
          >
            {this.state.expanded ? '⇡' : '...'}
          </semantic.Button>
        </div>
      )
    }
    return (
      <semantic.Popup {...popupProps} >
        <Buttons
          disabled={suggestions.size < 2}
          selected={this.props.selected === this.state.viewing}
          onIncrement={this.incrementViewing}
          onDecrement={this.decrementViewing}
          onSelect={this.toggleSelected}
        />
        {mpnTitle}
        <div className='topAreaContainer'>
          <div className='topAreaInner'>
            <div>
              <div className='imageContainer'>
                <semantic.Image src={image.get('url')} />
              </div>
              <a className='imageCredit' href={image.get('credit_url')}>
                {image.get('credit_string')}
              </a>
            </div>
            <div className='octopartLinkContainer'>
              <a
                href={
                  'https://octopart.com' +
                  (part ? `/search?q=${part}` : '')
                }
              >
                Powered by Octopart
              </a>
            </div>
          </div>
          <div className='rightHandModule'>
            <div className='description'>
              {suggestion.get('description')}
            </div>
            <Datasheet href={suggestion.get('datasheet')} />
            {specTable}
            {expandButton}
          </div>
        </div>
      </semantic.Popup>
    )
  }
}

class Datasheet extends React.PureComponent {
  render() {
    const link = this.props.href ?
      <a href={this.props.href} >
        <semantic.Icon name='file pdf outline' />
        Datasheet
      </a> : null
    return (
      <div className='datasheet'>
        {link}
      </div>
    )
  }
}

class SpecTable extends React.PureComponent {
  render() {
    const specTableData = this.props.specs.map(spec => (
      [spec.get('name'), spec.get('value')]
    ))
    return (
      <semantic.Table
        className='specTable'
        basic='very'
        compact={true}
        tableData={specTableData.toArray()}
        renderBodyRow={args => {
          return (
            <tr key={String(args)}>
              {args.map(text => (
                <td key={text}>
                  {text}
                </td>
              ))}
            </tr>
          )
        }}
      />
    )
  }
}

class Title extends React.PureComponent {
  render() {
    const props = this.props
    const opacity = props.wandColor === 'green' ? 1.0 : 0.3
    return (
      <div className='titleContainer'>
        <div>
          <semantic.Icon
            style={{opacity}}
            size='large'
            color={props.wandColor}
            name='magic'
          />
        </div>
        <div className='mpnTitle'>
          <div>
            {props.one}
          </div>
          <div>
            {props.two}
          </div>
        </div>
        <div className='viewingNumber'>
          {props.page}
        </div>
      </div>
    )
  }
}

class Buttons extends React.PureComponent {
  render() {
    const {disabled, selected, onDecrement, onIncrement, onSelect} = this.props
    return (
      <semantic.Button.Group basic fluid>
        <semantic.Button
          disabled={disabled}
          icon='left chevron'
          onClick={onDecrement}
        />
        <semantic.Button onClick={onSelect}>
          <semantic.Icon
            name={selected ? 'checkmark box' : 'square outline'}
          />
          {selected ? 'Selected' : 'Select'}
        </semantic.Button>
        <semantic.Button
          disabled={disabled}
          icon='right chevron'
          onClick={onIncrement}
        />
      </semantic.Button.Group>
    )
  }
}

export {MpnPopup}