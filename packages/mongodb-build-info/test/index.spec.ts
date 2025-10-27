import { expect } from 'chai';

import * as fixtures from './fixtures';
import {
  isAtlas,
  isAtlasStream,
  getDataLake,
  isLocalhost,
  isLocalAtlas,
  isDigitalOcean,
  getBuildEnv,
  isEnterprise,
  getGenuineMongoDB,
  identifyServerName,
} from '../src/index';

describe('mongodb-build-info', function () {
  context('isDataLake', function () {
    it('reports on DataLake', function () {
      const isDL = getDataLake(fixtures.DATALAKE_BUILD_INFO);
      expect(isDL.isDataLake).to.be.true;
      expect(isDL.dlVersion).to.equal('v20200329');
    });

    it('does not report on 3.2', function () {
      const isDL = getDataLake(fixtures.BUILD_INFO_3_2);
      expect(isDL.isDataLake).to.be.false;
      expect(isDL.dlVersion).to.equal(null);
    });

    it('does not report on older versions', function () {
      const isDL = getDataLake(fixtures.BUILD_INFO_OLD);
      expect(isDL.isDataLake).to.be.false;
      expect(isDL.dlVersion).to.equal(null);
    });
  });

  context('isEnterprise', function () {
    it('detects enterprise module for 2.6 and 3.0', function () {
      expect(isEnterprise(fixtures.BUILD_INFO_OLD)).to.be.true;
    });

    it('detects enterprise module for >= 3.2', function () {
      expect(isEnterprise(fixtures.BUILD_INFO_3_2)).to.be.true;
    });

    it('returns false when passed invalid argument', function () {
      expect(isEnterprise('')).to.be.false;
      expect(isEnterprise(123)).to.be.false;
      expect(isEnterprise({})).to.be.false;
      expect(isEnterprise(undefined)).to.be.false;
      expect(isEnterprise(null)).to.be.false;
    });
  });

  context('getBuildEnv', function () {
    it('returns server os and server arch', function () {
      const buildEnv = getBuildEnv(fixtures.BUILD_INFO_3_2);
      expect(buildEnv.serverOs).to.equal('osx');
      expect(buildEnv.serverArch).to.equal('x86_64');
    });

    it('returns null when passed an invalid argument', function () {
      expect(getBuildEnv(null)).to.deep.equal({
        serverOs: null,
        serverArch: null,
      });
      expect(getBuildEnv('')).to.deep.equal({
        serverOs: null,
        serverArch: null,
      });
      expect(getBuildEnv(undefined)).to.deep.equal({
        serverOs: null,
        serverArch: null,
      });
      expect(getBuildEnv({ buildEnvironment: {} })).to.deep.equal({
        serverOs: null,
        serverArch: null,
      });
    });
  });

  context('isAtlas', function () {
    it('reports on atlas', function () {
      expect(
        isAtlas(
          'mongodb+srv://admin:catscatscats@cat-data-sets.cats.mongodb.net/admin',
        ),
      ).to.be.true;
      expect(
        isAtlas(
          'mongodb://admin:catscatscats@cat-data-sets.cats.mongodb.net/admin',
        ),
      ).to.be.true;
      expect(
        isAtlas(
          'mongodb://admin:catscatscats@cat-data-sets.cats1.mongodb.net,cat-data-sets.cats2.mongodb.net/admin',
        ),
      ).to.be.true;
    });

    it('works with host only', function () {
      expect(isAtlas('cat-data-sets.cats.mongodb.net:27017')).to.be.true;
    });

    it('works with hostname', function () {
      expect(isAtlas('cat-data-sets.cats.mongodb.net')).to.be.true;
    });

    it('returns true with atlas dev', function () {
      expect(
        isAtlas(
          'mongodb+srv://admin:catscatscats@cat-data-sets.cats.mongodb-dev.net/admin',
        ),
      ).to.be.true;
      expect(isAtlas('cat-data-sets.cats.mongodb-dev.net')).to.be.true;
    });

    it('returns true with atlas qa', function () {
      expect(
        isAtlas(
          'mongodb+srv://admin:catscatscats@cat-data-sets.cats.mongodb-qa.net/admin',
        ),
      ).to.be.true;
      expect(isAtlas('cat-data-sets.cats.mongodb-qa.net')).to.be.true;
    });

    it('returns true with atlas staging', function () {
      expect(
        isAtlas(
          'mongodb+srv://admin:catscatscats@cat-data-sets.cats.mongodb-stage.net/admin',
        ),
      ).to.be.true;
      expect(isAtlas('cat-data-sets.cats.mongodb-stage.net')).to.be.true;
    });

    it('returns false if not atlas', function () {
      expect(isAtlas('cat-data-sets.cats.mangodb.net')).to.be.false;
      expect(isAtlas('cat-data-sets.catsmongodb.net')).to.be.false;
      expect(isAtlas('cat-data-sets.cats.mongodb.netx')).to.be.false;
      expect(isAtlas('cat-data-sets.cats.mongodb.com')).to.be.false;
      expect(isAtlas('localhost')).to.be.false;
    });

    it('does not throw and returns with invalid argument', function () {
      expect(isAtlas('')).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isAtlas(123)).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isAtlas({})).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isAtlas(undefined)).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isAtlas(null)).to.be.false;
    });
  });

  context('isLocalAtlas', function () {
    it('calls counts function with expected args', function (done) {
      void isLocalAtlas((db, coll, query) => {
        expect(db).to.equal('admin');
        expect(coll).to.equal('atlascli');
        expect(query).to.deep.equal({
          managedClusterType: 'atlasCliLocalDevCluster',
        });
        done();
        throw new Error('Not implemented');
      });
    });
    it('returns false when count resolves to 0', function (done) {
      void isLocalAtlas(() => Promise.resolve(0)).then((res) => {
        expect(res).to.be.false;
        done();
      });
    });
    it('returns false when count throws', function (done) {
      void isLocalAtlas(() => Promise.reject('No such db')).then((res) => {
        expect(res).to.be.false;
        done();
      });
    });
    it('returns true when count resolves to 1', function (done) {
      void isLocalAtlas(() => Promise.resolve(1)).then((res) => {
        expect(res).to.be.true;
        done();
      });
    });
  });

  context('isAtlasStream', function () {
    it('reports on atlas', function () {
      expect(
        isAtlasStream(
          'mongodb://admin:catscatscats@atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb.net/',
        ),
      ).to.be.true;
      expect(
        isAtlasStream(
          'mongodb://admin:catscatscats@atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb.net/',
        ),
      ).to.be.true;
    });

    it('works with host only', function () {
      expect(
        isAtlasStream(
          'atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb.net:27017',
        ),
      ).to.be.true;
    });

    it('works with hostname', function () {
      expect(
        isAtlasStream(
          'atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb.net',
        ),
      ).to.be.true;
    });

    it('returns true with atlas dev', function () {
      expect(
        isAtlasStream(
          'mongodb://admin:catscatscats@atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb-dev.net/',
        ),
      ).to.be.true;
      expect(
        isAtlasStream(
          'atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb-dev.net',
        ),
      ).to.be.true;
    });

    it('returns true with atlas qa', function () {
      expect(
        isAtlasStream(
          'mongodb://admin:catscatscats@atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb-qa.net/',
        ),
      ).to.be.true;
      expect(
        isAtlasStream(
          'atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb-qa.net',
        ),
      ).to.be.true;
    });

    it('returns true with atlas staging', function () {
      expect(
        isAtlasStream(
          'mongodb://admin:catscatscats@atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb-stage.net/',
        ),
      ).to.be.true;
      expect(
        isAtlasStream(
          'atlas-stream-64ba1372b2a9f1545031f34d-gkumd.virginia-usa.a.query.mongodb-stage.net',
        ),
      ).to.be.true;
    });

    it('returns false if not atlas stream', function () {
      expect(isAtlasStream('cat-data-sets.cats.mangodb.net')).to.be.false;
      expect(isAtlasStream('cat-data-sets.catsmongodb.net')).to.be.false;
      expect(isAtlasStream('cat-data-sets.cats.mongodb.netx')).to.be.false;
      expect(isAtlasStream('cat-data-sets.cats.mongodb.com')).to.be.false;
      expect(isAtlasStream('localhost')).to.be.false;
    });

    it('does not throw and returns with invalid argument', function () {
      expect(isAtlasStream('')).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isAtlasStream(123)).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isAtlasStream({})).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isAtlasStream(undefined)).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isAtlasStream(null)).to.be.false;
    });
  });

  context('isLocalhost', function () {
    it('reports on localhost', function () {
      expect(isLocalhost('localhost:27019')).to.be.true;
    });

    it('reports on localhost of type 127.0.0.1', function () {
      expect(isLocalhost('127.0.0.1:27019')).to.be.true;
    });

    // Although 127.0.0.1 is usually used for localhost,
    // anything in the 127.0.0.1 -> 127.255.255.255 can be used.
    it('reports on localhost of type 127.x.x.x', function () {
      expect(isLocalhost('127.0.100.1:27019')).to.be.true;
      expect(isLocalhost('127.250.100.250:27019')).to.be.true;
      expect(isLocalhost('127.10.0.0:27019')).to.be.true;
    });

    // IPv6 loopback addresses.
    it('reports on localhost of type [::1]', function () {
      expect(isLocalhost('[::1]')).to.be.true;
      expect(isLocalhost('mongodb://[::1]/?readPreference=secondary')).to.be
        .true;
      expect(isLocalhost('[0000:0000:0000:0000:0000:0000:0000:0001]')).to.be
        .true;
      expect(isLocalhost('[0:0:0:0:0:0:0:1]')).to.be.true;
      expect(isLocalhost('[0::1]')).to.be.true;
      expect(isLocalhost('[::1]:27019')).to.be.true;
      expect(isLocalhost('[0:0:0:0:0:0:0:1]:27019')).to.be.true;
      expect(isLocalhost('[0::1]:27019')).to.be.true;
    });

    it('reports on localhost of type 0.0.0.0', function () {
      expect(isLocalhost('0.0.0.0:27019')).to.be.true;
    });

    it('works as url', function () {
      expect(isLocalhost('mongodb://127.0.0.1:27019')).to.be.true;
      expect(isLocalhost('mongodb+srv://127.0.0.1')).to.be.true;
      expect(isLocalhost('mongodb://0.0.0.0:27019')).to.be.true;
      expect(isLocalhost('mongodb+srv://0.0.0.0')).to.be.true;
      expect(isLocalhost('mongodb://localhost')).to.be.true;
      expect(isLocalhost('mongodb://localhost:27019')).to.be.true;
    });

    it('works as hostname', function () {
      expect(isLocalhost('127.0.0.1')).to.be.true;
      expect(isLocalhost('0.0.0.0')).to.be.true;
      expect(isLocalhost('localhost')).to.be.true;
    });

    it('does not report if localhost or 127.0.0.1 is not the hostname', function () {
      expect(isLocalhost('127.0.0.500')).to.be.false;
      expect(isLocalhost('128.0.0.2')).to.be.false;
      expect(isLocalhost('0.0.0.1')).to.be.false;
      expect(isLocalhost('remotehost')).to.be.false;
      expect(isLocalhost('mongodb://remotelocalhost')).to.be.false;
      expect(isLocalhost('[test:ipv6::1]')).to.be.false;
      expect(isLocalhost('[1:0:0:0:0:0:0:1]')).to.be.false;
      expect(isLocalhost('[test:ipv6::1]:27019')).to.be.false;
      expect(isLocalhost('[1:0:0:0:0:0:0:1]:27019')).to.be.false;
    });

    it('does not throw and returns with invalid argument', function () {
      expect(isLocalhost('')).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isLocalhost(123)).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isLocalhost({})).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isLocalhost(undefined)).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isLocalhost(null)).to.be.false;
    });
  });

  context('isDigitalOcean', function () {
    it('reports on digital ocean', function () {
      expect(
        isDigitalOcean(
          'mongodb+srv://admin:catscatscats@dave-a1234321.mongo.ondigitalocean.com/test?authSource=admin&replicaSet=dave',
        ),
      ).to.be.true;
    });

    it('works with hostname only', function () {
      expect(isDigitalOcean('dave-a1234321.mongo.ondigitalocean.com')).to.be
        .true;
    });

    it('works with host only', function () {
      expect(isDigitalOcean('dave-a1234321.mongo.ondigitalocean.com:27017')).to
        .be.true;
    });

    it('returns false if not digitalocean', function () {
      expect(isDigitalOcean('dave-a1234321.mongo.ondigitalocean.com2')).to.be
        .false;
      expect(isDigitalOcean('dave-a1234321mongo.ondigitalocean.com')).to.be
        .false;
      expect(isDigitalOcean('dave-a1234321.mongoxondigitalocean.com')).to.be
        .false;
    });

    it('does not throw and returns with invalid argument', function () {
      expect(isDigitalOcean('')).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isDigitalOcean(123)).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isDigitalOcean({})).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isDigitalOcean(undefined)).to.be.false;
      /* @ts-expect-error -- passing invalid arguments */
      expect(isDigitalOcean(null)).to.be.false;
    });
  });

  context('isGenuineMongoDB', function () {
    it('reports on CosmosDB', function () {
      fixtures.COSMOS_DB_URI.forEach((uri) => {
        const isGenuine = getGenuineMongoDB(uri);
        expect(isGenuine.isGenuine).to.be.false;
        expect(isGenuine.serverName).to.equal('cosmosdb');
      });
    });

    it('reports on DocumentDB', function () {
      fixtures.DOCUMENT_DB_URIS.forEach((uri) => {
        const isGenuine = getGenuineMongoDB(uri);
        expect(isGenuine.isGenuine).to.be.false;
        expect(isGenuine.serverName).to.equal('documentdb');
      });
    });

    it('does not report on 3.2', function () {
      const isGenuine = getGenuineMongoDB(
        fixtures.BUILD_INFO_3_2,
        /* @ts-expect-error -- passing invalid arguments */
        fixtures.CMD_LINE_OPTS,
      );
      expect(isGenuine.isGenuine).to.be.true;
      expect(isGenuine.serverName).to.equal('mongodb');
    });

    it('does not report on older versions', function () {
      const isGenuine = getGenuineMongoDB(
        fixtures.BUILD_INFO_OLD,
        /* @ts-expect-error -- passing invalid arguments */
        fixtures.CMD_LINE_OPTS,
      );
      expect(isGenuine.isGenuine).to.be.true;
      expect(isGenuine.serverName).to.equal('mongodb');
    });
  });

  context('identifyServerName', function () {
    function fail() {
      return Promise.reject(new Error('Should not be called'));
    }

    it('reports MongoDB (when Atlas)', async function () {
      for (const connectionString of fixtures.ATLAS_URIS) {
        const result = await identifyServerName({
          connectionString,
          adminCommand: fail,
        });
        expect(result).to.equal('mongodb');
      }
    });

    it('reports CosmosDB', async function () {
      for (const connectionString of fixtures.COSMOS_DB_URI) {
        const result = await identifyServerName({
          connectionString,
          adminCommand: fail,
        });
        expect(result).to.equal('cosmosdb');
      }
    });

    it('reports DocumentDB', async function () {
      for (const connectionString of fixtures.DOCUMENT_DB_URIS) {
        const result = await identifyServerName({
          connectionString,
          adminCommand: fail,
        });
        expect(result).to.equal('documentdb');
      }
    });

    it('reports Firestore', async function () {
      for (const connectionString of fixtures.FIRESTORE_URIS) {
        const result = await identifyServerName({
          connectionString,
          adminCommand: fail,
        });
        expect(result).to.equal('firestore');
      }
    });

    it('reports FerretDB', async function () {
      const result = await identifyServerName({
        connectionString: '',
        adminCommand(req) {
          if ('buildInfo' in req) {
            return Promise.resolve({
              ferretdb: {},
            });
          } else {
            return Promise.resolve({});
          }
        },
      });
      expect(result).to.equal('ferretdb');
    });

    it('reports PG DocumentDB', async function () {
      const result = await identifyServerName({
        connectionString: '',
        adminCommand(req) {
          if ('getParameter' in req) {
            return Promise.reject(
              new Error(
                'function documentdb_api.get_parameter(boolean, boolean, text[]) does not exist',
              ),
            );
          } else {
            return Promise.resolve({});
          }
        },
      });
      expect(result).to.equal('pg_documentdb');
    });
  });
});
