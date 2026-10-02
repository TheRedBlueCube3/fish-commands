/*
This is a script to preview all keys.
*/

import fs from "fs";
import path, { format } from "path";

// source bundle directory
const bundleDirectory = "build/bundles";
const bundles = fs.readdirSync("build/bundles");

// const availableLocales = bundles.map(bundleFile => filenameToLocale(bundleFile));

function filenameToLocale(name: string)
{
	const match = name.match(/bundle_?([a-z-]{2,4})?\.properties/);
	if(match?.[1]) return match[1]; 
	else return "en";
}

function parseBundleFile(fileContents: string): Array<[string, string]> // this type is for duplication checks
{
	const lines = fileContents.split("\n");
	// parse line with regex

	const parsedLines = lines.map(line => 
		line.match(/([a-z0-9A-Z.\-_]+) ?= ?(.+)/)
	).filter(l=>l != null);

	return parsedLines.map(line => [line[1], line[2]]);
}

const bundleContents = Object.fromEntries(bundles.map(file => [filenameToLocale(file), Object.fromEntries(parseBundleFile(fs.readFileSync(path.join(bundleDirectory, file), {encoding: "utf8"})))]));

type RGBColor = [number, number, number]
function hexToRgb(hex: string): RGBColor
{
	if(hex.includes("#")) hex = hex.slice(1);

	return [
		parseInt(hex.slice(0, 2), 16),
		parseInt(hex.slice(2, 4), 16),
		parseInt(hex.slice(4, 6), 16)
	];
}

function minToANSI(str: string)
{
	// mapping of names of colors to hexcodes
	const colorNames: Record<string, string> = {
		clear: "000000", // ANSI does not support RGBA
		black: "000000",
		white: "ffffff",
		lightgray: "bfbfbf",
		lightgrey: "bfbfbf",
		gray: "7f7f7f",
		grey: "7f7f7f",
		darkgray: "3f3f3f",
		darkgrey: "3f3f3f",
		blue: "0000ff",
		navy: "00007f",
		royal: "4169e1",
		slate: "700090",
		sky: "87ceeb",
		cyan: "00ffff",
		teal: "007f7f",
		green: "00ff00",
		acid: "7fff00",
		lime: "32cd32",
		forest: "228b22",
		olive: "6b8e23",
		yellow: "ffff00",
		gold: "ffd700",
		goldenrod: "daa520",
		orange: "ffa500",
		brown: "8b4513",
		tan: "d2b48c",
		brick: "b22222",
		red: "ff0000",
		scarlet: "ff341c",
		coral: "ff7f50",
		salmon: "fa8072",
		pink: "ff69b4",
		magenta: "ff00ff",
		purple: "8000ff",
		violet: "ee82ee",
		maroon: "b03060",
		accent: "ffd37f"
	};
	const colortagRegex = /\[\[?([#0-9a-zA-Z]*)\]/g;
	const m = str.match(colortagRegex);
	if(!m) return str;
	let match: RegExpExecArray | null;
	let out: string = ``;
	let temp: number = 0;
	let prevPrevColor: string = ``;
	let prevColor: string = `white`;
	while ((match = colortagRegex.exec(str)) !== null) {
		// if(out.length == 0) out += str.slice(temp, match.index);
		out += str.slice(temp, match.index);
		temp = colortagRegex.lastIndex;
		if(match[0].includes("[["))
		{
			out += match[0];
			continue;
		}
		if(match[0] == '[]')
		{
			match[1] = prevPrevColor;
		}
		if(colorNames[match[1]])
		{
			const [r, g, b] = hexToRgb(colorNames[match[1]]);
			out += `\x1b[38;2;${r};${g};${b}m`;
		}
		else if(str.match(/#?([A-Fa-f0-9]{6})/))
		{
			const [r, g, b] = hexToRgb(match[1]);
			out += `\x1b[38;2;${r};${g};${b}m`;
		}
		prevPrevColor = prevColor;
		prevColor = match[1];
	}
	out += str.slice(temp);
	return out;
}

// find the locale in the arguments

function printLocale(locale: string): void
{
	console.log(`\x1b[32mLocale \x1b[1;34m${locale}\x1b[0m`);
	const keys = bundleContents[locale];
	for(const key in keys)
	{
		const lines = keys[key].split("\\n");
		if(lines.length > 1)
		{
			for(let i = 0; i < lines.length; i++)
			{
				let line = lines[i];
				if(i == 0)
				{
					console.log(`    \x1b[1;34m${key}\x1b[0m:\x1b[38;2;255;255;255m ${minToANSI(line)}`);
				}
				else
				{
					line = `\x1b[38;2;255;255;255m` + line;
					console.log(`${minToANSI(line.padStart(6 + key.length + line.length, ' '))}`);
				}
			}
		}
		else
			console.log(`    \x1b[1;34m${key}\x1b[0m:\x1b[38;2;255;255;255m ${minToANSI(keys[key])}\x1b[0m`);
	}
}
if(process.argv.length < 3)
{
	for(const locale in bundleContents) printLocale(locale);
}
else if(bundleContents[process.argv[2]])
{
	printLocale(process.argv[2]);
}