import { Injectable } from '@angular/core';
import {environment} from './../../environments/environment'; 
import {NGXLogger, CustomNGXLoggerService, NgxLoggerLevel} from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class UoLoggerService {

  // Decided to put wrap a custom service around NGXLogger to make it a bit easier to set the log level from an environment variable.

  private logger: NGXLogger;

  constructor(
    customLogger: CustomNGXLoggerService
  ) { 
    const environmentLogLevel = environment.logLevel || 'debug';
    this.logger = customLogger.create({
      level: NgxLoggerLevel[environmentLogLevel.toUpperCase()], 
      timestampFormat: 'shortTime', 
      enableSourceMaps: false // decided not to bother because it references this file anyway
    });
  }

  debug(...arg) {
    // @ts-ignore
    this.logger.debug(...arg);
    return;
  }

  info(...arg) {
    // @ts-ignore
    this.logger.info(...arg);
    return;
  }

  warn(...arg) {
    // @ts-ignore
    this.logger.warn(...arg);
    return;
  }

  error(...arg) {
    // @ts-ignore
    this.logger.error(...arg);
    return;
  }

}
