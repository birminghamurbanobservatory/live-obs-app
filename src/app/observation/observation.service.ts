import { Injectable } from '@angular/core';
import {Observable} from 'rxjs';
import {cloneDeep} from 'lodash';
import {environment} from './../../environments/environment';
import {map} from 'rxjs/operators';
import {Observation} from './observation';
import {CollectionMeta} from '../shared/collection-meta';
import {Collection} from '../shared/collection';
import {ApiFunctionsService} from '../shared/api-functions.service';
import {HttpClient} from '@angular/common/http';
import {deeplyRenameKeys} from '../shared/handy-utils';


@Injectable({
  providedIn: 'root'
})
export class ObservationService {

  constructor(
    private http: HttpClient,
    private apiFunctions: ApiFunctionsService
  ) { }


  getObservations(
    where: {} = {}, 
    options: {limit?: number; offset?: number; sortBy?: string; sortOrder?: string; onePer?: string; populate?: string[]} = {}
  ): Observable<{data: Observation[], meta: CollectionMeta}> {

    const queryParamsObject = Object.assign({}, where, options);
    const qs = this.apiFunctions.queryParamsObjectToString(queryParamsObject);

    return this.http.get(`${environment.apiUrl}/observations${qs}`)
    .pipe(
      map((obsCollection: Collection) => {
        return {
          data: obsCollection.member.map(this.formatObservationForApp),
          meta: obsCollection.meta
        }
      })
    )

  }


  getObservation(id: string, options: {populate?: string[]} = {}): Observable<Observation> {
    const qs = this.apiFunctions.queryParamsObjectToString(options);
    return this.http.get(`${environment.apiUrl}/observations/${id}${qs}`)
    .pipe(
      map((observation: Observation) => {
        return this.formatObservationForApp(observation);
      })
    )
  }


  formatObservationForApp(asJsonLd): Observation {

    const forApp: Observation = deeplyRenameKeys(asJsonLd, {
      '@id': 'id',
      '@type': 'type'
    });

    delete forApp['@context'];

    if (forApp.resultTime) {
      forApp.resultTime = new Date(forApp.resultTime);
    }

    if (forApp.phenomenonTime) {
      forApp.phenomenonTime.hasBeginning = new Date(forApp.phenomenonTime.hasBeginning);
      forApp.phenomenonTime.hasEnd = new Date(forApp.phenomenonTime.hasEnd);
    }
    
    return forApp;
  }


}
