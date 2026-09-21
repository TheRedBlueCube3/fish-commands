/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains most in-game chat commands that can be run by untrusted players.
*/

import { Achievement, Achievements, mapNameToDescArgs } from "/achievements";
import * as api from "/api";
import { FColor, FishServer, Gamemode, text } from "/config";
import { command, commandList, fail, formatArg, Perm, PermCategory, Req } from "/frameworks/commands";
import type { FishCommandData } from "/frameworks/commands/types";
import { AddedBundle, i18n, keyExists, sendLocalizedMessage } from "/frameworks/i18n";
import { Menu } from "/frameworks/menus";
import { capitalizeText, crash, delay, Duration, escapeStringColorsClient, escapeTextDiscord, StringBuilder, StringIO, tagProcessorPartial, to2DArray } from "/funcs";
import { FishEvents, fishPlugin, fishState, ipPortPattern, recentWhispers, tileHistory, uuidPattern } from "/globals";
import { FMap, PartialMapRun } from "/maps";
import { FishPlayer } from "/players";
import { Rank, RoleFlag } from "/ranks";
import { getLanguageFromCache, isLanguageAvailable, Language, languageCache, setPlayerLanguageEntry } from "/translation";
import { formatTime, formatTimeLocalize, formatTimeRelative, formatTimeRelativeLocalize, getColor, logAction, nearbyEnemyTile, neutralGameover, outputSuccess, skipWaves, teleportPlayer, vnwCondition } from "/utils";
import { VoteManager } from "/votes";

export const commands = commandList({
	about: {
		args: [],
		description: 'Prints information about the plugin.',
		perm: Perm.none,
		handler({localizedOutput: outputI18n, copy}){
			outputI18n("command.about.output", copy(fishPlugin.version?.slice(0, 8) ?? "[scarlet]null[]")
			);
		}
	},

	unpause: command({
		args: [],
		description: 'Unpauses the game.',
		perm: Perm.trusted,
		requirements: [Req.mode('pvp')],
		init() {
			const data = { unpaused: false };
			Events.on(EventType.PlayEvent, () => {
				if(data.unpaused){
					data.unpaused = false;
					Vars.state.rules.pvpAutoPause = true;
				}
			});
			return data;
		},
		handler({data, outputLocalizedSuccess: outputI18nSuccess}) {
			Vars.state.rules.pvpAutoPause = false;
			data.unpaused = true;
			Core.app.post(() => Vars.state.set(GameState.State.playing));
			outputI18nSuccess(`command.unpause.success`);
		}
	}),

	tp: {
		args: ['player:playerOn'],
		description: 'Teleport to another player.',
		perm: Perm.play,
		requirements: [Req.modeNot("pvp")],
		handler({ args, sender, f, localizedFail, outputLocalizedSuccess }) {
			if(!sender.hasPerm("admin")){
				if(!sender.unit()?.spawnedByCore) localizedFail(`command.tp.coreunit`);
				if(sender.team() !== args.player.team()) localizedFail(`command.tp.otherteam`);
				if(sender.unit()?.hasPayload?.()) localizedFail(`command.tp.haspayload`);
			}
			teleportPlayer(sender.player!, args.player.player!);
			outputLocalizedSuccess("command.tp.success", args.player.name);
		}
	},

	language: {
		args: ['language:string?'],
		description: 'Change your target translation language.',
		perm: Perm.none,
		requirements: [],
		async handler({args, sender, localize, outputLocalizedSuccess: localizedSuccess, localizedFail}){
			args.language ??= (await Menu.menu(
				localize(`command.language.menu.title`),
				localize(`command.language.menu.description`),
				languageCache.values().toSeq()
					.sort(Packages.java.util.Comparator({ compare(a:Language, b:Language){
						return Packages.java.lang.String(a.code).compareTo(Packages.java.lang.String(b));
					}}))
					.sort(floatf(l => l.code == "en" ? -2 : l.code == "ru" ? -1 : 0))
					.map(lang => {const ret: Language ={name: localize(`lang.name.${lang.code.toLowerCase()}`), code: lang.code}; return ret;})
					.toArray(),
				sender,
				{
					optionStringifier: l => `${l.name} (${l.code})`,
					includeCancel: true,
					columns: 2,
				}
			)).code;

			if(!(isLanguageAvailable(args.language) || ["off", "none"].includes(args.language.toLowerCase()))){
				localizedFail("command.language.invalid", args.language);
			}

			const targetLanguage = getLanguageFromCache(args.language);
			const localizedTargetLanguageName = localize(`lang.name.${targetLanguage.code.toLowerCase()}`);
			sender.language = targetLanguage.code;
			setPlayerLanguageEntry(sender.player!, targetLanguage.code);
			if(targetLanguage.name == "Off")
			{
				localizedSuccess(`command.language.off`);
			}
			else
			{
				localizedSuccess(`command.language.success`, localizedTargetLanguageName);
			}
		}
	},

	clean: command({
		args: [],
		description: 'Removes all boulders from the map.',
		perm: Perm.play,
		requirements: [],
		data: {lastRanMapStartTime: PartialMapRun.current?.startTime},
		async handler({sender, outputLocalizedSuccess, data, localizedFail, localize}){
			if(!PartialMapRun.current) fail(localize(`command.clean.gameover`));
			if(data.lastRanMapStartTime == PartialMapRun.current.startTime)
				fail(localize(`command.clean.alreadyrun`));
			data.lastRanMapStartTime = PartialMapRun.current.startTime;
			Timer.schedule(
				() => Call.sound(sender.con(), Sounds.rockBreak, 1, 1, 0),
				0, 0.05, 10
			);
			const array: Tile[] = ArcReflect.get(Vars.world.tiles, "array");
			let removed = 0;
			// eslint-disable-next-line @typescript-eslint/prefer-for-of
			for(let i = 0; i < array.length; i ++){
				const t = array[i];
				if(t.breakable() && t.block() instanceof Prop){
					t.removeNet();
					removed ++;
					if(removed % 500 == 0) await delay(100);
				}
			}
			outputLocalizedSuccess(`command.clean.success`);
		}
	}),

	die: {
		args: ["nodeatheffects:boolean?"],
		description: 'Kills your unit.',
		perm: Perm.mod.exceptModes({
			sandbox: Perm.play
		}, `You do not have permission to die.`),
		handler({ sender, args: { nodeatheffects }, localize }) {
			const unit = sender.unit() ?? fail(Math.random() > 0.9 ? localize`command.die.raremessage` : localize`command.die.alreadydead`);
			if(nodeatheffects) unit.remove();
			else unit.kill();
		},
	},

	discord: {
		args: [],
		description: 'Takes you to our discord.',
		perm: Perm.none,
		handler({ sender }) {
			Call.openURI(sender.con(), text.discordURL);
		},
	},

	tilelog: command({
		args: ['persist:boolean?', 'showUUID:boolean?'],
		description: 'Checks the history of a tile.',
		perm: Perm.none,
		data: {showUUID: true},
		handler({args, localizedOutput, outputSuccess, currentTapMode, handleTaps, sender, data, localize, outputLocalizedSuccess}){
			const changed = args.showUUID !== undefined && args.showUUID != data.showUUID;
			if(args.showUUID !== undefined){
				if(!sender.hasPerm("viewUUIDs")) fail(localize`command.tilelog.nouuidperms`);
				data.showUUID = args.showUUID;
			}
			if(args.persist && currentTapMode !== "on"){
				outputLocalizedSuccess(`command.tilelog.enabled`);
				handleTaps("on");
			} else if(args.persist && changed){
				outputSuccess(`${data.showUUID ? localize`command.tilelog.showuuid` : localize`command.tilelog.hideuuid`} ${localize`command.tilelog.clickdis`}`);
				handleTaps("on");
			} else if(currentTapMode == "off" || changed){
				handleTaps("once");
				localizedOutput(`command.tilelog.click`);
			} else {
				handleTaps("off");
				outputLocalizedSuccess(`command.tilelog.disabled`);
			}
		},
		tapped({tile, x, y, output, copy, player, sender, admins, data}){
			const historyData = tileHistory[`${x},${y}`] ?? fail(i18n(`command.tilelog.nohist`, sender.locale, tile.x, tile.y));
			const history = StringIO.read(historyData, str => str.readArray(d => ({
				action: d.readString(2),
				uuid: d.readString(3)!,
				time: d.readNumber(16),
				type: d.readString(2),
			}), 1)).map(h => ({
				...h,
				info: uuidPattern.test(h.uuid) ? player(admins.getInfoOptional(h.uuid)) : null,
			}));
			output(`[yellow]Tile history for tile (${tile.x}, ${tile.y}):\n` + history.map(e =>
				e.info ?
					(sender.hasPerm("viewUUIDs") && data.showUUID ?
						`[yellow]${copy(e.info.plainLastName())}[lightgray](${copy(e.uuid)})[yellow] ${e.action} a [cyan]${e.type}[] ${formatTimeRelative(e.time)}`
					: `[yellow]${copy(e.info.plainLastName())} ${e.action} a [cyan]${e.type}[] ${formatTimeRelative(e.time)}`)
				: `[yellow]${e.uuid}[yellow] ${e.action} a [cyan]${e.type}[] ${formatTimeRelative(e.time)}`
			).join('\n'));
		}
	}),

	aoelog: command(() => {
		const allowedActions = [
			"built", "broke", "rotated", "killed", "configured", "pay-dropped", "picked up", "controlled"
		];
		const cachedPointMap = Object.create(null) as Partial<Record<string, [number, number]>>;
		return {
			args: ['persist:boolean?', 'amount:number?', 'action:string?'],
			description: 'Checks the history of all tiles in the selected region. Can be filtered by action.',
			perm: Perm.none,
			handler({args, sender, outputSuccess, currentTapMode, handleTaps}) {
				if(currentTapMode === "off" || args.action || args.amount) {
					if(args.action && !allowedActions.includes(args.action))
						fail(`Invalid action. Allowed actions: ${allowedActions.join(", ")}`);
					if(args.amount && args.amount > 100) fail(`Limit cannot be greater than 100.`);

					cachedPointMap[sender.uuid] = undefined;
					handleTaps("on");
					outputSuccess(`Aoelog mode enabled. To see the recent history of all tiles in a rectangular region, tap opposite corners of the rectangle. Run /aoelog with no arguments to disable.`);
				} else {
					handleTaps("off");
					outputSuccess(`Aoelog disabled.`);
				}
			},
			tapped({x, y, output, outputFail, copy, player, sender, admins, handleTaps, args}) {
				function handleArea(p1: [number, number], p2: [number, number]){
					const minX = Math.min(p1[0], p2[0]);
					const maxX = Math.max(p1[0], p2[0]);
					const minY = Math.min(p1[1], p2[1]);
					const maxY = Math.max(p1[1], p2[1]);
					let limitTiles = 0;
					const amount = args.amount != null ? Math.floor(Math.abs(args.amount)) : 10;
					outer:
					for(let i = minX; i <= maxX; i ++){
						for(let j = minY; j <= maxY; j ++){
							const tileData = tileHistory[`${i},${j}`];
							if(!tileData) continue;
							let history = StringIO.read(tileHistory[`${i},${j}`], str => str.readArray(d => ({
								action: d.readString(2) ?? "??",
								uuid: d.readString(3) ?? "??",
								time: d.readNumber(16),
								type: d.readString(2) ?? "??",
							}), 1)).map(h => ({
								...h,
								info: uuidPattern.test(h.uuid) ? player(admins.getInfoOptional(h.uuid)) : null,
							}));;
							if(args.action) history = history.filter(e => e.action === args.action);
							if(history.length == 0) continue;
							output(`[yellow]Tile history for tile (${i}, ${j}):\n` + history.map(e =>
								e.info ?
									(sender.hasPerm("viewUUIDs") ?
										`[yellow]${copy(e.info.plainLastName())}[lightgray](${copy(e.uuid)})[yellow] ${e.action} a [cyan]${e.type}[] ${formatTimeRelative(e.time)}`
									: `[yellow]${copy(e.info.plainLastName())} ${e.action} a [cyan]${e.type}[] ${formatTimeRelative(e.time)}`)
								: `[yellow]${e.uuid}[yellow] ${e.action} a [cyan]${e.type}[] ${formatTimeRelative(e.time)}`
							).join('\n'));
							limitTiles ++;
							if(limitTiles === amount) break outer;
						}
					}
					if(limitTiles == 0){
						if(args.action) outputFail(`There is no recorded history for the selected region matching the provided filters.`);
						else outputFail(`There is no recorded history for the selected region.`);
					}
					if(limitTiles == amount)
						output(`Displaying first ${limitTiles} entries. To show other entries, increase the limit or select a smaller area.`);
				}
				const p1 = cachedPointMap[sender.uuid];
				if(!p1){
					cachedPointMap[sender.uuid] = [x, y];
					output(`1st point set at (${x},${y})`);
				} else {
					const p2 = [x, y] as [number, number];
					output(`2nd point set at (${x}, ${y})`);
					const width = Math.abs(p1[0] - p2[0]);
					const height = Math.abs(p1[1] - p2[1]);
					if(width > 50 || height > 50) fail("Selection too large: width/height cannot be more than 50.");
					handleArea(p1, p2);
					cachedPointMap[sender.uuid] = undefined;
					if(!args.persist) handleTaps("off");
				}	
			},
		};
	}),

	afk: {
		args: [],
		description: 'Toggles your afk status.',
		perm: Perm.none,
		handler({ sender, outputLocalizedSuccess }) {
			sender.manualAfk = !sender.manualAfk;
			sender.updateName();
			if(sender.manualAfk) outputLocalizedSuccess(`command.afk.marked`);
			else outputLocalizedSuccess(`command.afk.unmarked`);
		},
	},

	vanish: {
		args: ['target:player?'],
		description: `Toggles visibility of your rank and flags.`,
		perm: Perm.vanish,
		handler({ sender, args: {target = sender}, localize, outputLocalizedSuccess }){
			if(sender.stelled()) fail(localize`command.vanish.stelled`);
			if(sender.muted()) fail(localize`command.vanish.muted`);
			if(sender != target && target.hasPerm("blockTrolling")) fail(localize`command.vanish.untrollable`);
			if(sender != target && !sender.ranksAtLeast("mod")) fail(localize`command.vanish.noperms`);
			target.showRankPrefix = !target.showRankPrefix;
			const isVisible = target.showRankPrefix ? localize`command.vanish.visible` : localize`command.vanish.hidden`;
			if(target == sender)
			{
				outputLocalizedSuccess(`command.vanish.ownsuccess`, isVisible);
			}
			else
			{
				outputLocalizedSuccess(`command.vanish.setsuccess`, target.name, isVisible);
			}
		},
	},
	

	tileid: {
		args: [],
		description: 'Checks id of a tile.',
		perm: Perm.none,
		handler({localizedOutput, handleTaps}){
			handleTaps("once");
			localizedOutput(`command.tileid.click`);
		},
		tapped({output, f, tile, copy, sender}){
			output(i18n(`command.tileid.id`, sender.locale, copy(tile.block().id)));
		}
	},

	...Object.fromEntries(
		FishServer.all.map(server => [
			server.name,
			{
				args: [],
				description: `Switches to the ${server.name} server.`,
				perm: server.requiredPerm ? Perm.getByName(server.requiredPerm) : Perm.none,
				isHidden: true,
				handler({ sender, lastUsedSuccessfullySender }) {
					if(Date.now() - lastUsedSuccessfullySender > Duration.minutes(1))
						FishPlayer.locMessageAllWithPerm(server.requiredPerm,
							// `${sender.name}[magenta] has gone to the ${server.name} server. Use [cyan]/${server.name} [magenta]to join them!`
							`command.server.hasswitched`, sender.name, server.name
						);
					Call.connect(sender.con(), server.ip, server.port);
				},
			} satisfies FishCommandData<string, any>,
		])
	),

	switch: {
		args: ["server:string", "target:playerOn?"],
		description: "Switches to another server.",
		perm: Perm.play,
		handler({args, sender, f, lastUsedSuccessfullySender, localize}){
			if(args.target != null && args.target != sender && !sender.canModerate(args.target, true, "admin", true))
				fail(localize(`command.switch.noperms`, args.target.name));
			const target = args.target ?? sender;
			if(ipPortPattern.test(args.server) && sender.hasPerm("admin")){
				//direct connect
				const ipPort = args.server.split(":");
				Call.connect(target.con(), ipPort[0], ipPort[1]);
			} else {
				// const unknownServerMessage = `Unknown server ${args.server}. Valid options: ${FishServer.all.filter(s => !s.requiredPerm || sender.hasPerm(s.requiredPerm)).map(s => s.name).join(", ")}`;
				const unknownServerMessage = localize(`command.switch.unknownserver`, args.server, FishServer.all.filter(s => !s.requiredPerm || sender.hasPerm(s.requiredPerm)).map(s => s.name).join(", "));
				const server = FishServer.byName(args.server)
					?? fail(unknownServerMessage);

				//Pretend the server doesn't exist
				if(server.requiredPerm && !sender.hasPerm(server.requiredPerm))
					fail(unknownServerMessage);

				if(target == sender && Date.now() - lastUsedSuccessfullySender > Duration.minutes(1))
					FishPlayer.locMessageAllWithPerm(server.requiredPerm,
						`command.server.hasswitched`, sender.name, server.name
					);

				Call.connect(target.con(), server.ip, server.port);
			}
		}
	},

	s: {
		args: ['message:string'],
		description: `Sends a message to staff only.`,
		perm: Perm.chat,
		async handler({ sender, args, outputLocalizedSuccess, outputLocalizedFail, lastUsedSender, localize }){
			if(!sender.hasPerm("mod")){
				if(Date.now() - lastUsedSender < 4000) fail(localize`command.s.alreadyused`);
			}
			FishPlayer.messageStaff(sender.prefixedName, args.message, sender.hasPerm("mod"));
			try {
				await api.sendStaffMessage(args.message, sender.name, sender.hasPerm("mod"));
				if(!sender.hasPerm("mod")){
					outputLocalizedSuccess(`command.s.success`);
				}
			} catch {
				outputLocalizedFail(`command.s.failed`);
			}
		},
	},

	/**
	 * This command is mostly for mobile (or players without foos).
	 *
	 * Since the player's unit follows the camera and we are moving the
	 * camera, we need to keep setting the players real position to the
	 * spot the command was made. This is pretty buggy but otherwise the
	 * player will be up the target player's butt
	 */
	watch: command({
		args: ['player:playerOn?'],
		description: `Watch/unwatch a player.`,
		perm: Perm.none,
		data: new Set<string>,
		async handler({ args, data, sender, outputLocalizedSuccess, outputLocalizedFail, localize }) {
			if(!sender.con().mobile) await Menu.confirmDangerous(sender, localize`command.watch.warning`);
			if(data.has(sender.uuid)){
				outputLocalizedSuccess(`command.watch.success`);
				data.delete(sender.uuid);
			} else if(args.player){
				data.add(sender.uuid);
				const senderUnit = sender.unit() ?? fail(localize`command.watch.nounit`);
				const stayX = senderUnit.x;
				const stayY = senderUnit.y;
				const target = args.player.player!;
				(function watch(){
					const unit = target.unit();
					if(data.has(sender.uuid) && unit){
						// Self.X+(172.5-Self.X)/10
						Call.setCameraPosition(sender.con(), unit.x, unit.y);
						if(senderUnit) senderUnit.set(stayX, stayY);
						Timer.schedule(() => watch(), 0.1, 0.1, 0);
					} else {
						Call.setCameraPosition(sender.con(), stayX, stayY);
					}
				})();
			} else {
				outputLocalizedFail(`command.watch.warning`);
			}
		},
	}),
	spectate: command(() => {
		/** Mapping between player and original team */
		const spectators = new Map<FishPlayer, Team>();
		function spectate(target:FishPlayer<true>){
			spectators.set(target, target.team());
			target.forceRespawn();
			target.setTeam(Team.derelict);
			target.forceRespawn();
		}
		function resume(target:FishPlayer<true>){
			if(spectators.get(target) == null) return; // this state is possible for a person who left not in spectate
			target.setTeam(spectators.get(target)!);
			spectators.delete(target);
			target.forceRespawn();
		}
		Events.on(EventType.GameOverEvent, () => spectators.clear());
		Events.on(EventType.PlayerLeave, ({player}:{player:mindustryPlayer}) => resume(FishPlayer.get(player) as FishPlayer<true>));
		return {
			args: ["target:playerOn?"],
			description: `Toggles spectator mode in PVP games.`,
			perm: Perm.play,
			requirements: [Req.gameRunning],
			handler({sender, args: {target = sender}, outputSuccess, f, localize}){
				if(!Gamemode.pvp() && !sender.hasPerm("mod")) fail(localize`command.spectate.noperms`);
				if(target !== sender && target.hasPerm("blockTrolling")) fail(localize`command.spectate.untrollable`);
				if(target !== sender && !sender.ranksAtLeast("admin")) fail(localize`command.spectate.nopermsspec`);
				if(spectators.has(target)){
					resume(target);
					outputSuccess(target == sender
						? localize(`command.spectate.rejoining`, `${target.team().coloredName()}`)
						: localize(`command.spectate.kickedout`, `${target.name}`)
					);
				} else {
					spectate(target);
					outputSuccess(target == sender
						? localize`command.spectate.spectating`
						: localize(`command.spectate.kickedin`, target.name))
					;
				}
			}
		};
	}),
	help: {
		args: ['name:string?'],
		description: 'Displays a list of all commands under the specified category, or, displays information about one command.',
		perm: Perm.none,
		handler({ args, output, sender, allCommands, localize }) {
			const formatCommand = (name: string, color: string) =>
				new StringBuilder()
					.add(`${color}/${name}`)
					.chunk(`[white]${allCommands[name].args.map(formatArg).join(' ')}`)
					.chunk(`[lightgray]- ${allCommands[name].description}`).str;
			const formatList = (commandList: string[], color: string) => commandList.map((c) => formatCommand(c, color)).join('\n');

			if(args.name && ["selectors", "select", "selector", "@help", "@?"].includes(args.name)){
				output(localize`selectors`);
			} else if (args.name && isNaN(parseInt(args.name)) && !['mod', 'admin', 'member', 'manager', 'trusted'].includes(args.name)) {
				//name is not a number or a category, therefore it is probably a command name
				if (args.name in allCommands && (!allCommands[args.name].isHidden || allCommands[args.name].perm.check(sender))) {
					if(args.name == "help") Achievements.help_help.grantTo(sender, false);
					output(
`Help for command ${args.name}:
	${allCommands[args.name].description}
	Usage: [sky]/${args.name} [white]${allCommands[args.name].args.map(formatArg).join(' ')}
	Permission required: ${allCommands[args.name].perm.name}`
					);
				} else fail(`Command "${args.name}" does not exist.`);
			} else {
				const commands = Object.entries(allCommands).reduce((acc, [name, data]) => {
					(acc[data.perm.category()] ??= []).push(name);
					return acc;
				}, {} as Record<PermCategory, string[]>);

				const chunkedPlayerCommands: string[][] = to2DArray(commands.player, 15);

				switch (args.name) {
					case "trusted": case "mod": case "admin": case "manager": case 'member': {
						const perm = Perm.perms[args.name];
						if(!perm) crash(`Cannot find a color for ${args.name}`);
						output(`${perm.color}-- ${capitalizeText(args.name)} commands --\n` + formatList(commands[args.name], perm.color));
						break;
					}
					default: {
						const pageNumber = args.name != undefined ? parseInt(args.name) : 1;
						const page = chunkedPlayerCommands[pageNumber - 1] ?? fail(`"${args.name}" is an invalid page number.`);
						if(args.name == undefined) output(`[sky]For other categories, run [accent]/help [lightgray]<[]trusted[lightgray]|[]mod[lightgray]|[]admin[lightgray]|[]member[lightgray]>[][].`);
						output(`[sky]-- Commands page [lightgrey]${pageNumber}/${chunkedPlayerCommands.length}[sky] --\n` + formatList(page, '[sky]'));
					}
				}
			}
		},
	},

	msg: {
		args: ['player:playerOn', 'message:string'],
		description: 'Send a message to only one player.',
		perm: Perm.chat,
		handler({ args, sender, localizedOutput, f, localize }) {
			recentWhispers[args.player.uuid] = sender.uuid;
			args.player.recentPlayers.clear();
			args.player.recentPlayers.add(sender);
			// args.player.sendMessage(`${sender.prefixedName}[lightgray] whispered:[#BBBBBB] ${args.message}`);
			args.player.sendMessage(i18n(`command.msg.incoming`, args.player.locale, sender.prefixedName, args.message));
			// output(f`[lightgray]Whispered to ${args.player}[lightgray]:[#BBBBBB] ${args.message}`);
			localizedOutput(`command.msg.outgoing`, args.player.prefixedName, args.message);
		},
	},

	r: {
		args: ['message:string'],
		description: 'Reply to the most recent message.',
		perm: Perm.chat,
		handler({ args, sender, output, f, localize }) {
			const recipient = FishPlayer.getById(recentWhispers[sender.uuid] ?? fail(localize`command.r.nomessages`));
			if(!(recipient?.connected())) fail(localize`command.r.unconnected`);
			recentWhispers[recentWhispers[sender.uuid]] = sender.uuid;
			recipient.sendMessage(i18n(`command.msg.incoming`, recipient.locale, sender.prefixedName, args.message));
			output(localize(`command.msg.outgoing`, sender.prefixedName, args.message));
		},
	},

	trail: {
		args: ['type:string?', 'color:string?'],
		description: 'Use command to see options and toggle trail on/off.',
		perm: Perm.none,
		handler({ args, sender, output, outputFail, outputSuccess, localize }) {
			//overload 1: type not specified
			if(!args.type){
				if(sender.trail != null){
					sender.trail = null;
					outputSuccess(localize`command.trail.off`);
				} else {
					output(localize`command.trail.types`);
				}
				return;
			}

			//overload 2: type specified
			const trailTypes = {
				"1": 'fluxVapor',
				"2": 'overclocked',
				"3": 'overdriven',
				"4": 'shieldBreak',
				"5": 'upgradeCoreBloom',
				"6": 'electrified',
				"7": 'unitDust',
			};

			const selectedType = trailTypes[args.type as keyof typeof trailTypes] as string | undefined;
			if(!selectedType){
				if(Object.values(trailTypes).includes(args.type)) fail(localize`command.trail.usenumeric`);
				else fail(localize(`command.trail.unavailable`, args.type));
			}

			const color = args.color ? getColor(args.color) : Color.white;
			if (color instanceof Color) {
				sender.trail = {
					type: selectedType,
					color,
				};
			} else {
				outputFail(localize(`command.trail.notcolor`, args.color));
			}
		},
	},

	ohno: command({
		args: [],
		description: 'Spawns an ohno.',
		perm: Perm.play,
		init(){
			const Ohnos = {
				enabled: true,
				ohnos: new Array<Unit>(),
				makeOhno(team:Team, x:number, y:number){
					const ohno = UnitTypes.atrax.create(team);
					ohno.set(x, y);
					ohno.type = UnitTypes.alpha;
					ohno.apply(StatusEffects.disarmed, Number.MAX_SAFE_INTEGER);
					ohno.resetController(); //does this work?
					ohno.add();
					this.ohnos.push(ohno);
					return ohno;
				},
				updateLength(){
					this.ohnos = this.ohnos.filter(o => o && o.isAdded() && !o.dead);
				},
				checkAchievement(){
					for(const ohno of this.ohnos){
						const player = ohno.getPlayer();
						if(player) Achievements.ohno.grantTo(FishPlayer.get(player), false);
					}
				},
				killAll(){
					this.ohnos.forEach(ohno => ohno?.kill?.());
					this.ohnos = [];
				},
				amount(){
					return this.ohnos.length;
				},
			};
			Events.on(EventType.GameOverEvent, (_) => {
				Ohnos.killAll();
			});
			Timer.schedule(() => Ohnos.checkAchievement(), 1, 2);
			return Ohnos;
		},
		requirements: [
			Req.gameRunning, Req.modeNot("pvp"),
			Req.unitExists(`You cannot spawn ohnos while dead.`)
		],
		handler({sender, data:Ohnos, localize}){
			if(!Ohnos.enabled) fail(localize`command.ohno.disabled`);
			Ohnos.updateLength();
			if(
				Ohnos.ohnos.length >= (Groups.player.size() + 1) ||
				sender.team().data().countType(UnitTypes.alpha) >= Units.getCap(sender.team())
			) fail(localize`command.ohno.max`);
			if(nearbyEnemyTile((sender.unit()!), 6) != null) fail(localize`command.ohno.enemy`);
			if(!Vars.fogControl.isDiscovered(sender.team(), sender.player.x, sender.player.y))
				fail(localize`command.ohno.fog`);
			if(!UnitTypes.alpha.supportsEnv(Vars.state.rules.env)) fail(localize`command.ohno.alpha`);
	
			Ohnos.makeOhno(sender.team(), sender.player.x, sender.player.y);
		},
	}),

	ranks: {
		args: [],
		description: 'Displays information about all ranks.',
		perm: Perm.none,
		handler({ output, copy, sender, localize }){
			output(
				localize`command.ranks.ranklist` +
					Object.values(Rank.ranks)
						.map((rank) => `${copy(rank.prefix)} ${rank.coloredName(sender.locale)}: ${rank.color}${rank.getDescription(sender.locale)}[]\n`)
						.join("") +
				localize`command.ranks.flaglist` +
				Object.values(RoleFlag.flags)
					.map((flag) => `${copy(flag.prefix)} ${flag.coloredName(sender.locale)}: ${flag.color}${flag.getDescription(sender.locale)}[]\n`)
					.join("")
			);
		},
	},

	rules: {
		args: ['player:playerOn?'],
		description: 'Displays the server rules.',
		perm: Perm.none,
		handler({args, sender, output, outputSuccess, f, lastUsedSuccessfullySender, localize}){
			const target = args.player ?? sender;
			if(target !== sender){
				if(!sender.hasPerm("warn")) fail(localize`command.rules.noperms`);
				if(!sender.canModerate(target)) Req.cooldown(Duration.minutes(10))({lastUsedSuccessfullySender});
				if(target.hasPerm("blockTrolling")) fail(localize(`command.rules.untrollable`, target.name));
			}
			void target.showRules(["No"]).then((option) => {
				if(option == "No"){
					target.kick(i18n(`command.rules.kicked`, target.locale), 1);
					if(target !== sender) outputSuccess(localize`command.rules.plkicked`);
				} else if(option == null){
					if(target !== sender) output(localize`command.rules.menuclosed`);
				} else {
					if(target !== sender) outputSuccess(localize`command.rules.acknowledged`);
				}
			});
			if(target !== sender) outputSuccess(localize(`command.rules.reminded`, target.name));
		},
	},

	void: {
		args: ["player:playerOn?"],
		description: 'Warns other players about power voids.',
		perm: Perm.play,
		requirements: ({args}) => [
			Req.mode("attack"),
			args.player ? Req.cooldown(20_000) : Req.cooldownGlobal(10_000)
		],
		handler({args, sender, outputSuccess, f, localize}){
			if(args.player){
				if(!sender.hasPerm("trusted")) fail(localize`command.void.noperms`);
				if(args.player !== sender && args.player.hasPerm("blockTrolling")) fail(`Target player is insufficiently trollable.`);
				void Menu.menu(i18n(`command.void.menu.title`, args.player.locale),
					i18n(`command.void.menu.description`, args.player.locale),
					[i18n(`command.void.menu.button`, args.player.locale)], args.player,
					{ onCancel: 'null' },
				).then(() => outputSuccess(localize(`command.void.acknowledged`, args.player!.name)));
				logAction("showed void warning", sender, args.player);
				outputSuccess(localize(`command.void.success`, args.player.name));
			} else {
				sendLocalizedMessage(`command.void.description`);
			}
		},
	},

	team: {
		args: ['team:team', 'reason:string?'],
		description: 'Changes your team.',
		perm: Perm.changeTeam,
		handler({sender, args: {team, reason}, outputSuccess, f, localize}){
			if(Gamemode.sandbox() && fishState.peacefulMode && !sender.hasPerm("admin"))
				fail(localize`command.team.nopeace`);
			if(Gamemode.sandbox() && team === Vars.state.rules.waveTeam && !sender.hasPerm("admin"))
				fail(localize`command.team.nowave`);
			if(!(Gamemode.sandbox() || Gamemode.testsrv()) && !sender.hasPerm("mod") && !reason) fail(localize`command.team.noreason`);
			if(!sender.hasPerm("changeTeamExternal")){
				if(team.data().cores.size <= 0) fail(localize`command.team.nocores`);
				if(!sender.player.dead() && !sender.unit()?.spawnedByCore)
					sender.forceRespawn();
			}
			if(!sender.hasPerm("mod")) sender.changedTeam = true;
			sender.setTeam(team);
			outputSuccess(f`Changed your team to ${team}.`);
			if(reason && !Gamemode.sandbox()) logAction(`changed team to ${team.name} on ${escapeTextDiscord(Vars.state.map.plainName())} with reason ${escapeTextDiscord(reason)}`, sender);
		},
	},

	teamp: {
		args: ['team:team', 'target:playerOn'],
		description: 'Changes the team of a player.',
		perm: Perm.changeTeam,
		handler({sender, args: {team, target}, outputSuccess, f}){
			if(!sender.canModerate(target, true, "mod", true)) fail(f`You do not have permission to change the team of ${target}`);
			if(Gamemode.sandbox() && fishState.peacefulMode && !sender.hasPerm("admin")) fail(`You do not have permission to change teams because peaceful mode is on.`);
			if(!sender.hasPerm("changeTeamExternal")){
				if(team.data().cores.size <= 0) fail(`You do not have permission to change to a team with no cores.`);
				if(!target.player.dead() && !target.unit()?.spawnedByCore)
					target.forceRespawn();
			}
			target.setTeam(team);
			outputSuccess(f`Changed team of player ${target} to ${team}.`);
		},
	},

	rank: {
		args: ['player:player'],
		description: 'Displays the rank of a player.',
		perm: Perm.none,
		handler({args, output, f}) {
			output(f`Player ${args.player}'s rank is ${args.player.rank}.`);
		},
	},

	
	forcevnw: {
		args: ["force:boolean?"],
		description: 'Force skip to the next wave.',
		perm: Perm.admin,
		handler({allCommands, sender, args:{force = true}}){
			if(allCommands.vnw.data.manager.session == null){
				if(!force) fail(`Cannot clear votes for VNW because no vote is currently ongoing.`);
				skipWaves(1, true);
			} else {
				if(force) Call.sendMessage(`VNW: [green]Vote was forced by admin [yellow]${sender.name}[green], skipping wave.`);
				else Call.sendMessage(`VNW: [red]Votes cleared by admin [yellow]${sender.name}[red].`);
				allCommands.vnw.data.manager.forceVote(force);
			}
		},
	},

	vnw: command({
		args: ["waves:number?"],
		description: "Vote to start the next wave.",
		perm: Perm.play,
		init: () => ({
			manager: new VoteManager<number>(Duration.minutes(1.5))
				.on("success", (t) => skipWaves(t.session!.data, true))
				.on("vote passed", () => Call.sendMessage('VNW: [green]Vote passed, skipping to next wave.'))
				.on("vote failed", () => Call.sendMessage('VNW: [red]Vote failed.'))
				.on("player vote change", (t, player) => Call.sendMessage(`VNW: ${player.name} [white] has voted on skipping [accent]${t.session!.data}[white] wave(s). [green]${t.currentVotes()}[white] votes, [green]${t.requiredVotes()}[white] required.`))
				.on("player vote removed", (t, player) => Call.sendMessage(`VNW: ${player.name} [white] has left. [green]${t.currentVotes()}[white] votes, [green]${t.requiredVotes()}[white] required.`))
		}),
		requirements: [Req.cooldown(3000), Req.integerRange("waves", 1, 15), Req.mode("survival", "testsrv"), Req.gameRunning],
		async handler({sender, args: {waves}, data:{manager}}){
			
			if (!vnwCondition.check()) fail("You can only do that when all units from previous waves are dead.");
			//Disable narrowing, this is async
			if(!manager.session as boolean){
				waves ??= await Menu.menu(
					"Start a Next Wave Vote",
					"Select the amount of waves you would like to skip.",
					[1, 5, 10],
					sender,
					{
						includeCancel: true,
						optionStringifier: n => `${n} waves`
					}
				);
				if(manager.session){
					//Someone else started a vote
					if(manager.session.data != waves) fail(`Someone else started a vote with a different number of waves to skip.`);
					else manager.vote(sender, sender.voteWeight(), waves);
				} else {
					manager.start(sender, sender.voteWeight(), waves);
				}
			} else {
				manager.vote(sender, sender.voteWeight(), null);
			}
		}	
	}),

	forcertv: {
		args: ["force:boolean?"],
		description: 'Force skip to the next map.',
		perm: Perm.admin,
		handler({args:{force = true}, sender, allCommands}){
			if(allCommands.rtv.data.manager.session == null){
				if(!force) fail(`Cannot clear votes for RTV because no vote is currently ongoing.`);
				allCommands.rtv.data.manager.forceVote(true);
			} else {
				if(force) Call.sendMessage(`RTV: [green]Vote was forced by admin [yellow]${sender.name}[green].`);
				else Call.sendMessage(`RTV: [red]Votes cleared by admin [yellow]${sender.name}[red].`);
				allCommands.rtv.data.manager.forceVote(force);
			}
		}
	},

	rtv: command({
		args: [],
		description: 'Rock the vote to change map.',
		perm: Perm.play,
		init: () => ({
			manager: new VoteManager(Duration.minutes(1.5), Gamemode.hexed() ? ["fractionOfVoters", 1] : undefined) //Require unanimity in Hexed, as it is often 1 v everyone
				.on("success", () => neutralGameover())
				.on("vote passed", () => sendLocalizedMessage("command.rtv.passed"))
				.on("vote failed", () => sendLocalizedMessage("command.rtv.failed"))
				.on("player vote change", (t, player, oldVote, newVote) => Groups.player.each(p=>p.sendMessage(i18n("command.rtv.voted", p.locale, player.name, oldVote == newVote ? i18n("command.rtv.oldvote",p.locale) : "", t.currentVotes(), t.requiredVotes()))))
				.on("player vote removed", (t, player) => Groups.player.each(p=>p.sendMessage(i18n("command.rtv.removed", p.locale, player.name, t.currentVotes(), t.requiredVotes()))))
		}),
		requirements: [Req.cooldown(10000), Req.gameRunning],
		handler({sender, data:{manager}}){
			manager.vote(sender, 1, 0); //No weighting for RTV except for removing AFK players
		}
	}),

	// votekick: command({
	// 	args: ["target:player"],
	// 	description: "Starts a vote to kick a player.",
	// 	perm: Perm.play,
	// 	data: new VoteManager<FishPlayer>(
	// 		Duration.seconds(20),
	// 		["absolute", 3],
	// 		(fishP, target) => fishP.team() == target.team() || fishP.hasPerm("voteOtherTeams")
	// 	),
	// 	handler({args, sender, data: votekickmanager}){
	// 		if(votekickmanager.session) fail(`There is already a votekick in progress.`);
	// 		votekickmanager.start(sender, 1, args.target);
	// 	}
	// }),

	// vote: {
	// 	 args: ["vote:boolean"],
	// 	 description: "Use /votekick instead.",
	// 	 perm: Perm.play,
	// 	 handler({sender, args, allCommands}){
	// 		const votekickmanager = allCommands.votekick.data;
	// 		votekickmanager.handleVote(sender, args ? 1 : -1);
	// 	 }
	// },

	forcenextmap: {
		args: ["map:mapOrRandom"],
		description: 'Override the next map in queue.',
		perm: Perm.admin.exceptModes({
			testsrv: Perm.play
		}),
		handler({allCommands, args, sender, outputSuccess, f}){
			Vars.maps.setNextMapOverride(args.map == "random" ? null : args.map);
			if(allCommands.nextmap.data.voteEndTime() > -1){
				//Cancel /nextmap vote if it's ongoing
				allCommands.nextmap.data.resetVotes();
				Call.sendMessage(`[red]Admin ${sender.name}[red] has cancelled the vote. The next map will be ${args.map == "random" ? "random" : `[yellow]${args.map.name()}`}.`);
			} else {
				outputSuccess(f`Forced the next map to be ${
					args.map == "random" ? "random" : `"${args.map.name()}" by ${args.map.author()}`
				}.`);
			}
		},

	},

	maps: {
		args: [],
		description: 'Lists the available maps.',
		perm: Perm.none,
		handler({output, copy}){
			output(`\
[yellow]Use [white]/nextmap [lightgray]<map name> [yellow]to vote on a map.

[blue]Available maps:
_________________________
${Vars.maps.customMaps().toArray().map(map =>
`[yellow]${copy(map.name())}`
).join("\n")}`
			);
		}
	},

	nextmap: command(() => {
		const random = {
			name(){ return "[lightgray]Random"; },
			plainName(){ return "random"; }
		};
		type Random = typeof random;
		const votes = new Map<FishPlayer, MMap | Random>();
		let lastVoteCount = 0;
		let lastVoteTime = 0;
		let voteEndTime = -1;
		const voteDuration = Duration.minutes(1.5);
		let task: TimerTask | null = null;

		function resetVotes(){
			votes.clear();
			voteEndTime = -1;
			task?.cancel();
		}

		function getMapData():Seq<ObjectIntMapEntry<MMap | Random>> {
			const map = [...votes.values()].reduce(
				(acc, map) => (acc.increment(map), acc), new ObjectIntMap<MMap | Random>()
			);
			const out = new Seq<ObjectIntMapEntry<MMap | Random>>(map.size);
			map.forEach(({key, value}) => out.add({key, value}));
			return out;
		}

		function showVotes(){
			sendLocalizedMessage("command.nextmap.curvotes", getMapData().map(({key:map, value:votes}) =>
			`[cyan]${map.name()}[yellow]: ${votes}`
			).toString("\n"));
		}

		function startVote(){
			voteEndTime = Date.now() + voteDuration;
			task = Timer.schedule(endVote, voteDuration / 1000);
		}

		function endVote(){
			if(voteEndTime == -1) return; //aborted somehow
			if(votes.size == 0) return; //no votes?

			if(votes.size + 2 <= lastVoteCount && (Date.now() - lastVoteTime) < Duration.minutes(10)){
				//If the number of votes is 2 less than the previous number of votes for a vote in the past 10 minutes, abor
				sendLocalizedMessage("command.nextmap.toolow");
				resetVotes();
				return;
			} else {
				lastVoteTime = Date.now();
				lastVoteCount = votes.size;
			}

			const mapData = getMapData();
			const highestVoteCount = mapData.max(floatf(e => e.value)).value;
			const highestVotedMaps = mapData.select(e => e.value == highestVoteCount);
			let winner:MMap | Random;

			if(highestVotedMaps.size > 1){
				winner = highestVotedMaps.random()!.key;
				sendLocalizedMessage("command.nextmap.tie", highestVotedMaps.map(({key:map, value:votes}) =>
				`[cyan]${map.name()}[yellow]: ${votes}`
				).toString("\n"), winner.name(),
				);
			} else {
				winner = highestVotedMaps.get(0).key;
				sendLocalizedMessage(`command.nextmap.success`, winner.name(), highestVoteCount);
			}
			Vars.maps.setNextMapOverride(winner == random ? null : (winner as MMap));
			resetVotes();
		}

		Events.on(EventType.GameOverEvent, resetVotes);
		Events.on(EventType.ServerLoadEvent, resetVotes);

		return {
			args: ['map:mapOrRandom'],
			description: 'Allows you to vote for the next map. Use /maps to see all available maps.',
			perm: Perm.play,
			data: {votes, voteEndTime: () => voteEndTime, resetVotes, endVote},
			requirements: [Req.cooldown(10_000)],
			handler({args, sender, outputLocalizedFail: localizedFail}){
				const map = args.map === "random" ? random : args.map;
				if(Gamemode.testsrv()) localizedFail(`command.nextmap.useforce`);
				if(votes.get(sender)) localizedFail(`command.nextmap.alreadyvote`);
				
				if(voteEndTime == -1){
					if((Date.now() - lastVoteTime) < Duration.minutes(1)) localizedFail(`command.nextmap.toofast`);
					startVote();
					votes.set(sender, map);
					sendLocalizedMessage(`command.nextmap.started`, sender.name, map.name(), map.plainName());
				} else {
					votes.set(sender, map);
					Groups.player.each(p => p.sendMessage(i18n("command.nextmap.voted", p.locale, sender.name, map.name(), formatTimeRelativeLocalize(voteEndTime, p.locale, true))));
					showVotes();
				}
			}
		};
	}),
	surrender: command(() => {
		const prefix = "[orange]Surrender[white]: ";
		const managers = Team.all.map(team =>
			new VoteManager<number>(
				Duration.minutes(1.5),
				["fractionOfVoters", Gamemode.hexed() ? 1 : 3/4],
				p => p.team() == team,
			)
				.on("success", () => team.cores().copy().each(c => c.kill()))
				.on("vote passed", () => Call.sendMessage(
					prefix + `Team ${team.coloredName()} has voted to forfeit this match.`
				))
				.on("vote failed", t => t.messageEligibleVoters(
					prefix + `Team ${team.coloredName()} has chosen not to forfeit this match.`
				))
				.on("player vote change", (t, player, oldVote, newVote) => t.messageEligibleVoters(
					prefix + `${player.name}[white] ${oldVote == newVote ? "still " : ""}wants to forfeit this match. [orange]${t.currentVotes()}[white] votes, [orange]${t.requiredVotes()}[white] required.`
				))
				.on("player vote removed", (t, player) => t.messageEligibleVoters(
					prefix + `Player ${player.name}[white] has left the game. [orange]${t.currentVotes()}[white] votes, [orange]${t.requiredVotes()}[white] required.`
				))
		);

		FishEvents.on("playerTeamChange", (_, fishP, previous) => {
			managers[previous.id].unvote(fishP);
		});

		return {
			args: ["force:boolean?", "team:team?"],
			description: "Vote to surrender to the enemy team.",
			perm: Perm.play,
			requirements: ({sender}) => [
				Req.mode("pvp"), Req.teamAlive,
				Req.cooldown(sender.ranksAtLeast("mod") ? 5_000 : 20_000)
			],
			data: { managers },
			async handler({ sender, args: {force, team} }){
				const t = sender.hasPerm("admin") && team ? team : sender.team();
				const manager = managers[t.id];
				if(sender.hasPerm("admin") && force != undefined){
					if(force){
						await Menu.confirmDangerous(sender, `Are you sure you want to force team ${t.coloredName()}[] to lose?`);
						manager.messageEligibleVoters(prefix + `Vote forced by admin ${sender.name}[white].`);
						Call.sendMessage(
							prefix + `Team ${t.coloredName()} has voted to forfeit this match.`
						);
					} else {
						manager.messageEligibleVoters(prefix + `Votes cleared by admin ${sender.name}[white].`);
					}
					manager.forceVote(force);
					return;
				}
				if(manager.getEligibleVoters().length == 1)
					await Menu.confirmDangerous(sender, "Are you really sure you want to surrender? All of your buildings will be destroyed and the enemy team will win.");
				manager.vote(sender, 1, 0);
			},
		};
	}),
	stats: {
		args: ["target:player", "global:boolean?"],
		perm: Perm.none,
		description: "Views a player's stats.",
		async handler({args:{target, global = false}, output, player, f}){
			player(target);
			if(!target.dataSynced){
				await target.downloadData().catch(() => fail(`Error fetching data.`));
				target.dataSynced = true;
			}
			const stats = global ? target.globalStats : target.stats;
			output(f`[accent]\
Statistics for player ${target} ${global ? "across all servers" : "on this server"}:
(note: we started recording statistics on 22 Jan 2024)
[white]--------------[]
Blocks broken: ${stats.blocksBroken}
Blocks placed: ${stats.blocksPlaced}
Chat messages sent: ${stats.chatMessagesSent}
Games finished: ${stats.gamesFinished}
Time in-game: ${formatTime(stats.timeInGame)}
Win rate: ${stats.gamesWon / stats.gamesFinished}`
			);
		}
	},
	showworld: {
		args: ["x:number?", "y:number?", "size:number?"],
		perm: Perm.none,
		description: "Views the world as a 2D scrollable menu.",
		requirements: [Req.cooldown(4000), Req.integerRange("size", 1, 10)],
		handler({sender, args:{size = 7, x, y}}){
			if(Vars.state.rules.fog) fail(`This command is disabled when fog is enabled.`);
			const options = to2DArray((Reflect.get(Vars.world.tiles, "array") as Tile[]).map(tile => ({
				text: tile.block().emoji(),
				data: null,
			})), Vars.world.width()).reverse();
			const height = Vars.world.height();
			void Menu.scroll2D(sender, "The World", "Use the arrow keys to navigate around the world. Click a blank square to exit.", options, {
				columns: size,
				rows: size,
				x: x ? x - Math.trunc(size / 2) : 0,
				y: height - (y ? y + 1 + Math.trunc(size / 2) : size),
				getCenterText: (x, y) => `${x},${height - y - size}`
			});
		}
	},

	mapinfo: {
		args: ["map:map?"],
		perm: Perm.none,
		description: "Displays information about a map.",
		handler({output, args:{map}, f, sender}){
			if(map){
				const fmap = FMap.getCreate(map)
					?? fail("Map data is still being loaded, try again later.");
				output(fmap.displayStats(f)!);
			} else {
				void Menu.textPages(sender, Vars.maps.customMaps().map(m =>
					["Map information", () => FMap.getCreate(m)?.displayStats(f) ?? fail("Map data is still being loaded, try again later.")] as const
				).toArray(), [], {
					startPage: Vars.maps.customMaps().toArray().indexOf(Vars.state.map),
				});
			}
		}
	},

	gamemode: {
		args: ["mode:string"],
		perm: Perm.manager.exceptModes({
			testsrv: Perm.play,
		}),
		description: "Sets the gamemode.",
		requirements: ({sender}) => [Req.cooldownGlobal(sender.hasPerm('trusted') ? 10_000 : 30_000)],
		handler({args, sender, outputSuccess}){
			//Unpause
			Vars.state.set(GameState.State.playing);
			switch(args.mode){
				case "attack":
					Vars.state.rules.attackMode = true;
					Vars.state.rules.pvp = false;
					Vars.state.rules.infiniteResources = false;
					break;
				case "survival":
					Vars.state.rules.attackMode = false;
					Vars.state.rules.waves = true;
					Vars.state.rules.pvp = false;
					Vars.state.rules.infiniteResources = false;
					break;
				case "pvp":
					Vars.state.rules.attackMode = true;
					Vars.state.rules.pvp = true;
					Vars.state.rules.waves = false;
					Vars.state.rules.infiniteResources = false;
					break;
				case "sandbox":
					Vars.state.rules.attackMode = true;
					Vars.state.rules.pvp = false;
					Vars.state.rules.waves = false;
					Vars.state.rules.infiniteResources = true;
					break;
				default: fail(`Invalid mode, valid modes are: attack, survival, pvp`);
			}
			Call.sendMessage(`[orange]Player ${sender.prefixedName}[orange] changed the gamemode to ${args.mode}.`);
			outputSuccess(`Changed mode to ${args.mode}`);
			Call.setRules(Vars.state.rules);
		}
	},

	mixunit: {
		args: ["type:unittype", "base:unittype"],
		description: "Spawns a unit that is made of two unit types mixed together.",
		perm: Perm.admin.exceptModes({
			sandbox: Perm.play
		}),
		requirements: ({sender}) => [!sender.hasPerm("admin") && Req.cooldown(1500), Req.unitExists()].filter(Boolean),
		handler({args, sender, f, outputSuccess}){
			const { team, x, y } = sender.unit()!;
			const unit = args.base.create(team);
			unit.type = args.type;
			unit.maxHealth = args.type.health; //because half-dead units aren't fun
			unit.set(x, y);
			unit.add();
			outputSuccess(f`Spawned a ${args.type} that is partly a ${args.base}.`);
		}
	},

	achievement: {
		args: ["name:string?", "verbose:boolean?"],
		description: "Displays information on a specific achievement.",
		perm: Perm.none,
		async handler({args: {name = "", verbose = false}, sender, f, localize, output, copy}){
			name = Strings.stripColors(name.toLowerCase());
			
			const matching = Achievement.all.filter(a => Strings.stripColors(a.name).toLowerCase().includes(name));
			if(matching.length == 0)
				fail(localize(`command.achievement.notfound`, name));
			const achievement = matching.length > 2 ?
				await Menu.pagedList(sender, localize`command.achievement.menu.title`, localize`command.achievement.menu.description`, matching, {
					onCancel: "reject",
					columns: 2,
					optionStringifier: a => `${a.icon}[] ${a.name}`
				})
			: matching[0];
			
			// output(FColor.achievement`\
// Achievement ${achievement.icon} ${copy(achievement.name)}
// [white]--------------[]
// ${copy(achievement.description + (achievement.extendedDescription ? ("\n" + `[gray]${achievement.extendedDescription}`) : ""))}
// Allowed modes: ${achievement.modesText}
// Unlocked: ${f.boolGood(achievement.has(sender))}
// ${verbose ? `[gray]ID: (${achievement.nid})${achievement.sid}\n` : ""}\
// ${verbose ? `[gray]Notifies: ${achievement.notify}\n` : ""}\
// ${achievement.hidden ? "This achievement is secret." : ""}\
// `);

			output(FColor.achievement(localize("command.achievement.output",
				achievement.icon, 
				copy(localize(`achievement.${achievement.sid}.name`)), 
				copy(localize(`achievement.${achievement.sid}.description`, 
					...mapNameToDescArgs(achievement.sid, sender.locale)) + 
					(keyExists(`achievement.${achievement.sid}.note`)
						? ("\n" + `[gray]${localize(`achievement.${achievement.sid}.note`)}`)
						: "")), 
				achievement.modesText, 
				f.boolGoodLocalize(achievement.has(sender), sender.locale), 
				verbose ? localize("command.achievement.id", 
					achievement.nid, 
					achievement.sid) : "", 
				verbose ? localize("command.achievement.notifies", achievement.notify) : "", achievement.hidden ? localize("command.achievement.hidden") : "")));
			//TODO "x% of players have this achievement" tracking, requires backend aggregation endpoint
		}
	},

	achievementlist: {
		args: ["target:player?"],
		description: "Shows all achievements in a paged menu.",
		perm: Perm.none,
		async handler({sender, args: { target = sender }, f}){
			await Menu.textPages(
				sender,
				Achievement.all.filter(a => !a.hidden || a.has(target))
					.map(a => [
						`${a.icon}[] ${a.name}`,
						() => FColor.achievement`\
${a.description + (a.extendedDescription ? ("\n" + `[gray]${a.extendedDescription}`) : "")}
Allowed modes: ${a.modesText}
Unlocked: ${f.boolGood(a.has(target))}
${a.hidden ? "This achievement is secret." : ""}\
`
					])
			);
		}
	},

	achievementgrid: {
		args: ["target:player?"],
		description: "Shows all achievements in a 2D scrolling menu.",
		perm: Perm.none,
		async handler({sender, args: { target = sender }, f}){
			const visibleAchievements = Achievement.all.filter(a => !a.hidden || a.has(target));
			const options = to2DArray(visibleAchievements, 7).map(row => row.map(a => ({
				data: a,
				text: a.has(target) ? a.icon : `[gray]${Strings.stripColors(a.icon)}`,
			})));
			const numberAchievements = Achievement.all.filter(a => a.has(target)).length;
			const totalAchievements = visibleAchievements.length;
			let x = 0, y = 0;
			let a: Achievement | null = null;
			while(true){
				//the loop will be aborted if the menu is cancelled (promise will reject)
				[a, x, y] = await Menu.scroll2D(
					sender, "Achievements",
					a ? FColor.achievement`\
${a.icon} ${a.name}

${a.description + (a.extendedDescription ? ("\n" + `[gray]${a.extendedDescription}`) : "")}

Allowed modes: ${a.modesText}
Unlocked: ${f.boolGood(a.has(target))}
${a.hidden ? "This achievement is secret." : ""}\
` :
	(target == sender ? `You have ${numberAchievements}/${totalAchievements} achievements.`
	: FColor.achievement`Player ${target.prefixedName} has ${numberAchievements}/${totalAchievements} achievements.`)
	+ "\nClick an achievement icon to show more information.",
					options,
					{ onCancel: "reject", columns: 5, rows: 4, getCenterText: () => String.fromCharCode(Iconc.settings), x, y }
				);
				if(a == Achievements.click_me && target == sender) a.grantTo(sender);
			}
		}
	},
	skipconfirm: {
		args: ["duration:time?"],
		description: "Disables confirm popups for the specified duration.",
		perm: Perm.none,
		handler({ args: {duration}, sender, output, outputSuccess, localize}){
			if(Date.now() < sender.skipConfirm){
				duration ??= 0;
			} else {
				duration ??= Duration.minutes(2);
			}
			if(duration > Duration.hours(8))
				fail(localize`command.skipconfirm.maxduration`);
			sender.skipConfirm = Date.now() + duration;
			if(Date.now() < sender.skipConfirm) outputSuccess(localize(`command.skipconfirm.success`, formatTimeLocalize(duration, sender.locale)));
			else outputSuccess(`Re-enabled confirm popups.`);
			if(duration > Duration.hours(1)) output(localize`command.skipconfirm.warning`);
		}
	},
	copy: {
		args: [],
		description: "Copies relevant text from the previous command to your clipboard.",
		perm: Perm.none,
		async handler({ sender, outputSuccess, localize }){
			if(!sender.copyOptions || sender.copyOptions.length == 0) fail(localize`command.copy.nothing`);
			const response = sender.copyOptions.length == 1 ? sender.copyOptions[0] :
				await Menu.pagedList(
					sender, localize`command.copy.menu.title`, localize`command.copy.menu.description`,
					sender.copyOptions,
					{ optionStringifier: escapeStringColorsClient, columns: 1 }
				);
			Call.copyToClipboard(sender.con(), response);
			outputSuccess(localize`command.copy.success`);
		}
	},
	copyTo: {
		args: ["target:playerOn", "string:string"],
		description: "Copies the specified text to someone else's clipboard.",
		perm: Perm.mod,
		requirements: [Req.cooldown(5_000)],
		handler({ args: { target, string }, sender, f, outputSuccess }){
			Call.copyToClipboard(target.con(), string);
			target.sendMessage(`[accent]Copy: ${sender.prefixedName}[accent] sent you some text to copy.`);
			outputSuccess(f`Sent text to ${target}`);
		}
	},
});
