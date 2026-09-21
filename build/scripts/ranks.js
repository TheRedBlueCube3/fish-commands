"use strict";
/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains the definitions for ranks and role flags.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleFlag = exports.Rank = void 0;
var i18n_1 = require("/frameworks/i18n");
var funcs_1 = require("/funcs");
/** Each player has one rank, which is used to determine their prefix, permissions, and which other players they can perform moderation actions on. */
var Rank = /** @class */ (function () {
    function Rank(name, 
    /** Used to determine whether a rank outranks another. */ level, prefix, shortPrefix, color, autoRankData) {
        var _a, _b, _c, _d, _e;
        this.name = name;
        this.level = level;
        this.prefix = prefix;
        this.shortPrefix = shortPrefix;
        this.color = color;
        Rank.ranks[name] = this;
        if (autoRankData) {
            this.autoRankData = {
                joins: (_a = autoRankData.joins) !== null && _a !== void 0 ? _a : 0,
                playtime: (_b = autoRankData.playtime) !== null && _b !== void 0 ? _b : 0,
                blocksPlaced: (_c = autoRankData.blocksPlaced) !== null && _c !== void 0 ? _c : 0,
                timeSinceFirstJoin: (_d = autoRankData.timeSinceFirstJoin) !== null && _d !== void 0 ? _d : 0,
                chatMessagesSent: (_e = autoRankData.chatMessagesSent) !== null && _e !== void 0 ? _e : 0,
            };
            Rank.autoRanks.push(this);
        }
    }
    Rank.getByName = function (name) {
        var _a;
        return (_a = Rank.ranks[name]) !== null && _a !== void 0 ? _a : null;
    };
    Rank.prototype.coloredName = function (locale) {
        return this.color + (0, i18n_1.i18n)("rank.".concat(this.name, ".name"), locale) + "[]";
    };
    Rank.prototype.getDescription = function (locale) {
        return (0, i18n_1.i18n)("rank.".concat(this.name, ".description"), locale);
    };
    Rank.ranks = {};
    Rank.autoRanks = [];
    Rank.player = new Rank("player", 0, "", "&lk[p]&fr", "");
    Rank.active = new Rank("active", 1, "[black]<[forest]\uE800[]>[]", "&lk[a]&fr", "[forest]", {
        joins: 50,
        playtime: funcs_1.Duration.hours(24),
        blocksPlaced: 5000,
        timeSinceFirstJoin: funcs_1.Duration.days(7),
    });
    Rank.trusted = new Rank("trusted", 2, "[black]<[#E67E22]\uE813[]>[]", "&y[T]&fr", "[#E67E22]");
    Rank.mod = new Rank("mod", 3, "[black]<[#6FFC7C]\uE817[]>[]", "&lg[M]&fr", "[#6FFC7C]");
    Rank.admin = new Rank("admin", 4, "[black]<[cyan]\uE82C[]>[]", "&lr[A]&fr", "[cyan]");
    Rank.manager = new Rank("manager", 10, "[black]<[scarlet]\uE88E[]>[]", "&c[E]&fr", "[scarlet]");
    Rank.pi = new Rank("pi", 11, "[black]<[#FF8000]\u03C0[]>[]", "&b[+]&fr", "[blue]"); //i want pi rank
    Rank.fish = new Rank("fish", 999, "[blue]>|||>[] ", "&b[F]&fr", "[blue]");
    Rank.search = (0, funcs_1.searchFixed)(Object.values(Rank.ranks), [
        function (r, str) { return r.name == str.toLowerCase(); },
        function (r, str) { return r.name.includes(str.toLowerCase()); },
    ]);
    return Rank;
}());
exports.Rank = Rank;
Object.freeze(Rank.pi); //anti-trolling
/**
 * Role flags are used to determine a player's prefix and permissions.
 * Players can have any combination of the role flags.
 */
var RoleFlag = /** @class */ (function () {
    function RoleFlag(name, prefix, color, assignableByModerators) {
        if (assignableByModerators === void 0) { assignableByModerators = true; }
        this.name = name;
        this.prefix = prefix;
        this.color = color;
        this.assignableByModerators = assignableByModerators;
        RoleFlag.flags[name] = this;
    }
    RoleFlag.getByName = function (name) {
        var _a;
        return (_a = RoleFlag.flags[name]) !== null && _a !== void 0 ? _a : null;
    };
    RoleFlag.prototype.coloredName = function (locale) {
        return this.color + (0, i18n_1.i18n)("flag.".concat(this.name, ".name"), locale) + "[]";
    };
    RoleFlag.prototype.getDescription = function (locale) {
        return (0, i18n_1.i18n)("flag.".concat(this.name, ".description"), locale);
    };
    RoleFlag.flags = {};
    RoleFlag.developer = new RoleFlag("developer", "[black]<[#B000FF]\uE80E[]>[]", "[#B000FF]", false);
    RoleFlag.map_analyst = new RoleFlag("map_analyst", "[black]<[#C16BFF]\uE852[]>[]", "[#C16BFF]", false);
    RoleFlag.member = new RoleFlag("member", "[black]<[yellow]\uE809[]>[]", "[pink]", false);
    RoleFlag.illusionist = new RoleFlag("illusionist", "", "[lightgrey]", true);
    RoleFlag.map_expert = new RoleFlag("map_expert", "[black]<[#5800FF]\uE833[]>[]", "[#5800FF]", true);
    RoleFlag.no_effects = new RoleFlag("no_effects", "", "", true);
    RoleFlag.search = (0, funcs_1.searchFixed)(Object.values(RoleFlag.flags), [
        function (r, str) { return r.name == str.toLowerCase(); },
        function (r, str) { return r.name.includes(str.toLowerCase()); },
    ]);
    return RoleFlag;
}());
exports.RoleFlag = RoleFlag;
