/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains the code for the achievements system.
*/

import { FColor, Gamemode, GamemodeName, GamemodeNames } from "/config";
import { i18n, sendLocalizedMessage } from "/frameworks/i18n";
import { FishEvents } from "/globals";
import { FishPlayer } from "/players";
import { Rank } from "/ranks";
import { Achievements } from "/achievements";

type PossibleAchievement = keyof typeof Achievements;
// keys are sids
export function mapNameToDescArgs(name: PossibleAchievement, locale: string): string[]
{
	const possibleDescArgs: Record<string, string[]> = {
		"verified": [Rank.active.coloredName(locale)],
		"drown_mace_in_cryo": [Blocks.cryofluid.emoji()],
	};

	return possibleDescArgs[name] ?? [];
}

export class Achievement {
	nid: number;
	sid!: PossibleAchievement;

	icon: string;
	description: string;
	extendedDescription?: string;

	checkPlayerInfrequent?: (player:FishPlayer<true>) => boolean;
	checkPlayerFrequent?: (player:FishPlayer<true>) => boolean;
	checkPlayerJoin?: (player:FishPlayer<true>) => boolean;
	checkPlayerGameover?: (player:FishPlayer<true>, winTeam:Team) => boolean;
	checkInfrequent?: (team: Team) => boolean;
	checkFrequent?: (team: Team) => boolean;
	checkGameover?: (winTeam:Team) => boolean;

	notify: "nobody" | "player" | "everyone" = "player";
	hidden = false;
	disabled = false;
	allowedModes: GamemodeName[];
	modesText: string;
	
	static all: Achievement[] = [];
	/** Checked every second. */
	static checkFrequent: Achievement[] = [];
	/** Checked every 10 seconds. Use for states that can be gained but not lost, such as "x wins". */
	static checkInfrequent: Achievement[] = [];
	static checkJoin: Achievement[] = [];
	static checkGameover: Achievement[] = [];

	private static _id = 0;
	constructor(
		icon: string | number | [string, number | string],
		public name: string,
		description: string | [string, string],
		options: Partial<Pick<Achievement,
			"notify" | "hidden" | "disabled" |
			"checkFrequent" | "checkInfrequent" | "checkPlayerFrequent" | "checkPlayerInfrequent" | "checkPlayerJoin" | "checkGameover" | "checkPlayerGameover"
		> & {
			modes: ["only" | "not", ...GamemodeName[]];
		}> = {},
	){
		if(Array.isArray(icon)){
			this.icon = (icon[0].startsWith("[") ? icon[0] : `[${icon[0]}]`) + (typeof icon[1] == "number" ? String.fromCharCode(icon[1]) : icon[1]);
		} else if(typeof icon == "number"){
			this.icon = String.fromCharCode(icon);
		} else {
			this.icon = icon;
		}
		if(Array.isArray(description)){
			[this.description, this.extendedDescription] = description;
		} else this.description = description;
		this.nid = Achievement._id ++;
		Object.assign(this, options);
		if(options.modes){
			const [type, ...modes] = options.modes;
			if(type == "only"){
				this.allowedModes = modes;
				this.modesText = modes.join(", ");
			} else {
				this.allowedModes = GamemodeNames.filter(m => !modes.includes(m));
				this.modesText = `all except ${modes.join(", ")}`;
			}
		} else {
			this.allowedModes = GamemodeNames;
			this.modesText = `all`;
		}
		if(!this.disabled){
			Achievement.all.push(this);
			if(this.checkPlayerFrequent || this.checkFrequent) Achievement.checkFrequent.push(this);
			if(this.checkPlayerInfrequent || this.checkInfrequent) Achievement.checkInfrequent.push(this);
			if(this.checkPlayerJoin) Achievement.checkJoin.push(this);
			if(this.checkPlayerGameover || this.checkGameover) Achievement.checkGameover.push(this);
		}
	}

	message(locale: string):string {
		return FColor.achievement(
			i18n(
				"achievements.granted",
				locale,
				i18n(`achievement.${this.sid}.name`, locale),
				i18n(`achievement.${this.sid}.description`, locale, ...mapNameToDescArgs(this.sid, locale)),
			),
		);
	}
	allowedInMode(){
		return this.allowedModes.includes(Gamemode.name());
	}

	public grantToAllOnline(team?: Team){
		FishPlayer.forEachPlayer(p => {
			if(!this.has(p) && (!team || p.team() == team)){
				if(this.notify != "nobody") p.sendMessage(this.message(p.locale));
				this.setObtained(p);
			}
		});
	}
	/** Do not call this in a loop on an achievement set to notify everyone. */
	public grantTo(player:FishPlayer, allowRepeatMessage = false){
		const has = this.has(player);
		if(!has || allowRepeatMessage){
			if(this.notify == "everyone")
			{
				Groups.player.each((p)=>p.sendMessage(FColor.achievement(i18n("achievements.othgranted", p.locale, player.prefixedName, i18n(`achievement.${this.sid}.name`, p.locale)))));
			}
			else if(this.notify == "player") player.sendMessage(this.message(player.locale));
		}
		if(!has) this.setObtained(player);
	}

	private setObtained(player:FishPlayer){
		//void player.updateSynced(fishP => fishP.achievements.set(this.nid));
		player.achievements.set(this.nid);
	}
	public has(player:FishPlayer){
		return player.achievements.get(this.nid);
	}
}


Events.on(EventType.PlayerJoin, ({player}: {player: mindustryPlayer}) => {
	Time.mark();
	for(const ach of Achievement.checkJoin){
		if(ach.allowedInMode()){
			const fishP = FishPlayer.get(player) as FishPlayer<true>;
			if(!ach.has(fishP) && ach.checkPlayerJoin?.(fishP)){
				if(fishP.dataSynced) ach.grantTo(fishP);
				else Timer.schedule(() => ach.grantTo(fishP), 2); //2 seconds should be enough
			}
		}
	}
	Log.debug("ach join @", Time.elapsed());
});
FishEvents.on("gameOver", (_, winner) => {
	Time.mark();
	for(const ach of Achievement.checkGameover){
		if(ach.allowedInMode()){
			if(ach.checkGameover?.(winner)) ach.grantToAllOnline();
			else FishPlayer.forEachPlayer(fishP => {
				if(ach.checkPlayerGameover?.(fishP, winner)){
					ach.grantTo(fishP);
				}
			});
		}
	}
	Log.debug("ach gameover @", Time.elapsed());
});
Timer.schedule(() => {
	Time.mark();
	for(const ach of Achievement.checkFrequent){
		if(ach.allowedInMode()){
			if(ach.checkFrequent){
				if(Gamemode.pvp()){
					Vars.state.teams.active.each(({team}) => {
						if(ach.checkFrequent!(team)) ach.grantToAllOnline(team);
					});
				} else {
					if(ach.checkFrequent(Vars.state.rules.defaultTeam)) ach.grantToAllOnline();
				}
			} else {
				FishPlayer.forEachPlayer(fishP => {
					if(ach.checkPlayerFrequent?.(fishP)) ach.grantTo(fishP);
				});
			}
		}
	}
	Log.debug("ach frequent @", Time.elapsed());
}, 1, 1);
Timer.schedule(() => {
	Time.mark();
	for(const ach of Achievement.checkInfrequent){
		if(ach.allowedInMode()){
			if(ach.checkInfrequent){
				if(Gamemode.pvp()){
					Vars.state.teams.active.each(({team}) => {
						if(ach.checkInfrequent!(team)) ach.grantToAllOnline(team);
					});
				} else {
					if(ach.checkInfrequent(Vars.state.rules.defaultTeam)) ach.grantToAllOnline();
				}
			} else {
				FishPlayer.forEachPlayer(fishP => {
					if(ach.checkPlayerInfrequent?.(fishP)) ach.grantTo(fishP);
				});
			}
		}
	}
	Log.debug("ach infrequent @", Time.elapsed());
}, 10, 10);
