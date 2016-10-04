'use strict';

const got = require('got');
const $ = require('cheerio');
const fs = require('fs');
const path = require('path');
const pjson = require('./package.json');

module.exports = (PluginContext) => {
	const shell = PluginContext.shell;
	const app = PluginContext.app;
	var html = "";
	var do_search = 0;
	var prefix = pjson.hain.prefix;
	
	function startup() {
		html = fs.readFileSync(path.join(__dirname, 'preview.html'), 'utf8');
	}
	
	function search(query, res) {
		var query_trim = query.trim();
		if (do_search == 0)
		{
			res.add({
			  icon: "#fa fa-search",
			  id: query_trim,
			  payload: "search",
			  title: `Press Enter to search ${query_trim} on MyAnimeList`,
			  desc: ""
			});
			return 0;
		}
		do_search = 0;
		if (query_trim.length <= 2)
		{
			var title = `\"${query_trim}\" is too short`;
			if (query_trim.length == 0)
				title = "Please enter something";
			res.add({
				title: title,
				desc: "The search query needs to be at least 3 characters long",
				icon: '#fa fa-times'
			});
			return 0;
		}
		var url = `https://myanimelist.net/anime.php?q=${query_trim}`;
		res.add({
			id: '__temp',
			title: 'fetching...',
			desc: 'from MyAnimeList',
			icon: '#fa fa-circle-o-notch fa-spin'
		});
		got(url).then(response => {
			var table = $(".js-categories-seasonal table", response.body);
			var results = $(table).find("tr").toArray();
			results.shift();
			if (results.length == 0)
			{
				res.remove('__temp');
				res.add({
					title: `No results for ${query_trim}`,
					icon: '#fa fa-times'
				});
			}
			else
			{
				var res_temp = [];
				$(results).each(function (index, element) {
					var data = $(this).find("td").toArray();
					res_temp.push({
					  icon: $(data[0]).find("img").attr("data-src"),
					  id: $(data[1]).find("a").attr("href"),
					  payload: "open",
					  title: $(data[1]).find("a strong").text(),
					  desc: $(data[1]).find(".pt4").text(),
					  preview: true
					});
				});
				res.remove('__temp');
				res.add(res_temp);
			}
			return 1;
		});
		return 0;
	}

	function execute(id, payload) {
		if (payload == "open")
		{
			shell.openExternal(id);
			return 1;
		}
		if (payload == "search")
		{
			do_search = 1;
			app.setQuery(prefix+" "+id)
			return 1;
		}
	}

	function renderPreview(id, payload, render) {
		render('<html><head><link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css" rel="stylesheet" integrity="sha384-T8Gy5hrqNKT+hzMclPo118YTQO6cYprQmhrYwIiQ/3axmI1hQomh7Ud2hPOy8SP1" crossorigin="anonymous"><style>#center {text-align: center;top: calc(50% - 40px);left: calc(50% - 40px);position: relative;}</style></head><body><i id="center" class="fa fa-circle-o-notch fa-spin fa-5x" aria-hidden="true"></i></body></html>');
		got(id).then(response => {
			var info = $(response.body).find(".borderClass");
			var title = $(response.body).find(".h1").text()
			var img = $(info).find("a>img.ac").attr("src");
			var type = info.text().replace(/^[\s\S]*?Type:\s*?(\S+)[\s\S]*$/i, "$1");
			var eps = info.text().replace(/^[\s\S]*?Episodes:\s*?(\S+)[\s\S]*$/i, "$1");
			var studio = $(info.html().replace(/^[\s\S]*?Studios:\s*?([\S\s]+?)<\/div>[\s\S]+/i, "$1").trim()).text();
			var airdate = $(info.html().replace(/^[\s\S]*?Aired:\s*?([\S\s]+?)<\/div>[\s\S]+/i, "$1").trim()).text();
			var genre = $(info.html().replace(/^[\s\S]*?Genres:\s*?([\S\s]+?)<\/div>[\s\S]+/i, "$1").trim()).text();
			var desc = $(response.body).find("span[itemprop='description']").text();
			var rank = $("div[data-id='info2']", info).text().replace(/[\S\s]*?(?:#?(N\/A|\d+))[\S\s]*/i, "$1");
			var preview = html.replace("%src%", img);
			preview = preview.replace("%type%", type);
			preview = preview.replace("%title%", title);
			preview = preview.replace("%episodes%", eps);
			preview = preview.replace("%airdate%", airdate);
			preview = preview.replace("%studio%", studio);
			preview = preview.replace("%genre%", genre);
			preview = preview.replace("%rank%", rank);
			preview = preview.replace("%desc%", desc);
			render(preview);
		});
	}
	return {startup, search, execute, renderPreview};
};
