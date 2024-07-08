var regexes = [
  [
    /(BinData\()((0|[1-9][0-9]{0,2}))(\s*,\s*['"]?)[A-Za-z0-9+/=\s]+(['"]?\))/gm,
    '$1$2$4<base64>$5',
  ],

  // Certificates and keys
  [/-----BEGIN CERTIFICATE-----.*-----END CERTIFICATE-----/gm, '<certificate>'],
  [
    /-----BEGIN RSA PRIVATE KEY-----.*-----END RSA PRIVATE KEY-----/gm,
    '<private key>',
  ],

  // Electron app resources specific directories
  [/(file:\/\/)?\S+\/Contents\/Resources\/app\//gm, '$1/<path>/'],
  [/(file:\/\/)?([a-zA-Z]:)?\\\S+\\resources\\app\\/gm, '$1\\<path>\\'],
  [/(file:\/\/)?([a-zA-Z]:)?\/\S+\/resources\/app\//gm, '$1/<path>/'],

  // Generic user directories
  [/\/(Users?)\/[^/]*\//gm, '/$1/<user>/'],
  [
    /\/(usr|home|user|users|u01|var\/users|export\/home)\/[^/]*\//gm,
    '/$1/<user>/',
  ],
  [/\\(Users|Documents and Settings|Profiles)\\[^/\\]*\\/gm, '\\$1\\<user>\\'],

  // Email addresses
  [
    /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/gim,
    '<email>',
  ],

  // IP addresses
  [
    /((1?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\.){3}(1?[0-9][0-9]?|2[0-4][0-9]|25[0-5])/gm,
    '<ip address>',
  ],

  // URLs
  [
    /(http(s)?:\/\/)(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}(\.[a-z]{2,6})?\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/gim,
    '<url>',
  ],

  // MongoDB connection strings
  [
    /(mongodb:\/\/)(www\.)?[-a-zA-Z0-9@:%._\+~#=,]{2,256}(\.[a-z]{2,6})?\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/gim,
    '<mongodb uri>',
  ],

  // Compass Schema URL fragments
  [/#schema\/\w+\.\w+/, '#schema/<namespace>'],
];

module.exports = regexes;
