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
  playing = true;


  constructor(
    private logger: UoLoggerService,
    private obsService: ObservationService
  ) { }

  ngOnInit(): void {

    this.logger.debug(`${this.constructor.name} is initialising`);

    // Start the loop
    this.play();

  }


  play() {
    this.logger.debug('Playing');
    this.playing = true;

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


  pause() {
    this.logger.debug('Pause');
    this.playing = false;
    this.updatingIn = '';
    this.unsubscribeFromCountdownTimer();
  }


  setPendingObservation(): Observable<Observation> {

    // What I'm trying to avoid doing here is asking for dozens of populated observations in one go as it will put unnecessary strain on the server. All I need do is a ask for a load of recent unpopulated observations, find one that's from a timeseries the user hasn't seen yet, and get that one in it's populated form (i.e. all the extra metadata included) 

    // First up get multiple unpopulated observations
    // I'm trying to get enough observations here to avoid seeing the same, frequently uploading, sensors over and over.
    return this.getUnpopulatedObservations(30)
    .pipe(
      // flatMap allows you to chain observables
      flatMap((observations) => {

        const observationsToSelectFrom = observations.length ? observations : this.observations;
        if (!observationsToSelectFrom.length) {
          throwError('No observations to select from.');
        }
        const goodObservation = this.selectGoodObservation(observationsToSelectFrom);

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
      this.setPendingObservation().subscribe(() => {
        this.errorMessage = '';
      });
    })
  }


  getUnpopulatedObservations(nObservations = 10): Observable<Observation[]> {

    this.logger.debug('Getting unpopulated observations');

    const where: any = {
      flags: {
        exists: false
      },
      valueType: {
        in: ['number'] // let's stick to just numbers for the time being
      }      
    }

    // Prevent observations from the same timeseries appearing too often
    if (this.prevTimeseriesIds.length > 0) {
      where.inTimeseries = {
        not: {
          in: this.prevTimeseriesIds
        }
      }
    }

    // Prevent observations from the same deployment being shown consecutively.
    // This relies on there being more than one deployment. Otherwise it won't be able to get any observations.
    if (this.currentObservation && this.currentObservation.hasDeployment) {
      where.hasDeployment = {
        not: this.currentObservation.hasDeployment.id
      }
    }

    const options = {
      // We basically want to get enough observations, so that when the page loads and we pick one at random, there's a good chance it's an observation they haven't seen before.
      limit: nObservations
    };

    return this.obsService.getObservations(where, options)
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


  selectGoodObservation(observations: Observation[]): Observation {

    if (!observations.length) {
      throw new Error('No observation to select from');
    }

    let selectedObservation;

    const goodObservations = observations.filter((obs) => {
      // Haven't been able to think of a good filter now that I can use __not query parameters.
      return true;
    })

    if (goodObservations.length) {
      this.logger.debug(`${goodObservations.length} good observations to pick from.`);
      const idx = random(0, Math.max(goodObservations.length - 1, 0));
      selectedObservation = goodObservations[idx];

    } else {
      this.logger.debug(`Resorting to an non-good observation`);
      const idx = random(0, Math.max(observations.length - 1, 0));
      selectedObservation = observations[idx];
    };

    this.logger.debug(`Selected observation ${selectedObservation.id}`)
      
    return selectedObservation;
  }


  beginCountdown() {

    // Reset out unsubscriber
    this.countdownTimerUnsubscribe$ = new Subject();

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
    if (this.prevTimeseriesIds.length > 50) {
      // This stops the array from getting too long if someone leaves the page running for ages.
      // You'll want to make sure this is less than the total number of timeseries publically available.
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
