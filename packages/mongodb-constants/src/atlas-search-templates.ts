import dedent from 'dedent';

export type SearchTemplate = {
  name: string;
  snippet: string;
  version: string;
};

export const ATLAS_SEARCH_TEMPLATES: SearchTemplate[] = [
  {
    name: 'Dynamic field mappings',
    snippet: dedent`{
            "mappings": {
              "dynamic": true
            }
        }`,
    version: '4.4.0',
  },
  {
    name: 'Static field mappings',
    snippet: dedent`{
            "mappings": {
              "dynamic": false,
              "fields": {
                \${1:<string field name>}: {
                    "type": "string"
                },
                \${2:<number field name>}: {
                    "type": "number"
                },
                \${3:<date field name>}: {
                    "type": "date"
                },
                \${4:<geo field name>}: {
                    "type": "geo"
                },
              } 
            }
        }`,
    version: '4.4.0',
  },
  {
    name: 'Text field mappings',
    snippet: dedent`{
            "mappings": {
              "dynamic": true,
              "fields": {
                \${1:<string field name>}: [
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
    version: '4.4.0',
  },
  {
    name: 'Facet field mappings',
    snippet: dedent`{
            "mappings": {
              "dynamic": true,
              "fields": {
                \${1:<number field name for faceting>}: [
                  {
                    "type": "numberFacet"
                  },
                  {
                    "type": "number"
                  },
                ],
                \${2:<date field name for faceting>}: [
                  {
                     "type": "dateFacet"
                  }
                  {
                     "type": "date"
                  }
                ],
                \${3:<string field name for faceting>}: [
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
    version: '4.4.0',
  },
  {
    name: 'Vector Embedding field mapping',
    snippet: dedent`{
            "mappings": {
              "dynamic": true,
              "fields": {
                \${1:<vector embedding field name>}: [
                  {
                    "type": "vectorEmbedding"
                  }      
                ]    
              } 
            }
        }`,
    version: '4.4.0',
  },
];
