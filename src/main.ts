import 'source-map-support/register';
import Stoa from './Stoa';
import express from "express";

const port: number = Number(process.env.PORT) || 3836;
const stoa: express.Application = new Stoa().stoa;

stoa.listen(port, () => console.log(`Express server listening at ${port}`))
.on('error', err => console.error(err));
