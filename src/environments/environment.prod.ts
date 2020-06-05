export const environment = {
  production: true,
  apiUrl: 'https://api.birminghamurbanobservatory.com',
  logLevel: 'warn', // off, debug, info, warn, error
  // The following key should be for production only. On the GCP console you should restrict this key to just the domains (*.birminghamurbanobservatory.com/*) where it will be used. Also restrict it to just the Maps JavaScript API.
  googleMapsApiKey: 'AIzaSyDS-Evzqr-4IPzGWflXDDafglhHV-KTYZQ'
};
