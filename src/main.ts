import 'source-map-support/register';
import Stoa from './Stoa';
import express from "express";
import { logger } from "./modules/common/Logger";

const port: number = Number(process.env.PORT) || 3836;
const stoa: express.Application = new Stoa("database", "127.0.0.1", "2826").stoa;

stoa.listen(port, () => logger.info(`Stoa API server listening at ${port}`))
.on('error', err => logger.error(err));
