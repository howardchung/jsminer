# jsminer
An experiment with in-browser distributed bitcoin mining.

* Howard Chung
* Kent Jiang

About
----
JSMiner is an attempt to engage in bitcoin mining in a distributed manner--namely, through visitors' web browsers.
Traditionally, bitcoin mining has been done through standalone programs, which generally require administrator permissions to run.
By moving the computation to the browser, a visitor merely needs to visit a web page in order to begin mining.

Implementation
----
JSMiner consists of two components.
The first is a client application.
The second is a server which coordinates the work done by the clients.

Difficulties
----
Connecting this application to the live bitcoin network proved challenging.

Extensions
----
At this stage, bitcoin mining on CPUs is largely inefficient.
While possibly profitable for users if run on "free" electricity (from an institution or similar), it has largely been superseded by superior technologies.
ASICs (Application-Specific Integrated Circuits) have proven to be much more efficient in terms of hashes per watt, and currently make up the bulk of the bitcoin mining hash power.

