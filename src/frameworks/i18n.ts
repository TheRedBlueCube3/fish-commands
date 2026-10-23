/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains helper functions for i18n (internationalization) support.
*/

import { Formattable } from "/frameworks/commands";
import { ipPattern, uuidPattern } from "/globals";
import { FishPlayer } from "/players";
import { Rank, RoleFlag } from "/ranks";

//#region I18N helpers
const handle = Vars.modDirectory.child("fish-commands/bundles/bundle");

const createLangBundles = <T extends string>(languages: T[]) => Object.fromEntries(languages.map(lang => [lang, I18NBundle.createBundle(handle, new Locale(lang == "en" ? "" : lang))]));

/** The list of languages with translations in the bundle.properties files. */
export const bundles = createLangBundles(["en", "ru"]);

export type AddedBundle = keyof typeof bundles;

/** Checks if the value returned by `.format` or `i18n` exists. */
export const valueExists: (val:string) => boolean = val => (!val.startsWith("???") && !val.endsWith("???"));

/** Checks if a key exists in the source locale. */
export const keyExists: (key: string) => boolean = key => (valueExists(bundles["en"].format(key)));

/** Localizes a string by returning the value associated with the key in the requested locale. If it doesn't exist, the English fallback value is returned. Accepts format parameters to replace the {x} strings from the value. */
export function i18n(key: string, locale: string, ...args: unknown[])
{
	// try passed locale first
	let bundle = bundles[locale as AddedBundle];
	if(!bundle && locale.includes("_")) // if the child locale doesn't exist
	{
		// try the parent locale
		bundle = bundles[locale.slice(0, 2) as AddedBundle];
	}
	const value = bundle ? bundle.format(key, ...args) : `???${key}???`;
	const enCheckValue = bundles["en"].format(key, ...args);
	if(!valueExists(enCheckValue) && valueExists(value)) Log.warn(`I18n key ${key} doesn't exist in source locale, but exists in locale ${locale}`);
	if(valueExists(value)) return value;

	// if passed locale fails, try English locale
	if(locale !== "en")
	{
		const enValue = bundles["en"].format(key, ...args);
		if(!valueExists(enValue))
		{
			Log.err(`Failed to get I18n key ${key} for fallback English locale!`);
			return `???${key}???`;
		}
		if(bundles[locale as AddedBundle]) Log.warn(`I18n key ${key} exists in source locale, but not in locale ${locale}`);
		return enValue;
	}
	else
	{
		Log.err(`Failed to get I18n key ${key} for source locale!`);
		return `???${key}???`;
	}
}
//#endregion
//#region Replacements

/** Replacement for `Call.sendMessage`. Takes keys and a format if required. */
export function sendLocalizedMessage(key: string, ...args: unknown[]): void
{
	Groups.player.each(player => player.sendMessage(i18n(key, player.locale, ...args)));
}

/** Replacement for `Call.infoToast`. Takes keys and a format if required. */
export function sendLocalizedToast(key: string, duration: number, ...args: unknown[]): void
{
	Groups.player.each(player => Call.infoToast(player.con, i18n(key, player.locale, ...args), duration));
}

export function localizedLabel(key: string | null, args: unknown[], id: number, duration: number, worldx: number, worldy: number, flags: number): void;
export function localizedLabel(key:string | null, args: unknown[], id:number, duration:number, worldx:number, worldy:number):void;
export function localizedLabel(key:string, args: unknown[], duration:number, worldx:number, worldy:number):void;

export function localizedLabel(key: string | null, args: unknown[], param1: number, param2: number, param3: number, param4?: number, param5?: number)
{
	if(arguments.length == 5)
		Groups.player.each(p=>Call["label(mindustry.net.NetConnection,java.lang.String,float,float,float)"](p.con, i18n(key!, p.locale, ...args), param1, param2, param3));
	else if(arguments.length == 6)
		Groups.player.each(p=>Call["label(mindustry.net.NetConnection,java.lang.String,int,float,float,float)"](p.con, key ? i18n(key, p.locale, ...args) : null, param1, param2, param3, param4!));
	else if(arguments.length == 7)
		Groups.player.each(p=>Call["label(mindustry.net.NetConnection,java.lang.String,int,float,float,float, int)"](p.con, key ? i18n(key, p.locale, ...args) : null, param1, param2, param3, param4!, param5!));
}

export function sendLocMessageCB(key: string, argsCB: (locale: string, localize: (key: string, arg: unknown[]) => string) => unknown[] = () => [])
{
	Groups.player.each(player => player.sendMessage(
		i18n(key, player.locale, ...argsCB(player.locale, (key, arg) => i18n(key, player.locale, ...arg))
		)
	)
	);
}

//#endregion
//#region Formatting

type FlocFunction = (() => string) | ((str: string) => string)

export const FLocColor = (
	<T extends string>(data:Record<T, string>):Record<T, {
		(): string;
		(str: string): string;
	}> =>
		Object.fromEntries(Object.entries(data).map(([k, c]) =>
			[k, (str?:string) =>
				str != null ?
					`${str}${c}[]`
				: c
			]
		))
)({
	discord: "[#7289DA]",
	/** Used for tips and welcome messages. */
	tip: "[gold]",
	member: "[pink]",
	achievement: "[lime]",
});

export function locf(args: Formattable[], key: string, locale: string, flocfunc?: FlocFunction)
{
	const reset = i18n(key, locale).match(/^\[.+?\]/)?.[0] ?? "";
	return args.map(chunk => {
		if(!flocfunc) flocfunc = (str: string) => str;
		let unprocessed: string;
		if(chunk instanceof FishPlayer){
			unprocessed = `[cyan](${chunk.name}[cyan])` + reset;
		}else if(chunk instanceof Rank){
			unprocessed = `${chunk.color}${i18n(`rank.${chunk.name}.name`, locale)}[]` + reset;
		} else if(chunk instanceof RoleFlag){
			unprocessed = `${chunk.color}${i18n(`flag.${chunk.name}.name`, locale)}[]` + reset;
		} else if(chunk instanceof Error){
			unprocessed = `[red]${chunk.toString()}` + reset;
		} else if(chunk instanceof Player){
			const fishP = FishPlayer.get(chunk);
			unprocessed = `[cyan](${fishP.name}[cyan])` + reset;
		} else if(typeof chunk == "string"){
			if(uuidPattern.test(chunk)){
				unprocessed = `[blue]${chunk}[]`;
			} else if(ipPattern.test(chunk)){
				unprocessed = `[blue]${chunk}[]`;
			} else {
				//TODO reset color?
				unprocessed = chunk;
			}
		} else if(typeof chunk == "boolean"){
			unprocessed = `[blue]${chunk.toString()}[]`;
		} else if(typeof chunk == "number"){
			unprocessed = `[blue]${chunk.toString()}[]`;
		} else if(chunk instanceof Administration.PlayerInfo){
			unprocessed = chunk.lastName + reset;
		} else if(chunk instanceof UnitType){
			unprocessed = `[cyan]${i18n(chunk.name, locale)}[]`;
		} else if(chunk instanceof Block){
			unprocessed = `[cyan]${chunk.localizedName}[]`; // i'm not localizing all blocks
		} else if(chunk instanceof Team){
			unprocessed = `[white][#${chunk.color.toString()}]${chunk.emoji}${i18n(chunk.name, locale)}[][]`;
		} else if(chunk instanceof Item){
			unprocessed = `[cyan]${i18n(chunk.name, locale)}[]`;
		} else {
				chunk satisfies never;
				Log.err("Invalid format object!");
				Log.info(chunk);
				unprocessed = chunk as string; //allow it to get stringified by the engine
		}
		return flocfunc(unprocessed);
	});
}

export function i18nf(key: string, locale: string, ...args: Formattable[])
{
	return(i18n(key, locale, locf(args, key, locale)));
}

export function i18nfloc(key: string, locale: string, flocfunc: FlocFunction, ...args: Formattable[])
{
	return(i18n(key, locale, locf(args, key, locale)));
}