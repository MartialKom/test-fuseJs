import { Injectable } from '@angular/core';
import { FuseMockApiService } from '@fuse/lib/mock-api/mock-api.service';
import { FuseMockApiUtils } from '@fuse/lib/mock-api/mock-api.utils';
import {
    tags as tagsData,
    tasks as tasksData,
} from 'app/mock-api/apps/demands/data';
import { assign, cloneDeep } from 'lodash-es';

@Injectable({ providedIn: 'root' })
export class TasksMockApi {
    private _tasks: any[] = tasksData;

    /**
     * Constructor
     */
    constructor(private _fuseMockApiService: FuseMockApiService) {
        // Register Mock API handlers
        this.registerHandlers();
        let localDemands : any[] = JSON.parse(localStorage.getItem('demands'));

        if(localDemands){
            this._tasks = localDemands;
        } else {
            localStorage.setItem('demands', JSON.stringify(this._tasks));
        }
        
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Register Mock API handlers
     */
    registerHandlers(): void {

        // -----------------------------------------------------------------------------------------------------
        // @ Tasks - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService.onGet('api/apps/demands/all').reply(() => {
            // Clone the tasks
            const tasks = cloneDeep(this._tasks);

            // Sort the tasks by order
            tasks.sort((a, b) => a.order - b.order);

            return [200, tasks];
        });


        // -----------------------------------------------------------------------------------------------------
        // @ Task - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onGet('api/apps/demands/demand')
            .reply(({ request }) => {
                // Get the id from the params
                const id = request.params.get('id');

                // Clone the tasks
                const tasks = cloneDeep(this._tasks);

                // Find the task
                const task = tasks.find((item) => item.id === id);

                return [200, task];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Task - POST
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPost('api/apps/demands/demand')
            .reply(({ request }) => {
                // Generate a new task
                const newTask = {
                    id: FuseMockApiUtils.guid(),
                    user_id: request.body.userId,
                    content: '',
                    last_changed: null,
                    completed: false,
                };

                // Unshift the new task
                this._tasks.unshift(newTask);

                this.setLocalDemands();

                return [200, newTask];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Task - PATCH
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPatch('api/apps/demands/demand')
            .reply(({ request }) => {
                // Get the id and task
                const id = request.body.id;
                const task = cloneDeep(request.body.task);

                // Prepare the updated task
                let updatedTask = null;

                // Find the task and update it
                this._tasks.forEach((item, index, tasks) => {
                    if (item.id === id) {
                        // Update the task
                        tasks[index] = assign({}, tasks[index], task);

                        // Store the updated task
                        updatedTask = tasks[index];
                    }
                });

                this.setLocalDemands();
                return [200, updatedTask];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Task - DELETE
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onDelete('api/apps/demands/demand')
            .reply(({ request }) => {
                // Get the id
                const id = request.params.get('id');

                // Find the task and delete it
                const index = this._tasks.findIndex((item) => item.id === id);
                this._tasks.splice(index, 1);

                this.setLocalDemands();
                return [200, true];
            });

    }

    setLocalDemands(){
        localStorage.setItem("demands", JSON.stringify(this._tasks));
    }
}
