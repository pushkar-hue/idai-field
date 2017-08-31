const fs = require('fs');
const path = require('path');
const fileUrl = require('file-url');
const failFast = require('protractor-fail-fast');

const failFastActive = (process.argv.length > 4 && process.argv[4] == '--params=ff');

exports.config = {

    seleniumAddress: 'http://localhost:9515/wd/hub',
    baseUrl: fileUrl(path.resolve(__dirname, '../../..') + '/index.html'),

    suites: {
        default: [
            '../settings/*.spec.js',
            '../syncing/*.spec.js',
            '../images/*.spec.js',
            '../list/*.spec.js',
            '../resources/*.spec.js',
            '../resources/map/*.spec.js',
            '../widgets/*.spec.js',
            '../import/*.spec.js'
        ],
        flaky: [
            '../flaky/*.spec.js'
        ]
    },

    allScriptsTimeout: 110000,
    getPageTimeout: 100000,
    framework: 'jasmine2',
    jasmineNodeOpts: {
        isVerbose: false,
        showColors: true,
        includeStackTrace: false,
        defaultTimeoutInterval: 400000
    },
    plugins: [{
        package: 'protractor-console-plugin',
        failOnWarning: true,
        failOnError: true,
        logWarnings: true,
        exclude: [
            "http://localhost:3001/" // pouchdb issues ignorable errors when syncing
        ]
    }],
    params: {
        appDataPath: 'test/test-temp',
        configPath: 'config/config.test.json',
        configTemplate: { 'dbs' : ['test'] }
    },
    onPrepare: function() {
        if (failFastActive) jasmine.getEnv().addReporter(failFast.init());

        var ProgressReporter = function() {

            this.specStarted = function(spec) {
                process.stdout.write("SPEC " + spec.fullName + " ")
            };

            this.specDone = function(spec) {
                console.log(spec.status.toUpperCase())
            }
        };
        jasmine.getEnv().addReporter(new ProgressReporter());
    },
    afterLaunch: function() {
        if (failFastActive) failFast.clean();
    },
    /**
     * ng2 related configuration
     *
     * useAllAngular2AppRoots: tells Protractor to wait for any angular2 apps on the page instead of just the one matching
     * `rootEl`
     *
     */
    useAllAngular2AppRoots: true
};

if (failFastActive) exports.config.plugins.push({package: 'protractor-fail-fast'});