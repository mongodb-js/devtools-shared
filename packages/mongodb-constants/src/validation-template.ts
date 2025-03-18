export const VALIDATION_TEMPLATE = `/**
 * This is a starter template for a schema validation rule for a collection.
 * More information on schema validation rules can be found at:
 * https://www.mongodb.com/docs/manual/core/schema-validation/
 */
{
  $jsonSchema: {
    title: "Library.books",
    bsonType: "object",
    required: ["fieldname1", "fieldname2"],
    properties: {
      fieldname1: {
        bsonType: "string",
        description: "Fieldname1 must be a string",
      },
      fieldname2: {
        bsonType: "int",
        description: "Fieldname2 must be an integer",
      },
      arrayFieldName: {
        bsonType: "array",
        items: {
          bsonType: "string"
        },
        description: "arrayFieldName must be an array of strings"
      },
    }
  }
}`;
