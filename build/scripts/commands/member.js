"use strict";
/*
Copyright © BalaM314, 2026. All Rights Reserved.
This file contains member commands, which are fun cosmetics for donators.
*/
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
var commands_1 = require("/frameworks/commands");
var i18n_1 = require("/frameworks/i18n");
var globals_1 = require("/globals");
exports.commands = (0, commands_1.commandList)({
    pet: (0, commands_1.command)({
        args: ["name:string?"],
        description: 'Spawns a cool pet with a displayed name that follows you around.',
        perm: commands_1.Perm.member,
        data: {},
        handler: function (_a) {
            var _b, _c;
            var args = _a.args, sender = _a.sender, data = _a.data, outputSuccess = _a.outputSuccess, localize = _a.localize;
            if (!args.name) {
                var pet_1 = data[sender.uuid];
                if (pet_1) {
                    pet_1.kill();
                    delete data[sender.uuid];
                    outputSuccess(localize(templateObject_1 || (templateObject_1 = __makeTemplateObject(["command.pet.removed"], ["command.pet.removed"]))));
                    return;
                }
            }
            var useKey = sender.muted() || !args.name;
            if (useKey || !args.name /* typescript moment */)
                args.name = "command.pet.petname";
            if (args.name.length > 500)
                (0, commands_1.fail)(localize(templateObject_2 || (templateObject_2 = __makeTemplateObject(["command.pet.toolongname"], ["command.pet.toolongname"]))));
            if (Strings.stripColors(args.name).length > 70)
                (0, commands_1.fail)(localize(templateObject_3 || (templateObject_3 = __makeTemplateObject(["command.pet.toolongname.nocolortags"], ["command.pet.toolongname.nocolortags"]))));
            (_b = data[sender.uuid]) === null || _b === void 0 ? void 0 : _b.kill();
            var unit = (_c = sender.unit()) !== null && _c !== void 0 ? _c : (0, commands_1.fail)(localize(templateObject_4 || (templateObject_4 = __makeTemplateObject(["command.pet.nounit"], ["command.pet.nounit"]))));
            if (!Vars.fogControl.isDiscovered(sender.team(), World.conv(unit.x), World.conv(unit.y)))
                (0, commands_1.fail)(localize(templateObject_5 || (templateObject_5 = __makeTemplateObject(["command.pet.fog"], ["command.pet.fog"]))));
            var pet = UnitTypes.merui.spawn(sender.team(), unit.x, unit.y);
            pet.apply(StatusEffects.disarmed, Number.MAX_SAFE_INTEGER);
            data[sender.uuid] = pet;
            Call.infoPopup('[#7FD7FD7f]\uE81B', 5, Align.topRight, 180, 0, 0, 10);
            outputSuccess(localize(templateObject_6 || (templateObject_6 = __makeTemplateObject(["command.pet.success"], ["command.pet.success"]))));
            var petName = args.name;
            var id = globals_1.fishState.labelID++;
            (function controlUnit() {
                try {
                    var unit_1 = sender.unit();
                    var currentPet = data[sender.uuid];
                    if (pet != currentPet) {
                        Call["label(java.lang.String,int,float,float,float,int)"](null, id, 0, 0, 0, 0);
                        return;
                    }
                    if (currentPet.dead) {
                        delete data[sender.uuid];
                        Call["label(java.lang.String,int,float,float,float,int)"](null, id, 0, 0, 0, 0);
                        return;
                    }
                    if (!sender.connected()) {
                        currentPet === null || currentPet === void 0 ? void 0 : currentPet.kill();
                        Call["label(java.lang.String,int,float,float,float,int)"](null, id, 0, 0, 0, 0);
                        return;
                    }
                    if (unit_1 && currentPet) {
                        var distX = unit_1.x - currentPet.x;
                        var distY = unit_1.y - currentPet.y;
                        Tmp.v1.set(distX, distY);
                        if (Tmp.v1.len() > 50) {
                            currentPet.approach(Tmp.v1);
                        }
                        if (Tmp.v1.len() > 20 * 8) {
                            currentPet.apply(StatusEffects.fast, 60);
                        }
                        if (useKey)
                            (0, i18n_1.localizedLabel)(petName, [sender.name], id, -1, currentPet.x, currentPet.y + 5);
                        else
                            Call.label(petName, id, -1, currentPet.x, currentPet.y + 5);
                        //Pets share the sender's trail
                        if (sender.trail) {
                            Call.effect(Fx[sender.trail.type], currentPet.x, currentPet.y, 0, sender.trail.color);
                        }
                    }
                    return Timer.schedule(controlUnit, 0.05);
                }
                catch (err) {
                    Log.err(err);
                }
            })();
        }
    }),
    highlight: {
        args: ['color:string?'],
        description: 'Makes your chat text colored by default.',
        perm: commands_1.Perm.member,
        handler: function (_a) {
            var args = _a.args, sender = _a.sender, outputFail = _a.outputFail, outputSuccess = _a.outputSuccess, localize = _a.localize;
            if (args.color == null || args.color.length == 0) {
                if (sender.highlight != null) {
                    sender.highlight = null;
                    outputSuccess(localize(templateObject_7 || (templateObject_7 = __makeTemplateObject(["command.highlight.cleared"], ["command.highlight.cleared"]))));
                }
                else {
                    outputFail(localize(templateObject_8 || (templateObject_8 = __makeTemplateObject(["command.highlight.noclear"], ["command.highlight.noclear"]))));
                }
            }
            else if (Strings.stripColors(args.color) == "") {
                sender.highlight = args.color;
                outputSuccess(localize("command.highlight.set", args.color.replace("[", "").replace("]", "")));
            }
            else if (Strings.stripColors("[".concat(args.color, "]")) == "") {
                sender.highlight = "[".concat(args.color, "]");
                outputSuccess(localize("command.highlight.set", args.color));
            }
            else {
                outputFail(localize("command.highlight.colornotvalid", args.color));
            }
        }
    },
    rainbow: {
        args: ["speed:number?"],
        description: 'Make your name change colors.',
        perm: commands_1.Perm.member,
        requirements: [commands_1.Req.integerRange("speed", 0, 10)],
        handler: function (_a) {
            var _b;
            var args = _a.args, sender = _a.sender, outputSuccess = _a.outputSuccess, localize = _a.localize;
            var colors = ['[red]', '[orange]', '[yellow]', '[acid]', '[blue]', '[purple]'];
            function rainbowLoop(index, fishP) {
                if (!(fishP.rainbow && fishP.player && fishP.connected()))
                    return;
                Timer.schedule(function () {
                    if (!(fishP.rainbow && fishP.player && fishP.connected()))
                        return;
                    fishP.player.name = colors[index % colors.length] + Strings.stripColors(fishP.player.name);
                    rainbowLoop(index + 1, fishP);
                }, fishP.rainbow.speed / 5);
            }
            if (!args.speed) {
                sender.rainbow = null;
                sender.updateName();
                outputSuccess(localize(templateObject_9 || (templateObject_9 = __makeTemplateObject(["command.rainbow.off"], ["command.rainbow.off"]))));
            }
            else {
                (_b = sender.rainbow) !== null && _b !== void 0 ? _b : (sender.rainbow = { speed: args.speed });
                rainbowLoop(0, sender);
                outputSuccess(localize("command.rainbow.on", args.speed));
            }
        }
    }
});
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9;
