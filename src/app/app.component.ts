import { Component, OnInit, OnDestroy } from '@angular/core';
import {UoLoggerService} from './shared/uo-logger-service';
import {ObservationService} from './observation/observation.service';
import {catchError, takeUntil, mapTo} from 'rxjs/operators';
import {throwError, Subject, timer, merge} from 'rxjs';
import {Observation} from './observation/observation';
import {random} from 'lodash';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, OnDestroy {

  state = 'pending';
  private prevTimeseriesIds: string[] = [];
  getErrorMessage;
  currentObservation: Observation;
  private countdownTimerUnsubscribe$ = new Subject();
  countdownLength = 10; // in seconds
  updatingIn = '';

  constructor(
    private logger: UoLoggerService,
    private obsService: ObservationService
  ) { }

  ngOnInit(): void {

    this.logger.debug(`${this.constructor.name} is initialising`);

    this.getRecentObs();

  }


  getRecentObs() {

    const nObsToGetEachTime = 10;

    this.state = 'getting';
    this.obsService.getObservations({
      flags: {
        exists: false
      }
    }, {
      limit: nObsToGetEachTime,
      onePer: 'timeseries'
    })
    .pipe(
      catchError((err) => {
        this.logger.error(err.message);
        this.getErrorMessage = 'Failed to get recent observation';
        this.state = 'failed';
        return throwError(err);
      })
    )
    .subscribe(({data: observations}) => {
      this.getErrorMessage = '';
      this.state = 'got';
      this.logger.debug(`Got ${observations.length} observations.`);

      if (observations.length) {
        this.currentObservation = this.selectGoodObservation(observations);
        this.updatePrevTimeseriesIds(this.currentObservation.inTimeseries);
      }

      this.beginCountdown();

    })

  }


  selectGoodObservation(observations: Observation[]): Observation {

    // TODO: If you find observations from the same deployment keep appearing then you may also want to get preference to observations from deployments you haven't seen recently.

    const obsFromFreshTimeseries = observations.filter((obs) => {
      return !(this.prevTimeseriesIds.includes(obs.inTimeseries));
    })

    let selectedObservation;

    if (obsFromFreshTimeseries.length) {
      this.logger.debug(`${obsFromFreshTimeseries.length} fresh timeseries to pick from.`);
      const idx = random(0, Math.max(obsFromFreshTimeseries.length - 1, 0));
      selectedObservation = obsFromFreshTimeseries[idx];

    } else if (observations.length) {
      this.logger.debug(`Resorting to an already used timeseries`);
      const idx = random(0, Math.max(observations.length - 1, 0));
      selectedObservation = observations[idx];
    };

    if (selectedObservation) {
      this.logger.debug(`Selected observation ${selectedObservation.id} (timeseries: ${selectedObservation.inTimeseries})`)
    }
    return selectedObservation;

  }


  beginCountdown() {

    // TODO: May wish to restructure this a bit so that you actually get the new observations at the start of the coundown period (to save waiting for them at the end) and at the end of the countdown all you're doing is making a pending observation you got ~9 seconds ago the new current observation.

    // Cancel any previous subscriptions..
    this.unsubscribeFromCountdownTimer();

    this.logger.debug('Beginning countdown');

    const fullLengthMs = this.countdownLength * 1000;

    merge(
      timer(fullLengthMs - 3000).pipe(mapTo('3')),
      timer(fullLengthMs - 2000).pipe(mapTo('2')),
      timer(fullLengthMs - 1000).pipe(mapTo('1')),
      timer(fullLengthMs).pipe(mapTo('Done'))
    )
    .pipe(
      takeUntil(this.countdownTimerUnsubscribe$)
    )
    .subscribe((val) => {
      if (val === 'Done') {
        this.updatingIn = '';
        // Go get some more observations
        this.getRecentObs();
      } else {
        this.updatingIn = val;
      }
    })

  }


  updatePrevTimeseriesIds(newTimeseriesId) {
    if (this.prevTimeseriesIds.length > 200) {
      // This stops the array from getting too long if someone leaves the page running for ages.
      this.prevTimeseriesIds.shift();
    }
    this.prevTimeseriesIds.push(newTimeseriesId);
  }


  unsubscribeFromCountdownTimer() {
    this.countdownTimerUnsubscribe$.next();
    this.countdownTimerUnsubscribe$.complete();
  }


  ngOnDestroy() {
    this.unsubscribeFromCountdownTimer();
  }


}
