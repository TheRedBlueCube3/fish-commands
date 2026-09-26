"use strict";
/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains helper functions for i18n (internationalization) support.
*/
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyExists = exports.valueExists = exports.bundles = void 0;
exports.i18n = i18n;
exports.sendLocalizedMessage = sendLocalizedMessage;
exports.sendLocalizedToast = sendLocalizedToast;
exports.localizedLabel = localizedLabel;
exports.sendLocMessageCB = sendLocMessageCB;
//#region I18N helpers
var handle = Vars.modDirectory.child("fish-commands/bundles/bundle");
var createLangBundles = function (languages) { return Object.fromEntries(languages.map(function (lang) { return [lang, I18NBundle.createBundle(handle, new Locale(lang))]; })); };
/** The list of languages with translations in the bundle.properties files. */
exports.bundles = createLangBundles(["en", "ru"]);
/** Checks if the value returned by `.format` or `i18n` exists. */
var valueExists = function (val) { return (!val.startsWith("???") && !val.endsWith("???")); };
exports.valueExists = valueExists;
/** Checks if a key exists in the source locale. */
var keyExists = function (key) { return ((0, exports.valueExists)(exports.bundles["en"].format(key))); };
exports.keyExists = keyExists;
/** Localizes a string by returning the value associated with the key in the requested locale. If it doesn't exist, the English fallback value is returned. Accepts format parameters to replace the {x} strings from the value. */
function i18n(key, locale) {
    var _a, _b;
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    // try passed locale first
    var bundle = exports.bundles[locale];
    if (!bundle && locale.includes("_")) // if the child locale doesn't exist
     {
        // try the parent locale
        bundle = exports.bundles[locale.slice(0, 2)];
    }
    var value = bundle ? bundle.format.apply(bundle, __spreadArray([key], __read(args), false)) : "???".concat(key, "???");
    var enCheckValue = (_a = exports.bundles["en"]).format.apply(_a, __spreadArray([key], __read(args), false));
    if (!(0, exports.valueExists)(enCheckValue) && (0, exports.valueExists)(value))
        Log.warn("I18n key ".concat(key, " doesn't exist in source locale, but exists in locale ").concat(locale));
    if ((0, exports.valueExists)(value))
        return value;
    // if passed locale fails, try English locale
    if (locale !== "en") {
        var enValue = (_b = exports.bundles["en"]).format.apply(_b, __spreadArray([key], __read(args), false));
        if (!(0, exports.valueExists)(enValue)) {
            Log.err("Failed to get I18n key ".concat(key, " for fallback English locale!"));
            return "???".concat(key, "???");
        }
        if (exports.bundles[locale])
            Log.warn("I18n key ".concat(key, " exists in source locale, but not in locale ").concat(locale));
        return enValue;
    }
    else {
        Log.err("Failed to get I18n key ".concat(key, " for source locale!"));
        return "???".concat(key, "???");
    }
}
//#endregion
//#region Replacements
/** Replacement for `Call.sendMessage`. Takes keys and a format if required. */
function sendLocalizedMessage(key) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    Groups.player.each(function (player) { return player.sendMessage(i18n.apply(void 0, __spreadArray([key, player.locale], __read(args), false))); });
}
/** Replacement for `Call.infoToast`. Takes keys and a format if required. */
function sendLocalizedToast(key, duration) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    Groups.player.each(function (player) { return Call.infoToast(player.con, i18n.apply(void 0, __spreadArray([key, player.locale], __read(args), false)), duration); });
}
function localizedLabel(key, args, param1, param2, param3, param4, param5) {
    if (arguments.length == 5)
        Groups.player.each(function (p) { return Call["label(mindustry.net.NetConnection,java.lang.String,float,float,float)"](p.con, i18n.apply(void 0, __spreadArray([key, p.locale], __read(args), false)), param1, param2, param3); });
    else if (arguments.length == 6)
        Groups.player.each(function (p) { return Call["label(mindustry.net.NetConnection,java.lang.String,int,float,float,float)"](p.con, key ? i18n.apply(void 0, __spreadArray([key, p.locale], __read(args), false)) : null, param1, param2, param3, param4); });
    else if (arguments.length == 7)
        Groups.player.each(function (p) { return Call["label(mindustry.net.NetConnection,java.lang.String,int,float,float,float, int)"](p.con, key ? i18n.apply(void 0, __spreadArray([key, p.locale], __read(args), false)) : null, param1, param2, param3, param4, param5); });
}
function sendLocMessageCB(key, argsCB) {
    if (argsCB === void 0) { argsCB = function () { return []; }; }
    Groups.player.each(function (player) { return player.sendMessage(i18n.apply(void 0, __spreadArray([key, player.locale], __read(argsCB(player.locale, function (key, arg) { return i18n.apply(void 0, __spreadArray([key, player.locale], __read(arg), false)); })), false))); });
}
//#endregion
