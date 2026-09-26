/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains timers that run code at regular intervals.
*/

import { Antibot } from "/automod";
import { fetchAntibotData, getStaffMessages, syncDosBlacklist } from "/api";
import * as config from "/config";
import { Gamemode } from "/config";
import { updateMaps } from "/files";
import { Duration, DurationSecs } from "/funcs";
import { dosBlacklistCopy, FishEvents, fishState, ipJoins, joinDemographics } from "/globals";
import { FishPlayer } from "/players";
import { definitelyRealMemoryCorruption, neutralGameover, unblacklist } from "/utils";
import { i18n, sendLocalizedMessage, sendLocalizedToast, sendLocMessageCB } from "/frameworks/i18n";


/** Must be called once, and only once, on server start. */
export function initializeTimers(){
	Timer.schedule(() => {
		Time.mark();
		//Autosave
		const file = Vars.saveDirectory.child('1' + '.' + Vars.saveExtension);
		Core.app.post(() => {
			Time.mark();
			Time.mark();
			Time.mark();
			SaveIO.save(file);
			Log.debug("SaveIO @", Time.elapsed());
			FishPlayer.saveAll();
			FishPlayer.uploadAll();
			Log.debug("Save/upload @", Time.elapsed());
			Groups.player.each(p => p.sendMessage("[#4fff8f9f]" + i18n("server.saved", p.locale)));
			FishEvents.fire("saveData", []);
			Log.debug("autosave on main thread @", Time.elapsed());
		});
		//Unblacklist trusted players
		for(const fishP of Object.values(FishPlayer.cachedPlayers)){
			if(fishP.ranksAtLeast("trusted")){
				unblacklist(fishP.info().lastIP);
			}
		}
		Log.debug("autosave @", Time.elapsed());
	}, 10, DurationSecs.minutes(5));
	//Memory corruption prank
	Timer.schedule(() => {
		if(Math.random() < 0.2 && !Gamemode.hexed()){
			//Timer triggers every 17 hours, and the random chance is 20%, so the average interval between pranks is 85 hours
			definitelyRealMemoryCorruption();
		}
	}, DurationSecs.hours(1), DurationSecs.hours(17));
	//Trails
	Timer.schedule(() =>
		FishPlayer.forEachPlayer(p => p.displayTrail()),
	5, 0.15);
	//Staff chat
	if(!config.Mode.noBackend)
		Timer.schedule(() => {
			getStaffMessages((messages) => {
				if(messages.length) FishPlayer.messageStaff(messages);
			});
			fetchAntibotData().then(m => {
				if(fishState.antibotData.nameBlacklist?.[0] != m.nameBlacklistRegex){
					fishState.antibotData.nameBlacklist = m.nameBlacklistRegex == null ? null : [m.nameBlacklistRegex, Pattern.compile(m.nameBlacklistRegex)];
				}
				if(fishState.antibotData.nameGraylist?.[0] != m.nameGraylistRegex){
					fishState.antibotData.nameGraylist = m.nameGraylistRegex == null ? null : [m.nameGraylistRegex, Pattern.compile(m.nameGraylistRegex)];
				}
			}).catch(() => {});
			const { dosBlacklist } = Vars.netServer.admins;
			const newIPs:string[] = [];
			if(dosBlacklistCopy.size != dosBlacklist.size){
				//Find new IPs
				dosBlacklist.each(ip => dosBlacklistCopy.add(ip) && newIPs.push(ip));
			}
			syncDosBlacklist(newIPs).then(ips => {
				if(ips.length != dosBlacklist.size){
					//this is technically wrong as the returned data could lose x and gain x ips at once
					//close enough
					dosBlacklist.clear();
					dosBlacklistCopy.clear();
					dosBlacklist.addAll(ips);
					dosBlacklistCopy.addAll(ips);
				}
			}).catch(() => {});
		}, 5, 2);
	//Tip
	Timer.schedule(() => {
		const showAd = Math.random() < 0.10; //10% chance every 15 minutes
		const willBeChristmas = Math.random() > 0.5;
		const messagePool =
			showAd ? config.tips.ads :
			(config.Mode.isChristmas && willBeChristmas) ? config.tips.christmas :
			config.tips.normal;
		const poolCategory = showAd ? "ads" :
			(config.Mode.isChristmas && willBeChristmas) ? "christmas" :
			"normal";
		const neededKey = messagePool[Math.floor(Math.random() * messagePool.length)];
		Groups.player.each(p=>
		{
			let messageText: string;
			if(neededKey == "colortags")
			{
				messageText = i18n(`tip.${poolCategory}.${neededKey}`, p.locale, ["pink", "green", "cyan", "acid", "royal", "coral"][Math.floor(Math.random() * 6)]);
			}
			else if(poolCategory == "ads")
			{
				messageText = i18n(`tip.${poolCategory}.${neededKey}`, p.locale, config.text.membershipURL);
			}
			else
			{
				messageText = i18n(`tip.${poolCategory}.${neededKey}`, p.locale);
			}
			const message = showAd ? `[gold]${messageText}[]` : i18n(`tip.prefix`, p.locale, messageText);
			p.sendMessage(message);
		}
		);
	}, 60, DurationSecs.minutes(15));
	//State check
	Timer.schedule(() => {
		if(Groups.unit.size() > 10000){
			sendLocalizedMessage("server.toomanyunits");
			Groups.unit.clear();
			neutralGameover();
		}
	}, 0, 1);
	Timer.schedule(() => {
		FishPlayer.updateAFKCheck();
	}, 0, 1);
	//deliberately updating state on clock tick:
	//avoids memory leak and other complications from Record<ip, IndexedRatekeeper>
	Timer.schedule(() => {
		ipJoins.clear();
		if(joinDemographics.size > 1000) joinDemographics.clear();
	}, 0, DurationSecs.minutes(1));
	Timer.schedule(() => {
		if(Antibot.antiBotMode()){
			sendLocalizedToast(`server.antibot`, 2, Vars.netServer.admins.dosBlacklist.size);
		}
	}, 0, 1);
}

Timer.schedule(() => {
	updateMaps()
		.then((result) => {
			if(result){
				sendLocalizedMessage("server.mapupdate");
				Log.info(`Updated maps.`);
			}
		})
		.catch((message) => {
			if(Date.now() - fishState.lastSuccessfulMapUpdate >= Duration.hours(1))
				sendLocalizedMessage("server.mapupdateerror");
			Log.err(`Automated map update failed: ${String(message)}`);
		});
}, DurationSecs.minutes(1), DurationSecs.minutes(10));
