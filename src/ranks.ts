/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains the definitions for ranks and role flags.
*/

import { i18n } from "/frameworks/i18n";
import { Duration, searchFixed } from "/funcs";
import type { SelectEnumClassKeys } from "/types";

/** Each player has one rank, which is used to determine their prefix, permissions, and which other players they can perform moderation actions on. */
export class Rank {
	static ranks:Record<string, Rank> = {};
	static autoRanks: Rank[] = [];

	static player = new Rank("player", 0, "", "&lk[p]&fr", "");
	static active = new Rank("active", 1,  "[black]<[forest]\uE800[]>[]", "&lk[a]&fr", "[forest]", {
		joins: 50,
		playtime: Duration.hours(24),
		blocksPlaced: 5000,
		timeSinceFirstJoin: Duration.days(7),
	});
	static trusted = new Rank("trusted", 2, "[black]<[#E67E22]\uE813[]>[]", "&y[T]&fr", "[#E67E22]");
	static mod = new Rank("mod", 3, "[black]<[#6FFC7C]\uE817[]>[]", "&lg[M]&fr", "[#6FFC7C]");
	static admin = new Rank("admin", 4, "[black]<[cyan]\uE82C[]>[]", "&lr[A]&fr", "[cyan]");
	static manager = new Rank("manager", 10, "[black]<[scarlet]\uE88E[]>[]", "&c[E]&fr", "[scarlet]");
	static pi = new Rank("pi", 11, "[black]<[#FF8000]\u03C0[]>[]", "&b[+]&fr", "[blue]");//i want pi rank
	static fish = new Rank("fish", 999, "[blue]>|||>[] ", "&b[F]&fr", "[blue]");

	autoRankData?: {
		joins: number;
		playtime: number;
		blocksPlaced: number;
		timeSinceFirstJoin: number;
		chatMessagesSent: number;
	};

	constructor(
		public name:string,
		/** Used to determine whether a rank outranks another. */ public level:number,
		public prefix:string,
		public shortPrefix:string,
		public color:string,
		autoRankData?: Partial<Rank["autoRankData"]>,
	){
		Rank.ranks[name] = this;
		if(autoRankData){
			this.autoRankData = {
				joins: autoRankData.joins ?? 0,
				playtime: autoRankData.playtime ?? 0,
				blocksPlaced: autoRankData.blocksPlaced ?? 0,
				timeSinceFirstJoin: autoRankData.timeSinceFirstJoin ?? 0,
				chatMessagesSent: autoRankData.chatMessagesSent ?? 0,
			};
			Rank.autoRanks.push(this);
		}
	}
	static getByName(name:string):Rank | null {
		return Rank.ranks[name] ?? null;
	}
	static search = searchFixed(Object.values(Rank.ranks), [
		(r, str) => r.name == str.toLowerCase(),
		(r, str) => r.name.includes(str.toLowerCase()),
	]);
	coloredName(locale: string){
		return this.color + i18n(`rank.${this.name}.name`, locale) + "[]";
	}
	getDescription(locale: string)
	{
		return i18n(`rank.${this.name}.description`, locale);
	}
}
Object.freeze(Rank.pi); //anti-trolling
export type RankName = SelectEnumClassKeys<typeof Rank>;

/**
 * Role flags are used to determine a player's prefix and permissions.
 * Players can have any combination of the role flags.
 */
export class RoleFlag {
	static flags:Record<string, RoleFlag> = {};
	static developer = new RoleFlag("developer", "[black]<[#B000FF]\uE80E[]>[]", "[#B000FF]", false);
	static map_analyst = new RoleFlag("map_analyst", "[black]<[#C16BFF]\uE852[]>[]", "[#C16BFF]", false);
	static member = new RoleFlag("member", "[black]<[yellow]\uE809[]>[]", "[pink]", false);
	static illusionist = new RoleFlag("illusionist", "", "[lightgrey]", true);
	static map_expert = new RoleFlag("map_expert", "[black]<[#5800FF]\uE833[]>[]","[#5800FF]", true);
	static no_effects = new RoleFlag("no_effects", "", "", true);
	constructor(
		public name:string,
		public prefix:string,
		public color:string,
		public assignableByModerators = true,
	){RoleFlag.flags[name] = this;}
	static getByName(this:void, name:string):RoleFlag | null {
		return RoleFlag.flags[name] ?? null;
	}
	static search = searchFixed(Object.values(RoleFlag.flags), [
		(r, str) => r.name == str.toLowerCase(),
		(r, str) => r.name.includes(str.toLowerCase()),
	]);
	coloredName(locale: string){
		return this.color + i18n(`flag.${this.name}.name`, locale) + "[]";
	}
	getDescription(locale: string)
	{
		return i18n(`flag.${this.name}.description`, locale);
	}
}
export type RoleFlagName = SelectEnumClassKeys<typeof RoleFlag>;
