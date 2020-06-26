
/**
 * This checks that the JSON data has all the properties of the class.
 * @param obj The instance of a class
 * @param json The object of the JSON
 */
export function validateJSON (obj: Object, json: any)
{
    Object.getOwnPropertyNames(obj)
        .forEach(property => {
            if (!json.hasOwnProperty(property))
            {
                throw new Error('Parse error: ' + obj.constructor.name + '.' + property);
            }
        });
}
