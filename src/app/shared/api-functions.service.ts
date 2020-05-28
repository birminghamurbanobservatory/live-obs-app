import { Injectable } from '@angular/core';
import {isObject, isArray} from 'lodash';


@Injectable({
  providedIn: 'root'
})
export class ApiFunctionsService {

  constructor() { }


  // E.g. converts the where object:
  // {resultTime: {lte: '2020-01-01'}}
  // to the query string:
  // '?resultTime__lte=2020-01-01'
  queryParamsObjectToString(obj?): string {

    if (!obj) {
      // simply returning an empty string rather than throwing an error can save code in the services that use this.
      return '';
    }

    const arraysThatNeedDotSeparation = ['ancestorPlatforms'];

    const elements = [];
    Object.keys(obj).forEach((key) => {
      if (isObject(obj[key]) && !isArray(obj[key])) {
        Object.keys(obj[key]).forEach((modKey) => {
          if (modKey === 'in') {
            elements.push(`${key}__${modKey}=${obj[key][modKey].join(',')}`);
          } else {
            elements.push(`${key}__${modKey}=${obj[key][modKey]}`);
          }
        });
      } else if (isArray(obj[key])) {
        const separator = arraysThatNeedDotSeparation.includes(key) ? '.' : ',';
        elements.push(`${key}=${obj[key].join(separator)}`);
      } else {
        elements.push(`${key}=${obj[key]}`);
      }
    });
    if (elements.length) {
      return `?${elements.join('&')}`;
    } else {
      return '';
    }

  }


}
