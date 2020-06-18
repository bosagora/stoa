import * as sqlite from 'sqlite3';
const sqlite3 = sqlite.verbose();

let db: sqlite.Database;

// TODO Using assert function

function createDb ()
{
    console.log("createDb");
    db = new sqlite3.Database(':memory:', sqlite3. OPEN_CREATE | sqlite3.OPEN_READWRITE | sqlite3.OPEN_SHAREDCACHE, createTable);
    db.configure("busyTimeout", 1000);
}

function createTable ()
{
    console.log("createTable transaction");
    db.run("CREATE TABLE IF NOT EXISTS transactions (info TEXT)", insertRows);
}

function insertRows ()
{
    console.log("insert rows hash i");
    const stmt = db.prepare("INSERT INTO transactions VALUES (?)");

    for (let i = 0; i < 10; i++)
    {
        stmt.run("hash " + i);
    }

    stmt.finalize(readAllRows);
}

function readAllRows ()
{
    console.log("readAllRows transaction");
    db.all("SELECT rowid AS id, info FROM transactions", (err, rows) =>
    {
        rows.forEach(row =>
        {
            console.log(`${row.id}: ${row.info}`);
        });
        readSomeRows();
    });
}

function readSomeRows ()
{
    console.log("readAllRows transaction");
    db.each("SELECT rowid AS id, info FROM transactions WHERE rowid < ? ", 5, (err, row) =>
    {
        console.log(`${row.id}: ${row.info}`);
    }, closeDb);
}

function closeDb ()
{
    console.log("closeDb");
    db.close();
}

function runChainExample ()
{
    createDb();
}

describe('Database', () => {
    it('Ensures that basic functionalities work', () => {
        runChainExample();
    });
  });
