import express from "express";
import bodyParser from "body-parser";

class Stoa {
    public stoa: express.Application;

    constructor () {
        this.stoa = express();
        // parse application/x-www-form-urlencoded
        this.stoa.use(bodyParser.urlencoded({ extended: false }))
        // parse application/json
        this.stoa.use(bodyParser.json())

        this.stoa.get("/validators",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.send(req.query.height);
        });

        this.stoa.get("/validator/:address",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.send(req.params.address + ':' + req.query.height);
        });

        this.stoa.post("/push",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.log(req.body);
            res.status(200).send();
        });
    }
}
export default Stoa;
