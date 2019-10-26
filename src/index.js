import React from 'react';
import PropTypes from 'prop-types';
import {GlobalStoreContext} from './context';
import produce from 'immer';
import ObjectSchemaForm from './object-schema-form';
import ArraySchemaForm from './array-schema-form'
import {Button} from 'antd'
import 'antd/dist/antd.css'
import './index.scss'
import getName from  './locale'

function getData(state, keys) {
  try{
    let curState = state;
    for (let i = 0; i < keys.length; i++) {
      curState = curState[keys[i]];
    }
    return curState;
  }catch(e){
    return null;
  }
}

function setData(state, keys, value) {
  let curState = state;
  for (let i = 0; i < keys.length - 1; i++) {
    curState = curState[keys[i]];
  }
  curState[keys[keys.length - 1]] = value;

}

function getParentKeys(keys) {
  if (keys.length === 1) return [];
  let arr = [].concat(keys);
  arr.splice(keys.length - 1, 1);
  return arr;
}

const Ajv = require('ajv');
const ajv = new Ajv();

export default class JsonSchemaForm extends React.PureComponent {
  constructor (props) {
    super (props);
    this.state = {
      store: {
        value: props.value || {},
        validateResult: [],
      },
      changeStore: this.changeStore,
      setValueByPath: this.setValueByPath,
      addArrayItemByPath: this.addArrayItemByPath,
      deleteArrayItemByPath: this.deleteArrayItemByPath,
      moveArrayItem: this.moveArrayItem,
    };
  }

  static propTypes = {
    schema: PropTypes.object,
    value: PropTypes.object,
    onChange: PropTypes.func,
    dataPath: PropTypes.array,
    onBlur: PropTypes.func,
    enableSumbit: PropTypes.bool,
    locale: PropTypes.oneOf(['zh_CN', 'en_US'])
  };

  static defaultProps = {
    dataPath: [],
    enableSumbit: false,
    locale: 'en_US'
  };

  moveArrayItem =(paths, from, to)=>{

    function arrMove(arr, fromIndex, toIndex) {
      arr = [].concat(arr);
      let item = arr.splice(fromIndex, 1)[0];
      arr.splice(toIndex, 0, item);
      return arr;
    }

    this.changeStore(store=>{
      const arr = getData(this.state.store.value, paths);
      const newArr = arrMove(arr, from ,to)
      setData(store.value, paths, newArr)
    })
  }

  setValueByPath =(paths, value)=>{
    this.changeStore((store=>{
      if(paths.length > 1){
        const parentPaths = getParentKeys(paths);
        const data = getData(this.state.store.value, parentPaths)
        if(!data || typeof data !== 'object'){
          setData(store.value, parentPaths, {})
        }
      }
      setData(store.value, paths, value)
    }))
  }

  addArrayItemByPath =(paths, index , value = {})=>{
    this.changeStore(store=>{
      const arr = getData(store.value, paths);
      if(typeof index === 'undefined'){
        arr.push(value)
      }else arr.splice(index + 1, 0, value)
    })
  }
  
  deleteArrayItemByPath =(paths, index)=>{
    this.changeStore(store=>{
      const arr = getData(store.value, paths);
      arr.splice(index, 1)
    })
  }

  changeStore = fn => {
    this.setState (state => {
      const {enableSumbit} = this.props;
      const newStore = produce (state.store, draftState => {
        if (typeof fn === 'function') {
          fn (draftState, state.store);
        }
      })
      if(!enableSumbit){
        this.props.onChange(newStore.value)
      }
      return {
        store: newStore,
      };
    });
  };

  render () {
    const {schema, dataPath, enableSumbit} = this.props;
    const {store} = this.state;
    let C;
    if (schema.type === 'object') {
      C = ObjectSchemaForm;
    } else if (schema.type === 'array') {
      C = ArraySchemaForm;
    } else {
      throw new Error ('Not Support Type');
    }
    return (
      <GlobalStoreContext.Provider value={this.state}>
        <div className="json-schema-form">
          {
            <C
              dataPath={dataPath}
              schema={schema}
              value={store.value}
              onBlur={ ()=> {
                const validate = ajv.compile(schema);
                const valid = validate(store.value);
                if (!valid){
                  this.changeStore(store=>{
                    const errors = validate.errors.map(item=>{
                      if(item.keyword === 'required'){
                        return {
                          ...item,
                          dataPath: item.dataPath +`.${item.params.missingProperty}`
                        }
                      }
                      return item;
                    })
                    store.validateResult = errors;
                  })
                }else{
                  this.changeStore(store=>{
                    store.validateResult = [];
                  })
                }
              }}
            />
          }
          {enableSumbit && <div className="item-sumbit">
            <Button size="large" type="primary">{getName('submit')}</Button>
          </div>}
        </div>
      </GlobalStoreContext.Provider>
    );
  }
}
