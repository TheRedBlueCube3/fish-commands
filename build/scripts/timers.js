"use strict";
/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains timers that run code at regular intervals.
*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTimers = initializeTimers;
var automod_1 = require("/automod");
var api_1 = require("/api");
var config = __importStar(require("/config"));
var config_1 = require("/config");
var files_1 = require("/files");
var funcs_1 = require("/funcs");
var globals_1 = require("/globals");
var players_1 = require("/players");
var utils_1 = require("/utils");
var i18n_1 = require("/frameworks/i18n");
/** Must be called once, and only once, on server start. */
function initializeTimers() {
    Timer.schedule(function () {
        var e_1, _a;
        Time.mark();
        //Autosave
        var file = Vars.saveDirectory.child('1' + '.' + Vars.saveExtension);
        Core.app.post(function () {
            Time.mark();
            Time.mark();
            Time.mark();
            SaveIO.save(file);
            Log.debug("SaveIO @", Time.elapsed());
            players_1.FishPlayer.saveAll();
            players_1.FishPlayer.uploadAll();
            Log.debug("Save/upload @", Time.elapsed());
            Groups.player.each(function (p) { return p.sendMessage("[#4fff8f9f]" + (0, i18n_1.i18n)("server.saved", p.locale)); });
            globals_1.FishEvents.fire("saveData", []);
            Log.debug("autosave on main thread @", Time.elapsed());
        });
        try {
            //Unblacklist trusted players
            for (var _b = __values(Object.values(players_1.FishPlayer.cachedPlayers)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var fishP = _c.value;
                if (fishP.ranksAtLeast("trusted")) {
                    (0, utils_1.unblacklist)(fishP.info().lastIP);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        Log.debug("autosave @", Time.elapsed());
    }, 10, funcs_1.DurationSecs.minutes(5));
    //Memory corruption prank
    Timer.schedule(function () {
        if (Math.random() < 0.2 && !config_1.Gamemode.hexed()) {
            //Timer triggers every 17 hours, and the random chance is 20%, so the average interval between pranks is 85 hours
            (0, utils_1.definitelyRealMemoryCorruption)();
        }
    }, funcs_1.DurationSecs.hours(1), funcs_1.DurationSecs.hours(17));
    //Trails
    Timer.schedule(function () {
        return players_1.FishPlayer.forEachPlayer(function (p) { return p.displayTrail(); });
    }, 5, 0.15);
    //Staff chat
    if (!config.Mode.noBackend)
        Timer.schedule(function () {
            (0, api_1.getStaffMessages)(function (messages) {
                if (messages.length)
                    players_1.FishPlayer.messageStaff(messages);
            });
            (0, api_1.fetchAntibotData)().then(function (m) {
                var _a, _b;
                if (((_a = globals_1.fishState.antibotData.nameBlacklist) === null || _a === void 0 ? void 0 : _a[0]) != m.nameBlacklistRegex) {
                    globals_1.fishState.antibotData.nameBlacklist = m.nameBlacklistRegex == null ? null : [m.nameBlacklistRegex, Pattern.compile(m.nameBlacklistRegex)];
                }
                if (((_b = globals_1.fishState.antibotData.nameGraylist) === null || _b === void 0 ? void 0 : _b[0]) != m.nameGraylistRegex) {
                    globals_1.fishState.antibotData.nameGraylist = m.nameGraylistRegex == null ? null : [m.nameGraylistRegex, Pattern.compile(m.nameGraylistRegex)];
                }
            }).catch(function () { });
            var dosBlacklist = Vars.netServer.admins.dosBlacklist;
            var newIPs = [];
            if (globals_1.dosBlacklistCopy.size != dosBlacklist.size) {
                //Find new IPs
                dosBlacklist.each(function (ip) { return globals_1.dosBlacklistCopy.add(ip) && newIPs.push(ip); });
            }
            (0, api_1.syncDosBlacklist)(newIPs).then(function (ips) {
                if (ips.length != dosBlacklist.size) {
                    //this is technically wrong as the returned data could lose x and gain x ips at once
                    //close enough
                    dosBlacklist.clear();
                    globals_1.dosBlacklistCopy.clear();
                    dosBlacklist.addAll(ips);
                    globals_1.dosBlacklistCopy.addAll(ips);
                }
            }).catch(function () { });
        }, 5, 2);
    //Tip
    Timer.schedule(function () {
        var showAd = Math.random() < 0.10; //10% chance every 15 minutes
        var willBeChristmas = Math.random() > 0.5;
        var messagePool = showAd ? config.tips.ads :
            (config.Mode.isChristmas && willBeChristmas) ? config.tips.christmas :
                config.tips.normal;
        var poolCategory = showAd ? "ads" :
            (config.Mode.isChristmas && willBeChristmas) ? "christmas" :
                "normal";
        var neededKey = messagePool[Math.floor(Math.random() * messagePool.length)];
        Groups.player.each(function (p) {
            var messageText;
            if (neededKey == "colortags") {
                messageText = (0, i18n_1.i18n)("tip.".concat(poolCategory, ".").concat(neededKey), p.locale, ["pink", "green", "cyan", "acid", "royal", "coral"][Math.floor(Math.random() * 6)]);
            }
            else if (poolCategory == "ads") {
                messageText = (0, i18n_1.i18n)("tip.".concat(poolCategory, ".").concat(neededKey), p.locale, config.text.membershipURL);
            }
            else {
                messageText = (0, i18n_1.i18n)("tip.".concat(poolCategory, ".").concat(neededKey), p.locale);
            }
            var message = showAd ? "[gold]".concat(messageText, "[]") : (0, i18n_1.i18n)("tip.prefix", p.locale, messageText);
            p.sendMessage(message);
        });
    }, 60, funcs_1.DurationSecs.minutes(15));
    //State check
    Timer.schedule(function () {
        if (Groups.unit.size() > 10000) {
            (0, i18n_1.sendLocalizedMessage)("server.toomanyunits");
            Groups.unit.clear();
            (0, utils_1.neutralGameover)();
        }
    }, 0, 1);
    Timer.schedule(function () {
        players_1.FishPlayer.updateAFKCheck();
    }, 0, 1);
    //deliberately updating state on clock tick:
    //avoids memory leak and other complications from Record<ip, IndexedRatekeeper>
    Timer.schedule(function () {
        globals_1.ipJoins.clear();
        if (globals_1.joinDemographics.size > 1000)
            globals_1.joinDemographics.clear();
    }, 0, funcs_1.DurationSecs.minutes(1));
    Timer.schedule(function () {
        if (automod_1.Antibot.antiBotMode()) {
            (0, i18n_1.sendLocalizedToast)("server.antibot", 2, Vars.netServer.admins.dosBlacklist.size);
        }
    }, 0, 1);
}
Timer.schedule(function () {
    (0, files_1.updateMaps)()
        .then(function (result) {
        if (result) {
            (0, i18n_1.sendLocalizedMessage)("server.mapupdate");
            Log.info("Updated maps.");
        }
    })
        .catch(function (message) {
        if (Date.now() - globals_1.fishState.lastSuccessfulMapUpdate >= funcs_1.Duration.hours(1))
            (0, i18n_1.sendLocalizedMessage)("server.mapupdateerror");
        Log.err("Automated map update failed: ".concat(String(message)));
    });
}, funcs_1.DurationSecs.minutes(1), funcs_1.DurationSecs.minutes(10));
