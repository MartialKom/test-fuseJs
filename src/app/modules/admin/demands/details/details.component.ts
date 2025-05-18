import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DatePipe, NgClass } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    Renderer2,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormsModule,
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormGroup,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatDrawerToggleResult } from '@angular/material/sidenav';
import {
    ActivatedRoute,
    NavigationEnd,
    Router,
    RouterLink,
} from '@angular/router';
import { FuseFindByKeyPipe } from '@fuse/pipes/find-by-key/find-by-key.pipe';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { TasksListComponent } from '../list/list.component';
import { TasksService } from '../demands.service'; 
import { assign } from 'lodash-es';
import { DateTime } from 'luxon';
import { Subject, debounceTime, filter, takeUntil, tap } from 'rxjs';
import { Demand } from '../demands.types';

@Component({
    selector: 'tasks-details',
    templateUrl: './details.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    TextFieldModule,
    MatRippleModule,
    MatCheckboxModule,
    MatDatepickerModule
],
})
export class TasksDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('tagsPanelOrigin') private _tagsPanelOrigin: ElementRef;
    @ViewChild('tagsPanel') private _tagsPanel: TemplateRef<any>;
    @ViewChild('titleField') private _titleField: ElementRef;
    tagsEditMode: boolean = false;
    task: Demand;
    taskForm: UntypedFormGroup;
    tasks: Demand[];
    private _tagsPanelOverlayRef: OverlayRef;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _changeDetectorRef: ChangeDetectorRef,
        private _formBuilder: UntypedFormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _renderer2: Renderer2,
        private _router: Router,
        private _tasksListComponent: TasksListComponent,
        private _tasksService: TasksService,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Open the drawer
        this._tasksListComponent.matDrawer.open();

        // Create the task form
        this.taskForm = this._formBuilder.group({
            id: [''],
            content: [''],
            completed: [false],
        });


        // Get the tasks
        this._tasksService.tasks$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((tasks: Demand[]) => {
                this.tasks = tasks;

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get the task
        this._tasksService.task$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((task: Demand) => {
                // Open the drawer in case it is closed
                this._tasksListComponent.matDrawer.open();

                // Get the task
                this.task = task;

                // Patch values to the form from the task
                this.taskForm.patchValue(task, { emitEvent: false });

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Update task when there is a value change on the task form
        this.taskForm.valueChanges
            .pipe(
                tap((value) => {
                    // Update the task object
                    this.task = assign(this.task, value);
                    this.task.last_changed = DateTime.now().toString();
                }),
                debounceTime(300),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value) => {
                // Update the task on the server
                this._tasksService.updateTask(value.id, value).subscribe();

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Listen for NavigationEnd event to focus on the title field
        this._router.events
            .pipe(
                takeUntil(this._unsubscribeAll),
                filter((event) => event instanceof NavigationEnd)
            )
            .subscribe(() => {
                // Focus on the title field
                this._titleField.nativeElement.focus();
            });
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void {
        // Listen for matDrawer opened change
        this._tasksListComponent.matDrawer.openedChange
            .pipe(
                takeUntil(this._unsubscribeAll),
                filter((opened) => opened)
            )
            .subscribe(() => {
                // Focus on the title element
                this._titleField.nativeElement.focus();
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();

        // Dispose the overlay
        if (this._tagsPanelOverlayRef) {
            this._tagsPanelOverlayRef.dispose();
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Close the drawer
     */
    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._tasksListComponent.matDrawer.close();
    }

    /**
     * Toggle the completed status
     */
    toggleCompleted(): void {
        // Get the form control for 'completed'
        const completedFormControl = this.taskForm.get('completed');

        // Toggle the completed status
        completedFormControl.setValue(!completedFormControl.value);
    }

    /**
     * Open tags panel
     */
    openTagsPanel(): void {
        // Create the overlay
        this._tagsPanelOverlayRef = this._overlay.create({
            backdropClass: '',
            hasBackdrop: true,
            scrollStrategy: this._overlay.scrollStrategies.block(),
            positionStrategy: this._overlay
                .position()
                .flexibleConnectedTo(this._tagsPanelOrigin.nativeElement)
                .withFlexibleDimensions(true)
                .withViewportMargin(64)
                .withLockedPosition(true)
                .withPositions([
                    {
                        originX: 'start',
                        originY: 'bottom',
                        overlayX: 'start',
                        overlayY: 'top',
                    },
                ]),
        });

        // Subscribe to the attachments observable
        this._tagsPanelOverlayRef.attachments().subscribe(() => {
            // Focus to the search input once the overlay has been attached
            this._tagsPanelOverlayRef.overlayElement
                .querySelector('input')
                .focus();
        });

        // Create a portal from the template
        const templatePortal = new TemplatePortal(
            this._tagsPanel,
            this._viewContainerRef
        );

        // Attach the portal to the overlay
        this._tagsPanelOverlayRef.attach(templatePortal);

        // Subscribe to the backdrop click
        this._tagsPanelOverlayRef.backdropClick().subscribe(() => {
            // If overlay exists and attached...
            if (
                this._tagsPanelOverlayRef &&
                this._tagsPanelOverlayRef.hasAttached()
            ) {
                // Detach it
                this._tagsPanelOverlayRef.detach();

            

                // Toggle the edit mode off
                this.tagsEditMode = false;
            }

            // If template portal exists and attached...
            if (templatePortal && templatePortal.isAttached) {
                // Detach it
                templatePortal.detach();
            }
        });
    }



    /**
     * Set the task priority
     *
     * @param priority
     */
    setTaskPriority(priority): void {
        // Set the value
        this.taskForm.get('priority').setValue(priority);
    }


    /**
     * Delete the task
     */
    deleteTask(): void {
        // Open the confirmation dialog
        const confirmation = this._fuseConfirmationService.open({
            title: 'Delete demand',
            message:
                'Are you sure you want to delete this demand? This action cannot be undone!',
            actions: {
                confirm: {
                    label: 'Delete',
                },
            },
        });

        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
            // If the confirm button pressed...
            if (result === 'confirmed') {
                // Get the current task's id
                const id = this.task.id;

                // Get the next/previous task's id
                const currentTaskIndex = this.tasks.findIndex(
                    (item) => item.id === id
                );
                const nextTaskIndex =
                    currentTaskIndex +
                    (currentTaskIndex === this.tasks.length - 1 ? -1 : 1);
                const nextTaskId =
                    this.tasks.length === 1 && this.tasks[0].id === id
                        ? null
                        : this.tasks[nextTaskIndex].id;

                // Delete the task
                this._tasksService.deleteTask(id).subscribe((isDeleted) => {
                    // Return if the task wasn't deleted...
                    if (!isDeleted) {
                        return;
                    }

                    // Navigate to the next task if available
                    if (nextTaskId) {
                        this._router.navigate(['../', nextTaskId], {
                            relativeTo: this._activatedRoute,
                        });
                    }
                    // Otherwise, navigate to the parent
                    else {
                        this._router.navigate(['../'], {
                            relativeTo: this._activatedRoute,
                        });
                    }
                });

                // Mark for check
                this._changeDetectorRef.markForCheck();
            }
        });
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
