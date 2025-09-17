class NS {
  ns: string;
  dotIndex: number;
  database: string;
  collection: string;
  system: boolean;
  isSystem(): boolean;
  oplog: boolean;
  isOplog(): boolean;
  command: boolean;
  isCommand(): boolean;
  special: boolean;
  isSpecial(): boolean;
  specialish: boolean;
  normal: boolean;
  isNormal(): boolean;
  validDatabaseName: boolean;
  validCollectionName: boolean;
  databaseHash: number;
  toString(): string;
  static sort(namespaces: (string | NS)[]): typeof namespaces;
  static MAX_DATABASE_NAME_LENGTH: number;
  // Assigned in the constructor, but will always be undefined
  // isConf: undefined;
}

declare const toNS: ((namespace: string | NS) => NS) & {
  sort: typeof NS['sort'];
};

export default toNS;
