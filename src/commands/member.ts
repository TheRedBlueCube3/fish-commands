/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains member commands, which are fun cosmetics for donators.
*/

import { Perm, Req, command, commandList, fail } from "/frameworks/commands";
import { localizedLabel } from "/frameworks/i18n";
import { fishState } from "/globals";
import { FishPlayer } from "/players";


export const commands = commandList({
	pet: command({
		args: ["name:string?"],
		description: 'Spawns a cool pet with a displayed name that follows you around.',
		perm: Perm.member,
		data: {} as Record<string, Unit>,
		handler({args, sender, data, outputSuccess, localize}){
			if(!args.name){
				const pet = data[sender.uuid];
				if(pet){
					pet.kill();
					delete data[sender.uuid];
					outputSuccess(localize`command.pet.removed`);
					return;
				}
			}
			const useKey = sender.muted() || !args.name;
			if(useKey || !args.name /* typescript moment */ ) args.name = "command.pet.petname";
			if(args.name.length > 500) fail(localize`command.pet.toolongname`);
			if(Strings.stripColors(args.name).length > 70)
				fail(localize`command.pet.toolongname.nocolortags`);
			data[sender.uuid]?.kill();
			const unit = sender.unit() ?? fail(localize`command.pet.nounit`);
			if(!Vars.fogControl.isDiscovered(sender.team(), World.conv(unit.x), World.conv(unit.y)))
				fail(localize`command.pet.fog`);
			const pet = UnitTypes.merui.spawn(sender.team(), unit.x, unit.y);
			pet.apply(StatusEffects.disarmed, Number.MAX_SAFE_INTEGER);
			data[sender.uuid] = pet;

			Call.infoPopup('[#7FD7FD7f]\uE81B', 5, Align.topRight, 180, 0, 0, 10);
			outputSuccess(localize`command.pet.success`);

			const petName = args.name;
			const id = fishState.labelID++;
			(function controlUnit(){
				try {
					const unit = sender.unit();
					const currentPet = data[sender.uuid];
					if(pet != currentPet){
						Call["label(java.lang.String,int,float,float,float,int)"](null, id, 0, 0, 0, 0);
						return;
					}
					if(currentPet.dead){
						delete data[sender.uuid];
						Call["label(java.lang.String,int,float,float,float,int)"](null, id, 0, 0, 0, 0);
						return;
					}
					if(!sender.connected()){
						currentPet?.kill();
						Call["label(java.lang.String,int,float,float,float,int)"](null, id, 0, 0, 0, 0);
						return;
					}
					if(unit && currentPet){
						const distX = unit.x - currentPet.x;
						const distY = unit.y - currentPet.y;
						Tmp.v1.set(distX, distY);
						if(Tmp.v1.len() > 50){
							currentPet.approach(Tmp.v1);
						}
						if(Tmp.v1.len() > 20*8){
							currentPet.apply(StatusEffects.fast, 60);
						}
						if(useKey)
							localizedLabel(petName, [sender.name], id, -1, currentPet.x, currentPet.y + 5);
						else
							Call.label(petName, id, -1, currentPet.x, currentPet.y + 5);
						//Pets share the sender's trail
						if(sender.trail){
							Call.effect(Fx[sender.trail.type], currentPet.x, currentPet.y, 0, sender.trail.color);
						}
					}
					return Timer.schedule(controlUnit, 0.05);
				} catch(err){
					Log.err(err);
				}
			})();
		}
	}),

	highlight: {
		args: ['color:string?'],
		description: 'Makes your chat text colored by default.',
		perm: Perm.member,
		handler({args, sender, outputFail, outputSuccess, localize}){
			if(args.color == null || args.color.length == 0){
				if(sender.highlight != null){
					sender.highlight = null;
					outputSuccess(localize`command.highlight.cleared`);
				} else {
					outputFail(localize`command.highlight.noclear`);
				}
			} else if(Strings.stripColors(args.color) == ""){
				sender.highlight = args.color;
				outputSuccess(localize("command.highlight.set", args.color.replace("[","").replace("]","")));
			} else if(Strings.stripColors(`[${args.color}]`) == ""){
				sender.highlight = `[${args.color}]`;
				outputSuccess(localize("command.highlight.set", args.color));
			} else {
				outputFail(localize("command.highlight.colornotvalid", args.color));
			}
		}
	},

	rainbow: {
		args: ["speed:number?"],
		description: 'Make your name change colors.',
		perm: Perm.member,
		requirements: [Req.integerRange("speed", 0, 10)],
		handler({args, sender, outputSuccess, localize}){
			const colors = ['[red]', '[orange]', '[yellow]', '[acid]', '[blue]', '[purple]'];
			function rainbowLoop(index:number, fishP:FishPlayer){
				if(!(fishP.rainbow && fishP.player && fishP.connected())) return;
				Timer.schedule(() => {
					if(!(fishP.rainbow && fishP.player && fishP.connected())) return;
					fishP.player.name = colors[index % colors.length] + Strings.stripColors(fishP.player.name);
					rainbowLoop(index + 1, fishP);
				}, fishP.rainbow.speed / 5);
			}

			if(!args.speed){
				sender.rainbow = null;
				sender.updateName();
				outputSuccess(localize`command.rainbow.off`);
			} else {
				sender.rainbow ??= { speed: args.speed };
				rainbowLoop(0, sender);
				outputSuccess(localize(`command.rainbow.on`, args.speed));
			}

		}
	}
});