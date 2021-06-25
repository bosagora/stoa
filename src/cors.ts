/*******************************************************************************

    Define cors policy

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import cors from "cors";

// CORS policy for stoa
export const cors_options: cors.CorsOptions = {
    allowedHeaders: "*",
    credentials: true,
    methods: "GET, POST",
    origin: "*",
    preflightContinue: false,
};
