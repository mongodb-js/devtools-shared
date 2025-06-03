import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/where/#example}
 */
function test0() {
  type players = {
    _id: number;
    name: string;
    username: string;
    first_login: string;
  };

  const aggregation: schema.Pipeline<players> = [
    {
      $match: {
        $where:
          'function() {    return hex_md5(this.name) == "9b53e667f30cd329dca1ec9e6a83e994"}',
      },
    },
    {
      $match: {
        $expr: {
          $function: {
            body: 'function(name) {    return hex_md5(name) == "9b53e667f30cd329dca1ec9e6a83e994";}',
            args: ['$name'],
            lang: 'js',
          },
        },
      },
    },
  ];
}
