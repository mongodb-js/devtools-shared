import mod from './dist/index.js';

export default mod;
export const connectMongoClient = mod.connectMongoClient;
export const hookLogger = mod.hookLogger;
export const oidcServerRequestHandler = mod.oidcServerRequestHandler;
