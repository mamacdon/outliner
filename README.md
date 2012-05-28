Outliner provides an improved outline view for the Orion JavaScript editor. It constructs a hierarchical visualization
of the functions in a JavaScript file. Since many functions in JavaScript code are anonymous, Outliner uses a few simple
heuristics to infer the names of anonymous functions.

Installing into Orion
---------------------
1. Log in to Orion, and click the Plugins link on the global toolbar.
2. Paste [http://mamacdon.github.com/outliner/outlinerPlugin.html](http://mamacdon.github.com/outliner/outlinerPlugin.html) into the text box and click Install.
   After a moment, you should see a success message.
3. Open a JavaScript file in the Orion editor. You should now see a drop-down menu in the outline pane.
4. Click the drop-down arrow and choose "Hierarchical outliner".

<!--
Installing onto orionhub
------------------------
We can use Orionhub to simulate a local Orion server. We'll install the Outliner plugin into our "simulated" server.
1. Log into Orionhub.
2. Go to the Repositories page and clone the Orion client repository:
        git://git.eclipse.org/gitroot/orion/org.eclipse.orion.client.git
3. Go to the Sites page and create a new site configuration.
4. *While holding the SHIFT key*, click the Add button and choose ```org.eclipse.orion.client``` from the list.
   This should create a number of entries in the table.
5. Click *Start* to launch the site. Note the URL where the site is running; this is now your "local server".
6. Go to the Navigator and browse to ```org.eclipse.orion.client/bundles/org.eclipse.orion.client.core/web```.
7. Follow the instructions in "Installing" above, starting from Step 2.
-->

Uninstalling
------------
1. Log in to Orion and click the Plugins link on the global toolbar.
2. Uninstall ```outlinerPlugin.html```.

Requirements
------------
* Orion 0.5

License
-------
[Eclipse Distribution License v 1.0](http://www.eclipse.org/org/documents/edl-v10.html)
