import dedent from 'dedent';

export type SearchTemplate = {
	name: string;
	snippit: string;
	version: string;
};

export const ATLAS_SEARCH_TEMPLATES: SearchTemplate[] = [
    {
        name: 'Dynamic field mappings',
        snippit: dedent`{
            "mappings": {
              "dynamic": true
            }
        }`,
        version: '4.4.0'
    },
    {
        name: 'Static field mappings',
        snippit: dedent`{
            "mappings": {
              "dynamic": false,
              "fields": {
                <string field name>: {
                    "type": "string"
                },
                <number field name>: {
                    "type": "number"
                },
                <date field name>: {
                    "type": "date"
                },
                <geo field name>: {
                    "type": "geo"
                },
              } 
            }
        }`,
        version: '4.4.0'
    }, 
    {
        name: 'Text field mappings',
        snippit: dedent`{
            "mappings": {
              "dynamic": true,
              "fields": {
                <string field name>: [
                  {
                    // Enables text queries
                    "type": "string"
                  },
                  {
                    // Enables autocomplete queries
                    "type": "autocomplete"
                    
                  },
                  {
                    // Enables sorting
                    "type": "token"
                  }
                ]  
              } 
            }
          }`,
        version: '4.4.0'
    },
    {
        name: 'Facet field mappings',
        snippit: dedent`{
            "mappings": {
              "dynamic": true,
              "fields": {
                <number field name for faceting>: [
                  {
                    "type": "numberFacet"
                  },
                  {
                    "type": "number"
                  },
                ],
                <date field name for faceting>: [
                  {
                     "type": "dateFacet"
                  }
                  {
                     "type": "date"
                  }
                ],
               <string field name for faceting>: [
                  {
                    "type": "stringFacet"
                  },
                  {
                    "type": "string",
                    "analyzer": "lucene.keyword"
                  },
                ],
              } 
            }
          }`,
        version: '4.4.0'
    },
    {
        name: 'Vector Embedding field mapping',
        snippit: dedent`{
            "mappings": {
              "dynamic": true,
              "fields": {
                <vector embedding field name>: [
                  {
                    "type": "vectorEmbedding"
                  }      
                ]    
              } 
            }
        }`,
        version: '4.4.0'
    },
];