'use strict';

const got = require('got');
const $ = require('cheerio');
const fs = require('fs');
const path = require('path');
const pjson = require('./package.json');

module.exports = (PluginContext) => {
	const shell = PluginContext.shell;
	const app = PluginContext.app;
	const prefix = pjson.hain.prefix;
	var html = "";
	var do_search = 0;
	var render_id = "";
	var res_temp = [];
	
	function startup() {
		html = fs.readFileSync(path.join(__dirname, 'preview.html'), 'utf8');
	}
	
	function search(query, res) {
		res_temp = [];
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
		if (query_trim.length == 0)
		{
			res.add({
				title: "Please enter something",
				desc: "Must enter at least 1 character to search.",
				icon: '#fa fa-times'
			});
			return 0;
		}
		var url = `https://myanimelist.net/search/prefix.json?type=anime&keyword=${query_trim}&v=1`;
		res.add({
			id: '__temp',
			title: 'fetching...',
			desc: 'from MyAnimeList',
			icon: '#fa fa-circle-o-notch fa-spin'
		});
		got(url).then(response => {
			var results = JSON.parse(response.body);
			results = results.categories[0].items;
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
				var i = 0;
				while (i < results.length) {
					var data = results[i];
					var score = data.payload.score;
					var airing = "";
					if (data.payload.status == "Currently Airing")
						airing = " - Airing";
					if (score != "N/A")
						score += "/10";
					res_temp.push({
						icon: data.thumbnail_url,
						id: JSON.stringify(data),
						payload: "open",
						title: data.name,
						desc: data.payload.start_year+" | "+score+" | "+data.payload.media_type+airing,
						preview: true
					});
					i++;
				}
				res.remove('__temp');
				res.add(res_temp);
			}
			return 0;
		});
		return 0;
	}

	function execute(id, payload) {
		if (payload == "open")
		{
			if (id == render_id)
				shell.openExternal(JSON.parse(id).url);
			else {
				var i = 0;
				while (i < res_temp.length) {
					if (id == res_temp[i].id) {
						app.setSelectionIndex(i);
						return 0;
					}
					i++;
				}
			}
			return 0;
		}
		if (payload == "search")
		{
			do_search = 1;
			app.setQuery(prefix+" "+id);
			return 0;
		}
	}

	function renderPreview(id, payload, render) {
		render_id = id;
		render('<html><head><link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css" rel="stylesheet" integrity="sha384-T8Gy5hrqNKT+hzMclPo118YTQO6cYprQmhrYwIiQ/3axmI1hQomh7Ud2hPOy8SP1" crossorigin="anonymous"><style>#center {text-align: center;top: calc(50% - 40px);left: calc(50% - 40px);position: relative;}</style></head><body><i id="center" class="fa fa-circle-o-notch fa-spin fa-5x" aria-hidden="true"></i></body></html>');
		var jsdata = JSON.parse(id);
		got(jsdata.url).then(response => {
			var info = $(response.body).find(".borderClass");
			var eps = info.text().replace(/^[\s\S]*?Episodes:\s*?(\S+)[\s\S]*$/i, "$1");
			var studio = $(info.html().replace(/^[\s\S]*?Studios:\s*?([\S\s]+?)<\/div>[\s\S]+/i, "$1").trim()).text();
			var genre = $(info.html().replace(/^[\s\S]*?Genres:\s*?([\S\s]+?)<\/div>[\s\S]+/i, "$1").trim()).text();
			var desc = $(response.body).find("span[itemprop='description']").text();
			var rank = $("div[data-id='info2']", info).html().replace(/[\S\s]*?(?:#?(N\/A|\d+))[\S\s]*/i, "$1");
			var preview = html.replace("%src%", jsdata.image_url);
			preview = preview.replace("%type%", jsdata.payload.media_type);
			preview = preview.replace("%title%", jsdata.name);
			preview = preview.replace("%episodes%", eps);
			preview = preview.replace("%airdate%", jsdata.payload.aired);
			preview = preview.replace("%studio%", studio);
			preview = preview.replace("%genre%", genre);
			preview = preview.replace("%rank%", rank);
			preview = preview.replace("%desc%", desc);
			render(preview);
		});
	}
	return {startup, search, execute, renderPreview};
};
