//	Swap out Embed.ly Embedding with IFramely! 
//  A simple JS module by chrishickman@matterport.com

export const setupIframely = function(mpSdk, iframelyKey) {

	const tagPromise = new Promise((resolve, reject) => {
		var tagsWithAttachments = new Array();
		let tagObservable = mpSdk.Tag.data.subscribe({
			onAdded: function(index, item) {
				if (item.attachments.length > 0) {
					tagsWithAttachments[index] = item.attachments;
				}
			},
			onCollectionUpdated(collection) {
				resolve(tagsWithAttachments); // Return only the tagsWithAttachments
				tagObservable.cancel();
			}
		});
	});
	
	// Get the attachment collection
	const attachmentPromise = new Promise((resolve, reject) => {
		let attachmentObservable = mpSdk.Tag.attachments.subscribe({
			onCollectionUpdated(collection) {
				resolve(collection);
				attachmentObservable.cancel();
			}
		});
	});
	
	Promise.all([tagPromise, attachmentPromise]).then((values) => {
			replaceMedia(values[0], values[1]);
		})
		.catch((err) => {
			console.error('Ooops... the Promise went pear-shaped!', err);
		});
async function replaceMedia(tagCollection, attachmentCollection) {
			try {
				console.log(tagCollection, attachmentCollection);
				for (let tagID in tagCollection) {
					for (let attachmentID of tagCollection[tagID]) {
						console.log('Swapping Attachment from Embed.ly', attachmentCollection[attachmentID]);
						if (attachmentCollection[attachmentID].type == 'tag.attachment.image') {
							mpSdk.Tag.detach(tagID, attachmentID); // Remove media attached with Embed.ly			
							const [sandboxId, messenger] = await mpSdk.Tag.registerSandbox(
								`<img style="width: 100%; height: 100%:" src="${attachmentCollection[attachmentID].src}" />`, {
								name: 'Image Embed',
								size: { w: 0, h: 220 }
							});
							mpSdk.Tag.attach(tagID, sandboxId);					
						}
						else { // Is this even needed?
							mpSdk.Tag.detach(tagID, attachmentID); // Remove media attached with Embed.ly			
							const [sandboxId, messenger] = await mpSdk.Tag.registerSandbox(renderIframely(attachmentCollection[attachmentID].src), {
								name: 'IFramelyEmbed',
								size: { w: 0, h: 220 }
							});
							mpSdk.Tag.attach(tagID, sandboxId);
						}
					}
				}
			} catch (err) {
				console.log('Ooops... something went pear-shaped!', err);
			}
		}
		
		function renderIframely(src) {
			return `
			<style>
				.iframely-embed { width: 100%; }
				.iframely-responsive { position: relative; top: 0;left: 0; width: 100%; height: 0; padding-bottom: 56.25%; }
				.iframely-responsive > * { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
			</style>
			<div class="iframely-embed"><div class="iframely-responsive">
				<a data-iframely-url href="${src}"></a>
			</div></div>
			<script>
				  const script = document.createElement("script");
				  script.src = "//cdn.iframe.ly/embed.js?api_key=${iframelyKey}";
				  script.async = true;
				  document.body.appendChild(script);
			<` + `/script>`
		}		
}

