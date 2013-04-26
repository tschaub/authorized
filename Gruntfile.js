var cp = require('child_process');


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
        src: 'test/**/*.js'
      }
    },
    watch: {
      gruntfile: {
        files: 'Gruntfile.js',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: libSrc,
        tasks: ['jshint:lib', 'mocha']
      },
      test: {
        files: testSrc,
        tasks: ['jshint:test', 'mocha']
      }
    },
    env: {
      test: {
        NODE_PATH: 'lib'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('mocha', 'Run tests with Mocha', function() {
    var done = this.async();
    var cmd = 'NODE_PATH=lib node_modules/.bin/mocha test ' +
        '--reporter spec --recursive';
    cp.exec(cmd, function(err, stdout) {
      grunt.log.write(stdout);
      done(err);
    });
  });

  grunt.registerTask('test', ['jshint', 'mocha']);

  grunt.registerTask('default', ['test']);

};
