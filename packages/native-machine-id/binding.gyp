{
  'targets': [{
    'target_name': 'native_machine_id',
    'sources': [ 'binding.cc' ],
    'include_dirs': ["<!(node -p \"require('node-addon-api').include_dir\")"],
    'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
    'defines': ['NAPI_VERSION=6'],
    'cflags!': [ '-fno-exceptions' ],
    'cflags_cc!': [ '-fno-exceptions' ],
    'xcode_settings': {
      'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
      'CLANG_CXX_LIBRARY': 'libc++',
      'MACOSX_DEPLOYMENT_TARGET': '12.0',
    },
    'msvs_settings': {
      'VCCLCompilerTool': { 'ExceptionHandling': 1 },
    },
    'conditions': [
      ['OS=="mac"', {
        'link_settings': {
          'libraries': [
            '-framework CoreFoundation',
            '-framework IOKit'
          ]
        }
      }]
    ]
  }]
}
