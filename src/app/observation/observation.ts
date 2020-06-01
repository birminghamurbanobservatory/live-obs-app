export interface Observation {
  id?: string;
  type?: string;
  hasResult?: HasResult;
  resultTime?: Date;
  phenomenonTime?: PhenomenonTime;
  madeBySensor?: any;
  hasDeployment?: any;
  ancestorPlatforms?: any[];
  hasFeatureOfInterest?: any;
  observedProperty?: any;
  aggregation?: any;
  disciplines?: any[];
  usedProcedures?: any[];
  inTimeseries?: string;
  location?: Location;
}


interface HasResult {
  value: any;
  unit: any;
  flags: string[];
}


interface PhenomenonTime {
  hasBeginning: Date;
  hasEnd: Date;
  duration: number;
}


interface Location {
  id: string;
  geometry: any;
  properties: any;
}