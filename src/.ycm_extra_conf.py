def FlagsForFile( filename, **kwargs ):
  return {
    'flags': [ '-x', 'c', '-Wall', "-I../uthash/include"],
  }
