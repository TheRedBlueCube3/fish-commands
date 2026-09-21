/*
This is a script to check the existence of all keys and to make sure all keys map 1-1 in the  source locale to other locales.
*/
import fs from "fs";
import path from "path";
console.log("\x1b[1mCheckBundles\x1b[0m");
// source bundle directory
const bundleDirectory = "build/bundles";
const bundles = fs.readdirSync("build/bundles");
// const availableLocales = bundles.map(bundleFile => filenameToLocale(bundleFile));
function filenameToLocale(name) {
    const match = name.match(/bundle_?([a-z-]{2,4})?\.properties/);
    if (match?.[1])
        return match[1];
    else
        return "en";
}
function parseBundleFile(fileContents) {
    const lines = fileContents.split("\n");
    // parse line with regex
    const parsedLines = lines.map(line => line.match(/([a-z0-9A-Z.\-_]+) ?= ?(.+)/)).filter(l => l != null);
    return parsedLines.map(line => [line[1], line[2]]);
}
const bundleEntries = Object.fromEntries(bundles.map(file => [filenameToLocale(file), parseBundleFile(fs.readFileSync(path.join(bundleDirectory, file), { encoding: "utf8" }))]));
const bundleContents = Object.fromEntries(bundles.map(file => [filenameToLocale(file), Object.fromEntries(parseBundleFile(fs.readFileSync(path.join(bundleDirectory, file), { encoding: "utf8" })))]));
// start diagnostic works
const sourceBundle = bundleContents["en"];
console.log("\x1b[3mChecking locale key matching...\n\x1b[0m");
console.log(`\x1b[32mLocale \x1b[1;34men\x1b[22m \x1b[3;32m(source locale)\x1b[0m
	\x1b[1;34m${Object.keys(sourceBundle).length}\x1b[0;32m keys`);
let hasIssue = false;
// check if every source key exists in every other locale
for (const locale in bundleContents) {
    const bundle = bundleContents[locale];
    const bundleEntry = bundleEntries[locale];
    if (locale == "en")
        continue;
    // check how many keys in this locale are equal to the source so we can get a percentage (if the lengths are equal, of course)
    const lengthsEqual = Object.keys(bundle).length == Object.keys(sourceBundle).length;
    let percentage = 0;
    let translated = [];
    if (lengthsEqual) {
        translated = Object.entries(bundle).filter(value => value[1] != sourceBundle[value[0]]);
        percentage = (translated.length / Object.keys(bundle).length * 100);
    }
    console.log(`\x1b[32mLocale \x1b[1;34m${locale}\x1b[0m
	\x1b[1;${Object.keys(bundle).length == Object.keys(sourceBundle).length ? "34" : "31"}m${Object.keys(bundle).length}\x1b[0;32m keys${lengthsEqual ? `, \x1b[1;34m${percentage.toFixed(2)}% (${translated.length})\x1b[0;32m translated, \x1b[1;34m${(100 - percentage).toFixed(2)}% (${Object.keys(bundle).length - translated.length})\x1b[0;32m untranslated` : ''}`);
    if (!lengthsEqual)
        console.log(`\x1b[1;31m!!! KEYS IN LOCALE ${locale} DON'T MATCH !!!\x1b[0m`);
    for (const key in sourceBundle) {
        if (Object.keys(bundle).includes(key))
            continue;
        hasIssue = true;
        console.log(`\x1b[31mKey \x1b[0;3m${key}\x1b[23;31m is missing from locale \x1b[1;34m${locale}\x1b[22;31m!\x1b[0m`);
    }
    for (const key in bundle) {
        if (Object.keys(sourceBundle).includes(key))
            continue;
        hasIssue = true;
        console.log(`\x1b[31mKey \x1b[0;3m${key}\x1b[23;31m is missing from \x1b[1;34msource locale\x1b[22;31m, but exists in locale \x1b[1;34m${locale}\x1b[22;31m!\x1b[0m`);
    }
    console.log("\x1b[0m\x1b[3mChecking duplicate keys in locale...\x1b[0m");
    const uniques = [];
    for (const kv of bundleEntry) {
        const key = kv[0];
        if (!uniques.includes(key)) {
            uniques.push(key);
        }
        else {
            hasIssue = true;
            console.log(`\x1b[31mDuplicate key \x1b[0;3m${key}\x1b[23;31m in locale \x1b[1;34m${locale}\x1b[22;31m!\x1b[0m`);
        }
    }
}
console.log("\x1b[0m\x1b[3mChecking duplicate keys in source locale...\x1b[0m");
const uniques = [];
for (const kv of bundleEntries["en"]) {
    const key = kv[0];
    if (!uniques.includes(key)) {
        uniques.push(key);
    }
    else {
        hasIssue = true;
        console.log(`\x1b[31mDuplicate key \x1b[0;3m${key}\x1b[23;31m in \x1b[1;34msource locale\x1b[22;31m!\x1b[0m`);
    }
}
if (!hasIssue) {
    console.log("\x1b[1;32mAll good!\x1b[0m");
}
