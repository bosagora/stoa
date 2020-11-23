/*******************************************************************************

    Includes class to help package libsodium-wrappers-sumo

    This is designed to compensate for the slow loading of packages.
    
    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

/**
 * @ignore
 */
const _sodium_module = require('libsodium-wrappers-sumo');

/**
 * The Class to help package libsodium-wrappers-sumo
 */
export class SodiumHelper
{
    /**
     * @ignore
     */
    private static _sodium: any = null;

    /**
     * Wait until the package is loaded.
     */
    public static init (): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            if (SodiumHelper._sodium !== null)
            {
                resolve();
                return;
            }

            _sodium_module.ready
                .then(() =>
                {
                    SodiumHelper._sodium = _sodium_module;
                    resolve();
                })
                .catch((err: any) =>
                {
                    reject(err);
                });
        });
    }

    /**
     * Returns the object of the package that has already been loaded. 
     * If loading is not completed, throw an error.
     */
    public static get sodium (): any
    {
        if (SodiumHelper._sodium === null)
            throw new Error("The package libsodium did not complete loading.");

        return SodiumHelper._sodium;
    }
}
