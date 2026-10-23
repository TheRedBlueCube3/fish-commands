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
exports.FLocColor = exports.keyExists = exports.valueExists = exports.bundles = void 0;
exports.i18n = i18n;
exports.sendLocalizedMessage = sendLocalizedMessage;
exports.sendLocalizedToast = sendLocalizedToast;
exports.localizedLabel = localizedLabel;
exports.sendLocMessageCB = sendLocMessageCB;
exports.locf = locf;
exports.i18nf = i18nf;
exports.i18nfloc = i18nfloc;
var globals_1 = require("/globals");
var players_1 = require("/players");
var ranks_1 = require("/ranks");
//#region I18N helpers
var handle = Vars.modDirectory.child("fish-commands/bundles/bundle");
var createLangBundles = function (languages) { return Object.fromEntries(languages.map(function (lang) { return [lang, I18NBundle.createBundle(handle, new Locale(lang == "en" ? "" : lang))]; })); };
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
exports.FLocColor = (function (data) {
    return Object.fromEntries(Object.entries(data).map(function (_a) {
        var _b = __read(_a, 2), k = _b[0], c = _b[1];
        return [k, function (str) {
                return str != null ?
                    "".concat(str).concat(c, "[]")
                    : c;
            }
        ];
    }));
})({
    discord: "[#7289DA]",
    /** Used for tips and welcome messages. */
    tip: "[gold]",
    member: "[pink]",
    achievement: "[lime]",
});
function locf(args, key, locale, flocfunc) {
    var _a, _b;
    var reset = (_b = (_a = i18n(key, locale).match(/^\[.+?\]/)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : "";
    return args.map(function (chunk) {
        if (!flocfunc)
            flocfunc = function (str) { return str; };
        var unprocessed;
        if (chunk instanceof players_1.FishPlayer) {
            unprocessed = "[cyan](".concat(chunk.name, "[cyan])") + reset;
        }
        else if (chunk instanceof ranks_1.Rank) {
            unprocessed = "".concat(chunk.color).concat(i18n("rank.".concat(chunk.name, ".name"), locale), "[]") + reset;
        }
        else if (chunk instanceof ranks_1.RoleFlag) {
            unprocessed = "".concat(chunk.color).concat(i18n("flag.".concat(chunk.name, ".name"), locale), "[]") + reset;
        }
        else if (chunk instanceof Error) {
            unprocessed = "[red]".concat(chunk.toString()) + reset;
        }
        else if (chunk instanceof Player) {
            var fishP = players_1.FishPlayer.get(chunk);
            unprocessed = "[cyan](".concat(fishP.name, "[cyan])") + reset;
        }
        else if (typeof chunk == "string") {
            if (globals_1.uuidPattern.test(chunk)) {
                unprocessed = "[blue]".concat(chunk, "[]");
            }
            else if (globals_1.ipPattern.test(chunk)) {
                unprocessed = "[blue]".concat(chunk, "[]");
            }
            else {
                //TODO reset color?
                unprocessed = chunk;
            }
        }
        else if (typeof chunk == "boolean") {
            unprocessed = "[blue]".concat(chunk.toString(), "[]");
        }
        else if (typeof chunk == "number") {
            unprocessed = "[blue]".concat(chunk.toString(), "[]");
        }
        else if (chunk instanceof Administration.PlayerInfo) {
            unprocessed = chunk.lastName + reset;
        }
        else if (chunk instanceof UnitType) {
            unprocessed = "[cyan]".concat(i18n(chunk.name, locale), "[]");
        }
        else if (chunk instanceof Block) {
            unprocessed = "[cyan]".concat(chunk.localizedName, "[]"); // i'm not localizing all blocks
        }
        else if (chunk instanceof Team) {
            unprocessed = "[white][#".concat(chunk.color.toString(), "]").concat(chunk.emoji).concat(i18n(chunk.name, locale), "[][]");
        }
        else if (chunk instanceof Item) {
            unprocessed = "[cyan]".concat(i18n(chunk.name, locale), "[]");
        }
        else {
            chunk;
            Log.err("Invalid format object!");
            Log.info(chunk);
            unprocessed = chunk; //allow it to get stringified by the engine
        }
        return flocfunc(unprocessed);
    });
}
function i18nf(key, locale) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    return (i18n(key, locale, locf(args, key, locale)));
}
function i18nfloc(key, locale, flocfunc) {
    var args = [];
    for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
    }
    return (i18n(key, locale, locf(args, key, locale)));
}
