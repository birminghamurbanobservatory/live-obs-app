import { Component, OnInit, Input, OnChanges } from '@angular/core';
import {UoLoggerService} from '../../shared/uo-logger-service';
import {GoogleMapsLoader} from '../google-maps/google-maps-loader';
import center from '@turf/center';

@Component({
  selector: 'uo-location-viewer',
  templateUrl: './location-viewer.component.html',
  styleUrls: ['./location-viewer.component.css']
})
export class LocationViewerComponent implements OnInit, OnChanges {

  @Input() geometryIn: any

  uniqueMapId = `map-id-${this.generateUniqueId()}`; // in case multiple on same page
  map: any;
  googleMapsApi: any;
  processGeometryFail = false;

  constructor(
    private logger: UoLoggerService
  ) { }

  ngOnInit() {

    GoogleMapsLoader.load()
    .then((googleMapsApi) => {
      this.logger.debug('Google Maps Loaded');
      this.googleMapsApi = googleMapsApi;

      this.map = new googleMapsApi.Map(document.getElementById(this.uniqueMapId), {
        zoom: 11,
        center: {
          lat: 52, 
          lng: -1.9
        }
      });

      // If we already have geometryIn then plot it
      if (this.geometryIn) {
        this.drawLocationOnMap(this.geometryIn);
      }

    })

  }


  ngOnChanges(changes) {
    if (this.map) {
      this.drawLocationOnMap(changes.geometryIn)
    }
  }


  // Draw location on map
  drawLocationOnMap(geometry) {

    // Remove anything already plotted
    if (this.map.data) {
      this.map.data.forEach((feature) => {
        this.map.data.remove(feature);
      })
    }

    // Find the center of the geometry provided
    let geoJsonCenterPoint;
    try {
      geoJsonCenterPoint = center({
        type: 'Feature',
        geometry: this.geometryIn
      });
    } catch (err) {
      this.processGeometryFail = true;
      this.logger.error(err);
    }

    this.map.setCenter({
      lng: geoJsonCenterPoint.geometry.coordinates[0],
      lat: geoJsonCenterPoint.geometry.coordinates[1]
    })

    if (!this.processGeometryFail) {
      this.map.data.addGeoJson({type: 'Feature', geometry: this.geometryIn});
    }

  }


  generateUniqueId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

}
