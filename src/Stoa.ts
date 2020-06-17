import express from "express";

class Stoa {
    public stoa: express.Application;

    constructor () {
        this.stoa = express();

        this.stoa.get("/validators",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.send(req.query.height);
        });

        this.stoa.get("/validator/:address",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.send(req.params.address + ':' + req.query.height);
        });
    }
}
export default Stoa;
