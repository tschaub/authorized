

/**
 * @param {Object} grunt Grunt.
 */
module.exports = function(grunt) {

  var _ = grunt.util._;

  var libSrc = 'lib/**/*.js';
  var testSrc = 'test/**/*.js';

  var lintOptions = {
    curly: true,
    eqeqeq: true,
    indent: 2,
    latedef: true,
    newcap: true,
    nonew: true,
    quotmark: 'single',
    undef: true,
    trailing: true,
    maxlen: 80,
    globals: {
      exports: true,
      module: false,
      process: false,
      require: false
    }
  };

  var testLintOptions = _.clone(lintOptions, true);
  _.merge(testLintOptions.globals, {
    it: false,
    describe: false,
    beforeEach: false
  });

  grunt.initConfig({
    jshint: {
      gruntfile: {
        options: lintOptions,
        src: 'Gruntfile.js'
      },
      lib: {
        options: lintOptions,
        src: [libSrc]
      },
      test: {
        options: testLintOptions,
        src: [testSrc]
      }
    },
    cafemocha: {
      options: {
        reporter: 'spec'
      },
      all: {
        src: testSrc
      }
    },
    watch: {
      gruntfile: {
        files: 'Gruntfile.js',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: libSrc,
        tasks: ['jshint:lib', 'cafemocha']
      },
      test: {
        files: testSrc,
        tasks: ['jshint:test', 'cafemocha']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-cafe-mocha');

  grunt.registerTask('test', ['jshint', 'cafemocha']);

  grunt.registerTask('default', ['test']);

};
