import {environment} from '../../../environments/environment';

// Handy way of loading Google Maps on demand.
// Source: https://stackoverflow.com/questions/34931771/how-to-load-google-maps-api-asynchronously-in-angular2

// Note the google api key into the url below
// You can omit the version number from the URL in which case Google will automatically give you the latest version, but I was having issues with version 3.32, thus rolled back to 3.31.
const url = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&callback=__onGoogleMapsLoaded&libraries=drawing`;
// N.B. I've also requested the drawing library so users can draw their own polygon, etc.

export class GoogleMapsLoader {
    private static promise;
    public static load() {

    // First time 'load' is called?
    if (!GoogleMapsLoader.promise) {

      // Make promise to load
      GoogleMapsLoader.promise = new Promise((resolve) => {

        // Set callback for when google maps is loaded.
        window['__onGoogleMapsLoaded'] = (ev) => {
          resolve(window['google']['maps']);
        };

        // Add script tag to load google maps, which then triggers the callback, which resolves the promise with windows.google.maps.
        const node = document.createElement('script');
        node.src = url;
        node.type = 'text/javascript';
        document.getElementsByTagName('head')[0].appendChild(node);

      });
    }

    // Always return promise. When 'load' is called many times, the promise is already resolved.
    return GoogleMapsLoader.promise;
  }
}
