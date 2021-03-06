import { Injectable } from '@angular/core';
import * as check from 'check-types';


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
      if (check.object(obj[key])) {
        Object.keys(obj[key]).forEach((modKey) => {

          if (modKey === 'in') {
            elements.push(`${key}__${modKey}=${obj[key][modKey].join(',')}`);
          
          } else if (modKey === 'not') {
            if (check.object(obj[key][modKey])) {
              Object.keys(obj[key][modKey]).forEach((notModKey) => {
                if (notModKey === 'in') {
                  if (obj[key][modKey][notModKey].length) {
                    elements.push(`${key}__not__${notModKey}=${obj[key][modKey][notModKey].join(',')}`);
                  }
                } else {
                  elements.push(`${key}__not__${notModKey}=${obj[key][modKey][notModKey]}`);
                }
              });
            } else if (check.array(obj[key][modKey])) {
              const separator = arraysThatNeedDotSeparation.includes(key) ? '.' : ',';
              elements.push(`${key}__not=${obj[key][modKey].join(separator)}`);
            } else {
              elements.push(`${key}__not=${obj[key][modKey]}`);
            }

          } else {
            elements.push(`${key}__${modKey}=${obj[key][modKey]}`);
          }

        });
      } else if (check.array(obj[key])) {
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
