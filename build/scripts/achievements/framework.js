"use strict";
/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains the code for the achievements system.
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
exports.Achievement = void 0;
exports.mapNameToDescArgs = mapNameToDescArgs;
var config_1 = require("/config");
var i18n_1 = require("/frameworks/i18n");
var globals_1 = require("/globals");
var players_1 = require("/players");
var ranks_1 = require("/ranks");
// keys are sids
function mapNameToDescArgs(name, locale) {
    var _a;
    var possibleDescArgs = {
        "verified": [ranks_1.Rank.active.coloredName(locale)],
        "drown_mace_in_cryo": [Blocks.cryofluid.emoji()],
    };
    return (_a = possibleDescArgs[name]) !== null && _a !== void 0 ? _a : [];
}
var Achievement = /** @class */ (function () {
    function Achievement(icon, name, description, options) {
        var _a;
        if (options === void 0) { options = {}; }
        this.name = name;
        this.notify = "player";
        this.hidden = false;
        this.disabled = false;
        if (Array.isArray(icon)) {
            this.icon = (icon[0].startsWith("[") ? icon[0] : "[".concat(icon[0], "]")) + (typeof icon[1] == "number" ? String.fromCharCode(icon[1]) : icon[1]);
        }
        else if (typeof icon == "number") {
            this.icon = String.fromCharCode(icon);
        }
        else {
            this.icon = icon;
        }
        if (Array.isArray(description)) {
            _a = __read(description, 2), this.description = _a[0], this.extendedDescription = _a[1];
        }
        else
            this.description = description;
        this.nid = Achievement._id++;
        Object.assign(this, options);
        if (options.modes) {
            var _b = __read(options.modes), type = _b[0], modes_1 = _b.slice(1);
            if (type == "only") {
                this.allowedModes = modes_1;
                this.modesText = modes_1.join(", ");
            }
            else {
                this.allowedModes = config_1.GamemodeNames.filter(function (m) { return !modes_1.includes(m); });
                this.modesText = "all except ".concat(modes_1.join(", "));
            }
        }
        else {
            this.allowedModes = config_1.GamemodeNames;
            this.modesText = "all";
        }
        if (!this.disabled) {
            Achievement.all.push(this);
            if (this.checkPlayerFrequent || this.checkFrequent)
                Achievement.checkFrequent.push(this);
            if (this.checkPlayerInfrequent || this.checkInfrequent)
                Achievement.checkInfrequent.push(this);
            if (this.checkPlayerJoin)
                Achievement.checkJoin.push(this);
            if (this.checkPlayerGameover || this.checkGameover)
                Achievement.checkGameover.push(this);
        }
    }
    Achievement.prototype.message = function (locale) {
        return config_1.FColor.achievement((0, i18n_1.i18n)("achievements.granted", locale, (0, i18n_1.i18n)("achievement.".concat(this.sid, ".name"), locale), i18n_1.i18n.apply(void 0, __spreadArray(["achievement.".concat(this.sid, ".description"), locale], __read(mapNameToDescArgs(this.sid, locale)), false))));
    };
    Achievement.prototype.allowedInMode = function () {
        return this.allowedModes.includes(config_1.Gamemode.name());
    };
    Achievement.prototype.grantToAllOnline = function (team) {
        var _this = this;
        players_1.FishPlayer.forEachPlayer(function (p) {
            if (!_this.has(p) && (!team || p.team() == team)) {
                if (_this.notify != "nobody")
                    p.sendMessage(_this.message(p.locale));
                _this.setObtained(p);
            }
        });
    };
    /** Do not call this in a loop on an achievement set to notify everyone. */
    Achievement.prototype.grantTo = function (player, allowRepeatMessage) {
        var _this = this;
        if (allowRepeatMessage === void 0) { allowRepeatMessage = false; }
        var has = this.has(player);
        if (!has || allowRepeatMessage) {
            if (this.notify == "everyone") {
                Groups.player.each(function (p) { return p.sendMessage(config_1.FColor.achievement((0, i18n_1.i18n)("achievements.othgranted", p.locale, player.prefixedName, (0, i18n_1.i18n)("achievement.".concat(_this.sid, ".name"), p.locale)))); });
            }
            else if (this.notify == "player")
                player.sendMessage(this.message(player.locale));
        }
        if (!has)
            this.setObtained(player);
    };
    Achievement.prototype.setObtained = function (player) {
        //void player.updateSynced(fishP => fishP.achievements.set(this.nid));
        player.achievements.set(this.nid);
    };
    Achievement.prototype.has = function (player) {
        return player.achievements.get(this.nid);
    };
    Achievement.all = [];
    /** Checked every second. */
    Achievement.checkFrequent = [];
    /** Checked every 10 seconds. Use for states that can be gained but not lost, such as "x wins". */
    Achievement.checkInfrequent = [];
    Achievement.checkJoin = [];
    Achievement.checkGameover = [];
    Achievement._id = 0;
    return Achievement;
}());
exports.Achievement = Achievement;
Events.on(EventType.PlayerJoin, function (_a) {
    var e_1, _b;
    var _c;
    var player = _a.player;
    Time.mark();
    var _loop_1 = function (ach) {
        if (ach.allowedInMode()) {
            var fishP_1 = players_1.FishPlayer.get(player);
            if (!ach.has(fishP_1) && ((_c = ach.checkPlayerJoin) === null || _c === void 0 ? void 0 : _c.call(ach, fishP_1))) {
                if (fishP_1.dataSynced)
                    ach.grantTo(fishP_1);
                else
                    Timer.schedule(function () { return ach.grantTo(fishP_1); }, 2); //2 seconds should be enough
            }
        }
    };
    try {
        for (var _d = __values(Achievement.checkJoin), _e = _d.next(); !_e.done; _e = _d.next()) {
            var ach = _e.value;
            _loop_1(ach);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
        }
        finally { if (e_1) throw e_1.error; }
    }
    Log.debug("ach join @", Time.elapsed());
});
globals_1.FishEvents.on("gameOver", function (_, winner) {
    var e_2, _a;
    var _b;
    Time.mark();
    var _loop_2 = function (ach) {
        if (ach.allowedInMode()) {
            if ((_b = ach.checkGameover) === null || _b === void 0 ? void 0 : _b.call(ach, winner))
                ach.grantToAllOnline();
            else
                players_1.FishPlayer.forEachPlayer(function (fishP) {
                    var _a;
                    if ((_a = ach.checkPlayerGameover) === null || _a === void 0 ? void 0 : _a.call(ach, fishP, winner)) {
                        ach.grantTo(fishP);
                    }
                });
        }
    };
    try {
        for (var _c = __values(Achievement.checkGameover), _d = _c.next(); !_d.done; _d = _c.next()) {
            var ach = _d.value;
            _loop_2(ach);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_2) throw e_2.error; }
    }
    Log.debug("ach gameover @", Time.elapsed());
});
Timer.schedule(function () {
    var e_3, _a;
    Time.mark();
    var _loop_3 = function (ach) {
        if (ach.allowedInMode()) {
            if (ach.checkFrequent) {
                if (config_1.Gamemode.pvp()) {
                    Vars.state.teams.active.each(function (_a) {
                        var team = _a.team;
                        if (ach.checkFrequent(team))
                            ach.grantToAllOnline(team);
                    });
                }
                else {
                    if (ach.checkFrequent(Vars.state.rules.defaultTeam))
                        ach.grantToAllOnline();
                }
            }
            else {
                players_1.FishPlayer.forEachPlayer(function (fishP) {
                    var _a;
                    if ((_a = ach.checkPlayerFrequent) === null || _a === void 0 ? void 0 : _a.call(ach, fishP))
                        ach.grantTo(fishP);
                });
            }
        }
    };
    try {
        for (var _b = __values(Achievement.checkFrequent), _c = _b.next(); !_c.done; _c = _b.next()) {
            var ach = _c.value;
            _loop_3(ach);
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_3) throw e_3.error; }
    }
    Log.debug("ach frequent @", Time.elapsed());
}, 1, 1);
Timer.schedule(function () {
    var e_4, _a;
    Time.mark();
    var _loop_4 = function (ach) {
        if (ach.allowedInMode()) {
            if (ach.checkInfrequent) {
                if (config_1.Gamemode.pvp()) {
                    Vars.state.teams.active.each(function (_a) {
                        var team = _a.team;
                        if (ach.checkInfrequent(team))
                            ach.grantToAllOnline(team);
                    });
                }
                else {
                    if (ach.checkInfrequent(Vars.state.rules.defaultTeam))
                        ach.grantToAllOnline();
                }
            }
            else {
                players_1.FishPlayer.forEachPlayer(function (fishP) {
                    var _a;
                    if ((_a = ach.checkPlayerInfrequent) === null || _a === void 0 ? void 0 : _a.call(ach, fishP))
                        ach.grantTo(fishP);
                });
            }
        }
    };
    try {
        for (var _b = __values(Achievement.checkInfrequent), _c = _b.next(); !_c.done; _c = _b.next()) {
            var ach = _c.value;
            _loop_4(ach);
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_4) throw e_4.error; }
    }
    Log.debug("ach infrequent @", Time.elapsed());
}, 10, 10);
