import {transform, isObject} from 'lodash'


// example keysMap { oldKey1: newKey1, oldKey2: newKey2}
export function deeplyRenameKeys(obj: any, keysMap: any) {

  return transform(obj, function(result, value, key) { // transform to a new object

    var currentKey = keysMap[key] || key; // if the key is in keysMap use the replacement, if not use the original key

    result[currentKey] = isObject(value) ? deeplyRenameKeys(value, keysMap) : value; // if the key is an object run it through the inner function - replaceKeys
  });

}