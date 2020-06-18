/*******************************************************************************

    Test for sqlite3 module.
    The following functions are tested.
    Create database, Add Records, Read All Records, Read Some Records, Close

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as sqlite from 'sqlite3';
const sqlite3 = sqlite.verbose();
import * as assert from 'assert';

/**
 * Database object of sqlite
 */
let db: sqlite.Database;

/**
 * Create memory database for test
 */
function createDb ()
{
    db = new sqlite3.Database(':memory:',
        sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE |
        sqlite3.OPEN_SHAREDCACHE, createTable);
    db.configure("busyTimeout", 1000);
}

/**
 * Create table for test
 */
function createTable ()
{
    db.run("CREATE TABLE IF NOT EXISTS transactions (info TEXT)", insertRows);
}

/**
 * Insert sample data for test
 */
function insertRows ()
{
    const stmt = db.prepare("INSERT INTO transactions VALUES (?)");

    for (let i = 0; i < 10; i++)
    {
        stmt.run("hash " + i);
    }

    stmt.finalize(readAllRows);
}

/**
 * Read all data for test
 */
function readAllRows ()
{
    db.all("SELECT rowid AS id, info FROM transactions", (err, rows) =>
    {
        assert.equal(rows.length, 10);
        rows.forEach((row : any, idx : number) =>
        {
            assert.equal(row.id, idx + 1);
            assert.equal(row.info, 'hash ' + idx);
        });
        readSomeRows();
    });
}

/**
 * Read some data for test
 */
function readSomeRows ()
{
    let idx = 0;
    db.each("SELECT rowid AS id, info FROM transactions WHERE rowid < ? ", 5, (err, row) =>
    {
        assert.equal(row.id, idx + 1);
        assert.equal(row.info, 'hash ' + idx);
        idx++;
    }, closeDb);
}

/**
 * Close database
 */
function closeDb ()
{
    db.close();
}

/**
 *  Start test
 */
function runDatabaseSampleTest ()
{
    createDb();
}

describe('Database', () => {
    it('Ensures that basic functionalities work', () => {
        runDatabaseSampleTest();
    });
  });
