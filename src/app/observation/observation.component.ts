import { Component, OnInit, Input } from '@angular/core';
import {Observation} from './observation';

@Component({
  selector: 'app-observation',
  templateUrl: './observation.component.html',
  styleUrls: ['./observation.component.scss']
})
export class ObservationComponent implements OnInit {

  @Input() observation: Observation;

  constructor() { }

  ngOnInit(): void {
  }




}
