import 'source-map-support/register';
import { logger } from './modules/common/Logger';
import Stoa from './Stoa';

import express from 'express';
import { URL } from 'url';

const port: number = Number(process.env.PORT) || 3836;
const agora_address: URL = new URL(process.env.AGORA_ENDPOINT || "http://127.0.0.1:2826");
// TODO: Replace hardcoded "127.0.0.1" with  agora_address.hostname (#106)
const stoa: express.Application = new Stoa("database", "127.0.0.1", agora_address.port).stoa;

stoa.listen(port, () => logger.info(`Stoa API server listening at ${port}`))
.on('error', err => logger.error(err));
