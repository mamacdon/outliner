/*global define eclipse*/
define(["lib/orion/plugin.js", "jsoutliner"], function(plugin, mJsOutline) {
	var provider = new eclipse.PluginProvider();
	provider.registerServiceProvider("orion.edit.outliner",
		{	getOutline: mJsOutline.getOutline
		},
		{	name: "Hierarchical outline",
			contentType: ["application/javascript"],
			id: "org.eclipse.orion.jsoutliner"
		});
	provider.connect();
});
