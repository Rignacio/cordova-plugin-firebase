#!/usr/bin/env node
'use strict';

/**
 * This hook makes sure projects using [cordova-plugin-firebase](https://github.com/arnesson/cordova-plugin-firebase)
 * will build properly and have the required key files copied to the proper destinations when the app is build on Ionic Cloud using the package command.
 * Credits: https://github.com/arnesson.
 */
var fse = require('fs-extra');
var config = fse.readFileSync('config.xml').toString();
var name = getValue(config, 'name');

var IOS_DIR = 'platforms/ios';
var ANDROID_DIR = 'platforms/android';

var PLATFORM = {
    IOS: {
        dest: [
            IOS_DIR + name + '/Resources/GoogleService-Info.plist',
            IOS_DIR + name + '/Resources/Resources/GoogleService-Info.plist'
        ],
        src: [
            'GoogleService-Info.plist',
            IOS_DIR + '/www/GoogleService-Info.plist',
            'www/GoogleService-Info.plist'
        ]
    },
    ANDROID: {
        dest: [
            ANDROID_DIR + '/google-services.json'
        ],
        src: [
            'google-services.json',
            ANDROID_DIR + '/assets/www/google-services.json',
            'www/google-services.json'
        ],
        stringsXml: ANDROID_DIR + '/res/values/strings.xml'
    }
};

// Copy key files to their platform specific folders
if (directoryExists(IOS_DIR)) {
    copyKey(PLATFORM.IOS);
} else if (directoryExists(ANDROID_DIR)) {
    copyKey(PLATFORM.ANDROID, updateStringsXml)
}

function updateStringsXml(contents) {
    var json = JSON.parse(contents);
    var strings = fse.readFileSync(PLATFORM.ANDROID.stringsXml).toString();

    // strip non-default value
    strings = strings.replace(new RegExp('<string name="google_app_id">([^\@<]+?)</string>', 'i'), '');

    // strip non-default value
    strings = strings.replace(new RegExp('<string name="google_api_key">([^\@<]+?)</string>', 'i'), '');

    // strip empty lines
    strings = strings.replace(new RegExp('(\r\n|\n|\r)[ \t]*(\r\n|\n|\r)', 'gm'), '$1');

    // replace the default value
    strings = strings.replace(new RegExp('<string name="google_app_id">([^<]+?)</string>', 'i'), '<string name="google_app_id">' + json.client[0].client_info.mobilesdk_app_id + '</string>');

    // replace the default value
    strings = strings.replace(new RegExp('<string name="google_api_key">([^<]+?)</string>', 'i'), '<string name="google_api_key">' + json.client[0].api_key[0].current_key + '</string>');

    fse.writeFileSync(PLATFORM.ANDROID.stringsXml, strings);
}

function copyKey(platform, callback) {
    for (var i = 0; i < platform.src.length; i++) {
        var file = platform.src[i];
        if (fileExists(file)) {
            try {
                var contents = fse.readFileSync(file).toString();

                try {
                    platform.dest.forEach(function (destinationPath) {
                        var folder = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
                        fse.ensureDirSync(folder);
                        fse.writeFileSync(destinationPath, contents);
                    });
                } catch (e) {
                    // skip
                }

                callback && callback(contents);
            } catch (err) {
                console.log(err)
            }

            break;
        }
    }
}

function getValue(config, name) {
    var value = config.match(new RegExp('<' + name + '>(.*?)</' + name + '>', 'i'));
    if (value && value[1]) {
        return value[1]
    } else {
        return null
    }
}

function fileExists(path) {
    try {
        return fse.statSync(path).isFile();
    } catch (e) {
        return false;
    }
}

function directoryExists(path) {
    try {
        return fse.statSync(path).isDirectory();
    } catch (e) {
        return false;
    }
}