"use strict";
/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains the map run tracker and statistics computation.
*/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FMap = exports.PartialMapRun = exports.FinishedMapRun = void 0;
var i18n_1 = require("/frameworks/i18n");
var config_1 = require("/config");
var io_1 = require("/frameworks/io");
var funcs_1 = require("/funcs");
var globals_1 = require("/globals");
var utils_1 = require("/utils");
var FinishedMapRun = /** @class */ (function (_super) {
    __extends(FinishedMapRun, _super);
    //this constructor is useless, but rhino crashes with a bizarre error when trying to run the emitted code
    //do not remove this useless constructor
    function FinishedMapRun(data) {
        return _super.call(this, data) || this;
    }
    FinishedMapRun.prototype.duration = function () {
        return this.endTime - this.startTime;
    };
    FinishedMapRun.prototype.outcome = function () {
        if (config_1.Gamemode.pvp()) {
            if (this.winTeam === Team.derelict) {
                if (this.duration() > funcs_1.Duration.minutes(20))
                    return ["rtv", "late rtv"];
                else
                    return ["rtv", "early rtv"];
            }
            else
                return ["win", "win"];
        }
        else {
            if (this.success)
                return ["win", "win"];
            else if (this.winTeam === Team.derelict) {
                if (this.duration() > funcs_1.Duration.minutes(3))
                    return ["loss", "late rtv"];
                else
                    return ["rtv", "early rtv"];
            }
            else
                return ["loss", "loss"];
        }
    };
    return FinishedMapRun;
}((0, io_1.dataClass)()));
exports.FinishedMapRun = FinishedMapRun;
var PartialMapRun = /** @class */ (function () {
    function PartialMapRun() {
        this.startTime = Date.now();
        this.maxPlayerCount = 0;
    }
    /** In milliseconds */
    PartialMapRun.prototype.duration = function () {
        return Date.now() - this.startTime;
    };
    PartialMapRun.prototype.update = function () {
        this.maxPlayerCount = Math.max(this.maxPlayerCount, Groups.player.size());
    };
    PartialMapRun.prototype.finish = function (_b) {
        var winTeam = _b.winTeam;
        return new FinishedMapRun({
            winTeam: winTeam,
            success: config_1.Gamemode.pvp() ? true : winTeam == Vars.state.rules.defaultTeam,
            startTime: this.startTime,
            endTime: Date.now(),
            maxPlayerCount: this.maxPlayerCount,
            wave: Vars.state.wave,
        });
    };
    //Used for continuing through a restart
    PartialMapRun.prototype.write = function () {
        return "".concat(Date.now() - this.startTime, "/").concat(this.maxPlayerCount);
    };
    PartialMapRun.read = function (data) {
        var _b = __read(data.split("/").map(Number), 2), duration = _b[0], maxPlayerCount = _b[1];
        if (isNaN(duration) || isNaN(maxPlayerCount)) {
            Log.err("_FINDTAG_ failed to load map run stats data: ".concat(data));
        }
        var out = new _a();
        out.startTime = Date.now() - duration; //move start time forward by time when the server was off
        out.maxPlayerCount = maxPlayerCount;
        return out;
    };
    var _a;
    _a = PartialMapRun;
    PartialMapRun.key = "fish-partial-map-run";
    PartialMapRun.current = null;
    (function () {
        globals_1.FishEvents.on("saveData", function () {
            if (_a.current)
                Core.settings.put(_a.key, _a.current.write());
        });
        globals_1.FishEvents.on("loadData", function () {
            var data = Core.settings.getString(_a.key);
            if (data) {
                _a.current = _a.read(data);
            }
            else {
                //loading a map, but there is no run information, create one
                _a.current = new _a();
            }
        });
        Events.on(EventType.SaveLoadEvent, function (e) {
            var _b;
            //create a new run, if there isn't one already
            //loadData will have run first if it is a server restart
            (_b = _a.current) !== null && _b !== void 0 ? _b : (_a.current = new _a());
        });
        Timer.schedule(function () {
            var _b;
            (_b = _a.current) === null || _b === void 0 ? void 0 : _b.update();
        }, 0, 5);
        Events.on(EventType.GameOverEvent, function (e) {
            var _b;
            if (_a.current) {
                var finishedRun_1 = _a.current.finish({ winTeam: (_b = e.winner) !== null && _b !== void 0 ? _b : Team.derelict });
                var fmap = FMap.getCreate(Vars.state.map);
                if (!fmap)
                    return;
                //Highscore message
                if (config_1.Gamemode.attack() && finishedRun_1.success) {
                    var bestPreviousTime_1 = fmap.stats().shortestWinTime;
                    var duration_1 = finishedRun_1.duration();
                    // 					Call.sendMessage(
                    // `[orange]--------
                    // ${finishedRun.success && duration < bestPreviousTime ?
                    // 	`[green]New highscore! Map completed in [accent]${formatTimeShort(duration)}[]`
                    // : `[orange]Map completed in [accent]${formatTimeShort(duration)}[]. Current highscore: [green]${formatTimeShort(bestPreviousTime)}[]`}
                    // [orange]--------`
                    // 					);
                    (0, i18n_1.sendLocMessageCB)('maps.finished', function (locale, localize) { return [
                        finishedRun_1.success && duration_1 < bestPreviousTime_1
                            ? localize('maps.attack.highscore', [(0, utils_1.formatTimeShortLocalize)(duration_1, locale)])
                            : localize('maps.attack.finished', [(0, utils_1.formatTimeShortLocalize)(duration_1, locale), (0, utils_1.formatTimeShortLocalize)(bestPreviousTime_1, locale)])
                    ]; });
                }
                else if (config_1.Gamemode.survival()) {
                    var bestPreviousWave = fmap.stats().highestWave;
                    var wave = finishedRun_1.wave;
                    Call.sendMessage("[orange]--------\n".concat(finishedRun_1.success && wave < bestPreviousWave ?
                        "[green]New highscore! Reached wave [accent]".concat(wave, "[].")
                        : "[orange]Reached wave [accent]".concat(wave, "[]. Current highscore: [green]").concat(bestPreviousWave, "[]"), "\n[orange]--------"));
                }
                fmap.runs.push(finishedRun_1);
                globals_1.FishEvents.fire("saveMaps", []);
            }
            Core.settings.remove(_a.key);
            _a.current = null;
        });
    })();
    return PartialMapRun;
}());
exports.PartialMapRun = PartialMapRun;
var FMap = function () {
    var _b;
    var _classSuper = (0, io_1.dataClass)();
    var _static_allMaps_decorators;
    var _static_allMaps_initializers = [];
    var _static_allMaps_extraInitializers = [];
    return _b = /** @class */ (function (_super) {
            __extends(FMap, _super);
            function FMap(data, 
            //O(n^2)... should be fine?
            map) {
                if (map === void 0) { map = Vars.maps.customMaps().find(function (m) { return m.file.name() === data.mapFileName; }); }
                var _this = _super.call(this, data) || this;
                _this.map = map;
                return _this;
            }
            FMap.getCreate = function (map) {
                if (this.allMaps == null)
                    return null;
                var mapFileName = map.file.name();
                if (Object.prototype.hasOwnProperty.call(this.maps, mapFileName))
                    return this.maps[mapFileName];
                var fmap = new this({
                    runs: [],
                    mapFileName: mapFileName
                }, map);
                this.maps[mapFileName] = fmap;
                this.allMaps.push(fmap);
                return fmap;
            };
            FMap.prototype.rules = function () {
                var _c;
                return (_c = this.map) === null || _c === void 0 ? void 0 : _c.rules();
            };
            FMap.prototype.stats = function () {
                var _c;
                var runs = this.runs.filter(function (r) { return r.maxPlayerCount > 0; }); //Remove all runs with no players on
                var allRunCount = runs.length;
                var victories = runs.filter(function (r) { return r.outcome()[1] === "win"; });
                var losses = runs.filter(function (r) { return r.outcome()[0] === "loss"; }).length;
                var earlyRTVs = runs.filter(function (r) { return r.outcome()[1] === "early rtv"; }).length;
                var lateRTVs = runs.filter(function (r) { return r.outcome()[1] === "late rtv"; }).length;
                var significantRunCount = allRunCount - earlyRTVs;
                var totalLosses = losses + lateRTVs;
                var durations = runs.filter(function (r) { return r.outcome()[0] !== "rtv"; }).map(function (r) { return r.duration(); });
                var durationStats = (0, funcs_1.computeStatistics)(durations);
                var winDurationStats = (0, funcs_1.computeStatistics)(runs.filter(function (r) { return r.outcome()[0] === "win"; }).map(function (r) { return r.duration(); }));
                var teamWins = runs.filter(function (r) { return r.outcome()[1] !== "early rtv"; }).reduce(function (acc, item) {
                    var _c;
                    acc[item.winTeam.name] = ((_c = acc[item.winTeam.name]) !== null && _c !== void 0 ? _c : 0) + 1;
                    return acc;
                }, {});
                var teamWinRate = Object.fromEntries(Object.entries(teamWins).map(function (_c) {
                    var _d = __read(_c, 2), team = _d[0], wins = _d[1];
                    return [team, wins / significantRunCount];
                }));
                //Remove runs that were on wave 0, due to a silly bug we have thousands of runs with a max wave of 0
                var waveStats = (0, funcs_1.computeStatistics)(runs.filter(function (r) { return r.outcome()[0] !== "rtv" && r.wave !== 0; }).map(function (r) { return r.wave; }));
                return {
                    allRunCount: allRunCount,
                    significantRunCount: significantRunCount,
                    victories: victories.length,
                    losses: losses,
                    totalLosses: totalLosses,
                    earlyRTVs: earlyRTVs,
                    lateRTVs: lateRTVs,
                    earlyRTVRate: earlyRTVs / allRunCount,
                    winRate: victories.length / significantRunCount,
                    lossRate: losses / significantRunCount,
                    averagePlaytime: durationStats.average,
                    shortestWinTime: winDurationStats.lowest,
                    longestTime: durationStats.highest,
                    shortestTime: durationStats.lowest,
                    averageHighestPlayerCount: (0, funcs_1.computeStatistics)(runs.map(function (r) { return r.maxPlayerCount; })).average,
                    teamWins: teamWins,
                    teamWinRate: teamWinRate,
                    highestWave: waveStats.highest,
                    averageWave: waveStats.average,
                    mostRecentWin: (_c = victories.at(-1)) === null || _c === void 0 ? void 0 : _c.startTime
                };
            };
            FMap.prototype.displayStats = function (f, locale) {
                var map = this.map;
                if (!map)
                    return null;
                var stats = this.stats();
                var rules = this.rules();
                var modeSpecificStats = (0, utils_1.match)(config_1.Gamemode.name(), {
                    // 			attack: `\
                    // [#CCFFCC]Total runs: ${stats.allRunCount} (${stats.victories} wins, ${stats.totalLosses} losses, ${stats.earlyRTVs} RTVs)
                    // [#CCFFCC]Outcomes: ${f.percent(stats.winRate, 1)} wins, ${f.percent(stats.lossRate, 1)} losses, ${f.percent(stats.earlyRTVRate, 1)} RTVs
                    // [#CCFFCC]Average playtime: ${formatTime(stats.averagePlaytime)}
                    // [#CCFFCC]Shortest win time: ${formatTime(stats.shortestWinTime)}
                    // [#CCFFCC]Most recent win: ${stats.mostRecentWin ? formatTimestamp(stats.mostRecentWin) : "[red]none[]"}`,
                    attack: (0, i18n_1.i18n)("maps.attack.stats", locale, stats.allRunCount, stats.victories, stats.totalLosses, stats.earlyRTVs, f.percent(stats.winRate, 1), f.percent(stats.lossRate, 1), f.percent(stats.earlyRTVRate, 1), (0, utils_1.formatTimeLocalize)(stats.averagePlaytime, locale), (0, utils_1.formatTimeLocalize)(stats.shortestWinTime, locale), stats.mostRecentWin ? (0, utils_1.formatTimestamp)(stats.mostRecentWin, locale) : (0, i18n_1.i18n)("maps.none", locale)),
                    // survival: `\
                    // [#CCFFCC]Highest wave reached: ${stats.highestWave}
                    // [#CCFFCC]Average wave reached: ${stats.averageWave}
                    // [#CCFFCC]Total runs: ${stats.allRunCount} (${stats.earlyRTVs} RTVs)
                    // [#CCFFCC]RTV rate: ${f.percent(stats.earlyRTVRate, 1)}
                    // [#CCFFCC]Average duration: ${formatTime(stats.averagePlaytime)}
                    // [#CCFFCC]Longest duration: ${formatTime(stats.longestTime)}`,
                    survival: (0, i18n_1.i18n)("maps.survival.stats", locale, stats.highestWave, stats.averageWave, stats.allRunCount, stats.earlyRTVs, f.percent(stats.earlyRTVRate, 1), (0, utils_1.formatTimeLocalize)(stats.averagePlaytime, locale), (0, utils_1.formatTimeLocalize)(stats.longestTime, locale)),
                    // 			pvp: `\
                    // [#CCFFCC]Total runs: ${stats.allRunCount} (${stats.earlyRTVs} RTVs)
                    // [#CCFFCC]Team win rates: ${Object.entries(stats.teamWinRate).map(([team, rate]) => `${team} ${f.percent(rate, 1)}`).join(", ")}
                    // [#CCFFCC]RTV rate: ${f.percent(stats.earlyRTVRate, 1)}
                    // [#CCFFCC]Average match duration: ${formatTime(stats.averagePlaytime)}
                    // [#CCFFCC]Shortest match duration: ${formatTime(stats.shortestWinTime)}`,
                    pvp: (0, i18n_1.i18n)("maps.pvp.stats", locale, stats.allRunCount, stats.earlyRTVs, Object.entries(stats.teamWinRate).map(function (_c) {
                        var _d = __read(_c, 2), team = _d[0], rate = _d[1];
                        return "".concat((0, i18n_1.i18n)(team, locale), " ").concat(f.percent(rate, 1));
                    }).join(", "), f.percent(stats.earlyRTVRate, 1), (0, utils_1.formatTimeLocalize)(stats.averagePlaytime, locale), (0, utils_1.formatTimeLocalize)(stats.shortestWinTime, locale)),
                    // 			hexed: `\
                    // [#CCFFCC]Total runs: ${stats.allRunCount} (${stats.earlyRTVs} RTVs)
                    // [#CCFFCC]RTV rate: ${f.percent(stats.earlyRTVRate, 1)}
                    // [#CCFFCC]Average match duration: ${formatTime(stats.averagePlaytime)}
                    // [#CCFFCC]Shortest match duration: ${formatTime(stats.shortestWinTime)}`,
                    hexed: (0, i18n_1.i18n)("maps.hexed.stats", locale, stats.allRunCount, stats.earlyRTVs, f.percent(stats.earlyRTVRate, 1), (0, utils_1.formatTime)(stats.averagePlaytime), (0, utils_1.formatTime)(stats.shortestWinTime)),
                    // 			sandbox: `\
                    // [#CCFFCC]Total plays: ${stats.allRunCount}
                    // [#CCFFCC]Average play time: ${formatTime(stats.averagePlaytime)}
                    // [#CCFFCC]Shortest play time: ${formatTime(stats.shortestTime)}`,
                    sandbox: (0, i18n_1.i18n)("maps.sandbox.stats", locale, stats.allRunCount, (0, utils_1.formatTimeLocalize)(stats.averagePlaytime, locale), (0, utils_1.formatTimeLocalize)(stats.shortestTime, locale))
                }, "");
                // 		return (`\
                // [coral]${map.name()}
                // [gray](${map.file.name()})
                // [accent]Map by: [white]${map.author()}
                // [accent]Description: [white]${map.description()}
                // [accent]Size: [white]${map.width}x${map.height}
                // [accent]Last updated: [white]${new Date(map.file.lastModified()).toLocaleDateString()}
                // [accent]BvB allowed: ${f.boolGood(rules.placeRangeCheck)}, unit item transfer allowed: ${f.boolGood(rules.onlyDepositCore)}
                // ${modeSpecificStats}
                // [#CCFFCC]Longest play time: ${formatTime(stats.longestTime)}
                // [#CCFFCC]Average player count: ${f.number(stats.averageHighestPlayerCount, 1)}`
                return (0, i18n_1.i18n)("maps.generalinfo", locale, map.name(), map.file.name(), map.author(), map.description(), map.width, map.height, new Date(map.file.lastModified()).toLocaleDateString(locale), f.boolGoodLocalize(!rules.placeRangeCheck, locale), f.boolGoodLocalize(!rules.onlyDepositCore, locale), modeSpecificStats, (0, utils_1.formatTimeLocalize)(stats.longestTime, locale), f.numberLocalize(stats.averageHighestPlayerCount, locale, 1));
            };
            return FMap;
        }(_classSuper)),
        (function () {
            var _c;
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_c = _classSuper[Symbol.metadata]) !== null && _c !== void 0 ? _c : null) : void 0;
            _static_allMaps_decorators = [(0, io_1.serialize)("fish-map-data", function () { return ["version", 1, ["array", "u16", ["class", FMap, [
                                ["runs", ["array", "u32", ["class", FinishedMapRun, [
                                                ["startTime", ["number", "i64"]],
                                                ["endTime", ["number", "i64"]],
                                                ["maxPlayerCount", ["number", "u8"]],
                                                ["success", ["boolean"]],
                                                ["winTeam", ["team"]],
                                                ["wave", ["number", "u16"]]
                                            ]]]],
                                ["mapFileName", ["string"]],
                            ]]]]; }, function () { return ["array", "u16", ["class", FMap, [
                            ["runs", ["array", "u32", ["class", FinishedMapRun, [
                                            ["startTime", ["number", "i64"]],
                                            ["endTime", ["number", "i64"]],
                                            ["maxPlayerCount", ["number", "u8"]],
                                            ["success", ["boolean"]],
                                            ["winTeam", ["team"]],
                                        ]]]],
                            ["mapFileName", ["string"]],
                        ]]]; }, undefined, "saveMaps")];
            __esDecorate(null, null, _static_allMaps_decorators, { kind: "field", name: "allMaps", static: true, private: false, access: { has: function (obj) { return "allMaps" in obj; }, get: function (obj) { return obj.allMaps; }, set: function (obj, value) { obj.allMaps = value; } }, metadata: _metadata }, _static_allMaps_initializers, _static_allMaps_extraInitializers);
            if (_metadata) Object.defineProperty(_b, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _b.allMaps = __runInitializers(_b, _static_allMaps_initializers, null),
        _b.maps = (__runInitializers(_b, _static_allMaps_extraInitializers), {}),
        (function () {
            globals_1.FishEvents.on("dataLoaded", function () {
                var _c;
                //This event listener runs after the data has been loaded into allMaps
                ((_c = _b.allMaps) !== null && _c !== void 0 ? _c : (_b.allMaps = [])).forEach(function (map) {
                    _b.maps[map.mapFileName] = map;
                    map.runs.forEach(function (run) {
                        var _c;
                        //this should not even happen, I think GameOverEvent is sending winTeam as null sometimes??
                        (_c = run.winTeam) !== null && _c !== void 0 ? _c : (run.winTeam = Team.derelict);
                    });
                });
                //create all the data
                Vars.maps.customMaps().each(function (m) { return void _b.getCreate(m); });
            });
        })(),
        _b;
}();
exports.FMap = FMap;
