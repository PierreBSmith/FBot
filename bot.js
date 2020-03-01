const Discord = require("discord.js");
const auth = require("./auth.json");
const config = require("./config.json");
const fs = require("fs");
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

function createJSON(filename) {
	switch (filename) {
		case 'decklists':
		case 'customcommands':
			fs.writeFile('./assets/' + filename + ".json", "[]", 'utf8', (err) => {
				if (err) throw err;
				console.log("Created file: " + filename + ".json");
			});
			break;
		default:
			message.channel.send("Something went wrong!");
			console.log("Unexpectedly ended up in the default case of function createJSON.")
			break;
	}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function titlecase(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function emojify(cost, server) {
	let origcost = cost;
	let emocost = "";
	cost = cost
		.toLowerCase()
		.replace(/\{/g, "mana")
		.replace(/\}/g, " ")
		.replace(/\//g, "")
		.split(" ");
	if (cost[0] == "mana1000000") {
		for (let i = 0; i < 4; i += 1) {
			emocost += server.emojis.find(x => x.name === "mana1000000" + (i + 1).toString())
			if (emocost == "null") {
				return origcost;
			}
		}
		return emocost;
	}
	for (let i = 0; i < cost.length - 1; i++) {
		emocost += server.emojis.find(x => x.name === cost[i]);
		if (emocost == "null") {
			return origcost;
		}
	}
	return emocost;
}

function searchExact(results, searched) {
	for (let i = 0; i < results.total_cards; i++) {
		if (results.data[i].name.toLowerCase() == searched) {
			return results.data[i];
		}
	}
	return results.data[0];
}

function parseRulings(rulings) {
	var arrayRulings = [];
	rulings.filter(idx => idx.source !== "wotc");
	for (let i = 0; i < rulings.length; i++) {
		config.rulingsDate ? 	arrayRulings.push("```\n" + rulings[i].published_at + "\n" + rulings[i].comment + "```")
												: arrayRulings.push("```\n" + rulings[i].comment + "```")
	}
	if (arrayRulings.join("\n").length <= 2000) {
		return arrayRulings.join("\n");
	} else {
		var rulingpart = "";
		var arrayRulingsBig = [];
		for (let i = 0; i < arrayRulings.length; i++) {
			//+2 to account for linebreak
			if (rulingpart.length + arrayRulings[i].length + 2 <= 2000) {
				rulingpart += arrayRulings[i] + "\n";
			} else {
				arrayRulingsBig.push(rulingpart.trim());
				rulingpart = "";
				i--;
			}
		}
		if (rulingpart !== "") {
			arrayRulingsBig.push(rulingpart.trim());
		}
		return arrayRulingsBig;
	}
}

client.on("message", async message => {
	if (auth.channelbl.includes(message.channel.id)) return;
	if (message.author.bot) return;
	var msg = message.content.toLocaleLowerCase();
	if (msg.includes("can i get an f in the chat")) {
		fs.readdir("./assets/FPics", function (err, files) {
			if (err)
			{
				message.channel.send("F");
				return;
			}
			let rand = Math.floor(Math.random()*(files.length));
			message.channel.send(new Discord.Attachment('./assets/FPics/' + files[rand])).catch(console.error);
		});
	};
	if (msg.includes("oof") || msg.includes("kasen")) {
		message.channel.send("OOF");
	}


	if (message.content.charAt(0) !== "!") return;
	async function sendCardImage(params) {
		rp(params)
			.then(async (cd) => {
				//console.log(cd);
				if(cd.card_faces) {
					await message.channel.send("currently not implemented for double faced cards");
				} else {
						await message.channel.send(cd.image_uris.png).catch(console.error);
				}
				
			})
			.catch(async (err) => {
				console.log(err);
			});
	}

  async function sendCardText(params) {
    rp(params)
			.then(async (cd) => {
				let buildMessage = [];
				let oracletext = '';
				let pt = '';
				let loyalty = '';

				if (cd.card_faces) {
					let otherHalfCost = '';
					let halves = [];

					if (cd.card_faces[1].mana_cost) otherHalfCost = ' // ' + emojify(cd.card_faces[1].mana_cost, message.guild);
					buildMessage.push(cd.card_faces[0].name + ' // ' + cd.card_faces[1].name);
					buildMessage.push(emojify(cd.card_faces[0].mana_cost, message.guild) + otherHalfCost);
					buildMessage.push(titlecase(cd.rarity) + ' (' + cd.set.toUpperCase() + ')');
					for (let i = 0; i < 2; i++)
					{
						let half = ['```\n'];
						loyalty = '';

						if (cd.card_faces[i].oracle_text) oracletext = cd.card_faces[i].oracle_text;
						if (cd.card_faces[i].power) pt = cd.card_faces[i].power + '/' + cd.card_faces[i].toughness;
						if (cd.card_faces[i].loyalty) loyalty = 'Loyalty: ' + cd.card_faces[i].loyalty;
						half.push(cd.card_faces[i].name + ' ' + cd.card_faces[i].mana_cost);
						half.push(cd.type_line);
						half.push(oracletext);
						half.push(pt);
						half.push('```' + loyalty);
						halves.push(half.join('\n'));
					}
					buildMessage.push(halves.join(''));
					await message.channel.send(buildMessage.join('\n'));
				} else {
					if (cd.oracle_text) oracletext = '```\n' + cd.oracle_text + '```';
					if (cd.power) pt = cd.power + '/' + cd.toughness;
					if (cd.loyalty) loyalty = 'Loyalty: ' + cd.loyalty;
					buildMessage.push(cd.name + ' ' + emojify(cd.mana_cost, message.guild));
					buildMessage.push(titlecase(cd.rarity) + ' (' + cd.set.toUpperCase() + ')');
					buildMessage.push(cd.type_line);
					buildMessage.push(oracletext + pt + loyalty);
					await message.channel.send(buildMessage.join('\n'));
				}
			})
			.catch(async (err) => {
				console.log(err)
			});
  }

	async function readCommand(command, filename) {
		fs.readFile("./assets/" + filename + ".json", "utf8", function (err, data) {
			if (err && err.code === 'ENOENT') {
				createJSON(filename);
				message.channel.send("command does not exist");
				return;
			}
			let ccjson = JSON.parse(data)
			for (let i = 0; i < ccjson.length; i++) {
				if (ccjson[i].name == command) {
					message.channel.send(ccjson[i].comm);
					return;
				}
			}
		message.channel.send("command does not exist");
		})
	}

	async function addCommand(command, filename) {	
		fs.readFile("./assets/" + filename + ".json", "utf8", function (err, data) {
			if (err && err.code === 'ENOENT') {
				createJSON(filename);
				//for now, just assume the file created by createJSON contains this string
				//TODO: actually read the contents of the file created by createJSON here
				data = "[]"
			}
			let ccjson = JSON.parse(data)
			if (!ccjson) {
				ccjson = [{"name": command.name,"comm": command.comm}]
			} else {
				for (let i = 0; i < ccjson.length; i++) {
					if (ccjson[i].name == command.name) {
						message.channel.send("command already exists");
						return;
					}
				}
				ccjson.push(command)
				message.channel.send(command.name + " added");
			};
			fs.writeFile("./assets/" + filename + ".json", JSON.stringify(ccjson,0,4), (err) => {if(err) console.log(err)});
		})
	}

	async function removeCommand(command, filename) {
		fs.readFile("./assets/" + filename + ".json", "utf8", function (err, data) {
			if (err && err.code === 'ENOENT') {
				createJSON(filename);
				message.channel.send(command + " does not exist.");
				return;
			}
			let ccjson = JSON.parse(data)
			//delete ccjson.command
			let i = 0;
			for(; i < ccjson.length; i++){
				if(ccjson[i].name == command){
					ccjson.splice(i, 1);
					message.channel.send(command + " removed");
					break;
				}
			}
			
			fs.writeFile("./assets/" + filename + ".json", JSON.stringify(ccjson,0,4), (err) => {if(err) console.log(err)});
		})
	}

  async function sendCardPrice(params) {
    rp(params)
        .then(async (cd) => {
          let cdset = cd;
          let price;

          if (cd.data) cdset = searchExact(cd, args.join(' '));
          if (!cdset.prices.usd && !cdset.prices.usd_foil) {
            await message.channel.send(`No USD price found for ${cdset.name}`);
          } else {
            if (!cdset.prices.usd) {
              price = parseFloat(cdset.prices.usd_foil).toFixed(2) + ' (foil)';
            } else {
              price = Math.min(...[cdset.prices.usd, cdset.prices.usd_foil]
                          .filter(Boolean))
                          .toFixed(2);
            }
            await message.channel.send(`${cdset.name} (${cdset.set.toUpperCase()}) ~ $${price}`);
          }
        })
        .catch(async (err) => {
          console.log(err);
        });
  }

	async function sendRulings(params) {
		rp(params)
			.then(async (cd) => {
				var uriRulings = {
					uri: cd.rulings_uri,
					json: true
				}
				rp(uriRulings)
					.then(async (cr) => {
						if (!cr.data) {
							await message.channel.send("No rulings found for " & cd.name)
						} else {
							var readyRulings = parseRulings(cr.data);
							if (typeof readyRulings === "string") {
								await message.channel.send(readyRulings);
							} else {
								for (let i = 0; i < readyRulings.length; i++) {
									await message.channel.send(readyRulings[i]);
									await sleep(1000);
								}
							}
						}
					})

			})
	}

	const args = message.content.substring(1).trim().split(/ +/g);
	const command = args.shift().toLowerCase();
	if (command !== 'f') {
		var searchCard = {
			uri: "https://api.scryfall.com/cards/named",
			qs: {
				fuzzy: args.join(" ")
			},
			json: true
		};
		var searchRandCard = {
			uri: "https://api.scryfall.com/cards/random",
			qs: {
				q: args.join(" ")
			},
			json: true
		};
		var searchSetCard = {
			uri: "https://api.scryfall.com/cards/named",
			qs: {
				set: args[0],
				fuzzy: args.slice(1).join(" ")
			},
			json: true
		};
		var searchPrice = {
			uri: "https://api.scryfall.com/cards/search",
			qs: {
				order: "usd",
				dir: "asc",
				q: args.join(" ")
			},
			json: true
		};
		var addedCommand = {
			name: args[0],
			comm: args.slice(1).join(" ")
		}; 
	}
	
	switch (command) {
		case "f":
			if (auth.channelwl.includes(message.channel.id)) {
				for (let i = 0; i < parseInt(args[0]); i++) {
					var msg2 = "F ";
					msg2 = msg2.concat(i);
					message.channel.send(msg2);
					await sleep(1000);
				}
			}
			break;
		case "quality":
		message.channel.send(
				"MTGO is a quality program"
			);
		break;
		case "hotel":
		message.channel.send(
				"trivago"
			);
		break;
		/* case "help":
		 	message.channel.send(
		 		"says F whenever an F is asked for \nsays OOF whenever OOF \n!f [num] types that many F's"
		 		+ "\n!hotel for trivago \n!quality describes MTGO \n!c [cardName] pulls up the oracle text of a MTG card \n!cs [setAbbrevation] [cardName] pulls up the oracle text of the card in that set"
		 		+ "\n!p [cardName] for the price of a card \n!ps [setAbbrevation] [cardName] for the price of the card from that set \n!r [cardName] for rulings associated with that card in whitelisted channels"
		 		+ "\n!help for help"
		 	);
			 break;
		*/
		case "ownerhelp":
			if (auth.owners.includes(message.author.id)){
				message.channel.send("!whitelist whitelists a channel for the !f [num] command and the !r [cardName] command");
			}
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
		case "r":
			if (auth.channelwl.includes(message.channel.id)) {
				sendRulings(searchCard);
			}
			break;
		case "random":
			sendCardText(searchRandCard);
			break;
		case "im":
			sendCardImage(searchCard);
			break;
		case "ims":
			sendCardImage(searchSetCard);
			break;
		case "adddeck":
			addCommand(addedCommand, "decklists");
			break;
		case "addcom":
			addCommand(addedCommand, "customcommands");
			break;
		case "deck":
			readCommand(args[0], "decklists");
			break;
		case "removedeck":
			removeCommand(args[0], "decklists");
			break;
		case "removecom":
			removeCommand(args[0], "customcommands");
			break;
		case "decks":
			var decknames = "Decks: "
			fs.readFile("./assets/decklists.json", "utf8", function (err, data) {
				if (err && err.code === 'ENOENT') {
					message.channel.send("No decks found.");
					return;
				}
				let ccjson = JSON.parse(data)
				if (ccjson) {
					for (let i = 0; i < ccjson.length; i++) {
						decknames += ccjson[i].name;
						if (i === ccjson.length - 1) break;
						decknames += ", ";
					}
				}
				if (decknames !== "Decks: ") {
					message.channel.send(decknames);
				} else {
					message.channel.send("No decks found.");
				}
			})
			break;
		case "whitelist":
			//add "owners" to your auth.json as an array with Discord IDs of users who should have access to this command
			//add "channelwl" to your auth.json as an empty array
			if (auth.owners.includes(message.author.id) && !auth.channelwl.includes(message.channel.id)) {
				auth.channelwl.push(message.channel.id);
				fs.writeFile("./auth.json", JSON.stringify(auth,0,4), (err) => {console.log(err)});
				message.channel.send(message.channel.name + " has been whitelisted for commands that require whitelisting.")
			} else {
				auth.channelwl = auth.channelwl.filter(chan => chan !== message.channel.id);
				fs.writeFile("./auth.json", JSON.stringify(auth,0,4), (err) => {console.log(err)});
				message.channel.send(message.channel.name + " has been removed from the whitelist.");
			}
			break;
		default:
			try{
				readCommand(command, "customcommands");
			} catch(err){
				console.log(err);
			}		
			break;				
	}
});


client.login(auth.token);
