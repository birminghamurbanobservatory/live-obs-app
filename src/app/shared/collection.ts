import {CollectionMeta} from './collection-meta';

export interface Collection {
  '@context': any;
  member: any[];
  meta: CollectionMeta;
}