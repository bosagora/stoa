/*******************************************************************************

    This file contains a class that calculate transaction fees and
    process statistics.

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/
import axios from "axios";

export const RequestVotera = async (url: string) => {
    return await axios.get(url)
}