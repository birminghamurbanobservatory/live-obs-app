export interface CollectionMeta {
  current: any;
  previous: any;
  next: any;
  count: number; // the number of items in the collection returned
  total: number; // the total number available (i.e. there might be more still to get)
}