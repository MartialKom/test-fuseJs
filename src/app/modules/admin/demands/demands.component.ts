import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'tasks',
  templateUrl: './demands.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
})
export class TasksComponent {
  /**
   * Constructor
   */
  constructor() {}
}
