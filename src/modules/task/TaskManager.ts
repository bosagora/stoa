/*******************************************************************************

    Define the task manager that uses timer to periodically execute
    a registered task function.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { logger } from '../common/Logger';

/**
 * The class that defines the TaskManager.
 * It uses timer to periodically execute a registered task function.
 */
export class TaskManager
{
    /**
     * The return value when `setInterval` is run.
     * This is necessary to execute `clearInterval`.
     */
    private interval: NodeJS.Timeout | null;

    /**
     * The registered task function
     */
    private readonly task: () => Promise<void>;

    /**
     * The interval of the timer (milliseconds)
     */
    private readonly delay: number;


    private is_terminated: boolean

    /**
     * Constructor
     * @param task The task to register
     * @param delay The interval of the timer (milliseconds)
     */
    constructor (task: () => Promise<void>, delay: number)
    {
        this.interval = null;
        this.task = task;
        this.delay = delay;
        this.is_terminated = false;

        this.start();
    }

    /**
     * Start the timer
     */
    public start ()
    {
        if (this.interval !== null)
            clearInterval(this.interval);

        this.interval = setInterval(() =>
        {
            this.work();
        }, this.delay);
    }

    /**
     * Stop the timer
     */
    public stop ()
    {
        if (this.interval !== null)
        {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Terminate the timer
     */
    public terminate ()
    {
        this.is_terminated = true;
        this.stop();
    }
    /**
     * The function executed by timer
     * It runs internally registered tasks.
     * It stops the timer before running the task,
     * and restarts the timer after the task is terminated.
     */
    public work ()
    {
        (async () => {
            this.stop();

            try
            {
                await this.task();
            }
            catch(err)
            {
                logger.error(err);
            }
            finally
            {
                if (!this.is_terminated)
                    this.start();
            }
        })();
    }
}
