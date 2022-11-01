# Parselt

Parselt (a shortened form of parseltongue) is a library for updating and linting translation files in json or yaml. To get started, see [Getting Started](#getting-started).

# Basic Concepts

Parselt current supports two commands: 'scan' and 'format'. Each of these require a config file (see [Getting Started](#getting-started)) that identifies a main file or a main directory that represents the primary language of your application (e.g. `en.json` or `en/settings.json`).

'Scan' will check all non-main files and compare them to the main files. It will verify that all structures are the same (e.g. that a key in `fr.json` that has an object value doesn't correspond to the same key in `en.json` which has an array value). It will then warn for all keys which are the same across translations and provide errors for any dissimilar structures, invalid values (e.g. null), or keys that are found in the main files, but not found in non-main files.

'Format' mainly serves to re-order keys alphabetically. There is also an option to remove extra translations which are found in non-main files, but not in main files. The use case for this last feature is that users will sometimes delete a translation in the main language when it is removed from use in the application, but forget to apply this to all other translations. Over time, these unused keys increase and create clutter in the application.

# When to use

Parselt will work for applications of all sizes, but medium-to-large applications will see the most benefit. Unsurprisingly, as applications gain more keys and more languages, there is more potential for clutter, which is where parselt excels.

# Getting Started

## Set up a config file

Create a `parselt.json` file at the root of your project with the following property:

```json
{
    "instances": []
}
```

```json

Now add your first instance with basic properties to the "instances" array:

{
        "name": string, // e.g. "main". Must be unique per instance
        "rootDirectoryPath": string, //e.g. "./src/i18n",
        "shouldCheckFirstKey": boolean, // default: true. Set to false if the first key in the file is not something that is referenced (e.g. your structure is something like, {"EN": {"SETTINGS_TITLE": "Settings"}}, but you only reference the "SETTINGS" key, instead of the full path, "EN.SETTINGS").
        "shouldPrintResultSummaryOnly": boolean, // default: false
        "fileType": "json" | "yaml",
        "indentation": 2 | 4,
}
```

If your translation files are in a single directory (e.g. with `en.json`, `fr.json`, etc.), then add the following properties to your instance:

```json
{
        "isMultiDirectory": false,
        "mainFileName": string, //e.g. "en.json"
        "filePrefix": string | null, //use if you are loading different types of files by prefix in the directory (e.g. you have an en.json and fr.json, as well as an auth.en.json and an auth.fr.json)
}
```

If your translation files are in multiple directories (e.g. with `en/settings.json`, `fr/settings.json`, etc.), then add the following properties to your instance:

```json
{
        "isMultiDirectory": true,
        "mainDirectoryName": string, //e.g. "en"
}
```

Now you're good to go with your first config file! If you have translation files in multiple places within your application, simply add more instances with a unique name per instance.

## Commands

To scan/format one instance, named "main":

```
npx parselt scan --instance-name main
```

```
npx parselt format --instance-name main
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
