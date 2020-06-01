import { Component, OnInit, OnDestroy } from '@angular/core';
import {UoLoggerService} from './shared/uo-logger-service';
import {ObservationService} from './observation/observation.service';
import {catchError, takeUntil, mapTo, tap, map, flatMap} from 'rxjs/operators';
import {throwError, Subject, timer, merge, Observable} from 'rxjs';
import {Observation} from './observation/observation';
import {random, cloneDeep} from 'lodash';
import {GoogleMapsLoader} from './location/google-maps/google-maps-loader';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, OnDestroy {

  private prevTimeseriesIds: string[] = [];
  observations: Observation[] = [];
  pendingObservation: Observation;
  currentObservation: Observation;
  private unsubscribe$ = new Subject(); // generic
  private countdownTimerUnsubscribe$ = new Subject(); // specifically for the countdown
  countdownLength = 10; // in seconds
  updatingIn = '';
  private googleMapsApi;
  errorMessage = '';


  constructor(
    private logger: UoLoggerService,
    private obsService: ObservationService
  ) { }

  ngOnInit(): void {

    this.logger.debug(`${this.constructor.name} is initialising`);

    // TODO: Need to handle if this errors, and show error message to user.
    this.setPendingObservation()
    .pipe(
      catchError((err): any => {
        this.errorMessage = 'Failed to retrieve an observation.';
        return throwError(err);
      })
    )
    .subscribe(() => {

      // Set the pending obs as the current obs.
      if (this.pendingObservation) {
        this.currentObservation = cloneDeep(this.pendingObservation);
      }

      // Now we can start the countdown timer
      this.beginCountdown();

      // We'll also want to line another pending observation up
      this.pauseThenSetPendingObservation();

    })

  }


  setPendingObservation(): Observable<Observation> {

    // What I'm trying to avoid doing here is asking for dozens of populated observations in one go as it will put unnecessary strain on the server. All I need do is a ask for a load of recent unpopulated observations, find one that's from a timeseries the user hasn't seen yet, and get that one in it's populated form (i.e. all the extra metadata included) 

    // First up get multiple unpopulated observations
    // I'm trying to get enough observations here to avoid seeing the same, frequently uploading, sensors over and over.
    return this.getUnpopulatedObservations(15)
    .pipe(
      // flatMap allows you to chain observables
      flatMap((observations) => {

        const observationsToSelectFrom = observations.length ? observations : this.observations;
        if (!observationsToSelectFrom.length) {
          throwError('No observations to select from.');
        }
        const goodObservation = this.selectGoodObservation(observationsToSelectFrom, this.prevTimeseriesIds);

        return this.getPopulatedObservation(goodObservation.id);

      }),
      tap((populatedObservation) => {
        this.pendingObservation = populatedObservation;

        // Update our list of used timeseries
        this.updatePrevTimeseriesIds(populatedObservation.inTimeseries);
      })
    )

  }


  pauseThenSetPendingObservation(): void {
    timer(3000)
    .pipe(
        takeUntil(this.unsubscribe$)
    ).subscribe(() => {
      // Although we don't need to do anything with the subscribe function here, we still need it otherwise the observable inside the getRecentObservations function won't complete.
      this.setPendingObservation().subscribe(() => {});
    })
  }


  getUnpopulatedObservations(nObservations = 10): Observable<Observation[]> {

    this.logger.debug('Getting unpopulated observations');

    return this.obsService.getObservations({
      flags: {
        exists: false
      }
    }, {
      limit: nObservations,
      // TODO: Is there a way of having one per timeseries whilst also sorting by newest first? Not sure there is because the SQL involves a DISTINCT ON query which means the ORDER BY can only be by the timeseries, not the result_time.
      // The issue currently is that the order is pretty much always the same, based upon the timeseries id in the database.
      // You could just omit the onePer, but you could end up with issues is you ever have a sensor that spits out new data every second, it could completely dominate the available observations unless you find a way of adding a query parameter that excludes certain timeseries.
      // onePer: 'timeseries'
    })
    .pipe(
      map((observationCollection) => {
        return observationCollection.data;
      }),
      tap((observations) => {
        this.logger.debug(`Got ${observations.length} observations.`)
      }),
      catchError((err) => {
        this.logger.error(err.message);
        return throwError(err);
      })
    );

  }


  getPopulatedObservation(id) {

    this.logger.debug(`Getting populated observation ${id}`);

    return this.obsService.getObservation(id, {
      populate: [
        'hasDeployment',
        'madeBySensor',
        'ancestorPlatforms',
        'observedProperty',
        'unit',
        'aggregation',
        'hasFeatureOfInterest',
        'disciplines',
        'usedProcedures'
      ]
    });

  }


  selectGoodObservation(observations: Observation[], prevTimeseriesIds: string[]): Observation {

    // TODO: If you find observations from the same deployment keep appearing then you may also want to get preference to observations from deployments you haven't seen recently.

    if (!observations.length) {
      throw new Error('No observation to select from');
    }

    let selectedObservation;

    const obsFromFreshTimeseries = observations.filter((obs) => {
      return !(prevTimeseriesIds.includes(obs.inTimeseries));
    })

    if (obsFromFreshTimeseries.length) {
      this.logger.debug(`${obsFromFreshTimeseries.length} fresh timeseries to pick from.`);
      const idx = random(0, Math.max(obsFromFreshTimeseries.length - 1, 0));
      selectedObservation = obsFromFreshTimeseries[idx];

    } else {
      this.logger.debug(`Resorting to an already used timeseries`);
      const idx = random(0, Math.max(observations.length - 1, 0));
      selectedObservation = observations[idx];
    };

    this.logger.debug(`Selected observation ${selectedObservation.id} (timeseries: ${selectedObservation.inTimeseries})`)
      
    return selectedObservation;
  }


  beginCountdown() {

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
        this.logger.debug('Countdown complete');
        // Update which observation we show
        this.currentObservation = cloneDeep(this.pendingObservation);
        // Go get line up another pending observation so it's ready for the end of the countdown.
        this.pauseThenSetPendingObservation();
        // Start the countdown timer again
        this.beginCountdown();

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
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }


}
