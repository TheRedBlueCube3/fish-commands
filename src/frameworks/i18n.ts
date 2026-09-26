/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains helper functions for i18n (internationalization) support.
*/

//#region I18N helpers
const handle = Vars.modDirectory.child("fish-commands/bundles/bundle");

const createLangBundles = <T extends string>(languages: T[]) => Object.fromEntries(languages.map(lang => [lang, I18NBundle.createBundle(handle, new Locale(lang))]));

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