import { setupIframely } from './libs/sdk-iframely.js';

//
// Transient Mattertag Editor v2.0
//
// Purpose: Upgrade to https://matterport.github.io/showcase-sdk/sdk_transient_tags_editor.html
//
// New Features: 
//	- OAuth for Loading Spaces
//	- Client Side API Queries
//  - Ability to save Mattertags back to Models

let params = "&help=0&hl=2&play=1&qs=1",
	bundle = true,
	matSpace = "/bundle/showcase.html?m=",
	matSid = (localStorage.getItem('last_model') ? localStorage.getItem('last_model') : "JGPnGQ6hosj"), // If a model was previously selected, load it from localStorage
	tag, addTagBtn, importBtn, exportBtn, removeBtn, overlay, sidSelector, table_container, iframe, space,
	auth_code;

document.addEventListener("DOMContentLoaded", () => {
	addTagBtn = document.getElementById('add_tag');
	importBtn = document.getElementById('import_tags');
	exportBtn = document.getElementById('export_tags');
	removeBtn = document.getElementById('remove_tags');
	overlay = document.querySelector('.showcase_overlay');
	sidSelector = document.querySelector('.sid_selector');
	table_container = document.querySelector(".scrollable");
	iframe = document.getElementById('showcase');
	space = `${matSpace}${matSid}${params}&applicationKey=${applicationKey}`;
	iframe.setAttribute('src', space);
	iframe.addEventListener('load', showcaseLoader, true);

	sidSelector.setAttribute('value', matSid);
	sidSelector.addEventListener('keyup', e => {
		if (e.key === "Enter") {
			matSid = sidSelector.value;
			let space = `${matSpace}${matSid}${params}&applicationKey=${applicationKey}`;
			console.log("Loading - " + space);
			iframe.setAttribute('src', space);
			iframe.addEventListener('load', showcaseLoader, true);
		}
	});
})

// OAuth App Client ID  (Must set Client ID and Client Secret in _token.php also)
const clientId = '0s7wstbky6m10ke3ra3d92ehb'; // Transient Tag Editor App ID
//const clientId = 'h9mubzxh2ahxp8ehwnsbwg8db'; // Test of 30 Minute Token App ID
const applicationKey = '3nhn5rm8hmr1x74hsr46t7fud';
const redirectOrigin = 'https://goshow.me/transient-tag-editor/';
const oauthButton = document.getElementById('oauth-diag-submit');
const safeOrigins = [
	'https://static.matterport.com',
	'https://static.matterportvr.cn',
	window.location.origin,
];

let authWindow;

async function onAuthMessage(msg) {
	if (!authWindow) return;
	// validate that we received a message from a known source
	// Origins we possibly expect to receive messages over `postMessage` from
	if (msg.source === authWindow && safeOrigins.includes(msg.origin) && msg.data.type === 'auth_model') {
		// cleanup a bit: remove the message listener, and close the auth window
		window.removeEventListener('message', onAuthMessage);
		authWindow.close();

		if (msg.data.token !== "") {
			console.log('New Access Token Received:', msg.data.token);

			// Store Access Token in Local Browser Storage.
			localStorage.setItem('tte_access_token', msg.data.token.access_token);

			// Store Refresh Token in Local Browser Storage ***
			// This is being done here for the purpose of an example.  This is -not- the correct way to store a refresh_token.
			// We will not approve any application that stores a refresh token client side for production access.
			// https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps#name-refresh-tokens
			localStorage.setItem('tte_refresh_token', msg.data.token.refresh_token); // Again <-- not clever, just do

			// Store the Access Token Duration ... for fun (because we are only use tte_access_expiry to detect validity before using the refresh token)
			// Although, there's a broader subject of discussion that we are having here -- because technically, access_tokens are supposed to be
			// one-time use only for security purposes -- therefore, the way that this app is created, in that the access token is reused until it has
			// expired is trying to use best-practices based on what's allowed, not what should be enforced.

			localStorage.setItem('tte_access_token_validity_length', msg.data.token.expires_in);

			// Store the Expiration Time of the Access Token - Date.now (milliseconds) + minutes * 1000 (milliseconds)
			localStorage.setItem('tte_access_expiry', Date.now() + msg.data.token.expires_in * 1000);

			// Refresh Tokens last for 30 Days -- so store when the token will expire in milliseconds from the unix epoch
			let thirtyDays = 60 * 60 * 24 * 30 * 1000;
			localStorage.setItem('tte_refresh_expiry', Date.now() + thirtyDays);
		}
		else {
			console.log('Using existing authentication:', localStorage, ' to get: ', msg.data);
		}
		const showcaseParams = new URLSearchParams(window.location.search);
		matSid = msg.data.modelId;
		localStorage.setItem('last_model', msg.data.modelId);
		document.getElementById('sid').value = msg.data.modelId;
		showcaseParams.set('m', matSid);
		showcaseParams.set('applicationKey', applicationKey);
		showcaseParams.set('play', 1);
		showcaseParams.set('qs', 1);
		showcaseParams.set('newtags', 0);
		showcaseParams.set('apiHost', 'https://my.matterport.com');
		showcaseParams.set('auth', 'Bearer,' + localStorage.getItem('tte_access_token'));

		// start the Showcase player, hide the OAuth overlay, and connect the SDK
		await loadShowcase(showcaseParams);
		await connectSdk({
			auth: localStorage.getItem('tte_access_token'),
		});
	}
}

oauthButton.addEventListener('click', async function() {

	// See if there's an access token stored locally...

	if (localStorage.getItem('tte_access_token') !== null) {

		// See if Access Token is still valid ....
		if (Date.now() < localStorage.getItem('tte_access_expiry')) {
			console.log('Access Token still valid!');
			window.addEventListener('message', onAuthMessage);
			authWindow = window.open('redirect.html?access_token=' + localStorage.getItem('tte_access_token'), 'OAuth', 'width=800,height=800');
		}

		// If Access Token has expired, use the refresh token.  Please note that for the sake of this example, the refresh token is being
		// insecurely stored in localstorage.
		// https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps#name-refresh-tokens
		else if (Date.now() < localStorage.getItem('tte_refresh_expiry')) {
			console.log('Access Token has expired (' + Date.now() + '<' + localStorage.getItem('tte_refresh_expiry') + ' but Refresh Token is still valid!');
			const response = await fetch('refreshAccessToken.php?refresh_token=' + localStorage.getItem('tte_refresh_token'));
			let newToken = await response.json();
			if (typeof newToken.error !== 'undefined') {
				console.log('Refresh Token is invalid -- clearing localStorage...', newToken.error);
				localStorage.clear();
			} else {
				console.log('Token is still valid and refreshed...', newToken);
				// Store valid token in localStorage	
				localStorage.setItem('tte_access_token', newToken.access_token);
				localStorage.setItem('tte_access_expiry', Date.now() + newToken.expires_in * 1000); // Convert seconds to milliseconds
				// Setup a listener to handle the modal window...
				window.addEventListener('message', onAuthMessage);
				authWindow = window.open('redirect.html?access_token=' + localStorage.getItem('tte_access_token'), 'OAuth', 'width=800,height=800');
			}
		}

		// If both Access Token and Refresh Tokens have Expired...
		else {
			console.log('Token has expired - clearing localStorage...');
			localStorage.clear();
		}
	}
	if (localStorage.getItem('tte_access_token') == null) {
		console.log('Requesting new access token...');
		window.addEventListener('message', onAuthMessage);
		authWindow = window.open(
			`https://authn.matterport.com/oauth/authorize?client_id=${clientId}&response_type=code&scope=ViewPublic%20ViewDetails%20EditDetails`,
			'OAuth',
			'width=800,height=800'
		);
	}
});

async function getMattertags() {
	let url = './modelAPI.php?modelSid=' + matSid + '&accessToken=' + localStorage.getItem('tte_access_token') + '&applicationKey=' + applicationKey;
	let response = await fetch(url);
	let data = await response.text();
	console.log('Server Side Model API Query', data);
}

// Get Tags via Showcase Model API
// I'm really just doing this as a proof of concept - I'm not -sure- if this is useful, however, I'll be analyzing that when I start to work on allowing tags to be committed via Model API over OAuth... as there may be some data that is not returned via Mattertag.data() such as enabled (which should always be true as disabled scans shouldn't be loadable...)

async function getTagsClientSide() {
	var query = `{
		 model(id: "${matSid}") {	 
			mattertags {
				  id
				  created
				  modified
				  floor { id } 
				  enabled
				  color
				  label
				  description
				  media
				  mediaType
				  anchorPosition { x y z }
				  discPosition { x y z }
				  stemNormal { x y z }
				  stemLength
				  stemEnabled
				  keywords
			}		
		}
	}`;
	let url = "https://my.matterport.com/api/mp/models/graph";
	var headers = {
		'Content-Type': 'application/graphql',
		'x-matterport-application-key': applicationKey,
	};
	const urlParams = new URLSearchParams(iframe.contentWindow.location.search);
	auth_code = urlParams.get('auth');
	if (auth_code !== null) {
		console.log('GraphQL query made with Bearer Token');
		headers['Authorization'] = 'Bearer ' + localStorage.getItem('tte_access_token');
	}
	var options = {
		method: 'POST',
		mode: 'cors',
		headers: headers,
		body: query,
		redirect: 'follow'
	};

	var data = fetch(url, options)
		.then(response => response.text())
		.then(result => console.log('Client Side Model API Request', JSON.parse(result)))
		.catch(error => console.log('error', error));
}

async function loadShowcase(params) {
	return new Promise((res) => {
		iframe.onload = res;
		const src = '/bundle/showcase.html';
		iframe.src = src + '?' + params.toString();
	});
}

// connect to the Bundle SDK
async function connectSdk(options) {
	const showcaseWindow = iframe.contentWindow;
	const bundleConnector = showcaseWindow.MP_SDK;
	return bundleConnector.connect(showcaseWindow, options);
}

function showcaseLoader() {

	if (bundle == true) {
		console.log("Loading Bundle...");
		try {
			iframe.contentWindow.MP_SDK.connect(iframe, applicationKey, '3.6')
				.then(loadedShowcaseHandler)
				.catch(console.error);
		} catch (e) {
			console.error(e);
			return;
		}
	} else {
		console.log("Loading via SDK Embeds...");
		try {
			window.MP_SDK.connect(iframe, applicationKey, '3.2')
				.then(loadedShowcaseHandler)
				.catch(console.error);
		} catch (e) {
			console.error(e);
		}
	}
}

async function loadedShowcaseHandler(mpSdk) {

	// For fun...
	getTagsClientSide();

	var addingTag = false;
	var movingTag = false;

	// Fetch tags and replace media with IFrame.ly embeds
	// Wait until Showcase is actually playing....
	await mpSdk.App.state.waitUntil((appState) => appState.phase == 'appphase.playing');

	// Replace media in Tags with Iframely Media
	setupIframely(mpSdk, '5142aff4d2d4b937a57e53');

	// Fetch tags
	mpSdk.Mattertag.getData().then((tags) => {
			populateTags(tags);
			console.log(tags);
		})
		.catch(console.error);

	overlay.addEventListener('mousemove', (e) => {
		// console.log(`x: ${e.clientX} y: ${e.clientY}`);
		if (tag && !movingTag) {
			movingTag = true;
			mpSdk.Renderer.getWorldPositionData({
					x: e.offsetX,
					y: e.offsetY
				})
				.then((worldData) => {
					if (!worldData.position) {
						return mpSdk.Renderer.getWorldPositionData({
							x: e.offsetX,
							y: e.offsetY
						});
					}
					return worldData;
				})
				.then((worldData) => {
					if (!worldData.position) {
						return mpSdk.Renderer.getWorldPositionData({
							x: e.offsetX,
							y: e.offsetY
						});
					}
					return worldData;
				})
				.then((worldData) => {
					if (!worldData.position) {
						return mpSdk.Renderer.getWorldPositionData({
							x: e.offsetX,
							y: e.offsetY
						});
					}
					return worldData;
				})
				.then((worldData) => {
					if (!worldData.position) {
						return mpSdk.Renderer.getWorldPositionData({
							x: e.offsetX,
							y: e.offsetY
						}, .2);
					}
					return worldData;
				})
				.then(worldData => {
					if (!worldData.position) {
						worldData.position = {
							x: 0,
							y: 0,
							z: 0
						}
					}
					return mpSdk.Mattertag.editPosition(tag, {
						anchorPosition: worldData.position,
						stemVector: {
							x: 0,
							y: 0.2,
							z: 0
						}
					});
				})
				.then(() => {
					movingTag = false;
				})
				.catch((e) => {
					console.error(e);
					tag = null;
					movingTag = false;
				});
		}
	});

	overlay.addEventListener('click', (e) => {
		tag = null;
		overlay.setAttribute('style', 'display: none;');
	});

	addTagBtn.addEventListener('click', () => {
		overlay.setAttribute('style', 'display: inherit;');
		if (!addingTag && !tag) {
			addingTag = true;
			mpSdk.Mattertag.add([{
					label: "Matterport Tag",
					description: "",
					anchorPosition: {
						x: 0,
						y: 0,
						z: 0
					},
					stemVector: {
						x: 0,
						y: 0,
						z: 0
					},
					color: {
						r: 1,
						g: 0,
						b: 0
					},
				}])
				.then((sid) => {
					tag = sid[0];
					return mpSdk.Mattertag.getData()
				})
				.then((collection) => {
					var t_sid = collection.find(elem => elem.sid === tag);
					var row = addToTable(t_sid);
					addingTag = false;
				})
				.catch((e) => {
					console.error(e);
					addingTag = false;
				})
		}
	});

	function populateTags(tags, sort = 'label') {
		// TODO: implement sorting and description link extraction
		var curTags = document.querySelectorAll('.scrollable tbody tr')
		curTags.forEach((tag) => {
			tag.remove();
		});
		tags.forEach(addToTable);
	}

	function changeInfo(element, tagId) {
		if (element.tagName === 'TH') {
			return;
		}
		var field = element.getAttribute('class');
		var editor = document.createElement(field == 'description' ? 'textarea' : 'input');
		editor.setAttribute('class', field);
		editor.value = element.innerText;
		element.replaceWith(editor);
		editor.focus();
		editor.addEventListener('blur', () => {
			clickAway(editor, tagId);
		});
		editor.addEventListener('keydown', (e) => {
			if (e.key == "Enter") {
				editor.blur();
			}
		});
	}

	function clickAway(element, tagId) {
		var change = document.createElement('td');
		change.innerText = element.value;
		change.setAttribute('class', element.getAttribute('class'));
		element.replaceWith(change);
		change.removeEventListener('blur', clickAway);
		var props = new Object();
		props[element.getAttribute('class')] = element.value;
		mpSdk.Mattertag.editBillboard(tagId, props)
			.catch((e) => {
				console.error(e);
			});
		change.addEventListener('click', () => {
			changeInfo(change, tagId);
		});
	};

	function addToTable(tag) {

		if (table_container && table_container.children[0] && table_container.children[0].tagName == 'THEAD') {
			table_container = table_container.appendChild(document.createElement('TBODY'));
		}

		let row = table_container.appendChild(document.createElement('tr'));
		row.setAttribute('id', `${tag.sid}`);

		// ID / Goto
		let sid;
		row.appendChild(sid = document.createElement('td'));
		sid.setAttribute('class', 'sid');
		sid.innerText = `${tag.sid}`;
		sid.addEventListener('click', () => {
			mpSdk.Mattertag.navigateToTag(tag.sid, mpSdk.Mattertag.Transition.FADEOUT)
				.catch((e) => {
					console.error(e);
				});
		});

		// Label
		var label = row.appendChild(document.createElement('td'));
		label.setAttribute('class', 'label');
		label.innerText = `${tag.label}`;
		label.addEventListener('click', () => {
			changeInfo(label, tag.sid);
		});

		// Description
		let description = row.appendChild(document.createElement('td'));
		description.setAttribute('class', 'description');
		description.innerText = `${tag.description}`;
		description.addEventListener('click', () => {
			changeInfo(description, tag.sid);
		});

		// Image
		let image = row.appendChild(document.createElement('td'));
		image.setAttribute('class', 'image');
		image.innerText = tag.media.src;

		// Color
		let color = row.appendChild(document.createElement('td'));
		color.setAttribute('class', 'color');
		let colorDiv = color.appendChild(document.createElement('div'));
		colorDiv.setAttribute('style', `background-color: rgb(${tag.color.r * 255}, ${tag.color.g * 255}, ${tag.color.b * 255});`);

		// Actions
		let actions = row.appendChild(document.createElement('td'));
		actions.setAttribute('class', 'actions');

		// Delete
		let del = actions.appendChild(document.createElement('span'));
		del.setAttribute('class', 'delete');
		del.addEventListener('click', () => {
			console.log("Removed Mattertag #" + tag.sid);
			row.remove(); // Remove this row.
			mpSdk.Mattertag.remove(tag.sid)
				.catch((e) => {
					console.log(e);
				});
		});

		// Update
		let update = actions.appendChild(document.createElement('span'));
		update.setAttribute('class', 'update');
		update.addEventListener('click', () => {
			updateAPI(tag.sid);
		})

		return row;
	}

	function replaceShowcaseTags(tags) {
		return mpSdk.Mattertag.getData()
			.then(oldTags => {
				oldTagSids = oldTags.map(oldTag => oldTag.sid);
				return mpSdk.Mattertag.remove(oldTagSids);
			})
			.then(() => {
				return mpSdk.Mattertag.add(tags);
			})
			.then(newSids => {
				tags.forEach((tag, i) => tag.sid = newSids[i]);
				return tags;
			})
			.catch(e => {
				console.error(`${e}: ${tags}`);
			});
	}

	importBtn.addEventListener('click', () => {
		var input = document.createElement('input');
		input.type = 'file';
		var file;
		input.onchange = e => {
			file = e.target.files[0];
			importFile(file);
		}
		setTimeout(() => {
			input.click();
		}, 100);
	});

	removeBtn.addEventListener('click', () => {
		removeAllTags();
	})

	function importFile(file) {
		if (file.type === "application/json") {
			var reader = new FileReader();
			reader.readAsText(file);

			reader.addEventListener('load', e => {
				var content = e.target.result;
				tags = JSON.parse(content);
				replaceShowcaseTags(tags)
					.then((newTags) => {
						populateTags(newTags);
						setupTagFunctionality();
					})
					.catch(console.error);
			});
		} else {
			window.alert("Please select a .json filetype");
		}
	}

	// from https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
	// Function to download data to a file
	function download(data, filename, type) {
		var file = new Blob([data], {
			type: type
		});
		if (window.navigator.msSaveOrOpenBlob) // IE10+
			window.navigator.msSaveOrOpenBlob(file, filename);
		else { // Others
			var a = document.createElement("a"),
				url = URL.createObjectURL(file);
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			setTimeout(function() {
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			}, 0);
		}
	}

	function removeAllTags() {
		mpSdk.Mattertag.getData()
			.then(tags => {
				return tags.map(tag => tag.sid);
			})
			.then(tagSids => {
				return mpSdk.Mattertag.remove(tagSids)
			})
			.catch(console.error);

		document.querySelectorAll('tr').forEach(block => {
			if (!block || block.children[0].tagName == 'TH') return;
			block.parentNode.removeChild(block);
		});
	}

	function exportTags(tags) {
		if (!tags || tags.length == 0) {
			return;
		} // TODO: Let the user know there are no tags
		var filename = 'tags.json';
		var tagsText = JSON.stringify(tags);
		download(tagsText, filename, "application/json");
	}

	exportBtn.addEventListener('click', () => {
		mpSdk.Mattertag.getData().then(exportTags);
	});

	function extractColors(rgb) {
		var re = /background-color: rgb\((.*)\)/;
		var colors = rgb.match(re);
		colors = colors[1].split(',');
		colors = colors.map(color => parseInt(color.trim()));

		return Object({
			r: colors[0],
			g: colors[1],
			b: colors[2]
		});
	}

	function configureColorSliderElement(parent, defaultColorValue) {
		var slider;
		parent.appendChild(slider = document.createElement('input'));
		slider.setAttribute('type', 'range');
		slider.setAttribute('max', 255);
		slider.setAttribute('min', 0);
		slider.setAttribute('value', defaultColorValue);
	}

	function changeColor(block) {
		colorDiv = block.children[0];
		var colors = extractColors(colorDiv.getAttribute('style'));
		var picker = document.createElement('div');
		picker.setAttribute('class', 'color_picker');

		Object.values(colors).forEach(color => {
			configureColorSliderElement(picker, color);
		});
		console.log(picker);

		// why won't you blur?
		picker.addEventListener('blur', () => {
			console.warn("BLURRED");
			newColor = document.createElement('div');
			newColor.setAttribute('background-color', `rgb(${picker.children[0]}, ${picker.children[1]}, ${picker.children[2]})`);
			picker.replaceWith(newColor);
		});

		colorDiv.replaceWith(picker);
	}

	function updateAPI(tagId) {
		auth_code = localStorage.getItem('tte_access_token');
		console.log(auth_code);
		if (auth_code === null) {
			alert('You are not logged in, therefore you cannot save changes to this tag.');
		} else {
			alert('Request to update Tag #' + tagId + ' via API (not implemented yet)');
			console.log()
		}

	}

} // loadedShowcaseHandler      