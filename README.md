# Parselt

Parselt (a shortened form of parseltongue) is a library for updating and linting translation files in json or yaml. To get started, see [Getting Started](#getting-started).

# Basic Concepts

## Main Language

Parselt assumes that a project has a single main language that is the source of truth for the translation file structure across all languages. Assuming that this language is always up-to-date, parselt will compare the key structures and file structures (as applicable) in the main language with all other languages and take appropriate action specified by the user (e.g. listing warnings and errors, formatting, removing unused keys, etc.)

## Instances

Parselt supports users configuring one or more "instances" within their project. An instance represents a folder that contains a set of languages for a particular use case and has certain properties (e.g. it divides languages by subdirectories with the name of the language - multidirectories - or by filename with the name of the language - en.json, fr.json, etc.). Most projects will only have one instance, but some larger projects can have several.

# When to use

Parselt will work for applications of all sizes, but medium-to-large applications will see the most benefit. Unsurprisingly, as applications gain more keys and more languages, there is more potential for clutter, which is where parselt excels.

# Getting Started

## Installation

Install the package as below:
```
npm install @lumidion/parselt --save-dev
```

## Auto setup

Simply run the following command and parselt will automatically set up the configuration based on your current project setup, with limited user input. If your setup cannot be detected, it will prompt for user input to fill out the configuration manually. If there are any problems in this process, users can also set up their own configuration manually.

```
npx parselt init
```

## Manual Setup

Create a `parselt.json` file at the root of your project with the following property:

```json5
{
    instances: [],
}
```

Now add your first instance with basic properties to the "instances" array:

```json5
{
        "name": "string", // e.g. "main". Must be unique per instance
        "rootDirectoryPath": "string", //e.g. "./src/i18n",
        "shouldCheckFirstKey": "boolean", // default: true. Set to false if the first key in the file is not something that is referenced (e.g. your structure is something like, {"EN": {"SETTINGS_TITLE": "Settings"}}, but you only reference the "SETTINGS" key, instead of the full path, "EN.SETTINGS").
        "shouldPrintResultSummaryOnly": "boolean", // default: false
        "fileType": "json | yaml",
        "indentation": 2 | 4,
}
```

If your translation files are in a single directory (e.g. with `en.json`, `fr.json`, etc.), then add the following properties to your instance:

```json5
{
    "isMultiDirectory": false,
    "mainFileName": 'string', //e.g. "en.json"
    "filePrefix": 'string | undefined', //e.g. "auth". Use if you are loading different types of files by prefix in a single directory (e.g. you have an en.json and fr.json, as well as an auth.en.json and an auth.fr.json). In this case you would need to configure two instances, one with a file prefix ("auth") and one without. Parselt will then compare the auth.*.json files against one another and the *.json files against one another.
}
```

If your translation files are in multiple directories (e.g. with `en/settings.json`, `fr/settings.json`, etc.), then add the following properties to your instance:

```json5
{
    "isMultiDirectory": true,
    "mainDirectoryName": 'string', //e.g. "en"
}
```

Now you're good to go with your first config file! If you have translation files in multiple places within your application, simply add more instances with a unique name per instance.

# Commands

Parselt currently supports two commands (aside from 'init'): 'scan' and 'format'. Each of these requires a config file to be previously set up (see [Getting Started](#getting-started)).

'Scan' will check all non-main files and compare them to the main files. It will verify that all structures are the same (e.g. that a key in `fr.json` that has an object value doesn't correspond to the same key in `en.json` which has an array value). It will then warn for all keys which are the same across translations and provide errors for any dissimilar structures, invalid values (e.g. null), or keys that are found in the main files, but not found in non-main files.

'Format' mainly serves to re-order keys alphabetically. There is also an option to remove extra translations which are found in non-main files, but not in main files. The use case for this last feature is that users will sometimes delete a translation in the main language when it is removed from use in the application, but forget to apply this to all other translations. Over time, these unused keys increase and create clutter in the application.

To scan/format one instance, named "frontend":

```
npx parselt scan --instance-name frontend
```

```
npx parselt format --instance-name frontend
```

To scan/format all instances:

```
npx parselt scan
```

```
npx parselt format
```

To remove extra translations in non-main files (e.g. "SETTINGS.KEY1.KEY2" is present in `fr.json`, but not in the main file, `en.json`):

```
npx parselt format --remove-extras
```
