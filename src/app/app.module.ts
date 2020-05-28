import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { ObservationComponent } from './observation/observation.component';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    ObservationComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    // Although I set these config options here, the uo-logger.service creates a new instance anyway.
    LoggerModule.forRoot({level: NgxLoggerLevel.DEBUG, timestampFormat: 'shortTime'})
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
