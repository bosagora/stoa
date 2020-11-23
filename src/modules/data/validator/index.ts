/*******************************************************************************

    The class that defines the Validator.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

export { IBitField } from '../types/BitField';
export { IBlock } from '../types/Block';
export { IBlockHeader } from '../types/BlockHeader';
export { IEnrollment } from '../types/Enrollment';
export { IPreImageInfo } from '../types/PreImageInfo';
export { ITransaction } from '../types/Transaction';
export { ITxInput } from '../types/TxInput';
export { ITxOutput } from '../types/TxOutput';
export { IDataPayload } from '../types/DataPayload';

import Ajv from 'ajv';

const ajv = new Ajv();

/**
 * Generic function of validation
 */
export interface ValidateFunction<T> extends Ajv.ValidateFunction {
    _t?: T; // stop linter from complaining about unused T variable
}

/**
 * Class for validating JSON data
 */
export class Validator
{
    /**
     * The map of validation functions created to reuse -
     * an once created validation function.
     */
    private static validators = new Map<string, Ajv.ValidateFunction>();

    /**
     * Create a validation function using the schema.
     * Return it if it has already been created.
     * @param schema_name The JSON schema name
     * @returns The function of validation
     */
    private static buildValidator <T> (schema_name: string): ValidateFunction<T>
    {
        let validator = Validator.validators.get(schema_name);
        if (validator === undefined)
        {
            validator = ajv.compile(require(`../schemas/${schema_name}.json`));
            Validator.validators.set(schema_name, validator);
        }
        return validator as ValidateFunction<T>;
    }

    /**
     * Check the validity of a JSON data.
     * @param validator The Function to validate JSON
     * @param candidate The JSON data
     * @returns `true` if the JSON is valid, otherwise `false`
     */
    private static isValid <T> (validator: ValidateFunction<T>, candidate: any)
        : candidate is T
    {
        return (validator(candidate) === true);
    }

    /**
     * Check the validity of a JSON data.
     * @param schema_name The JSON schema name
     * @param candidate The JSON data
     * @returns `true` if the JSON is valid, otherwise throw an `Error`
     */
    public static isValidOtherwiseThrow <T> (schema_name: string, candidate: any)
        : candidate is T
    {
        const validator = this.buildValidator<T>(schema_name);
        if (this.isValid<T>(validator, candidate) === true)
        {
            return true;
        }
        else if (
            (validator.errors !== undefined) &&
            (validator.errors !== null) &&
            (validator.errors.length > 0))
        {
            if (validator.errors.length == 1)
            {
                throw new Error(`Validation failed: ${schema_name} - ` + validator.errors[0].message);
            }
            else
            {
                let messages = [];
                for (let error of validator.errors)
                    messages.push(error.message);
                throw new Error(`Validation failed: ${schema_name} - ` + messages.join('\n'));
            }
        }
        else
        {
            throw new Error(`Validation failed: ${schema_name}`);
        }
    }

    /**
     * Check the validity of a JSON data.
     * @param schema_name The JSON schema name
     * @param candidate The JSON data
     * @returns `true` if the JSON is valid, otherwise `false`
     */
    public static isValidOtherwiseNoThrow <T> (schema_name: string, candidate: any): candidate is T
    {
        const validator = this.buildValidator<T>(schema_name);
        return this.isValid<T>(validator, candidate);
    }
}
