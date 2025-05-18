import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPreview,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { DOCUMENT, DatePipe, NgClass, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import {
  FuseNavigationService,
  FuseVerticalNavigationComponent,
} from '@fuse/components/navigation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { TasksService } from '../demands.service'; 

import { Subject, filter, fromEvent, takeUntil } from 'rxjs';
import { Demand } from '../demands.types';

@Component({
  selector: 'tasks-list',
  templateUrl: './list.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
      MatSidenavModule,
      RouterOutlet,
      MatButtonModule,
      MatTooltipModule,
      MatIconModule,
      CdkDropList,
      CdkDrag,
      NgClass,
      CdkDragPreview,
      CdkDragHandle,
      RouterLink,
      DatePipe,
  ],
})
export class TasksListComponent implements OnInit, OnDestroy {


  @ViewChild('matDrawer', { static: true }) matDrawer: MatDrawer;

  drawerMode: 'side' | 'over';
  selectedTask: Demand;
  tasks: Demand[];
  tasksCount: any = {
      completed: 0,
      incomplete: 0,
      total: 0,
  };
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  /**
   * Constructor
   */
  constructor(
      private _activatedRoute: ActivatedRoute,
      private _changeDetectorRef: ChangeDetectorRef,
      @Inject(DOCUMENT) private _document: any,
      private _router: Router,
      private _tasksService: TasksService,
      private _fuseMediaWatcherService: FuseMediaWatcherService,
      private _fuseNavigationService: FuseNavigationService
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
      // Get the tags

      // Get the tasks
      this._tasksService.tasks$
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((tasks: Demand[]) => {
              this.tasks = tasks;

              // Update the counts
              this.tasksCount.total = this.tasks.length;
              this.tasksCount.completed = this.tasks.filter(
                  (task) => task.completed
              ).length;
              this.tasksCount.incomplete =
                  this.tasksCount.total - this.tasksCount.completed;

              // Mark for check
              this._changeDetectorRef.markForCheck();

              // Update the count on the navigation
              setTimeout(() => {
                  // Get the component -> navigation data -> item
                  const mainNavigationComponent =
                      this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(
                          'mainNavigation'
                      );

                  // If the main navigation component exists...
                  if (mainNavigationComponent) {
                      const mainNavigation =
                          mainNavigationComponent.navigation;
                      const menuItem = this._fuseNavigationService.getItem(
                          'apps.tasks',
                          mainNavigation
                      );

                      // Update the subtitle of the item
                      menuItem.subtitle =
                          this.tasksCount.incomplete + ' remaining Demand';

                      // Refresh the navigation
                      mainNavigationComponent.refresh();
                  }
              });
          });

      // Get the task
      this._tasksService.task$
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((task: Demand) => {
              this.selectedTask = task;

              // Mark for check
              this._changeDetectorRef.markForCheck();
          });

      // Subscribe to media query change
      this._fuseMediaWatcherService
          .onMediaQueryChange$('(min-width: 1440px)')
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((state) => {
              // Calculate the drawer mode
              this.drawerMode = state.matches ? 'side' : 'over';

              // Mark for check
              this._changeDetectorRef.markForCheck();
          });

      // Listen for shortcuts
      fromEvent(this._document, 'keydown')
          .pipe(
              takeUntil(this._unsubscribeAll),
              filter<KeyboardEvent>(
                  (event) =>
                      (event.ctrlKey === true || event.metaKey) && // Ctrl or Cmd
                      (event.key === '/' || event.key === '.') // '/' or '.' key
              )
          )
          .subscribe((event: KeyboardEvent) => {
              this.createTask();
          });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
      // Unsubscribe from all subscriptions
      this._unsubscribeAll.next(null);
      this._unsubscribeAll.complete();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * On backdrop clicked
   */
  onBackdropClicked(): void {
      // Go back to the list
      this._router.navigate(['./'], { relativeTo: this._activatedRoute });

      // Mark for check
      this._changeDetectorRef.markForCheck();
  }

  /**
   * Create task
   *
   * @param type
   */
  createTask(): void {
      // Create the task
      this._tasksService.createTask().subscribe((newTask) => {
          // Go to the new task
          this._router.navigate(['./', newTask.id], {
              relativeTo: this._activatedRoute,
          });

          // Mark for check
          this._changeDetectorRef.markForCheck();
      });
  }

  /**
   * Toggle the completed status
   * of the given task
   *
   * @param task
   */
  toggleCompleted(task: Demand): void {
      // Toggle the completed status
      task.completed = !task.completed;

      // Update the task on the server
      this._tasksService.updateTask(task.id, task).subscribe();

      // Mark for check
      this._changeDetectorRef.markForCheck();
  }



  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
      return item.id || index;
  }
}
