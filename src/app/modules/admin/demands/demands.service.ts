import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import {
    BehaviorSubject,
    Observable,
    Subject,
    filter,
    map,
    of,
    switchMap,
    take,
    takeUntil,
    tap,
    throwError,
} from 'rxjs';
import { Demand } from './demands.types';
import { AuthService } from '@auth0/auth0-angular';

@Injectable({ providedIn: 'root' })
export class TasksService {
    // Private
    
    private _task: BehaviorSubject<Demand | null> = new BehaviorSubject(null);
    private _tasks: BehaviorSubject<Demand[] | null> = new BehaviorSubject(null);
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient,private _authO: AuthService) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------


    /**
     * Getter for task
     */
    get task$(): Observable<Demand> {
        return this._task.asObservable();
    }

    /**
     * Getter for tasks
     */
    get tasks$(): Observable<Demand[]> {
        return this._tasks.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------




    /**
     * Get tasks
     */
    getTasks(): Observable<Demand[]> {
        return this._httpClient.get<Demand[]>('api/apps/demands/all').pipe(
            tap((response) => {
                this._tasks.next(response);
            })
        );
    }

  
    /**
     * Get task by id
     */
    getTaskById(id: string): Observable<Demand> {
        return this._tasks.pipe(
            take(1),
            map((tasks) => {
                // Find the task
                const task = tasks.find((item) => item.id === id) || null;

                // Update the task
                this._task.next(task);

                // Return the task
                return task;
            }),
            switchMap((task) => {
                if (!task) {
                    return throwError(
                        'Could not found task with id of ' + id + '!'
                    );
                }

                return of(task);
            })
        );
    }

    /**
     * Create task
     *
     * @param type
     */
    createTask(): Observable<Demand> {
        return this._authO.user$.pipe(
            take(1), // Prendre un seul utilisateur
            switchMap((data) => {
                const userId = data.name + "-" + uuidv4(); // Concaténer userId
                console.log(data);
                return this.tasks$.pipe(
                    take(1),
                    switchMap((tasks) =>
                        this._httpClient
                            .post<Demand>('api/apps/demands/demand', { userId })
                            .pipe(
                                map((newTask) => {
                                    this._tasks.next([newTask, ...tasks]);
                                    return newTask;
                                })
                            )
                    )
                );
            })
        );
    }

    /**
     * Update task
     *
     * @param id
     * @param task
     */
    updateTask(id: string, task: Demand): Observable<Demand> {
        return this.tasks$.pipe(
            take(1),
            switchMap((tasks) =>
                this._httpClient
                    .patch<Demand>('api/apps/demands/demand', {
                        id,
                        task,
                    })
                    .pipe(
                        map((updatedTask) => {
                            // Find the index of the updated task
                            const index = tasks.findIndex(
                                (item) => item.id === id
                            );

                            // Update the task
                            tasks[index] = updatedTask;

                            // Update the tasks
                            this._tasks.next(tasks);

                            // Return the updated task
                            return updatedTask;
                        }),
                        switchMap((updatedTask) =>
                            this.task$.pipe(
                                take(1),
                                filter((item) => item && item.id === id),
                                tap(() => {
                                    // Update the task if it's selected
                                    this._task.next(updatedTask);

                                    // Return the updated task
                                    return updatedTask;
                                })
                            )
                        )
                    )
            )
        );
    }

    /**
     * Delete the task
     *
     * @param id
     */
    deleteTask(id: string): Observable<boolean> {
        return this.tasks$.pipe(
            take(1),
            switchMap((tasks) =>
                this._httpClient
                    .delete('api/apps/demands/demand', { params: { id } })
                    .pipe(
                        map((isDeleted: boolean) => {
                            // Find the index of the deleted task
                            const index = tasks.findIndex(
                                (item) => item.id === id
                            );

                            // Delete the task
                            tasks.splice(index, 1);

                            // Update the tasks
                            this._tasks.next(tasks);

                            // Return the deleted status
                            return isDeleted;
                        })
                    )
            )
        );
    }
}
