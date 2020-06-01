import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Pipe } from '@angular/core';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { ObservationComponent } from './observation/observation.component';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import {HttpClientModule} from '@angular/common/http';
import {LocationViewerComponent} from './location/location-viewer/location-viewer.component';
import { TimeagoModule } from 'ngx-timeago';


@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    ObservationComponent,
    LocationViewerComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    TimeagoModule.forRoot(),
    // Although I set these config options here, the uo-logger.service creates a new instance anyway.
    LoggerModule.forRoot({level: NgxLoggerLevel.DEBUG, timestampFormat: 'shortTime'})
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
