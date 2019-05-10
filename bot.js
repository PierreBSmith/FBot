const Discord = require("discord.js");
const config = require(".././auth.json");
const request = require("request");
const rp = require("request-promise");
const client = new Discord.Client();
var logger = require("winston");
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console(), {
	colorize: true
});
logger.level = "debug";
client.on("ready", function (evt) {
	logger.info("Connected");
	logger.info("Logged in as: ");
	logger.info(client.username + " - (" + client.id + ")");
});

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function sprintf(template, values) {
	return template.replace(/%s/g, function () {
		return values.shift();
	});
}

function titlecase(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function ifexists(cardpart) {
	if (cardpart == undefined) {
		return "";
	} else {
		return cardpart;
	}
}

function emojify(cost, server) {
	let i;
	let emocost = "";
	cost = cost
		.toLowerCase()
		.replace(/\{/g, "mana")
		.replace(/\}/g, " ")
		.replace(/\//g, "")
		.split(" ");
	for (i = 0; i < cost.length - 1; i++) {
		emocost += server.emojis.find(x => x.name === cost[i]);
	}
	return emocost;
}

client.on("message", async message => {
	if (message.author.bot) return;
	var msg = message.content.toLocaleLowerCase();
	if (msg.includes("can i get an f in the chat")) {
		message.channel.send("F");
	}
	if (msg.includes("oof")) {
		message.channel.send("OOF");
	}

	if (message.content.charAt(0) !== "!") return;
	async function sendCardText(params) {
		rp(params)
			.then(async function (cd) {
				if (ifexists(cd.card_faces) != "") {
					var halves = "";
					var cardhalf;
					var halfname;
					var halfcost;
					var halftype;
					var halftext;
					for (var i = 0; i < 2; i++) {
						cardhalf = cd.card_faces[i];
						halfname = "```" + cardhalf.name + " ";
						ifexists(cardhalf.mana_cost) != "" ?
							(halfcost = cardhalf.mana_cost + "\n") :
							(halfcost = "\n");
						halftype = cardhalf.type_line + "\n";
						halftext = cardhalf.oracle_text;
						ifexists(cardhalf.power) != "" ?
							(pt = "\n" + cardhalf.power + "/" + cardhalf.toughness) :
							(pt = "");
						halves +=
							halfname +
							halfcost +
							halftype.replace("â€”", "—") +
							halftext +
							pt +
							"```";
						if (i == 0) {
							if (ifexists(cardhalf.loyalty) != "") {
								halves += "Loyalty: " + cardhalf.loyalty;
							}
							halves += "\n";
						}
					}
					await message.channel.send(
						sprintf("%s\n%s\n%s (%s)\n%s", [
							cd.name,
							ifexists(cd.card_faces[1].mana_cost != "") ?
							emojify(cd.card_faces[0].mana_cost, message.guild) +
							" // " +
							emojify(cd.card_faces[1].mana_cost, message.guild) :
							emojify(cd.card_faces[0].mana_cost, message.guild),
							titlecase(cd.rarity),
							cd.set.toUpperCase(),
							halves
						])
					);
				} else {
					await message.channel.send(
						sprintf("%s %s\n%s (%s)\n%s\n%s%s%s", [
							cd.name,
							ifexists(cd.mana_cost) != "" ?
							emojify(cd.mana_cost, message.guild) :
							"",
							titlecase(cd.rarity),
							cd.set.toUpperCase(),
							cd.type_line.replace("â€”", "—"),
							(cd.oracle_text == "" ? "" : "```\n") +
							cd.oracle_text.replace("â€”", "—") +
							(cd.oracle_text == "" ? "" : "```"),
							ifexists(cd.power) +
							(cd.power == undefined ? "" : "/") +
							ifexists(cd.toughness),
							(cd.loyalty == undefined ? "" : "Loyalty: ") +
							ifexists(cd.loyalty)
						])
					);
				}
			})
			.catch(async function (err) {
				console.log(err);
			});
	}

	async function sendCardPrice(params) {
		rp(params)
			.then(async function (cd) {
				if (cd.data[0].usd == undefined) {
					await message.channel.send(sprintf("No USD price found for %s", [
						cd.data[0].name
					]));
				} else {
					await message.channel.send(
						sprintf("%s (%s) ~ $%s", [cd.data[0].name,
							cd.data[0].set.toUpperCase(),
							cd.data[0].usd
						])
					);
				}
			})
			.catch(async function (err) {
				console.log(err);
			});
	}

	const args = message.content.substring(1).trim().split(/ +/g);
	const command = args.shift().toLowerCase();
	//hey future me, if you ever want to add more command your gonna have to change this shit you dumb shit
	if (command !== 'f') {
		var searchCard = {
			uri: "https://api.scryfall.com/cards/named",
			qs: {
				fuzzy: args.join(" ")
			},
			json: true
		};
		var searchSetCard = {
			uri: "https://api.scryfall.com/cards/named",
			qs: {
				set: args.shift(),
				fuzzy: args.join(" ")
			},
			json: true
		};
		var searchPrice = {
			uri: "https://api.scryfall.com/cards/search",
			qs: {
				order: "usd",
				q: args.join(" ")
			},
			json: true
		};
	}
	switch (command) {
		case "f":
			for (var i = 0; i < parseInt(args[0]); i++) {
				var msg2 = "F ";
				msg2 = msg2.concat(i);
				message.channel.send(msg2);
				await sleep(1000);
			}
			break;
		case "help":
			message.channel.send(
				"says F whenever an F is asked for \n says OOF whenever OOF \n !f [num] types that many F's \n !help for help"
			);
			break;
		case "c":
			sendCardText(searchCard);
			break;
		case "cs":
			sendCardText(searchSetCard);
			break;
		case "p":
			sendCardPrice(searchPrice);
			break;
		case "ps":
			sendCardPrice(searchSetCard);
			break;
	}
});


client.login(config.token);